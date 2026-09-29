import { describe, it, expect } from 'vitest'
import { comLutadores, createInitialState, resolveRound } from '@/app/lib/battle/engine'
import { alvoDaIa } from '@/app/lib/battle/ai'
import { MOEDA_POR_NIVEL_DO_CONTRATO, VAGAS_DE_CONTRATO, precoDoContrato, validarContratos } from '@/app/lib/battle/party'
import type { BaseStats } from '@/app/lib/battle/types'

/**
 * A party da raid: o mercado de contratos e como os contratados entram na
 * luta. O motor com vários por lado já tem testes próprios (time.test.ts);
 * aqui fica o que é da party.
 */

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 100,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 200,
  stamina: 200,
  ...over,
})

describe('preço do contrato', () => {
  it('escala com o nível, como a recompensa', () => {
    expect(precoDoContrato(1)).toBe(MOEDA_POR_NIVEL_DO_CONTRATO)
    expect(precoDoContrato(10)).toBe(10 * MOEDA_POR_NIVEL_DO_CONTRATO)
  })

  it('a party cheia custa o que uma vitória de treino rende', () => {
    // 12 moedas por nível na vitória contra a IA (recompensa.ts).
    expect(VAGAS_DE_CONTRATO * precoDoContrato(7)).toBe(12 * 7)
  })

  it('nível inválido não deixa o contrato de graça', () => {
    expect(precoDoContrato(0)).toBe(MOEDA_POR_NIVEL_DO_CONTRATO)
  })
})

describe('validação dos contratos', () => {
  const mercado = { disponiveis: new Set(['rukia', 'orihime', 'chad', 'ichigo']), proprioCharacterId: 'ichigo' }

  it('aceita até as vagas da party', () => {
    expect(validarContratos(['rukia', 'orihime'], mercado)).toEqual({ ok: true, ids: ['rukia', 'orihime'] })
    expect(validarContratos([], mercado)).toEqual({ ok: true, ids: [] })
  })

  it('recusa mais contratos que vagas', () => {
    expect(validarContratos(['rukia', 'orihime', 'chad'], mercado)).toEqual({ ok: false, erro: 'party_cheia' })
  })

  it('recusa o mesmo personagem duas vezes', () => {
    expect(validarContratos(['rukia', 'rukia'], mercado)).toEqual({ ok: false, erro: 'contrato_repetido' })
  })

  it('recusa contratar o próprio personagem', () => {
    expect(validarContratos(['ichigo'], mercado)).toEqual({ ok: false, erro: 'contrato_proprio' })
  })

  it('recusa quem não está no mercado', () => {
    expect(validarContratos(['aizen'], mercado)).toEqual({ ok: false, erro: 'contrato_indisponivel' })
  })

  it('ignora campo vazio vindo do formulário', () => {
    expect(validarContratos(['', 'rukia'], mercado)).toEqual({ ok: true, ids: ['rukia'] })
  })
})

describe('contratados entram na luta', () => {
  it('ficam depois do jogador, com nome e nível', () => {
    const e = comLutadores(createInitialState(stats(), stats()), 'PLAYER', [
      { base: stats({ hp: 90 }), nivel: 7, nome: 'Rukia Kuchiki' },
      { base: stats({ hp: 80 }), nivel: 7, nome: 'Orihime Inoue' },
    ])
    expect(e.aliados).toHaveLength(3)
    expect(e.aliados.map((c) => c.nome)).toEqual([undefined, 'Rukia Kuchiki', 'Orihime Inoue'])
    expect(e.aliados[1].nivel).toBe(7)
    expect(e.aliados[2].currentHp).toBe(80)
    expect(e.inimigos).toHaveLength(1)
  })

  it('agem na rodada junto com o jogador', () => {
    const e = comLutadores(createInitialState(stats(), stats({ hp: 1000 })), 'PLAYER', [
      { base: stats(), nivel: 1, nome: 'Rukia' },
    ])
    const r = resolveRound(
      e,
      { aliadas: [{ kind: 'ATTACK', skillId: null }, { kind: 'ATTACK', skillId: null }], inimigas: [] },
      { playerSkills: {}, enemySkills: {}, playerTransformations: {} },
      () => 1
    )
    const quemBateu = r.turnResults.filter((t) => t.kind === 'ATTACK' && t.side === 'PLAYER').map((t) => t.posicao)
    expect(quemBateu.sort()).toEqual([0, 1])
  })
})

describe('alvo da IA', () => {
  const vivo = createInitialState(stats(), stats()).aliados[0]
  const caido = { ...vivo, currentHp: 0 }

  it('no 1x1 não sorteia nada — a batalha antiga sai igual', () => {
    let chamou = false
    expect(alvoDaIa([vivo], () => ((chamou = true), 0.5))).toBeUndefined()
    expect(chamou).toBe(false)
  })

  it('com party, sorteia entre quem está de pé', () => {
    expect(alvoDaIa([vivo, vivo, vivo], () => 0)).toBe(0)
    expect(alvoDaIa([vivo, vivo, vivo], () => 0.99)).toBe(2)
  })

  it('nunca escolhe quem caiu', () => {
    for (const sorte of [0, 0.3, 0.6, 0.99]) {
      expect(alvoDaIa([caido, vivo, caido], () => sorte)).toBe(1)
    }
  })
})
