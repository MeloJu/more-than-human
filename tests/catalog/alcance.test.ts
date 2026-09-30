import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { alcances } = require('../../prisma/catalog/alcance') as { alcances: [string, string, string][] }

/**
 * O alcance revisado de cada golpe. Decide o que aparar e esquivar defendem,
 * então um erro aqui pune quem lê a luta direito — aparar um Getsuga Tenshō,
 * que é uma onda disparada da lâmina, não pode dar certo.
 */
const alcanceDe = (nome: string) => alcances.find(([n]) => n === nome)?.[2]

describe('catálogo de alcance', () => {
  it('não repete golpe', () => {
    const chaves = alcances.map(([n, c]) => `${n}|${c}`)
    expect(chaves.filter((k, i) => chaves.indexOf(k) !== i)).toEqual([])
  })

  it('só usa os três alcances', () => {
    for (const [nome, , a] of alcances) expect(['CORPO', 'DISTANCIA', 'AREA'], nome).toContain(a)
  })

  // Casos conferidos na wiki de cada obra: são os que a regra por tag e nome
  // errava, e os que mais pesam para quem apara ou esquiva.
  it('golpe de espada que é disparo fica à distância', () => {
    expect(alcanceDe('Getsuga Tenshō')).toBe('DISTANCIA')
    expect(alcanceDe('Desgarrón')).toBe('DISTANCIA')
    expect(alcanceDe('El Directo')).toBe('DISTANCIA')
    expect(alcanceDe('Kamishini no Yari')).toBe('DISTANCIA')
  })

  it('técnica que exige contato fica corpo a corpo', () => {
    expect(alcanceDe('Fenda')).toBe('CORPO') // Cleave
    expect(alcanceDe('Zanka no Tachi: Cremation')).toBe('CORPO') // Kyokujitsujin
    expect(alcanceDe('Transfiguração Ociosa')).toBe('CORPO')
    expect(alcanceDe('Rasengan')).toBe('CORPO')
  })

  it('invocação vale pelo jeito que ataca, não por ser invocação', () => {
    expect(alcanceDe('Shikigami: Cães Divinos')).toBe('CORPO') // mordem
    expect(alcanceDe('Shikigami: Nue')).toBe('CORPO') // choque no contato
    expect(alcanceDe('Shikigami: Max Elephant')).toBe('AREA') // inunda o campo
    expect(alcanceDe('Uzumaki: Redemoinho de Maldições')).toBe('DISTANCIA') // disparo
  })

  it('golpe de Pokémon de contato fica corpo a corpo', () => {
    expect(alcanceDe('Pikachu: Investida Trovão')).toBe('CORPO')
    expect(alcanceDe('Snorlax: Corpo Pesado')).toBe('CORPO')
  })
})
