import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { descricoes } = require('../../prisma/catalog/descricoes') as {
  descricoes: [string, string, string][]
}

/**
 * O catálogo de descrições é aplicado pelo sync em ordem, e uma chave repetida
 * não dá erro nenhum: a segunda linha sobrescreve a primeira em silêncio, e a
 * descrição que alguém escreveu com cuidado some sem aviso.
 */
describe('catálogo de descrições', () => {
  it('não repete habilidade (nome + categoria)', () => {
    const chaves = descricoes.map(([nome, categoria]) => `${nome}|${categoria}`)
    const repetidas = chaves.filter((k, i) => chaves.indexOf(k) !== i)
    expect(repetidas).toEqual([])
  })

  it('toda descrição é uma frase de verdade', () => {
    for (const [nome, , texto] of descricoes) {
      expect(texto.trim().length, nome).toBeGreaterThan(10)
      expect(texto.trim(), nome).toMatch(/[.!?]$/)
    }
  })
})
