import { prisma } from '@/app/lib/prisma'
import { SEM_BONUS, computeBaseStats, hasBattleValue } from './engine'
import { getEquipmentGrantedSkills } from '@/app/lib/equipment/queries'
import { NORMAL_BATTLE_XP_MULTIPLIER } from './constants'
import { escolherLoadoutPadrao } from './ai'
import { getLoadoutSlotCount } from '@/app/lib/progression/constants'
import type { BaseStats, ScalingStat, SkillDef, SkillEffect, StatBonus, TraitDef, TransformationDef } from './types'
import type { ScalingStat as PrismaScalingStat } from '@prisma/client'

function parseEffects(json: unknown): SkillEffect[] {
  return Array.isArray(json) ? (json as SkillEffect[]) : []
}

/**
 * O enum do Prisma é MAIÚSCULO e o motor fala minúsculo, igual ao tipo Stat
 * que getCombatStat indexa. A tradução mora aqui, na borda, para que o motor
 * continue sem saber que existe banco.
 */
const SCALING_STAT_DO_BANCO: Record<PrismaScalingStat, ScalingStat> = {
  ATTACK: 'attack',
  DEFENSE: 'defense',
  SPEED: 'speed',
  ENERGY: 'energy',
}

export function toSkillDef(skill: {
  id: string
  name: string
  power: number
  energyCost: number
  cooldown: number
  precision?: number
  description?: string | null
  effects: unknown
  tags: unknown
  category?: string
  scalingStat: PrismaScalingStat
}): SkillDef {
  return {
    id: skill.id,
    name: skill.name,
    power: skill.power,
    energyCost: skill.energyCost,
    precision: skill.precision,
    cooldown: skill.cooldown,
    description: skill.description ?? undefined,
    effects: parseEffects(skill.effects),
    category: skill.category,
    // Json sem garantia de forma: só entram as strings.
    tags: Array.isArray(skill.tags) ? skill.tags.filter((t): t is string => typeof t === 'string') : [],
    scalingStat: SCALING_STAT_DO_BANCO[skill.scalingStat],
  }
}

export function toTransformationDef(t: {
  id: string
  name: string
  levelRequirement: number
  energyModifier: number
  attackModifier: number
  defenseModifier: number
  speedModifier: number
  flatHpBonus: number
  flatAttackBonus: number
  flatDefenseBonus: number
  flatSpeedBonus: number
  drainPerTurn: number
  drainHpPerTurn: number
  consumesTurn: boolean
  activationCost: number
  triggerType: string
  triggerPayload: unknown
}): TransformationDef {
  return {
    id: t.id,
    name: t.name,
    levelRequirement: t.levelRequirement,
    energyModifier: t.energyModifier,
    attackModifier: t.attackModifier,
    defenseModifier: t.defenseModifier,
    speedModifier: t.speedModifier,
    flatHpBonus: t.flatHpBonus,
    flatAttackBonus: t.flatAttackBonus,
    flatDefenseBonus: t.flatDefenseBonus,
    flatSpeedBonus: t.flatSpeedBonus,
    drainPerTurn: t.drainPerTurn,
    drainHpPerTurn: t.drainHpPerTurn,
    consumesTurn: t.consumesTurn,
    activationCost: t.activationCost,
    triggerType: t.triggerType as TransformationDef['triggerType'],
    triggerPayload: t.triggerPayload,
  }
}

/**
 * Traços passivos do personagem por trás deste UserCharacter, filtrados pelo
 * nível dele.
 *
 * A consulta parte do UserCharacter de propósito, para que nenhum chamador
 * precise passar characterId junto — traço é sempre "o que este personagem é",
 * e quem já tem o UserCharacter já sabe disso implicitamente.
 */
export async function getCharacterTraits(userCharacterId: string, level: number): Promise<TraitDef[]> {
  const traits = await prisma.trait.findMany({
    where: {
      levelRequirement: { lte: level },
      character: { userCharacters: { some: { id: userCharacterId } } },
    },
  })
  return traits.map((t) => ({
    name: t.name,
    energyModifier: t.energyModifier,
    attackModifier: t.attackModifier,
    defenseModifier: t.defenseModifier,
    speedModifier: t.speedModifier,
    flatHpBonus: t.flatHpBonus,
    flatAttackBonus: t.flatAttackBonus,
    flatDefenseBonus: t.flatDefenseBonus,
    flatSpeedBonus: t.flatSpeedBonus,
    energyCostModifier: t.energyCostModifier,
  }))
}

