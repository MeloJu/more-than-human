import { describe, it, expect } from 'vitest'
import { applyTransformation, createInitialState, heroi, isLegalMove } from '@/app/lib/battle/engine'
import { pickAiSkill } from '@/app/lib/battle/ai'
import type { BaseStats, SkillDef, TransformationDef } from '@/app/lib/battle/types'
/* eslint-disable @typescript-eslint/no-require-imports */
const { aposentadas } = require('../../prisma/catalog/aposentadas') as { aposentadas: { skill: string }[] }
const { kits } = require('../../prisma/catalog/kits') as { kits: { skills: { skill: string }[] }[] }
const { signatures } = require('../../prisma/catalog/signatures') as { signatures: { skills: { name: string }[] }[] }
const { jujutsuKits } = require('../../prisma/catalog/jujutsu') as { jujutsuKits: { skills: { name: string }[] }[] }
const { transformations } = require('../../prisma/catalog/transformations') as {
  transformations: { character: string; name: string; golpes?: { name: string }[] }[]
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Golpe da forma: a habilidade só existe com a forma ativa. Antes o Byakuya
 * lançava o Senbonzakura Kageyoshi sem nunca liberar o Bankai.
 */

const stats = (): BaseStats => ({ hp: 200, attack: 20, defense: 10, speed: 15, energy: 200, stamina: 200 })

const bankai: TransformationDef = {
  id: 'bankai',
  name: 'Bankai: Senbonzakura Kageyoshi',
  levelRequirement: 1,
  energyModifier: 0,
  attackModifier: 0.3,
  defenseModifier: 0,
  speedModifier: 0,
  flatHpBonus: 0,
  flatAttackBonus: 0,
  flatDefenseBonus: 0,
  flatSpeedBonus: 0,
  drainPerTurn: 0,
  triggerType: 'MANUAL',
  triggerPayload: null,
}

const kageyoshi: SkillDef = {
  id: 'kageyoshi',
  name: 'Senbonzakura Kageyoshi',
  power: 30,
  energyCost: 0,
  cooldown: 0,
  effects: [],
  scalingStat: 'energy',
  tags: [],
  requerForma: 'bankai',
  requerFormaNome: bankai.name,
}
const shukumei: SkillDef = { ...kageyoshi, id: 'shukumei', name: 'Shukumei', power: 20, requerForma: undefined, requerFormaNome: undefined }

describe('golpe da forma', () => {
  it('não pode ser usado sem a forma', () => {
    const c = { ...heroi(createInitialState(stats(), stats())), currentEnergy: 200 }
    expect(isLegalMove(c, kageyoshi)).toBe(false)
  })

  it('com a forma ativa, pode', () => {
    const c = { ...applyTransformation(heroi(createInitialState(stats(), stats())), bankai), currentEnergy: 200 }
    expect(isLegalMove(c, kageyoshi)).toBe(true)
  })

  it('a IA não escolhe golpe de forma que ela não liberou', () => {
    const c = { ...heroi(createInitialState(stats(), stats())), currentEnergy: 200 }
    expect(pickAiSkill(c, [kageyoshi, shukumei])).toBe('shukumei')
  })
})

describe('catálogo', () => {
  const nomesNosKits = new Set([
    ...kits.flatMap((k) => k.skills.map((s) => s.skill)),
    ...signatures.flatMap((k) => k.skills.map((s) => s.name)),
    ...jujutsuKits.flatMap((k) => k.skills.map((s) => s.name)),
  ])

  it('habilidade aposentada não volta por um catálogo de kit', () => {
    // O sync recria vínculo a partir destes catálogos; se uma aposentada
    // estiver aqui, ela é apagada e recriada a cada execução.
    for (const a of aposentadas) expect(nomesNosKits.has(a.skill), a.skill).toBe(false)
  })

  it('as cinco formas que eram habilidade existem', () => {
    const nomes = transformations.map((t) => `${t.character} · ${t.name}`)
    expect(nomes).toEqual(
      expect.arrayContaining([
        'Goku · Kaioken',
        'Naruto Uzumaki · Manto de Chakra da Kurama',
        'Sasuke Uchiha · Sharingan',
        'Mahito · Corpo Espiritual Instantâneo da Morte Distorcida',
        'Kenpachi Zaraki · Sem o Tapa-Olho',
      ])
    )
  })
})
