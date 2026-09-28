import { describe, it, expect } from 'vitest'
import { seededRandom, simulateBattle, winRate, type Combatente } from './simulate'
import type { BaseStats, SkillDef } from '@/app/lib/battle/types'

const stats = (o: Partial<BaseStats> = {}): BaseStats => ({
  hp: 130, attack: 18, defense: 11, speed: 12, energy: 100, stamina: 90, ...o,
})
const semSkills: SkillDef[] = []

describe('seededRandom', () => {
  it('mesma semente devolve a mesma sequência', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('sementes diferentes divergem', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)())
  })

  it('devolve valores entre 0 e 1', () => {
    const r = seededRandom(7)
    for (let i = 0; i < 50; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('simulateBattle', () => {
  const forte: Combatente = { stats: stats({ attack: 60 }), skills: semSkills }
  const fraco: Combatente = { stats: stats({ hp: 40, attack: 5, defense: 0 }), skills: semSkills }

  it('é determinístico: mesma semente, mesmo resultado', () => {
    expect(simulateBattle(forte, fraco, 99)).toEqual(simulateBattle(forte, fraco, 99))
  })

  it('quem tem vantagem esmagadora vence', () => {
    expect(simulateBattle(forte, fraco, 1).outcome).toBe('PLAYER_WIN')
  })

  it('quem está em desvantagem esmagadora perde', () => {
    expect(simulateBattle(fraco, forte, 1).outcome).toBe('ENEMY_WIN')
  })

  it('sempre termina, e dentro do teto de rodadas', () => {
    const r = simulateBattle(forte, fraco, 5)
    expect(r.outcome).not.toBeNull()
    expect(r.rodadas).toBeGreaterThan(0)
    expect(r.rodadas).toBeLessThanOrEqual(50)
  })

  it('espelhamento perfeito não favorece ninguém de forma absurda', () => {
    // Mesmos stats dos dois lados. O empate de velocidade favorece o jogador,
    // mas as posturas (esquiva, aparar) põem leitura e sorte na luta, então
    // o espelho fica perto do meio — nunca num extremo.
    const wr = winRate({ stats: stats(), skills: semSkills }, { stats: stats(), skills: semSkills }, 100)
    expect(wr).toBeGreaterThan(0.3)
    expect(wr).toBeLessThan(0.9)
  })
})

describe('winRate', () => {
  // QUASE SEMPRE, e não sempre: aparar e esquivar deixam o fraco salvar uma
  // luta de vez em quando, lendo o golpe três rodadas seguidas. Esse é o
  // ponto das posturas; o que não pode é virar a regra.
  it('vantagem esmagadora vence quase sempre', () => {
    const forte: Combatente = { stats: stats({ attack: 200 }), skills: semSkills }
    const fraco: Combatente = { stats: stats({ hp: 20, defense: 0 }), skills: semSkills }
    expect(winRate(forte, fraco, 100)).toBeGreaterThanOrEqual(0.85)
  })

  it('desvantagem esmagadora perde quase sempre', () => {
    const forte: Combatente = { stats: stats({ attack: 200 }), skills: semSkills }
    const fraco: Combatente = { stats: stats({ hp: 20, defense: 0 }), skills: semSkills }
    expect(winRate(fraco, forte, 100)).toBeLessThanOrEqual(0.15)
  })
})
