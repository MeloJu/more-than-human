'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import {
  SEM_BONUS,
  ativarForma,
  comHeroi,
  computeFighterStats,
  faltaParaAtivar,
  heroi,
  isLegalMove,
  migrarEstado,
  podeBloquear,
  resolveRound,
  vilao,
} from './engine'
import { acaoDaIa, acaoDoChefe, alvoDaIa } from './ai'
import { ehLutador, invocacoesEmCampo, skillIdDaColuna } from './invocacoes'
import { recompensaComTeto, vitoriasContraIaHoje } from './recompensa'
import { applyExperience, battleXpGained } from './leveling'
import { getEnemySkills, getEquippedSkills, getMonsterSkills, getPlayerTransformations, loadEnemyProfile } from './queries'
import { createBattleAndRedirect } from './montagem'
import { raidPorSlug } from '@/app/lib/raid/catalogo'
import { avancar, recompensaDaRaid, reservasDoTime } from '@/app/lib/raid/andares'
import { autoFillLoadout } from '@/app/lib/progression/loadout'
import { recordStoryProgress } from '@/app/lib/story/progresso'
import { MAX_ROUNDS, NPC_WINS_ON_WIN } from './constants'
import type {
  AcaoDeCombate,
  BattleState,
  Outcome,
  PlayerAction,
  Postura,
  SkillDef,
  TransformationDef,
  TurnResult,
  BattleStateGravado,
} from './types'

type BattleRow = Awaited<ReturnType<typeof prisma.battle.findFirst>>

async function loadActiveBattleContext(battleId: string) {
  const user = await requireUser()

  const battle = await prisma.battle.findFirst({ where: { id: battleId, userId: user.id } })
  if (!battle) redirect('/battle/ai?error=not_found')
  if (battle.status !== 'ACTIVE') redirect(`/battle/ai/${battleId}`)

  const userCharacter = await prisma.userCharacter.findUnique({ where: { id: battle.playerCharacterId }, include: { character: true } })
  const enemy = await loadEnemyProfile(battle)
  if (!userCharacter || !enemy) redirect(`/battle/ai?error=not_found`)

  const state = migrarEstado(battle.state as unknown as BattleStateGravado)

  // As formas do inimigo, pelo nível com que ele entrou na luta. Monstro de
  // raid ainda não tem forma nenhuma; batalha gravada antes de o nível ir
  // para o estado lê nível 1, que também não libera nenhuma.
  const [playerSkills, playerTransformations, enemyTransformations, participantes, raidRun] = await Promise.all([
    getEquippedSkills(userCharacter.id),
    getPlayerTransformations(userCharacter.characterId, userCharacter.level),
    battle.enemyCharacterId
      ? getPlayerTransformations(battle.enemyCharacterId, vilao(state).nivel ?? 1)
      : Promise.resolve({}),
    carregarParticipantes(battle.id),
    battle.raidRunId ? prisma.raidRun.findUnique({ where: { id: battle.raidRunId }, select: { id: true, raid: true } }) : null,
  ])

  // O andar de raid que esta luta é, para o fim dela fazer a incursão andar.
  const raidDaBatalha = raidRun ? raidPorSlug(raidRun.raid) : undefined
  const raid =
    raidRun && raidDaBatalha
      ? { runId: raidRun.id, andar: battle.andar ?? 0, totalDeAndares: raidDaBatalha.andares.length }
      : null

  // O chefe do andar, se houver: as particularidades dele e o arsenal inteiro.
  const principalDoAndar = raidDaBatalha?.andares[battle.andar ?? 0]?.inimigos[0]
  const perfilDoChefe = principalDoAndar && 'personagem' in principalDoAndar ? principalDoAndar.perfil : undefined
  const enemySkills =
    perfilDoChefe && battle.enemyCharacterId
      ? await getEnemySkills(battle.enemyCharacterId, vilao(state).nivel ?? 1, { semTeto: true })
      : enemy.skills

  // Estágio de história dita o próprio XP (xpReward), que é o número exibido
  // ao jogador na tela do estágio. Sem isso ele receberia o XP genérico de
  // batalha e a tela estaria prometendo uma recompensa que não é paga.
  //
  // `isFirstStoryClear` decide entre valor cheio e metade: rejogar paga menos,
  // senão repetir o mesmo estágio vira o caminho mais rápido do jogo (ver
  // battleXpGained). As duas consultas vão juntas porque só fazem sentido
  // juntas.
  let storyXpReward: number | null = null
  let isFirstStoryClear = true
  if (battle.storyStageId) {
    const [stage, progresso] = await Promise.all([
      prisma.storyStage.findUnique({ where: { id: battle.storyStageId }, select: { xpReward: true } }),
      prisma.userStoryProgress.findUnique({
        where: {
          userCharacterId_stageId: { userCharacterId: battle.playerCharacterId, stageId: battle.storyStageId },
        },
        select: { completedAt: true },
      }),
    ])
    storyXpReward = stage?.xpReward ?? null
    isFirstStoryClear = progresso === null
  }

  return {
    battle: battle as NonNullable<BattleRow>,
    userCharacter,
    enemySkills,
    perfilDoChefe,
    xpMultiplier: enemy.xpMultiplier,
    storyXpReward,
    isFirstStoryClear,
    playerSkills,
    playerTransformations,
    enemyTransformations,
    aliados: participantes.aliados,
    inimigosExtras: participantes.inimigos,
    raid,
    state,
  }
}