export async function getTreeBonus(userCharacterId: string): Promise<StatBonus> {
  const unlocks = await prisma.userSkillUnlock.findMany({ where: { userCharacterId }, include: { node: true } })
  return unlocks.reduce<StatBonus>(
    (acc, u) => ({
      ...acc,
      hp: acc.hp + u.node.flatHpBonus,
      attack: acc.attack + u.node.flatAttackBonus,
      defense: acc.defense + u.node.flatDefenseBonus,
      speed: acc.speed + u.node.flatSpeedBonus,
    }),
    { ...SEM_BONUS }
  )
}

export async function getEligiblePlayerSkills(userCharacterId: string, characterId: string, level: number): Promise<Record<string, SkillDef>> {
  const [levelSkills, treeUnlocks, granted] = await Promise.all([
    prisma.characterSkill.findMany({ where: { characterId, requiredLevel: { lte: level } }, include: { skill: true } }),
    prisma.userSkillUnlock.findMany({ where: { userCharacterId }, include: { node: { include: { skill: true } } } }),
    // Recompensas do modo história: pertencem a este UserCharacter, não ao
    // personagem do catálogo, então não podem vir de characterSkill.
    prisma.userCharacterSkill.findMany({ where: { userCharacterId }, include: { skill: true } }),
  ])
  const skills: Record<string, SkillDef> = {}
  for (const cs of levelSkills) {
    if (hasBattleValue(cs.skill)) skills[cs.skill.id] = toSkillDef(cs.skill)
  }
  for (const unlock of treeUnlocks) {
    const skill = unlock.node.skill
    if (skill && hasBattleValue(skill)) skills[skill.id] = toSkillDef(skill)
  }
  for (const g of granted) {
    if (hasBattleValue(g.skill)) skills[g.skill.id] = toSkillDef(g.skill)
  }
  return skills
}

/**
 * Habilidades com que um personagem controlado pela IA entra em batalha.
 *
 * FILTRA POR NÍVEL e LIMITA A QUANTIDADE. Antes não fazia nem uma coisa nem
 * outra: buscava todas as linhas de CharacterSkill do personagem, então um
 * inimigo de nível 2 chegava com o arsenal completo que teria no nível 40,
 * contra um jogador que leva 4 habilidades no loadout. Ver
 * escolherLoadoutPadrao para o porquê do teto e para a queixa de "a IA não tem
 * cooldown", que era sintoma disto.
 *
 * O teto usa a MESMA regra de slots do jogador, aplicada ao nível do inimigo:
 * ninguém entra em campo com mais opções do que o outro lado poderia levar.
 */
export async function getEnemySkills(characterId: string, level: number): Promise<Record<string, SkillDef>> {
  const rows = await prisma.characterSkill.findMany({
    where: { characterId, requiredLevel: { lte: level } },
    include: { skill: true },
  })
  const usaveis = rows.map((cs) => cs.skill).filter(hasBattleValue).map(toSkillDef)
  const skills: Record<string, SkillDef> = {}
  for (const s of escolherLoadoutPadrao(usaveis, getLoadoutSlotCount(level))) skills[s.id] = s
  return skills
}

export async function getMonsterSkills(monsterId: string): Promise<Record<string, SkillDef>> {
  const rows = await prisma.monsterSkill.findMany({ where: { monsterId }, include: { skill: true } })
  const skills: Record<string, SkillDef> = {}
  for (const ms of rows) {
    if (hasBattleValue(ms.skill)) skills[ms.skill.id] = toSkillDef(ms.skill)
  }
  return skills
}

/** Only the subset of the eligible pool the player has equipped for battle (see app/lib/progression). */
export async function getEquippedSkills(userCharacterId: string): Promise<Record<string, SkillDef>> {
  const [rows, equipmentSkills] = await Promise.all([
    prisma.userCharacterEquippedSkill.findMany({ where: { userCharacterId }, include: { skill: true } }),
    getEquipmentGrantedSkills(userCharacterId),
  ])
  const skills: Record<string, SkillDef> = {}
  for (const row of rows) {
    if (hasBattleValue(row.skill)) skills[row.skill.id] = toSkillDef(row.skill)
  }
  // Vêm depois de propósito: a skill do equipamento se soma ao loadout em vez
  // de disputar um dos 4 slots com ele.
  for (const skill of equipmentSkills) {
    if (hasBattleValue(skill)) skills[skill.id] = toSkillDef(skill)
  }
  return skills
}

