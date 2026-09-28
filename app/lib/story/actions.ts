'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { SEM_BONUS, applyBossOverrides, computeBaseStats, scaleForLevel } from '@/app/lib/battle/engine'
import { createBattleAndRedirect } from '@/app/lib/battle/actions'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { getStageForUser } from './queries'

/**
 * Chamado quando uma batalha termina em vitória. Se ela veio de um estágio do
 * modo história, registra o progresso e paga a moeda.
 *
 * A moeda só é creditada na PRIMEIRA vez. Rejogar um estágio continua valendo
 * o XP normal da batalha, mas não a recompensa — senão o estágio mais rentável
 * viraria uma torneira infinita de dinheiro.
 */
export async function recordStoryProgress(battleId: string): Promise<void> {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    select: {
      userId: true,
      playerCharacterId: true,
      storyStageId: true,
      storyStage: { select: { coinReward: true } },
    },
  })
  if (!battle?.storyStageId) return

  await prisma.$transaction(async (tx) => {
    // createMany + skipDuplicates em vez de upsert para saber, pela contagem,
    // se esta foi mesmo a primeira conclusão — um upsert não distingue.
    const inserted = await tx.userStoryProgress.createMany({
      // O personagem que lutou é quem conclui. Antes gravava só o userId, o
      // que fazia o progresso valer para a conta inteira.
      data: [{ userId: battle.userId, userCharacterId: battle.playerCharacterId, stageId: battle.storyStageId! }],
      skipDuplicates: true,
    })
    if (inserted.count === 0) return

    const coins = battle.storyStage?.coinReward ?? 0
    if (coins > 0) {
      await tx.user.update({ where: { id: battle.userId }, data: { coins: { increment: coins } } })
    }
  })
}

export async function startStoryBattle(stageId: string): Promise<never> {
  const user = await requireUser()

  const userCharacter = await getSelectedCharacter(user.id)
  if (!userCharacter) redirect('/select')

  const found = await getStageForUser(stageId, userCharacter.id)
  if (!found) redirect('/story?error=not_found')
  // Revalidado no servidor de propósito: a UI já esconde estágios bloqueados,
  // mas a action é alcançável por POST direto.
  if (found.locked) redirect('/story?error=locked')

  const existing = await prisma.battle.findFirst({
    where: { userId: user.id, playerCharacterId: userCharacter.id, status: 'ACTIVE' },
    select: { id: true },
  })
  if (existing) redirect(`/battle/ai/${existing.id}`)

  const { stage } = found
  const enemy = stage.enemyCharacter ?? stage.enemyMonster
  if (!enemy) redirect('/story?error=not_found')
  // O chefe pode ter atributos próprios — ver o comentário de bossHp em
  // schema.prisma para por que ele não é obrigado a ser o personagem jogável.
  const enemyBase = applyBossOverrides(
    computeBaseStats(scaleForLevel(enemy, stage.enemyLevel), SEM_BONUS),
    stage
  )

  return createBattleAndRedirect({
    userId: user.id,
    userCharacter,
    enemy: stage.enemyCharacterId
      ? { kind: 'character', characterId: stage.enemyCharacterId, base: enemyBase, level: stage.enemyLevel }
      : { kind: 'monster', monsterId: stage.enemyMonsterId!, base: enemyBase, level: stage.enemyLevel },
    storyStageId: stage.id,
  })
}
