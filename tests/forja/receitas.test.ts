import { describe, it, expect } from 'vitest'
import { REFINO_MAXIMO, RECEITAS, bonusRefinado, custoDoRefino, receitaDe } from '@/app/lib/forja/receitas'
import { itens } from '@/prisma/catalog/itens'
import { equipment } from '@/prisma/catalog/equipment'

/**
 * A forja: toda receita aponta para equipamento e material que existem, nada
 * que a loja vende se forja, e o refino cresce com o nível e para no teto.
 */

const nomesDeItem = new Set(itens.map((i: { nome: string }) => i.nome))
const peca = (nome: string) => equipment.find((e: { name: string }) => e.name === nome)

describe('receitas', () => {
  it('toda receita é de um equipamento do catálogo que a loja não vende', () => {
    for (const r of RECEITAS) {
      const e = peca(r.equipamento)
      expect(e, r.equipamento).toBeDefined()
      const naLoja = e?.naLoja ?? (e?.rarity === 'COMUM' || e?.rarity === 'RARO')
      expect(naLoja, r.equipamento).toBe(false)
    }
  })

  it('todo material citado existe no catálogo de itens', () => {
    for (const r of RECEITAS) for (const m of r.custo.materiais) expect(nomesDeItem.has(m.item), m.item).toBe(true)
    for (const raridade of ['COMUM', 'RARO', 'EPICO', 'LENDARIO'])
      for (const m of custoDoRefino(raridade, 1).materiais) expect(nomesDeItem.has(m.item), m.item).toBe(true)
  })

  it('a Garra da Pantera não se forja: é o troféu do Grimmjow', () => {
    expect(receitaDe('Garra da Pantera')).toBeUndefined()
  })
})

describe('refino', () => {
  it('soma 15% por nível e para no teto', () => {
    expect(bonusRefinado(20, 0)).toBe(20)
    expect(bonusRefinado(20, 1)).toBe(23)
    expect(bonusRefinado(20, REFINO_MAXIMO)).toBe(29)
    expect(bonusRefinado(20, REFINO_MAXIMO + 5)).toBe(29)
  })

  it('o custo cresce com o nível', () => {
    expect(custoDoRefino('EPICO', 2).moedas).toBeGreaterThan(custoDoRefino('EPICO', 1).moedas)
  })
})
