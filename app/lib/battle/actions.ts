'use server'

import { redirect } from 'next/navigation'
import { getBonusDeAtributos } from '@/app/lib/progression/queries'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import {
  SEM_BONUS,
  applyTraits,
  applyTransformation,
  comHeroi,
  computeBaseStats,
  computeFighterStats,
  createInitialState,
  heroi,
  isLegalMove,
  migrarEstado,
  podeBloquear,
  resolveRound,
  sumStatBonuses,
  traitEnergyCostModifier,
  vilao,
} from './engine'
import { deveBloquear, pickAiSkill } from './ai'
import { tierLiberado } from './raid'
import { recompensaComTeto, vitoriasContraIaHoje } from './recompensa'
import { applyExperience, battleXpGained } from './leveling'
import { getCharacterTraits, getEquippedSkills, getPlayerTransformations, getTreeBonus, loadEnemyProfile } from './queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { autoFillLoadout } from '@/app/lib/progression/actions'
import { recordStoryProgress } from '@/app/lib/story/actions'
import { MAX_ROUNDS, NPC_WINS_ON_WIN } from './constants'
import type { BaseStats, BattleState, Outcome, PlayerAction, TurnResult, BattleStateGravado} from './types'

type BattleRow = Awaited<ReturnType<typeof prisma.battle.findFirst>>

async function loadActiveBattleContext(battleId: string) {
  const user = await requireUser()

  const battle = await prisma.battle.findFirst({ where: { id: battleId, userId: user.id } })
  if (!battle) redirect('/battle/ai?error=not_found')
  if (battle.status !== 'ACTIVE') redirect(`/battle/ai/${battleId}`)

  const userCharacter = await prisma.userCharacter.findUnique({ where: { id: battle.playerCharacterId }, include: { character: true } })
  const enemy = await loadEnemyProfile(battle)
  if (!userCharacter || !enemy) redirect(`/battle/ai?error=not_found`)

  const [playerSkills, playerTransformations] = await Promise.all([
    getEquippedSkills(userCharacter.id),
    getPlayerTransformations(userCharacter.characterId, userCharacter.level),
  ])

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
    enemySkills: enemy.skills,
    xpMultiplier: enemy.xpMultiplier,
    storyXpReward,
    isFirstStoryClear,
    playerSkills,
    playerTransformations,
    state: migrarEstado(battle.state as unknown as BattleStateGravado),
  }
}

function decideDrawOrHpTiebreak(state: BattleState): Outcome {
  const playerRatio = heroi(state).maxHp > 0 ? heroi(state).currentHp / heroi(state).maxHp : 0
  const enemyRatio = vilao(state).maxHp > 0 ? vilao(state).currentHp / vilao(state).maxHp : 0
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
  userId: string
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
          skillId: result.skillId,
          result: result as unknown as Prisma.InputJsonValue,
        },
      })
      if (result.kind === 'TRANSFORM' && result.side === 'PLAYER' && result.transformationId) {
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
      // história tem estágio, raid tem monstro, PvP tem oponente humano.
      ctx.battle.enemyCharacterId !== null &&
        ctx.battle.storyStageId === null &&
        ctx.battle.opponentUserId === null,
      ctx.battle.userId
    )
    await applyPostBattleEffects(battleId, ctx.userCharacter.id, ctx.userCharacter.characterId, ctx.userCharacter.level, result)
  } catch (e) {
    if (e instanceof Error && e.message === 'CONCURRENT_UPDATE') redirect(`/battle/ai/${battleId}?error=conflict`)
    throw e
  }
}

type EnemyRef =
  | { kind: 'character'; characterId: string; base: BaseStats }
  | { kind: 'monster'; monsterId: string; base: BaseStats }