type ContextoDeBatalha = Awaited<ReturnType<typeof loadActiveBattleContext>>

type Participante = {
  posicao: number
  nome: string
  skills: Record<string, SkillDef>
  formas: Record<string, TransformationDef>
}

/**
 * Quem luta além do principal de cada lado: os aliados da party e os demais
 * inimigos de um andar de raid, com o que a IA precisa para jogar por eles —
 * golpes e formas no nível com que entraram. Batalha sem ninguém a mais
 * devolve listas vazias, e a rodada sai igual à de sempre.
 */
async function carregarParticipantes(battleId: string): Promise<{ aliados: Participante[]; inimigos: Participante[] }> {
  const linhas = await prisma.battleParticipant.findMany({
    where: { battleId },
    orderBy: { posicao: 'asc' },
    include: { character: { select: { name: true } }, monster: { select: { name: true } } },
  })
  const fichas = await Promise.all(
    linhas.map(async (p) => ({
      lado: p.lado,
      posicao: p.posicao,
      nome: p.character?.name ?? p.monster?.name ?? 'Lutador',
      skills: p.monsterId
        ? await getMonsterSkills(p.monsterId)
        : p.characterId
          ? await getEnemySkills(p.characterId, p.nivel)
          : {},
      formas: p.characterId ? await getPlayerTransformations(p.characterId, p.nivel) : {},
    }))
  )
  return {
    aliados: fichas.filter((f) => f.lado === 'PLAYER'),
    inimigos: fichas.filter((f) => f.lado === 'ENEMY'),
  }
}

/**
 * Resolve uma rodada com a ação do jogador contra a da IA. A IA decide por
 * acaoDaIa — bloquear, transformar ou atacar —, a mesma decisão que o
 * simulador de balanceamento usa. Ela joga também pelos aliados da party e
 * por cada inimigo do andar.
 */
