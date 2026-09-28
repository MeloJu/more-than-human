'use server'

import { redirect } from 'next/navigation'
import { bonusDeAtributos } from '@/app/lib/progression/atributos'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import {
  computeFighterStats,
  createInitialState,
  heroi,
  isLegalMove,
  migrarEstado,
  resolveRound,
  sumStatBonuses,
  vilao,
} from '@/app/lib/battle/engine'
import { getEquippedSkills, getTreeBonus } from '@/app/lib/battle/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { applyExperience } from '@/app/lib/battle/leveling'
import { MAX_ROUNDS, PVP_LEVEL_RANGE, XP_ON_LOSS, XP_ON_WIN } from '@/app/lib/battle/constants'
import { publishPvpEvent } from './events'
import type { BattleState, PlayerAction, TurnResult, BattleStateGravado} from '@/app/lib/battle/types'

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

  const state = createInitialState(hostFighter.base, guestFighter.base, undefined, {
    player: hostFighter.uc.level,
    enemy: guestFighter.uc.level,
  })

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
 * Submete a ação da rodada. Turno é SIMULTÂNEO: guarda a escolha e só resolve
 * quando a do adversário também chegou — assim ninguém joga vendo a jogada do
 * outro.
 *
 * A resolução é disparada por quem submeter por último, dentro de uma
 * transação que exige que as duas ações ainda estejam lá. Se os dois
 * submeterem ao mesmo tempo, só uma transação encontra o par e resolve; a
 * outra não faz nada, em vez de resolver a rodada duas vezes.
 */
export async function submitPvpAction(battleId: string, skillId: string | null): Promise<void> {
  const user = await requireUser()

  const battle = await prisma.battle.findFirst({
    where: { id: battleId, status: 'ACTIVE', opponentUserId: { not: null }, OR: [{ userId: user.id }, { opponentUserId: user.id }] },
  })
  if (!battle) redirect('/battle/pvp?error=not_found')

  const isHost = battle.userId === user.id
  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  const myCombatant = isHost ? heroi(state) : vilao(state)
  const myCharacterId = isHost ? battle.playerCharacterId : battle.opponentCharacterId!

  const mySkills = await getEquippedSkills(myCharacterId)
  const chosen = skillId ? mySkills[skillId] ?? null : null
  if (skillId && !chosen) redirect(`/battle/pvp/${battleId}?error=invalid_skill`)
  if (!isLegalMove(myCombatant, chosen)) redirect(`/battle/pvp/${battleId}?error=illegal_move`)

  const action: PlayerAction = { kind: 'ATTACK', skillId }

  // Prisma.DbNull (e não null) é o "é NULL no banco" para coluna Json — com
  // null puro o filtro é rejeitado. Exigir que o campo ainda esteja vazio é o
  // que impede reenviar a ação e sobrescrever a escolha já feita na rodada.
  const stored = await prisma.battle.updateMany({
    where: isHost
      ? { id: battleId, turnNumber: battle.turnNumber, pendingHostAction: { equals: Prisma.DbNull } }
      : { id: battleId, turnNumber: battle.turnNumber, pendingOpponentAction: { equals: Prisma.DbNull } },
    data: isHost
      ? { pendingHostAction: action as unknown as Prisma.InputJsonValue }
      : { pendingOpponentAction: action as unknown as Prisma.InputJsonValue },
  })
  if (stored.count === 0) redirect(`/battle/pvp/${battleId}?error=already_submitted`)

  // Invalidar ANTES de avisar: o evento faz o outro jogador buscar a página de
  // novo, e se o cache ainda estiver quente ele recebe o estado anterior — o
  // aviso chega, mas a tela não muda.
  revalidatePath(`/battle/pvp/${battleId}`)
  publishPvpEvent(battleId, { type: 'ACTION_SUBMITTED', byUserId: user.id })

  await maybeResolveRound(battleId)
}

/** Resolve a rodada se — e só se — as duas ações estiverem registradas. */
async function maybeResolveRound(battleId: string): Promise<void> {
  const battle = await prisma.battle.findUnique({ where: { id: battleId } })
  if (!battle || battle.status !== 'ACTIVE') return
  if (battle.pendingHostAction === null || battle.pendingOpponentAction === null) return

  const [hostSkills, guestSkills] = await Promise.all([
    getEquippedSkills(battle.playerCharacterId),
    getEquippedSkills(battle.opponentCharacterId!),
  ])

  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  const hostAction = battle.pendingHostAction as unknown as PlayerAction
  const guestAction = battle.pendingOpponentAction as unknown as { skillId: string | null }

  // O host é sempre o "player" do motor e o convidado o "enemy" — a tradução
  // pra perspectiva de cada jogador acontece só na leitura (getPvpBattleView).
  const { state: newState, turnResults } = resolveRound(
    state,
    { aliadas: [hostAction], inimigas: [{ kind: 'ATTACK', skillId: guestAction.skillId }] },
    { playerSkills: hostSkills, enemySkills: guestSkills, playerTransformations: {} }
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
          skillId: r.skillId,
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
