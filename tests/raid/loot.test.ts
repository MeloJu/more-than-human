import { describe, it, expect } from 'vitest'
import { sortearLoot } from '@/app/lib/raid/loot'
import { RAIDS } from '@/app/lib/raid/catalogo'

/**
 * O loot de um andar vencido: material do andar, e o equipamento do chefe —
 * garantido na primeira vitória, nunca repetido.
 */

const andar = {
  loot: [{ item: 'Garra de Adjuchas', min: 1, max: 2 }],
  equipamento: { nome: 'Garra da Pantera', chance: 0.3 },
}

describe('sortearLoot', () => {
  it('o material sai entre o mínimo e o máximo', () => {
    expect(sortearLoot(andar, () => 0, { primeiraVitoria: false, jaTemEquipamento: true }).itens).toEqual([
      { nome: 'Garra de Adjuchas', quantidade: 1 },
    ])
    expect(sortearLoot(andar, () => 0.99, { primeiraVitoria: false, jaTemEquipamento: true }).itens).toEqual([
      { nome: 'Garra de Adjuchas', quantidade: 2 },
    ])
  })

  it('o equipamento do chefe vem garantido na primeira vitória', () => {
    expect(sortearLoot(andar, () => 0.99, { primeiraVitoria: true, jaTemEquipamento: false }).equipamento).toBe('Garra da Pantera')
  })

  it('depois, só com a sorte da chance', () => {
    expect(sortearLoot(andar, () => 0.99, { primeiraVitoria: false, jaTemEquipamento: false }).equipamento).toBeUndefined()
    expect(sortearLoot(andar, () => 0.1, { primeiraVitoria: false, jaTemEquipamento: false }).equipamento).toBe('Garra da Pantera')
  })

  it('quem já tem a peça não recebe outra', () => {
    expect(sortearLoot(andar, () => 0, { primeiraVitoria: true, jaTemEquipamento: true }).equipamento).toBeUndefined()
  })

  it('todo andar de Las Noches deixa material, e o chefe deixa a Garra da Pantera', () => {
    const lasNoches = RAIDS.find((r) => r.slug === 'las-noches')!
    expect(lasNoches.andares.every((a) => (a.loot ?? []).length > 0)).toBe(true)
    expect(lasNoches.andares.at(-1)?.equipamento?.nome).toBe('Garra da Pantera')
  })
})