function rodadaContraIa(ctx: ContextoDeBatalha, acaoDoJogador: PlayerAction) {
  const golpesDoInimigo = Object.values(ctx.enemySkills)
  const primeiroInimigoDePe = ctx.state.inimigos.find((c) => c.currentHp > 0) ?? vilao(ctx.state)

  // Os aliados decidem como a IA decide pelo inimigo, lendo quem está de pé.
  const aliadas: AcaoDeCombate[] = [acaoDoJogador]
  for (const a of ctx.aliados) {
    const eu = ctx.state.aliados[a.posicao]
    // Caído tem a ação ignorada pelo motor; o ataque básico só preenche a vaga.
    aliadas[a.posicao] =
      eu && eu.currentHp > 0
        ? acaoDaIa(eu, Object.values(a.skills), primeiroInimigoDePe, a.formas, {
            skillsDoOponente: golpesDoInimigo,
            campo: invocacoesEmCampo(ctx.state.aliados, a.posicao),
          })
        : { kind: 'ATTACK', skillId: null }
  }

  // Cada inimigo escolhe o alvo ANTES do golpe, para ler o arsenal de quem vai
  // apanhar ao decidir a postura.
  const fichasInimigas: Omit<Participante, 'nome'>[] = [
    { posicao: 0, skills: ctx.enemySkills, formas: ctx.enemyTransformations },
    ...ctx.inimigosExtras,
  ]
  const inimigas: AcaoDeCombate[] = []
  for (const f of fichasInimigas) {
    const eu = ctx.state.inimigos[f.posicao]
    if (!eu || eu.currentHp <= 0) {
      inimigas[f.posicao] = { kind: 'ATTACK', skillId: null }
      continue
    }
    const skillsDe = (posicao: number) =>
      Object.values(posicao > 0 ? ctx.aliados.find((a) => a.posicao === posicao)?.skills ?? {} : ctx.playerSkills)

    // O chefe joga pelo perfil dele (presa, carga, fase 2) — ver acaoDoChefe.
    if (f.posicao === 0 && ctx.perfilDoChefe) {
      inimigas[0] = acaoDoChefe(eu, Object.values(f.skills), f.formas, ctx.state.aliados, ctx.perfilDoChefe, { skillsDe })
      continue
    }

    const alvo = alvoDaIa(ctx.state.aliados)
    const presa = ctx.state.aliados[alvo ?? 0]
    const acao = acaoDaIa(eu, Object.values(f.skills), presa, f.formas, {
      skillsDoOponente: skillsDe(alvo ?? 0),
      campo: invocacoesEmCampo(ctx.state.inimigos, f.posicao),
    })
    inimigas[f.posicao] = acao.kind === 'ATTACK' && alvo !== undefined ? { ...acao, alvo } : acao
  }

  // O mapa de golpes é por LADO: o motor procura pelo id. Os do principal vêm
  // por último para vencer uma colisão — é a ficha dele que a tela mostra.
  const golpesAliados: Record<string, SkillDef> = Object.assign({}, ...ctx.aliados.map((a) => a.skills), ctx.playerSkills)
  const golpesInimigos: Record<string, SkillDef> = Object.assign({}, ...ctx.inimigosExtras.map((i) => i.skills), ctx.enemySkills)
  const formasDosAliados: Record<string, TransformationDef>[] = [ctx.playerTransformations]
  for (const a of ctx.aliados) formasDosAliados[a.posicao] = a.formas
  const formasDosInimigos: Record<string, TransformationDef>[] = [ctx.enemyTransformations]
  for (const i of ctx.inimigosExtras) formasDosInimigos[i.posicao] = i.formas

  return resolveRound(
    ctx.state,
    { aliadas, inimigas },
    {
      playerSkills: golpesAliados,
      enemySkills: golpesInimigos,
      playerTransformations: ctx.playerTransformations,
      enemyTransformations: ctx.enemyTransformations,
      formasPorPosicao: { PLAYER: formasDosAliados, ENEMY: formasDosInimigos },
    }
  )
}

/**
 * Vida somada do time, em fração da máxima somada. Só os lutadores: as
 * invocações não decidem a luta (ver lutadorDePe no motor).
 */
function fracaoDeVida(todos: BattleState['aliados']): number {
  const time = todos.filter(ehLutador)
  const max = time.reduce((s, c) => s + c.maxHp, 0)
  return max > 0 ? time.reduce((s, c) => s + Math.max(0, c.currentHp), 0) / max : 0
}

