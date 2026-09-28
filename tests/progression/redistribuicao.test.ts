import { describe, it, expect } from 'vitest'
import {
  REDISTRIBUICAO_CUSTO,
  alocacoesZeradas,
  custoDaRedistribuicao,
  pontosAlocados,
} from '@/app/lib/progression/redistribuicao'
import { ATRIBUTOS, colunaDe } from '@/app/lib/progression/atributos'

describe('redistribuição de atributos', () => {
  it('a primeira é de graça, as seguintes cobram', () => {
    expect(custoDaRedistribuicao(0)).toBe(0)
    expect(custoDaRedistribuicao(1)).toBe(REDISTRIBUICAO_CUSTO)
    expect(custoDaRedistribuicao(5)).toBe(REDISTRIBUICAO_CUSTO)
  })

  it('soma os pontos de TODOS os atributos — um esquecido sumiria na redistribuição', () => {
    const personagem = Object.fromEntries(ATRIBUTOS.map((a) => [colunaDe(a), 2]))
    expect(pontosAlocados(personagem)).toBe(ATRIBUTOS.length * 2)
  })

  it('zera exatamente as colunas que a soma conta', () => {
    const zeradas = alocacoesZeradas()
    expect(Object.keys(zeradas).sort()).toEqual(ATRIBUTOS.map(colunaDe).sort())
    expect(Object.values(zeradas).every((v) => v === 0)).toBe(true)
  })
})
