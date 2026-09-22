import { describe, it, expect } from 'vitest'
import { NIVEL_MINIMO_POR_TIER, nivelMinimoDoTier, tierLiberado } from '@/app/lib/battle/raid'

describe('nivelMinimoDoTier', () => {
  it('devolve o nível mapeado de cada tier', () => {
    expect(nivelMinimoDoTier(1)).toBe(1)
    expect(nivelMinimoDoTier(2)).toBe(3)
    expect(nivelMinimoDoTier(3)).toBe(5)
    expect(nivelMinimoDoTier(4)).toBe(8)
  })

  it('tier desconhecido cai no MAIS ALTO mapeado, não no mais baixo', () => {
    // Um monstro tier 9 entrando no catálogo antes de alguém pensar no portão
    // dele fica trancado para nível baixo, em vez de liberado para todos.
    expect(nivelMinimoDoTier(9)).toBe(8)
    expect(tierLiberado(9, 1)).toBe(false)
    expect(tierLiberado(9, 8)).toBe(true)
  })

  it('a escada nunca desce: tier maior nunca pede nível menor', () => {
    const tiers = Object.keys(NIVEL_MINIMO_POR_TIER).map(Number).sort((a, b) => a - b)
    for (let i = 1; i < tiers.length; i++) {
      expect(nivelMinimoDoTier(tiers[i])).toBeGreaterThanOrEqual(nivelMinimoDoTier(tiers[i - 1]))
    }
  })
})

describe('tierLiberado', () => {
  it('libera exatamente NO nível exigido, não um depois', () => {
    expect(tierLiberado(3, 4)).toBe(false)
    expect(tierLiberado(3, 5)).toBe(true)
  })

  it('nível acima do exigido continua liberado', () => {
    expect(tierLiberado(1, 50)).toBe(true)
    expect(tierLiberado(4, 50)).toBe(true)
  })

  it('o tier 1 é acessível no nível inicial — a raid nunca fica sem entrada', () => {
    expect(tierLiberado(1, 1)).toBe(true)
  })
})