// Com party, o desempate é do TIME: o jogador quase morto com dois aliados
// inteiros não perdeu a luta.
function decideDrawOrHpTiebreak(state: BattleState): Outcome {
  const playerRatio = fracaoDeVida(state.aliados)
  const enemyRatio = fracaoDeVida(state.inimigos)
  if (Math.abs(playerRatio - enemyRatio) < 0.001) return 'DRAW'
  return playerRatio > enemyRatio ? 'PLAYER_WIN' : 'ENEMY_WIN'
}

type Reward = ReturnType<typeof applyExperience>

/**
 * Persists a resolved round: the Battle's new state/turnNumber/status, the
 * Turn rows, any transformation unlock, and (if the round ended the battle)
 * the XP/level/points update — all in one transaction. Deliberately does NOT
 * touch progression or story; see applyPostBattleEffects for that split.
 * Throws 'CONCURRENT_UPDATE' if another request already advanced this
 * battle's turnNumber first.
 */
async function persistRound(
  battleId: string,
  expectedTurnNumber: number,
  newState: BattleState,
  turnResults: TurnResult[],
  userCharacterId: string,
  userCharacterLevel: number,
  userCharacterExperience: number,
  xpMultiplier: number,
  storyXpReward: number | null,
  isFirstStoryClear: boolean,
  ehBatalhaContraIa: boolean,
  userId: string,
  /** O andar de raid que esta luta é, ou null fora da raid. */
  raid: { runId: string; andar: number; totalDeAndares: number } | null
): Promise<{ finalState: BattleState; isFinished: boolean; reward: Reward | null; moedas: number }> {
  const nextTurnNumber = expectedTurnNumber + 1
  const forcedEnd = newState.outcome === null && nextTurnNumber > MAX_ROUNDS
  const finalState: BattleState = forcedEnd ? { ...newState, outcome: decideDrawOrHpTiebreak(newState) } : newState
  const isFinished = finalState.outcome !== null

  // A recompensa de batalha contra IA escala com o nível e tem teto DIÁRIO,
  // que corta o pagamento e não a partida — ver app/lib/battle/recompensa.ts.
  // A contagem é consultada aqui, fora da transação, porque é leitura de algo
  // que já aconteceu: batalhas anteriores, não esta.
  let moedas = 0
  let xpGanho = battleXpGained(finalState.outcome, xpMultiplier, storyXpReward, isFirstStoryClear)

  if (isFinished && ehBatalhaContraIa && finalState.outcome === 'PLAYER_WIN') {
    const jaVenceuHoje = await vitoriasContraIaHoje(userCharacterId)
    const pago = recompensaComTeto(userCharacterLevel, jaVenceuHoje)
    xpGanho = pago.xp
    moedas = pago.moedas
  }

  // Computed up front (pure function, no DB needed) so we know the resulting
  // level outside the transaction too, without re-fetching afterward.
  const reward = isFinished ? applyExperience(userCharacterLevel, userCharacterExperience, xpGanho) : null

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.battle.updateMany({
      where: { id: battleId, turnNumber: expectedTurnNumber },
      data: {
        state: finalState as unknown as Prisma.InputJsonValue,
        turnNumber: nextTurnNumber,
        status: isFinished ? 'FINISHED' : 'ACTIVE',
        // O resultado vira COLUNA ao terminar. Sem isso ele só existiria
        // dentro do JSON, e contar vitórias do dia exigiria desserializar
        // todas as batalhas — que é o que o teto diário precisa perguntar.
        ...(isFinished ? { outcome: finalState.outcome } : {}),
      },
    })
    if (updateResult.count === 0) throw new Error('CONCURRENT_UPDATE')

    // FIM DE ANDAR: a incursão anda na MESMA transação da rodada final. Fora
    // dela, uma queda no meio deixaria a luta terminada e a raid parada no
    // mesmo andar, sem botão para seguir. A party sai como terminou — é isso
    // que o próximo andar herda (ver app/lib/raid/andares.ts).
    if (isFinished && raid) {
      const passo = avancar(raid.andar, raid.totalDeAndares, finalState.outcome)
      const andou = await tx.raidRun.updateMany({
        where: { id: raid.runId, status: 'ATIVA', andar: raid.andar },
        data: {
          status: passo.status,
          andar: passo.andar,
          reservas: reservasDoTime(finalState.aliados) as unknown as Prisma.InputJsonValue,
        },
      })
      if (andou.count > 0 && passo.status === 'VENCIDA') moedas += recompensaDaRaid(userCharacterLevel)
    }

    const existingTurnCount = await tx.turn.count({ where: { battleId } })
    let actionNumber = existingTurnCount + 1
    for (const result of turnResults) {
      await tx.turn.create({
        data: {
          battleId,
          number: actionNumber++,
          // A rodada que ACABOU de ser resolvida, não a próxima: o battle já
          // foi atualizado para nextTurnNumber acima.
          round: expectedTurnNumber,
          actor: result.side,
          skillId: skillIdDaColuna(result.skillId),
          result: result as unknown as Prisma.InputJsonValue,
        },
      })
      // Só a forma do PRÓPRIO jogador fica registrada na conta dele: a do
      // aliado contratado é do aliado.
      if (result.kind === 'TRANSFORM' && result.side === 'PLAYER' && (result.posicao ?? 0) === 0 && result.transformationId) {
        await tx.userCharacterTransformation.upsert({
          where: { userCharacterId_transformationId: { userCharacterId, transformationId: result.transformationId } },
          create: { userCharacterId, transformationId: result.transformationId, unlockedAtLevel: userCharacterLevel },
          update: {},
        })
      }
    }

    if (moedas > 0) {
      await tx.user.update({ where: { id: userId }, data: { coins: { increment: moedas } } })
    }

    if (reward) {
      await tx.userCharacter.update({
        where: { id: userCharacterId },
        data: {
          level: reward.level,
          experience: reward.experience,
          pointsAvailable: { increment: reward.pointsGained },
          ...(finalState.outcome === 'PLAYER_WIN' ? { npcWins: { increment: NPC_WINS_ON_WIN } } : {}),
        },
      })
    }
  })

  return { finalState, isFinished, reward, moedas }
}

