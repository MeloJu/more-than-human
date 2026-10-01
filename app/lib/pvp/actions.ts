'use server'

import { redirect } from 'next/navigation'
import {
  comandoDoGolpe,
  evolucaoDoGolpe,
  ordensDisponiveis,
  pokemonEmCampo,
  pokemonNaReserva,
  skillIdDaColuna,
} from '@/app/lib/battle/invocacoes'
import { bonusDeAtributos } from '@/app/lib/progression/atributos'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import {
  ativarForma,
  comHeroi,
  comVilao,
  computeFighterStats,
  createInitialState,
  energyCostFor,
  faltaParaAtivar,
  podeBloquear,
  prepararTreinador,
  heroi,
  isLegalMove,
  migrarEstado,
  resolveRound,
  sumStatBonuses,
  vilao,
} from '@/app/lib/battle/engine'
import { getEquippedSkills, getPlayerTransformations, getTreeBonus, timeDoJogador } from '@/app/lib/battle/queries'
import { alvoDoFormulario, posturaDoFormulario } from '@/app/lib/battle/formulario'
import { gastarItens } from '@/app/lib/itens/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { applyExperience } from '@/app/lib/battle/leveling'
import { MAX_ROUNDS, PVP_LEVEL_RANGE, XP_ON_LOSS, XP_ON_WIN } from '@/app/lib/battle/constants'
import { publishPvpEvent } from './events'
import type { BattleState, BattleStateGravado, PlayerAction, TransformationDef, TurnResult } from '@/app/lib/battle/types'

/**
 * Entra na fila e, se já houver alguém esperando, pareia na hora.
 *
 * O pareamento roda dentro de uma transação com deleteMany condicionado ao id
 * do oponente: se dois jogadores entrarem no mesmo instante e ambos tentarem
 * parear com o mesmo terceiro, só a transação que conseguir remover a linha
 * dele cria a batalha. A outra vê count === 0 e volta pra fila, em vez de
 * criar uma segunda batalha com um jogador que já está lutando.
 */
