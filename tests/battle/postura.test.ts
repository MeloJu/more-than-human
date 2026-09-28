import { describe, it, expect } from 'vitest'
import { comHeroi, comVilao, createInitialState, custoDaPostura, heroi, resolveRound, vilao } from '@/app/lib/battle/engine'
import { escolherPosturaDaIa } from '@/app/lib/battle/ai'
import { alcanceDe } from '@/app/lib/battle/alcance'
import { POSTURA_NEUTRA_REGEN, STAMINA_REGEN_PCT } from '@/app/lib/battle/constants'
import type { AcaoDeCombate, BaseStats, Postura, SkillDef } from '@/app/lib/battle/types'

/**
 * Posturas: como o combatente se move na rodada, junto com o golpe, pagas em
 * stamina. É o que dá à stamina um gasto em toda rodada — antes ela sobrava
 * e treiná-la não valia nada.
 */

const NUNCA_CRITA = () => 0.99
const SEMPRE = () => 0

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 1000,
  attack: 30,
  defense: 10,
  speed: 15,
  energy: 200,
  stamina: 200,
  ...over,
})

const golpe = (id: string, over: Partial<SkillDef> = {}): SkillDef => ({
  id,
  name: id,
  power: 40,
  energyCost: 0,
  cooldown: 0,
  effects: [],
  scalingStat: 'attack',
  tags: [],
  ...over,
})
const soco = golpe('soco', { alcance: 'CORPO' })
const feixe = golpe('feixe', { alcance: 'DISTANCIA' })
const explosao = golpe('explosao', { alcance: 'AREA' })

/** O inimigo ataca com `sk`; o herói fica na postura pedida e não ataca. */
function rodada(postura: Postura, sk: SkillDef, rand: () => number = NUNCA_CRITA, inimigoPostura: Postura = 'NEUTRA') {
  const s = createInitialState(stats(), stats())
  const aliadas: AcaoDeCombate[] = [{ kind: 'ATTACK', skillId: 'nada', postura }]
  return resolveRound(
    s,
    { aliadas, inimigas: [{ kind: 'ATTACK', skillId: sk.id, postura: inimigoPostura }] },
    { playerSkills: { nada: golpe('nada', { power: 0, effects: [] }) }, enemySkills: { [sk.id]: sk }, playerTransformations: {} },
    rand
  )
}
const danoNoHeroi = (r: ReturnType<typeof rodada>) => 1000 - heroi(r.state).currentHp