/**
 * The explicit integration seam between battle and its sibling feature
 * modules. Everything here runs outside persistRound's transaction on
 * purpose: a level-up backfilling the loadout, or a story stage recording
 * progress, are both reactions to the round having finished, not part of
 * the atomic write of the round itself.
 */
async function applyPostBattleEffects(
  battleId: string,
  userCharacterId: string,
  userCharacterCharacterId: string,
  userCharacterLevel: number,
  result: { finalState: BattleState; isFinished: boolean; reward: Reward | null }
): Promise<void> {
  const { finalState, isFinished, reward } = result

  // A level-up may have made new skills eligible - backfill any free loadout
  // slots with them so a win doesn't quietly leave new moves unequipped.
  if (reward && reward.level > userCharacterLevel) {
    await autoFillLoadout(userCharacterId, userCharacterCharacterId, reward.level)
  }

  // Vitória em batalha vinda do modo história libera o próximo estágio e
  // entrega a recompensa. Fica fora da transação de persistRound porque é
  // no-op para toda batalha que não veio de um estágio (IA avulsa, raid) —
  // a função mesma decide isso olhando o storyStageId da batalha.
  if (isFinished && finalState.outcome === 'PLAYER_WIN') {
    await recordStoryProgress(battleId)
  }

  // Server Actions invoked without a redirect() rely on the router refreshing
  // the current route on their own, which turned out not to happen reliably
  // for this dynamic, cookie-gated route in Next 16 — revalidate explicitly
  // instead of assuming it.
  revalidatePath(`/battle/ai/${battleId}`)
  if (isFinished) {
    revalidatePath('/dashboard')
    revalidatePath('/status')
    revalidatePath('/story')
    revalidatePath('/battle/raid')
  }
}