// The one truly identical tail shared by startAiBattle/startRaidBattle/
// startStoryBattle: compute the player's stats, seed the battle state,
// insert the Battle row, redirect into it.
//
// Deliberately NOT shared: the "already has an active battle?" check (AI
// filters by enemyCharacterId, raid by enemyMonsterId, story has no type
// filter at all — it blocks on ANY active battle), fetching/validating the
// userCharacter, and picking/scaling the enemy. Those differ enough between
// the 3 callers that folding them in here would silently change behavior.
export async function createBattleAndRedirect(params: {
  userId: string
  userCharacter: { id: string; level: number; character: { hp: number; attack: number; defense: number; speed: number; energy: number; stamina: number } }
  enemy: EnemyRef
  storyStageId?: string
}): Promise<never> {
  const [treeBonus, equipmentBonus, atributos, traits] = await Promise.all([
    getTreeBonus(params.userCharacter.id),
    getEquipmentBonus(params.userCharacter.id),
    getBonusDeAtributos(params.userCharacter.id),
    getCharacterTraits(params.userCharacter.id, params.userCharacter.level),
  ])
  // Traço entra DEPOIS de nível, árvore e equipamento: é o que o personagem é,
  // aplicado sobre tudo que ele conquistou.
  const playerBase = applyTraits(
    computeFighterStats(
      params.userCharacter.character,
      params.userCharacter.level,
      sumStatBonuses(treeBonus, equipmentBonus, atributos)
    ),
    traits
  )
  const state = createInitialState(playerBase, params.enemy.base, {
    player: traitEnergyCostModifier(traits),
  })

  const battle = await prisma.battle.create({
    data: {
      userId: params.userId,
      playerCharacterId: params.userCharacter.id,
      ...(params.enemy.kind === 'character' ? { enemyCharacterId: params.enemy.characterId } : { enemyMonsterId: params.enemy.monsterId }),
      ...(params.storyStageId ? { storyStageId: params.storyStageId } : {}),
      status: 'ACTIVE',
      turnNumber: 1,
      state: state as unknown as Prisma.InputJsonValue,
    },
  })

  redirect(`/battle/ai/${battle.id}`)
}

export async function startAiBattle(userCharacterId: string): Promise<never> {
  const user = await requireUser()
  const userId = user.id

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId }, include: { character: true } })
  if (!userCharacter) redirect('/select')

  const existing = await prisma.battle.findFirst({
    where: { userId, playerCharacterId: userCharacterId, status: 'ACTIVE', enemyCharacterId: { not: null } },
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
    enemy: { kind: 'character', characterId: enemyCharacter.id, base: enemyBase },
  })
}

export async function startRaidBattle(userCharacterId: string, monsterId: string): Promise<never> {
  const user = await requireUser()
  const userId = user.id

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId }, include: { character: true } })
  if (!userCharacter) redirect('/select')

  const existing = await prisma.battle.findFirst({
    where: { userId, playerCharacterId: userCharacterId, status: 'ACTIVE', enemyMonsterId: { not: null } },
    select: { id: true },
  })
  if (existing) redirect(`/battle/ai/${existing.id}`)

  const monster = await prisma.monster.findUnique({ where: { id: monsterId } })
  if (!monster) redirect('/battle/raid?error=not_found')

  // O PORTÃO É REVALIDADO AQUI, e não só na tela. A tela desabilita o botão
  // do tier trancado, mas quem posta o form direto passaria por cima dela —
  // server action é fronteira de confiança, o botão desabilitado é conforto.
  if (!tierLiberado(monster.tier, userCharacter.level)) redirect('/battle/raid?error=tier_locked')

  // STATS FIXOS, SEM ESCALA POR NÍVEL — é o que faz o tier ser uma escada em
  // vez de decoração. Ver app/lib/battle/raid.ts para a medição que mostrou
  // que escalar o monstro junto com o jogador congela a dificuldade relativa.
  const enemyBase = computeBaseStats(monster, SEM_BONUS)

  return createBattleAndRedirect({
    userId,
    userCharacter,
    enemy: { kind: 'monster', monsterId: monster.id, base: enemyBase },
  })
}

