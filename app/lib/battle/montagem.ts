import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { getBonusDeAtributos } from '@/app/lib/progression/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import {
  applyTraits,
  comVilao,
  computeFighterStats,
  createInitialState,
  prepararTreinador,
  sumStatBonuses,
  traitEnergyCostModifier,
} from './engine'
import { getCharacterTraits, getTreeBonus, timeDoJogador, timeDoPersonagem } from './queries'
import type { BaseStats } from './types'

/**
 * A ficha com que o personagem do jogador entra numa luta.
 *
 * Fora do arquivo de actions de propósito: tudo que um arquivo 'use server'
 * exporta vira endpoint chamável pelo navegador, e montar a ficha de um
 * personagem qualquer não é algo que o navegador deva poder pedir. Batalha
 * avulsa, história e raid montam o jogador por aqui, então os três entram em
 * campo com a mesma conta.
 */
export async function fichaDoJogador(userCharacter: {
  id: string
  level: number
  character: { hp: number; attack: number; defense: number; speed: number; energy: number; stamina: number }
}): Promise<{ base: BaseStats; energyCostModifier: number }> {
  const [treeBonus, equipmentBonus, atributos, traits] = await Promise.all([
    getTreeBonus(userCharacter.id),
    getEquipmentBonus(userCharacter.id),
    getBonusDeAtributos(userCharacter.id),
    getCharacterTraits(userCharacter.id, userCharacter.level),
  ])
  // Traço entra DEPOIS de nível, árvore e equipamento: é o que o personagem é,
  // aplicado sobre tudo que ele conquistou.
  const base = applyTraits(
    computeFighterStats(userCharacter.character, userCharacter.level, sumStatBonuses(treeBonus, equipmentBonus, atributos)),
    traits
  )
  return { base, energyCostModifier: traitEnergyCostModifier(traits) }
}

/**
 * `level` é o nível com que o inimigo entra na luta: decide quanto as
 * habilidades dele custam (ver energyCostFor) e quais formas ele tem.
 * Monstro de raid usa 1 — os stats dele são fixos, sem escala por nível.
 */
export type EnemyRef =
  | { kind: 'character'; characterId: string; base: BaseStats; level: number }
  | { kind: 'monster'; monsterId: string; base: BaseStats; level: number }

// FORA DO ARQUIVO DE ACTIONS: morava em actions.ts, e tudo que um arquivo
// 'use server' exporta vira endpoint. Chamada direto do navegador, ela criava
// uma luta com o userId, o personagem e os atributos do inimigo que o
// chamador quisesse (um chefe de 1 de vida, até num estágio da história).
//
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
  /** O inimigo é chefe: o ABATE não o derruba de uma vez. */
  chefe?: boolean
}): Promise<never> {
  const jogador = await fichaDoJogador(params.userCharacter)
  const inicial = createInitialState(
    jogador.base,
    params.enemy.base,
    { player: jogador.energyCostModifier },
    { player: params.userCharacter.level, enemy: params.enemy.level }
  )
  let state = params.chefe ? comVilao(inicial, { chefe: true }) : inicial

  // Treinador (o Red) entra com o time em campo — o dele e o do inimigo.
  const [timeDoLadoJogador, timeDoInimigo] = await Promise.all([
    timeDoJogador(params.userCharacter.id),
    params.enemy.kind === 'character' ? timeDoPersonagem(params.enemy.characterId, params.enemy.level) : Promise.resolve([]),
  ])
  if (timeDoLadoJogador.length > 0) state = prepararTreinador(state, 'PLAYER', 0, timeDoLadoJogador)
  if (timeDoInimigo.length > 0) state = prepararTreinador(state, 'ENEMY', 0, timeDoInimigo)

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