/**
 * Shared by takeTurn/activateTransformation: persist the round, react to it
 * finishing, and translate a concurrent-update race into a user-facing
 * redirect instead of an unhandled error — previously duplicated in both.
 */
async function finalizeRound(
  battleId: string,
  ctx: Awaited<ReturnType<typeof loadActiveBattleContext>>,
  newState: BattleState,
  turnResults: TurnResult[]
): Promise<void> {
  try {
    const result = await persistRound(
      battleId,
      ctx.battle.turnNumber,
      newState,
      turnResults,
      ctx.userCharacter.id,
      ctx.userCharacter.level,
      ctx.userCharacter.experience,
      ctx.xpMultiplier,
      ctx.storyXpReward,
      ctx.isFirstStoryClear,
      // Batalha contra IA é a que tem inimigo do catálogo e nada mais:
      // história tem estágio, raid tem incursão, PvP tem oponente humano.
      ctx.battle.enemyCharacterId !== null &&
        ctx.battle.storyStageId === null &&
        ctx.battle.opponentUserId === null &&
        ctx.battle.raidRunId === null,
      ctx.battle.userId,
      ctx.raid
    )
    await applyPostBattleEffects(battleId, ctx.userCharacter.id, ctx.userCharacter.characterId, ctx.userCharacter.level, result)
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_UPDATE') redirect(`/battle/ai/${battleId}?error=conflict`)
    throw e
  }
}

export async function startAiBattle(userCharacterId: string): Promise<never> {
  const user = await requireUser()
  const userId = user.id

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId }, include: { character: true } })
  if (!userCharacter) redirect('/select')

  const existing = await prisma.battle.findFirst({
    where: { userId, playerCharacterId: userCharacterId, status: 'ACTIVE', enemyCharacterId: { not: null }, raidRunId: null },
    select: { id: true },
  })
  if (existing) redirect(`/battle/ai/${existing.id}`)

  const enemyPool = await prisma.character.findMany({ where: { id: { not: userCharacter.characterId } } })
  const enemyCharacter = enemyPool[Math.floor(Math.random() * enemyPool.length)]
  // Inimigo acompanha o nivel do jogador: sem isso, a luta contra IA vira
  // trivial assim que o jogador passa a escalar, e deixa de servir como
  // treino ou como fonte de recompensa.
  const enemyBase = computeFighterStats(enemyCharacter, userCharacter.level, SEM_BONUS)

  return createBattleAndRedirect({
    userId,
    userCharacter,
    enemy: { kind: 'character', characterId: enemyCharacter.id, base: enemyBase, level: userCharacter.level },
  })
}

const POSTURAS: readonly Postura[] = ['NEUTRA', 'ESQUIVA', 'APARAR', 'GUARDA', 'IMPETO']

/** A postura enviada com o golpe. Valor desconhecido vira a neutra: o campo vem do navegador. */
function posturaDoFormulario(dados?: FormData): Postura {
  const valor = dados?.get('postura')
  return POSTURAS.find((p) => p === valor) ?? 'NEUTRA'
}

/**
 * O alvo enviado com o golpe, como índice no lado inimigo. Fora do intervalo
 * ou ausente vira undefined, e o motor manda o golpe para o primeiro de pé.
 */
function alvoDoFormulario(dados: FormData | undefined, state: BattleState): number | undefined {
  const valor = dados?.get('alvo')
  if (typeof valor !== 'string') return undefined
  const n = Number(valor)
  return Number.isInteger(n) && n >= 0 && n < state.inimigos.length ? n : undefined
}

