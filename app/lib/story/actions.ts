'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { SEM_BONUS, applyBossOverrides, computeBaseStats, scaleForLevel } from '@/app/lib/battle/engine'
import { createBattleAndRedirect } from '@/app/lib/battle/montagem'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { getStageForUser } from './queries'


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
    // Estágio com atributos de chefe é luta de chefe.
    chefe: stage.bossHp != null,
  })
}