describe('custo', () => {
  it('é pago em stamina no início da rodada', () => {
    const r = rodada('GUARDA', feixe)
    expect(heroi(r.state).currentStamina).toBeLessThan(200)
  })

  it('é fixo para o nível, e não fração da reserva — é o que faz treinar stamina valer', () => {
    const pouca = heroi(createInitialState(stats({ stamina: 100 }), stats()))
    const muita = heroi(createInitialState(stats({ stamina: 400 }), stats()))
    expect(custoDaPostura(pouca, 'ESQUIVA')).toBe(custoDaPostura(muita, 'ESQUIVA'))
  })

  it('cresce com o nível, junto com a reserva', () => {
    const n1 = heroi(createInitialState(stats(), stats(), undefined, { player: 1 }))
    const n15 = heroi(createInitialState(stats(), stats(), undefined, { player: 15 }))
    expect(custoDaPostura(n15, 'APARAR')).toBeGreaterThan(custoDaPostura(n1, 'APARAR'))
  })

  it('sem stamina para a postura pedida, o combatente fica na neutra e ataca normalmente', () => {
    const s = comHeroi(createInitialState(stats(), stats()), { currentStamina: 0 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'soco', postura: 'APARAR' }], inimigas: [{ kind: 'ATTACK', skillId: 'soco' }] },
      { playerSkills: { soco }, enemySkills: { soco }, playerTransformations: {} },
      NUNCA_CRITA
    )
    expect(r.turnResults.some((t) => t.side === 'ENEMY' && t.aparou)).toBe(false)
    expect(r.turnResults.some((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')).toBe(true)
  })

  it('a neutra recupera stamina a mais', () => {
    const s = comHeroi(createInitialState(stats(), stats()), { currentStamina: 0 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { playerSkills: {}, enemySkills: {}, playerTransformations: {} },
      NUNCA_CRITA
    )
    expect(heroi(r.state).currentStamina).toBe(Math.round(200 * STAMINA_REGEN_PCT) + Math.round(200 * POSTURA_NEUTRA_REGEN))
  })
})

describe('esquiva', () => {
  it('pode fazer o golpe à distância passar longe', () => {
    const r = rodada('ESQUIVA', feixe, SEMPRE)
    expect(danoNoHeroi(r)).toBe(0)
    expect(r.turnResults.some((t) => t.esquivou)).toBe(true)
  })

  it('não serve contra golpe em área — não há para onde ir', () => {
    const r = rodada('ESQUIVA', explosao, SEMPRE)
    expect(danoNoHeroi(r)).toBeGreaterThan(0)
  })
})

describe('aparar', () => {
  it('anula o golpe corpo a corpo e responde com a força de quem aparou', () => {
    const r = rodada('APARAR', soco)
    expect(danoNoHeroi(r)).toBe(0)
    expect(vilao(r.state).currentHp).toBeLessThan(1000)
    expect(r.turnResults.some((t) => t.aparou)).toBe(true)
  })

  it('o contragolpe não depende da força do golpe aparado', () => {
    // Devolver fração do golpe deixava o fraco matar o titã com o próprio
    // golpe dele — ver APARAR_CONTRAGOLPE.
    const fraco = rodada('APARAR', soco)
    const forte = rodada('APARAR', golpe('pesado', { power: 400, alcance: 'CORPO' }))
    expect(1000 - vilao(forte.state).currentHp).toBe(1000 - vilao(fraco.state).currentHp)
  })

  it('contra golpe à distância, a stamina foi gasta à toa', () => {
    const r = rodada('APARAR', feixe)
    expect(danoNoHeroi(r)).toBeGreaterThan(0)
    expect(heroi(r.state).currentStamina).toBeLessThan(200)
  })
})

describe('guarda e ímpeto', () => {
  it('a guarda reduz o dano de qualquer alcance', () => {
    expect(danoNoHeroi(rodada('GUARDA', explosao))).toBeLessThan(danoNoHeroi(rodada('NEUTRA', explosao)))
    expect(danoNoHeroi(rodada('GUARDA', feixe))).toBeLessThan(danoNoHeroi(rodada('NEUTRA', feixe)))
  })

  it('no ímpeto, quem avança bate mais forte', () => {
    expect(danoNoHeroi(rodada('NEUTRA', feixe, NUNCA_CRITA, 'IMPETO'))).toBeGreaterThan(danoNoHeroi(rodada('NEUTRA', feixe)))
  })

  it('e quem está avançando apanha mais', () => {
    expect(danoNoHeroi(rodada('IMPETO', feixe))).toBeGreaterThan(danoNoHeroi(rodada('NEUTRA', feixe)))
  })
})

describe('domínio', () => {
  it('o acerto garantido vence a esquiva e o aparar', () => {
    const dominado = (postura: Postura) => {
      const s = comVilao(createInitialState(stats(), stats()), {
        statusEffects: [{ id: 'd', type: 'DOMAIN', magnitude: 1, remainingRounds: 3, sourceSkillName: 'Domínio' }],
        currentEnergy: 200,
      })
      return resolveRound(
        s,
        { aliadas: [{ kind: 'ATTACK', skillId: 'nada', postura }], inimigas: [{ kind: 'ATTACK', skillId: 'soco' }] },
        { playerSkills: { nada: golpe('nada', { power: 0 }) }, enemySkills: { soco }, playerTransformations: {} },
        SEMPRE
      )
    }
    expect(danoNoHeroi(dominado('ESQUIVA'))).toBeGreaterThan(0)
    expect(danoNoHeroi(dominado('APARAR'))).toBeGreaterThan(0)
  })
})

describe('alcance', () => {
  it('o ataque básico é corpo a corpo', () => {
    expect(alcanceDe(null)).toBe('CORPO')
  })

  it('o alcance gravado vence a dedução', () => {
    expect(alcanceDe(golpe('x', { category: 'HADO', alcance: 'AREA' }))).toBe('AREA')
  })

  it('deduz pela categoria e pelas tags', () => {
    expect(alcanceDe(golpe('x', { category: 'TAIJUTSU' }))).toBe('CORPO')
    expect(alcanceDe(golpe('x', { category: 'HADO' }))).toBe('DISTANCIA')
    expect(alcanceDe(golpe('x', { category: 'KI', tags: ['fisico'] }))).toBe('CORPO')
    expect(alcanceDe(golpe('x', { tags: ['dominio'] }))).toBe('AREA')
  })
})

describe('postura da IA', () => {
  const ia = (over = {}) => ({ ...heroi(createInitialState(stats(), stats())), ...over })

  it('com pouca stamina, fica na neutra para recuperar', () => {
    expect(escolherPosturaDaIa(ia({ currentStamina: 10 }), soco, undefined, {})).toBe('NEUTRA')
  })

  it('com o adversário quase caído, avança', () => {
    const quaseCaido = ia({ currentHp: 100 })
    expect(escolherPosturaDaIa(ia(), soco, quaseCaido, {})).toBe('IMPETO')
  })

  it('lendo um adversário de perto, apara', () => {
    expect(escolherPosturaDaIa(ia(), soco, ia(), { skillsDoOponente: [soco], rand: SEMPRE })).toBe('APARAR')
  })

  it('lendo um adversário que dispara, esquiva', () => {
    expect(escolherPosturaDaIa(ia(), soco, ia(), { skillsDoOponente: [feixe], rand: SEMPRE })).toBe('ESQUIVA')
  })
})