export async function takeTurn(battleId: string, skillId: string | null, dados?: FormData): Promise<void> {
  const ctx = await loadActiveBattleContext(battleId)
  const chosenSkill = skillId ? ctx.playerSkills[skillId] ?? null : null
  if (skillId && !chosenSkill) redirect(`/battle/ai/${battleId}?error=invalid_skill`)
  if (!isLegalMove(heroi(ctx.state), chosenSkill)) redirect(`/battle/ai/${battleId}?error=illegal_move`)

  const { state: newState, turnResults } = rodadaContraIa(ctx, {
    kind: 'ATTACK',
    skillId,
    postura: posturaDoFormulario(dados),
    alvo: alvoDoFormulario(dados, ctx.state),
  })

  await finalizeRound(battleId, ctx, newState, turnResults)
}

/**
 * Gasta a rodada erguendo a guarda.
 *
 * Não recebe habilidade nem alvo — é uma postura. A legalidade é conferida
 * aqui e não só na tela, como em toda action: esta rota é alcançável por POST
 * direto, e bloquear sem stamina precisa falhar do lado do servidor.
 */
export async function blockTurn(battleId: string): Promise<void> {
  const ctx = await loadActiveBattleContext(battleId)
  if (!podeBloquear(heroi(ctx.state))) redirect(`/battle/ai/${battleId}?error=no_stamina`)

  const { state: newState, turnResults } = rodadaContraIa(ctx, { kind: 'BLOCK' })

  await finalizeRound(battleId, ctx, newState, turnResults)
}

export async function activateTransformation(battleId: string, transformationId: string): Promise<void> {
  const ctx = await loadActiveBattleContext(battleId)
  if (heroi(ctx.state).activeTransformationId) redirect(`/battle/ai/${battleId}?error=already_transformed`)
  if (!ctx.playerTransformations[transformationId]) redirect(`/battle/ai/${battleId}?error=invalid_transformation`)

  const forma = ctx.playerTransformations[transformationId]

  // Toda forma cobra energia e stamina na ativação — a que gasta a rodada
  // também. Conferido aqui, antes de resolver qualquer coisa, para o jogador
  // saber qual das duas faltou em vez de ver a rodada passar sem efeito.
  const falta = faltaParaAtivar(heroi(ctx.state), forma)
  if (falta.energia > 0) redirect(`/battle/ai/${battleId}?error=insufficient_energy`)
  if (falta.stamina > 0) redirect(`/battle/ai/${battleId}?error=insufficient_stamina`)

  // FORMA QUE NÃO GASTA A RODADA: aplica e pronto, sem resolver turno nenhum.
  // O inimigo não ganha um golpe de graça, e o jogador segue podendo agir na
  // mesma rodada — que é o ponto do Bankai, liberado no meio da troca.
  if (forma.consumesTurn === false) {
    const novoEstado: BattleState = comHeroi(ctx.state, ativarForma(heroi(ctx.state), forma))

    // O turno NÃO avança, então a trava otimista compara o mesmo número: se
    // outra aba resolveu uma rodada nesse meio tempo, esta gravação não passa.
    const gravou = await prisma.battle.updateMany({
      where: { id: battleId, turnNumber: ctx.battle.turnNumber },
      data: { state: novoEstado as unknown as Prisma.InputJsonValue },
    })
    if (gravou.count === 0) redirect(`/battle/ai/${battleId}?error=conflict`)

    await prisma.userCharacter.update({
      where: { id: ctx.userCharacter.id },
      data: { activeTransformationId: transformationId },
    })
    await prisma.userCharacterTransformation.upsert({
      where: {
        userCharacterId_transformationId: { userCharacterId: ctx.userCharacter.id, transformationId },
      },
      create: {
        userCharacterId: ctx.userCharacter.id,
        transformationId,
        unlockedAtLevel: ctx.userCharacter.level,
      },
      update: {},
    })

    revalidatePath(`/battle/ai/${battleId}`)
    return
  }

  const { state: newState, turnResults } = rodadaContraIa(ctx, { kind: 'TRANSFORM', transformationId })

  await finalizeRound(battleId, ctx, newState, turnResults)
}
