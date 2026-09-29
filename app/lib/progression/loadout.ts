import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { getEligiblePlayerSkills } from '@/app/lib/battle/queries'
import { escolherLoadoutPadrao } from '@/app/lib/battle/ai'
import { getLoadoutSlotCount } from './constants'

/*
  FORA DO ARQUIVO DE ACTIONS: morava em progression/actions.ts, exportada de
  um arquivo 'use server' — ou seja, qualquer navegador podia chamá-la com o
  personagem e o NÍVEL que quisesse, e equipar habilidades acima do próprio
  nível (ou mexer no loadout de outra conta).
*/

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Fills empty loadout slots with newly-eligible-but-unequipped skills, up to
 * the cap. Never touches slots that are already occupied - this only backfills
 * gaps. Called after character creation, level-up, and skill tree unlocks so
 * the player is never left with fewer usable moves than they're entitled to.
 *
 * `db` defaults to the top-level client, matching the two standalone call
 * sites below (unlockSkillNode, and the post-battle level-up check in
 * battle/actions.ts). Passing an interactive-transaction client instead (as
 * createCharacter does, to make character creation atomic) skips the
 * internal `$transaction` batch below — Prisma doesn't support nesting one
 * transaction inside another — and just awaits the creates in sequence,
 * which is already atomic by virtue of the caller's own transaction.
 */
export async function autoFillLoadout(userCharacterId: string, characterId: string, level: number, db: Db = prisma): Promise<void> {
  const [eligible, equipped] = await Promise.all([
    getEligiblePlayerSkills(userCharacterId, characterId, level),
    db.userCharacterEquippedSkill.findMany({ where: { userCharacterId } }),
  ])

  const usedSlots = new Set(equipped.map((e) => e.slot))
  const freeSlots: number[] = []
  for (let slot = 0; slot < getLoadoutSlotCount(level); slot++) {
    if (!usedSlots.has(slot)) freeSlots.push(slot)
  }
  if (freeSlots.length === 0) return

  const equippedSkillIds = new Set(equipped.map((e) => e.skillId))
  const candidates = Object.values(eligible).filter((skill) => !equippedSkillIds.has(skill.id))
  if (candidates.length === 0) return

  // Mesma regra que monta o arsenal do inimigo. Antes isto era
  // Object.keys(...).slice(), ou seja, as primeiras que o banco devolvesse:
  // o jogador começava com quatro habilidades quaisquer, e podia perfeitamente
  // não ter o próprio golpe principal equipado.
  const creates = escolherLoadoutPadrao(candidates, freeSlots.length)
    .map((s) => s.id)
    .map((skillId, i) => db.userCharacterEquippedSkill.create({ data: { userCharacterId, skillId, slot: freeSlots[i] } }))

  if (db === prisma) {
    await prisma.$transaction(creates)
  } else {
    for (const c of creates) await c
  }
}

