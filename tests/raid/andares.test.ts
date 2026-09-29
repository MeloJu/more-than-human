import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { comLutadores, createInitialState } from '@/app/lib/battle/engine'
import { avancar, comReservas, recompensaDaRaid, reservasDoTime, MOEDA_POR_NIVEL_NA_RAID } from '@/app/lib/raid/andares'
import { RAIDS, raidPorSlug } from '@/app/lib/raid/catalogo'
import type { BaseStats } from '@/app/lib/battle/types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { characters, novosPersonagens } = require('../../prisma/catalog/characters') as {
  characters: { name: string }[]
  novosPersonagens: { name: string }[]
}

/**
 * A raid por andares. O que ela tem de próprio é NÃO RESETAR: a party entra
 * em cada andar como saiu do anterior. Um erro aqui (curar sem querer entre
 * andares) apagaria a raid sem nenhuma tela perceber — por isso a regra tem
 * teste próprio.
 */

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 200,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 150,
  stamina: 100,
  ...over,
})

function party() {
  return comLutadores(createInitialState(stats(), stats()), 'PLAYER', [
    { base: stats(), nivel: 10, nome: 'Rukia' },
    { base: stats(), nivel: 10, nome: 'Orihime' },
  ])
}

describe('o que atravessa de um andar para o outro', () => {
  it('a party sai do andar como terminou a luta', () => {
    const fim = party()
    fim.aliados[0] = { ...fim.aliados[0], currentHp: 73, currentEnergy: 12, currentStamina: 40 }
    fim.aliados[2] = { ...fim.aliados[2], currentHp: 0 }
    const reservas = reservasDoTime(fim.aliados)
    expect(reservas[0]).toEqual({ hp: 73, energia: 12, stamina: 40 })
    expect(reservas[2].hp).toBe(0)
  })

  it('entra no andar seguinte SEM recuperar nada', () => {
    const reservas = [
      { hp: 73, energia: 12, stamina: 40 },
      { hp: 150, energia: 90, stamina: 100 },
      { hp: 0, energia: 30, stamina: 10 },
    ]
    const proximo = comReservas(party(), reservas)
    expect(proximo.aliados.map((c) => c.currentHp)).toEqual([73, 150, 0])
    expect(proximo.aliados[0].currentEnergy).toBe(12)
    expect(proximo.aliados[0].currentStamina).toBe(40)
  })

  it('quem caiu continua caído', () => {
    const proximo = comReservas(party(), [{ hp: 100, energia: 50, stamina: 50 }, { hp: 0, energia: 0, stamina: 0 }])
    expect(proximo.aliados[1].currentHp).toBe(0)
  })

  it('não passa do máximo de agora', () => {
    // Personagem que subiu de nível no meio da raid: o máximo cresceu, mas o
    // que ele tinha não. E valor gravado acima do máximo não vira vida extra.
    const proximo = comReservas(party(), [{ hp: 9999, energia: 9999, stamina: 9999 }])
    expect(proximo.aliados[0].currentHp).toBe(200)
    expect(proximo.aliados[0].currentEnergy).toBe(150)
    expect(proximo.aliados[0].currentStamina).toBe(100)
  })

  it('no primeiro andar, sem reservas, todo mundo entra inteiro', () => {
    const inteiro = party()
    expect(comReservas(inteiro, null)).toBe(inteiro)
  })

  it('não mexe no lado inimigo', () => {
    const e = party()
    expect(comReservas(e, [{ hp: 1, energia: 1, stamina: 1 }]).inimigos).toEqual(e.inimigos)
  })
})

describe('como a incursão anda', () => {
  it('vitória sobe um andar', () => {
    expect(avancar(0, 5, 'PLAYER_WIN')).toEqual({ status: 'ATIVA', andar: 1 })
  })

  it('vitória no último andar vence a raid', () => {
    expect(avancar(4, 5, 'PLAYER_WIN')).toEqual({ status: 'VENCIDA', andar: 4 })
  })

  it('derrota encerra a incursão no andar em que aconteceu', () => {
    expect(avancar(2, 5, 'ENEMY_WIN')).toEqual({ status: 'PERDIDA', andar: 2 })
  })

  it('empate também encerra: o andar não foi limpo', () => {
    expect(avancar(2, 5, 'DRAW')).toEqual({ status: 'PERDIDA', andar: 2 })
  })

  it('a recompensa da raid escala com o nível', () => {
    expect(recompensaDaRaid(10)).toBe(10 * MOEDA_POR_NIVEL_NA_RAID)
    expect(recompensaDaRaid(0)).toBe(MOEDA_POR_NIVEL_NA_RAID)
  })
})

describe('o catálogo de raids', () => {
  const personagens = new Set([...characters, ...novosPersonagens].map((c) => c.name))
  const seed = readFileSync('prisma/seed.js', 'utf8')

  it('slugs únicos, e cada raid se acha pelo slug', () => {
    const slugs = RAIDS.map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const r of RAIDS) expect(raidPorSlug(r.slug)).toBe(r)
  })

  it('todo andar tem inimigo, e o chefe fecha a raid', () => {
    for (const r of RAIDS) {
      for (const a of r.andares) expect(a.inimigos.length, a.nome).toBeGreaterThan(0)
      expect(r.andares.at(-1)?.chefe, r.nome).toBe(true)
    }
  })

  it('todo inimigo existe no catálogo, pelo nome', () => {
    for (const r of RAIDS) {
      for (const a of r.andares) {
        for (const i of a.inimigos) {
          if ('monstro' in i) expect(seed, i.monstro).toContain(`name: '${i.monstro}'`)
          else expect(personagens.has(i.personagem), i.personagem).toBe(true)
        }
      }
    }
  })

  it('o chefe de Las Noches entra com a Pantera liberada', () => {
    // A Pantera é a fase 2 do Grimmjow e exige nível 12 (transformations.js).
    const chefe = raidPorSlug('las-noches')?.andares.at(-1)?.inimigos[0]
    expect(chefe && 'personagem' in chefe ? chefe.nivel : 0).toBeGreaterThanOrEqual(12)
  })
})
