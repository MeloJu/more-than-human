import { getBonusDeAtributos } from '@/app/lib/progression/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { applyTraits, computeFighterStats, sumStatBonuses, traitEnergyCostModifier } from './engine'
import { getCharacterTraits, getTreeBonus } from './queries'
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