/**
 * Resolves "who is the enemy" for an already-created Battle row, which may
 * point at either a Character (regular AI battle) or a Monster (raid) -
 * exactly one of enemyCharacterId/enemyMonsterId is set. Shared by the
 * server actions and the arena page so neither has to duplicate the branch.
 */
/**
 * Nível em que o inimigo desta batalha luta.
 *
 * História dita o nível no próprio estágio; batalha contra IA escala o inimigo
 * pelo nível do jogador (ver startAiBattle). Sem isto, getEnemySkills não teria
 * como filtrar o arsenal.
 */
async function enemyLevelFor(battle: {
  storyStageId?: string | null
  playerCharacterId?: string | null
}): Promise<number> {
  if (battle.storyStageId) {
    const stage = await prisma.storyStage.findUnique({
      where: { id: battle.storyStageId },
      select: { enemyLevel: true },
    })
    if (stage) return stage.enemyLevel
  }
  if (battle.playerCharacterId) {
    const uc = await prisma.userCharacter.findUnique({
      where: { id: battle.playerCharacterId },
      select: { level: true },
    })
    if (uc) return uc.level
  }
  return 1
}

export async function loadEnemyProfile(
  battle: {
    enemyCharacterId: string | null
    enemyMonsterId: string | null
    storyStageId?: string | null
    playerCharacterId?: string | null
  }
): Promise<{ name: string; imageUrl: string | null; corDestaque: string | null; corSecundaria: string | null; stats: BaseStats; skills: Record<string, SkillDef>; xpMultiplier: number } | null> {
  if (battle.enemyCharacterId) {
    const character = await prisma.character.findUnique({ where: { id: battle.enemyCharacterId } })
    if (!character) return null
    return {
      name: character.name,
      imageUrl: character.imageUrl,
      corDestaque: character.corDestaque,
      corSecundaria: character.corSecundaria,
      stats: computeBaseStats(character, SEM_BONUS),
      skills: await getEnemySkills(character.id, await enemyLevelFor(battle)),
      xpMultiplier: NORMAL_BATTLE_XP_MULTIPLIER,
    }
  }
  if (battle.enemyMonsterId) {
    const monster = await prisma.monster.findUnique({ where: { id: battle.enemyMonsterId } })
    if (!monster) return null
    return {
      name: monster.name,
      imageUrl: monster.imageUrl,
      // Monstro nao tem cor propria: cai no --accent do tema. Tier ja e o
      // eixo de identidade deles, nao a cor.
      corDestaque: null,
      corSecundaria: null,
      stats: computeBaseStats(monster, SEM_BONUS),
      skills: await getMonsterSkills(monster.id),
      xpMultiplier: monster.tier,
    }
  }
  return null
}

export async function getPlayerTransformations(characterId: string, level: number): Promise<Record<string, TransformationDef>> {
  const rows = await prisma.transformation.findMany({ where: { characterId, levelRequirement: { lte: level } } })
  const result: Record<string, TransformationDef> = {}
  for (const t of rows) result[t.id] = toTransformationDef(t)
  return result
}

/**
 * Everything the arena page (app/battle/ai/[battleId]) needs to render: the
 * Battle row (ownership-checked against userId first), the player's
 * UserCharacter, the resolved enemy profile, and the turn log. Returns null
 * on either failure mode - not found, or not yours, or a dangling FK - so the
 * page can just call notFound() without knowing which case it was.
 */
export async function getBattleView(battleId: string, userId: string) {
  const battle = await prisma.battle.findFirst({ where: { id: battleId, userId } })
  if (!battle) return null

  const [userCharacter, enemy, turns] = await Promise.all([
    prisma.userCharacter.findUnique({ where: { id: battle.playerCharacterId }, include: { character: true } }),
    loadEnemyProfile(battle),
    prisma.turn.findMany({ where: { battleId }, orderBy: { number: 'desc' } }),
  ])
  if (!userCharacter || !enemy) return null

  return { battle, userCharacter, enemy, turns }
}