export async function takeTurn(battleId: string, skillId: string | null): Promise<void> {
  const ctx = await loadActiveBattleContext(battleId)
  const chosenSkill = skillId ? ctx.playerSkills[skillId] ?? null : null
  if (skillId && !chosenSkill) redirect(`/battle/ai/${battleId}?error=invalid_skill`)
  if (!isLegalMove(heroi(ctx.state), chosenSkill)) redirect(`/battle/ai/${battleId}?error=illegal_move`)

  const playerAction: PlayerAction = { kind: 'ATTACK', skillId }
  const inimigoBloqueia = deveBloquear(vilao(ctx.state), Object.values(ctx.enemySkills))
  const enemySkillId = pickAiSkill(vilao(ctx.state), Object.values(ctx.enemySkills), heroi(ctx.state))

  const { state: newState, turnResults } = resolveRound(
    ctx.state,
    {
      aliadas: [playerAction],
      inimigas: [inimigoBloqueia ? { kind: 'BLOCK' } : { kind: 'ATTACK', skillId: enemySkillId }],
    },
    { playerSkills: ctx.playerSkills, enemySkills: ctx.enemySkills, playerTransformations: ctx.playerTransformations }
  )

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

  const inimigoBloqueia = deveBloquear(vilao(ctx.state), Object.values(ctx.enemySkills))
  const enemySkillId = pickAiSkill(vilao(ctx.state), Object.values(ctx.enemySkills), heroi(ctx.state))

  const { state: newState, turnResults } = resolveRound(
    ctx.state,
    { aliadas: [{ kind: 'BLOCK' }], inimigas: [inimigoBloqueia ? { kind: 'BLOCK' } : { kind: 'ATTACK', skillId: enemySkillId }] },
    { playerSkills: ctx.playerSkills, enemySkills: ctx.enemySkills, playerTransformations: ctx.playerTransformations }
  )

  await finalizeRound(battleId, ctx, newState, turnResults)
}

export async function activateTransformation(battleId: string, transformationId: string): Promise<void> {
  const ctx = await loadActiveBattleContext(battleId)
  if (heroi(ctx.state).activeTransformationId) redirect(`/battle/ai/${battleId}?error=already_transformed`)
  if (!ctx.playerTransformations[transformationId]) redirect(`/battle/ai/${battleId}?error=invalid_transformation`)

  const forma = ctx.playerTransformations[transformationId]

  // FORMA QUE NÃO GASTA A RODADA: aplica e pronto, sem resolver turno nenhum.
  // O inimigo não ganha um golpe de graça, e o jogador segue podendo agir na
  // mesma rodada — que é o ponto do Bankai, liberado no meio da troca.
  //
  // O preço é energia, cobrada aqui, uma vez. Sem ele a forma seria ativação
  // obrigatória na rodada 1 e deixaria de ser decisão.
  if (forma.consumesTurn === false) {
    const custo = forma.activationCost ?? 0
    if (heroi(ctx.state).currentEnergy < custo) {
      redirect(`/battle/ai/${battleId}?error=insufficient_energy`)
    }

    const transformado = applyTransformation(heroi(ctx.state), forma)
    const novoEstado: BattleState = comHeroi(ctx.state, {
      ...transformado,
      currentEnergy: transformado.currentEnergy - custo,
    })

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

  const playerAction: PlayerAction = { kind: 'TRANSFORM', transformationId }
  const inimigoBloqueia = deveBloquear(vilao(ctx.state), Object.values(ctx.enemySkills))
  const enemySkillId = pickAiSkill(vilao(ctx.state), Object.values(ctx.enemySkills), heroi(ctx.state))

  const { state: newState, turnResults } = resolveRound(
    ctx.state,
    {
      aliadas: [playerAction],
      inimigas: [inimigoBloqueia ? { kind: 'BLOCK' } : { kind: 'ATTACK', skillId: enemySkillId }],
    },
    { playerSkills: ctx.playerSkills, enemySkills: ctx.enemySkills, playerTransformations: ctx.playerTransformations }
  )

  await finalizeRound(battleId, ctx, newState, turnResults)
}