export async function joinPvpQueue(): Promise<void> {
  const user = await requireUser()

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { selectedCharacter: { select: { id: true, level: true } } },
  })
  if (!me?.selectedCharacter) redirect('/battle/pvp?error=no_character')
  const meuNivel = me.selectedCharacter.level

  // Já está numa batalha PvP? Volta pra ela em vez de duplicar.
  const existing = await prisma.battle.findFirst({
    where: { status: 'ACTIVE', opponentUserId: { not: null }, OR: [{ userId: user.id }, { opponentUserId: user.id }] },
    select: { id: true },
  })
  if (existing) redirect(`/battle/pvp/${existing.id}`)

  // Pareia so dentro da faixa de nivel: com os dois lados escalando, um
  // nivel 12 contra um nivel 3 nao e partida, e desistir vira a unica
  // jogada racional do lado fraco.
  const opponent = await prisma.pvpQueue.findFirst({
    where: {
      userId: { not: user.id },
      userCharacter: { level: { gte: meuNivel - PVP_LEVEL_RANGE, lte: meuNivel + PVP_LEVEL_RANGE } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  if (!opponent) {
    await prisma.pvpQueue.upsert({
      where: { userId: user.id },
      create: { userId: user.id, userCharacterId: me.selectedCharacter.id },
      update: { userCharacterId: me.selectedCharacter.id, joinedAt: new Date() },
    })
    revalidatePath('/battle/pvp')
    redirect('/battle/pvp?waiting=1')
  }

  const battleId = await pairPlayers(
    { userId: opponent.userId, userCharacterId: opponent.userCharacterId },
    { userId: user.id, userCharacterId: me.selectedCharacter.id }
  )
  if (!battleId) {
    // Perdeu a corrida: o oponente foi pareado por outra pessoa. Entra na fila.
    await prisma.pvpQueue.upsert({
      where: { userId: user.id },
      create: { userId: user.id, userCharacterId: me.selectedCharacter.id },
      update: { userCharacterId: me.selectedCharacter.id, joinedAt: new Date() },
    })
    redirect('/battle/pvp?waiting=1')
  }

  redirect(`/battle/pvp/${battleId}`)
}

/** Monta os stats de um UserCharacter do jeito que a batalha espera. */
async function buildFighter(userCharacterId: string) {
  const uc = await prisma.userCharacter.findUnique({
    where: { id: userCharacterId },
    include: { character: true },
  })
  if (!uc) return null
  const [tree, equipment, skills] = await Promise.all([
    getTreeBonus(uc.id),
    getEquipmentBonus(uc.id),
    getEquippedSkills(uc.id),
  ])
  // Cada lado escala pelo PROPRIO nivel. A fila so pareia dentro de
  // PVP_LEVEL_RANGE justamente porque, com os dois escalando, diferenca
  // grande de nivel deixa de ser vantagem e vira atropelo.
  return { uc, base: computeFighterStats(uc.character, uc.level, sumStatBonuses(tree, equipment, bonusDeAtributos(uc))), skills }
}

async function pairPlayers(
  host: { userId: string; userCharacterId: string },
  guest: { userId: string; userCharacterId: string }
): Promise<string | null> {
  const [hostFighter, guestFighter] = await Promise.all([
    buildFighter(host.userCharacterId),
    buildFighter(guest.userCharacterId),
  ])
  if (!hostFighter || !guestFighter) return null

  let state = createInitialState(hostFighter.base, guestFighter.base, undefined, {
    player: hostFighter.uc.level,
    enemy: guestFighter.uc.level,
  })
  // Treinador (o Red) entra com o time, dos dois lados.
  const [timeDoHost, timeDoGuest] = await Promise.all([
    timeDoJogador(host.userCharacterId),
    timeDoJogador(guest.userCharacterId),
  ])
  if (timeDoHost.length > 0) state = prepararTreinador(state, 'PLAYER', 0, timeDoHost)
  if (timeDoGuest.length > 0) state = prepararTreinador(state, 'ENEMY', 0, timeDoGuest)

  try {
    return await prisma.$transaction(async (tx) => {
      // Só segue quem conseguir tirar o host da fila — ver comentário em joinPvpQueue.
      const claimed = await tx.pvpQueue.deleteMany({ where: { userId: host.userId } })
      if (claimed.count === 0) throw new Error('LOST_RACE')
      await tx.pvpQueue.deleteMany({ where: { userId: guest.userId } })

      const battle = await tx.battle.create({
        data: {
          userId: host.userId,
          playerCharacterId: host.userCharacterId,
          opponentUserId: guest.userId,
          opponentCharacterId: guest.userCharacterId,
          status: 'ACTIVE',
          state: state as unknown as Prisma.InputJsonValue,
        },
      })
      return battle.id
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'LOST_RACE') return null
    throw e
  }
}

export async function leavePvpQueue(): Promise<void> {
  const user = await requireUser()
  await prisma.pvpQueue.deleteMany({ where: { userId: user.id } })
  revalidatePath('/battle/pvp')
  redirect('/battle/pvp')
}

/**
 * A luta de quem está jogando, já na perspectiva dele: o host é o lado
 * PLAYER do motor (aliados), o convidado o ENEMY (inimigos).
 */
async function minhaLuta(battleId: string) {
  const user = await requireUser()

  const battle = await prisma.battle.findFirst({
    where: { id: battleId, status: 'ACTIVE', opponentUserId: { not: null }, OR: [{ userId: user.id }, { opponentUserId: user.id }] },
  })
  if (!battle) redirect('/battle/pvp?error=not_found')

  const isHost = battle.userId === user.id
  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  return {
    user,
    battle,
    isHost,
    state,
    eu: isHost ? heroi(state) : vilao(state),
    meuTime: isHost ? state.aliados : state.inimigos,
    timeDoOutro: isHost ? state.inimigos : state.aliados,
    meuPersonagemId: isHost ? battle.playerCharacterId : battle.opponentCharacterId!,
    falhar: (erro: string): never => redirect(`/battle/pvp/${battleId}?error=${erro}`),
  }
}

type Luta = Awaited<ReturnType<typeof minhaLuta>>

/**
 * Guarda a ação da rodada. Turno é SIMULTÂNEO: guarda a escolha e só resolve
 * quando a do adversário também chegou — assim ninguém joga vendo a jogada do
 * outro.
 *
 * A resolução é disparada por quem submeter por último, dentro de uma
 * transação que exige que as duas ações ainda estejam lá. Se os dois
 * submeterem ao mesmo tempo, só uma transação encontra o par e resolve; a
 * outra não faz nada, em vez de resolver a rodada duas vezes.
 *
 * A POÇÃO sai da mochila aqui, na mesma transação que guarda a ação: a
 * escolha está feita e não volta atrás, como o golpe.
 */
async function registrar(luta: Luta, action: PlayerAction, itemGasto?: string): Promise<void> {
  const { battle, isHost, user } = luta

  // Prisma.DbNull (e não null) é o "é NULL no banco" para coluna Json — com
  // null puro o filtro é rejeitado. Exigir que o campo ainda esteja vazio é o
  // que impede reenviar a ação e sobrescrever a escolha já feita na rodada.
  const resultado = await prisma
    .$transaction(async (tx) => {
      const stored = await tx.battle.updateMany({
        where: isHost
          ? { id: battle.id, turnNumber: battle.turnNumber, pendingHostAction: { equals: Prisma.DbNull } }
          : { id: battle.id, turnNumber: battle.turnNumber, pendingOpponentAction: { equals: Prisma.DbNull } },
        data: isHost
          ? { pendingHostAction: action as unknown as Prisma.InputJsonValue }
          : { pendingOpponentAction: action as unknown as Prisma.InputJsonValue },
      })
      if (stored.count === 0) return 'already_submitted' as const
      if (itemGasto) await gastarItens(tx, user.id, [{ itemId: itemGasto, quantidade: 1 }])
      return 'ok' as const
    })
    .catch((e: unknown) => {
      if (e instanceof Error && e.message === 'FALTA_ITEM') return 'sem_item' as const
      throw e
    })
  if (resultado !== 'ok') return luta.falhar(resultado)

  // Invalidar ANTES de avisar: o evento faz o outro jogador buscar a página de
  // novo, e se o cache ainda estiver quente ele recebe o estado anterior — o
  // aviso chega, mas a tela não muda.
  revalidatePath(`/battle/pvp/${battle.id}`)
  publishPvpEvent(battle.id, { type: 'ACTION_SUBMITTED', byUserId: user.id })

  await maybeResolveRound(battle.id)
}

/** O golpe da rodada (ou o ataque básico, com skillId null), com postura e alvo. */
export async function submitPvpAction(battleId: string, skillId: string | null, dados?: FormData): Promise<void> {
  const luta = await minhaLuta(battleId)
  const { eu, meuTime, timeDoOutro } = luta

  const mySkills = await getEquippedSkills(luta.meuPersonagemId)
  const chosen = skillId ? mySkills[skillId] ?? null : null
  if (skillId && !chosen) return luta.falhar('invalid_skill')
  if (!isLegalMove(eu, chosen)) return luta.falhar('illegal_move')
  // Treinador: o golpe de um Pokémon só sai com ele em campo, e o ataque
  // básico (a Investida) precisa de algum em campo.
  if (eu.treinador) {
    const emCampo = pokemonEmCampo(meuTime, 0)?.def.id
    const precisa = comandoDoGolpe(chosen) ?? evolucaoDoGolpe(chosen)?.de
    if (chosen ? precisa !== emCampo : !emCampo) return luta.falhar('pokemon_fora')
  }

  await registrar(luta, {
    kind: 'ATTACK',
    skillId,
    postura: posturaDoFormulario(dados),
    alvo: alvoDoFormulario(dados, timeDoOutro.length),
  })
}

/** Manda a invocação em campo usar o especial dela (ver darOrdem, na IA). */
export async function darOrdemPvp(battleId: string, posicao: number, dados?: FormData): Promise<void> {
  const luta = await minhaLuta(battleId)
  const ordem = Number.isInteger(posicao) ? ordensDisponiveis(luta.meuTime, 0).find((o) => o.posicao === posicao) : undefined
  if (!ordem?.def.especial) return luta.falhar('invalid_order')
  if (luta.eu.currentEnergy < energyCostFor(luta.eu, ordem.def.especial.custo)) return luta.falhar('illegal_move')

  await registrar(luta, {
    kind: 'ORDEM',
    invocacao: posicao,
    postura: posturaDoFormulario(dados),
    alvo: alvoDoFormulario(dados, luta.timeDoOutro.length),
  })
}

/** O treinador troca o Pokémon em campo por um da pokébola, de pé. */
export async function trocarPokemonPvp(battleId: string, posicao: number): Promise<void> {
  const luta = await minhaLuta(battleId)
  const valida = Number.isInteger(posicao) && pokemonNaReserva(luta.meuTime, 0).some((p) => p.posicao === posicao)
  if (!luta.eu.treinador || !valida) return luta.falhar('troca_invalida')

  await registrar(luta, { kind: 'TROCAR', invocacao: posicao })
}

/** Gasta a rodada erguendo a guarda, pagando com stamina. */
export async function bloquearPvp(battleId: string): Promise<void> {
  const luta = await minhaLuta(battleId)
  if (!podeBloquear(luta.eu)) return luta.falhar('no_stamina')

  await registrar(luta, { kind: 'BLOCK' })
}

/**
 * Bebe uma poção da mochila, gastando a rodada. O efeito vem do catálogo, não
 * do formulário, e o item sai da mochila quando a ação é guardada.
 */
export async function usarItemPvp(battleId: string, itemId: string): Promise<void> {
  const luta = await minhaLuta(battleId)
  const naMochila = await prisma.userItem.findUnique({
    where: { userId_itemId: { userId: luta.user.id, itemId } },
    include: { item: true },
  })
  if (!naMochila || naMochila.quantidade <= 0 || naMochila.item.tipo !== 'CONSUMIVEL') return luta.falhar('sem_item')
  const efeito = (naMochila.item.efeito ?? {}) as { vida?: number; energia?: number }

  await registrar(
    luta,
    {
      kind: 'ITEM',
      nome: naMochila.item.nome,
      vida: typeof efeito.vida === 'number' ? efeito.vida : undefined,
      energia: typeof efeito.energia === 'number' ? efeito.energia : undefined,
    },
    itemId
  )
}

/** As formas que o personagem de uma luta PvP pode liberar, pelo nível dele. */
async function formasDoLutador(userCharacterId: string): Promise<Record<string, TransformationDef>> {
  const uc = await prisma.userCharacter.findUnique({ where: { id: userCharacterId }, select: { characterId: true, level: true } })
  return uc ? getPlayerTransformations(uc.characterId, uc.level) : {}
}

/**
 * Libera uma forma. A que gasta a rodada vira a ação da rodada, como um golpe.
 *
 * A QUE NÃO GASTA (Bankai, Resurrección) entra na hora, como na luta contra a
 * IA: ela existe para ser liberada no meio da troca. A trava é a mesma da
 * ação guardada — mesma rodada, e a sua jogada ainda não enviada —, então a
 * rodada não pode resolver no meio da gravação: falta a sua ação.
 */
export async function liberarFormaPvp(battleId: string, transformationId: string): Promise<void> {
  const luta = await minhaLuta(battleId)
  const { eu, isHost, state, battle } = luta
  if (eu.activeTransformationId) return luta.falhar('already_transformed')

  const forma = (await formasDoLutador(luta.meuPersonagemId))[transformationId]
  if (!forma || forma.triggerType !== 'MANUAL') return luta.falhar('invalid_transformation')
  const falta = faltaParaAtivar(eu, forma)
  if (falta.energia > 0) return luta.falhar('insufficient_energy')
  if (falta.stamina > 0) return luta.falhar('insufficient_stamina')

  if (forma.consumesTurn !== false) {
    await registrar(luta, { kind: 'TRANSFORM', transformationId })
    return
  }

  const novoEstado = isHost ? comHeroi(state, ativarForma(eu, forma)) : comVilao(state, ativarForma(eu, forma))
  const gravou = await prisma.battle.updateMany({
    where: isHost
      ? { id: battle.id, turnNumber: battle.turnNumber, pendingHostAction: { equals: Prisma.DbNull } }
      : { id: battle.id, turnNumber: battle.turnNumber, pendingOpponentAction: { equals: Prisma.DbNull } },
    data: { state: novoEstado as unknown as Prisma.InputJsonValue },
  })
  if (gravou.count === 0) return luta.falhar('conflict')

  // O outro lado vê a forma na hora: o evento faz a página dele recarregar.
  revalidatePath(`/battle/pvp/${battle.id}`)
  publishPvpEvent(battle.id, { type: 'ACTION_SUBMITTED', byUserId: luta.user.id })
}

/** Resolve a rodada se — e só se — as duas ações estiverem registradas. */
async function maybeResolveRound(battleId: string): Promise<void> {
  const battle = await prisma.battle.findUnique({ where: { id: battleId } })
  if (!battle || battle.status !== 'ACTIVE') return
  if (battle.pendingHostAction === null || battle.pendingOpponentAction === null) return

  const [hostSkills, guestSkills, formasDoHost, formasDoConvidado] = await Promise.all([
    getEquippedSkills(battle.playerCharacterId),
    getEquippedSkills(battle.opponentCharacterId!),
    formasDoLutador(battle.playerCharacterId),
    formasDoLutador(battle.opponentCharacterId!),
  ])

  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  const hostAction = battle.pendingHostAction as unknown as PlayerAction
  const guestAction = battle.pendingOpponentAction as unknown as PlayerAction

  // O host é sempre o "player" do motor e o convidado o "enemy" — a tradução
  // pra perspectiva de cada jogador acontece só na leitura (getPvpBattleView).
  const { state: newState, turnResults } = resolveRound(
    state,
    { aliadas: [hostAction], inimigas: [guestAction] },
    {
      playerSkills: hostSkills,
      enemySkills: guestSkills,
      playerTransformations: formasDoHost,
      enemyTransformations: formasDoConvidado,
    }
  )

  const nextTurn = battle.turnNumber + 1
  const forcedEnd = newState.outcome === null && nextTurn > MAX_ROUNDS
  const finalState: BattleState = forcedEnd
    ? { ...newState, outcome: decideByHp(newState) }
    : newState
  const isFinished = finalState.outcome !== null

  const applied = await prisma.$transaction(async (tx) => {
    // Exigir as duas ações no where é o que impede dupla resolução quando os
    // dois submetem ao mesmo tempo.
    const advanced = await tx.battle.updateMany({
      where: {
        id: battleId,
        turnNumber: battle.turnNumber,
        pendingHostAction: { not: Prisma.DbNull },
        pendingOpponentAction: { not: Prisma.DbNull },
      },
      data: {
        state: finalState as unknown as Prisma.InputJsonValue,
        turnNumber: nextTurn,
        status: isFinished ? 'FINISHED' : 'ACTIVE',
        pendingHostAction: Prisma.DbNull,
        pendingOpponentAction: Prisma.DbNull,
      },
    })
    if (advanced.count === 0) return false

    const existing = await tx.turn.count({ where: { battleId } })
    let n = existing + 1
    for (const r of turnResults) {
      await tx.turn.create({
        data: {
          battleId,
          number: n++,
          round: battle.turnNumber,
          actor: r.side,
          skillId: skillIdDaColuna(r.skillId),
          result: r as unknown as Prisma.InputJsonValue,
        },
      })
    }

    if (isFinished) await awardPvpResults(tx, battle, finalState)
    return true
  })

  if (!applied) return

  // Mesma ordem da submissão: invalidar antes de notificar.
  revalidatePath(`/battle/pvp/${battleId}`)
  if (isFinished) {
    revalidatePath('/dashboard')
    revalidatePath('/status')
  }
  publishPvpEvent(battleId, { type: 'ROUND_RESOLVED', turnNumber: nextTurn })
  if (isFinished) publishPvpEvent(battleId, { type: 'BATTLE_FINISHED' })
}

function decideByHp(state: BattleState) {
  const p = heroi(state).maxHp > 0 ? heroi(state).currentHp / heroi(state).maxHp : 0
  const e = vilao(state).maxHp > 0 ? vilao(state).currentHp / vilao(state).maxHp : 0
  if (Math.abs(p - e) < 0.001) return 'DRAW' as const
  return p > e ? ('PLAYER_WIN' as const) : ('ENEMY_WIN' as const)
}

/** XP e vitória de PvP para os dois lados. */
async function awardPvpResults(
  tx: Prisma.TransactionClient,
  battle: { playerCharacterId: string; opponentCharacterId: string | null },
  finalState: BattleState
): Promise<void> {
  const rows = await tx.userCharacter.findMany({
    where: { id: { in: [battle.playerCharacterId, battle.opponentCharacterId!] } },
    select: { id: true, level: true, experience: true },
  })

  for (const uc of rows) {
    const isHost = uc.id === battle.playerCharacterId
    const won = finalState.outcome === (isHost ? 'PLAYER_WIN' : 'ENEMY_WIN')
    const draw = finalState.outcome === 'DRAW'
    const xp = draw ? Math.round((XP_ON_WIN + XP_ON_LOSS) / 2) : won ? XP_ON_WIN : XP_ON_LOSS
    const reward = applyExperience(uc.level, uc.experience, xp)

    await tx.userCharacter.update({
      where: { id: uc.id },
      data: {
        level: reward.level,
        experience: reward.experience,
        pointsAvailable: { increment: reward.pointsGained },
        ...(won ? { pvpWins: { increment: 1 } } : {}),
      },
    })
  }
}

/** Desistir: encerra a batalha dando a vitória ao adversário. */
export async function forfeitPvpBattle(battleId: string): Promise<void> {
  const user = await requireUser()
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, status: 'ACTIVE', opponentUserId: { not: null }, OR: [{ userId: user.id }, { opponentUserId: user.id }] },
  })
  if (!battle) redirect('/battle/pvp')

  const isHost = battle.userId === user.id
  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  const finalState: BattleState = { ...state, outcome: isHost ? 'ENEMY_WIN' : 'PLAYER_WIN' }

  await prisma.$transaction(async (tx) => {
    const done = await tx.battle.updateMany({
      where: { id: battleId, status: 'ACTIVE' },
      data: { status: 'FINISHED', state: finalState as unknown as Prisma.InputJsonValue },
    })
    if (done.count === 0) return
    await awardPvpResults(tx, battle, finalState)
  })

  publishPvpEvent(battleId, { type: 'OPPONENT_LEFT' })
  publishPvpEvent(battleId, { type: 'BATTLE_FINISHED' })
  redirect('/battle/pvp')
}

export type { TurnResult }
