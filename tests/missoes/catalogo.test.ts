import { describe, it, expect } from 'vitest'
import { RESUMO_VAZIO, missoesDoDia, resumirLutas, type LutaParaMissao } from '@/app/lib/missoes/catalogo'

const dia = new Date(Date.UTC(2026, 9, 5))
const amanha = new Date(Date.UTC(2026, 9, 6))

describe('missoesDoDia', () => {
  it('são três, sem repetir, e a primeira é de vitória', () => {
    const m = missoesDoDia('conta-a', dia)
    expect(m).toHaveLength(3)
    expect(new Set(m.map((x) => x.id)).size).toBe(3)
    expect(['vitorias-3', 'treino-5']).toContain(m[0].id)
  })

  it('o sorteio é o mesmo para a mesma conta no mesmo dia', () => {
    expect(missoesDoDia('conta-a', dia).map((x) => x.titulo)).toEqual(missoesDoDia('conta-a', dia).map((x) => x.titulo))
  })

  it('muda entre dias e entre contas', () => {
    // Em 30 dias, a mesma conta não pode ter sempre a mesma lista.
    const listas = new Set(
      Array.from({ length: 30 }, (_, i) => missoesDoDia('conta-a', new Date(dia.getTime() + i * 864e5)).map((x) => x.titulo).join('|'))
    )
    expect(listas.size).toBeGreaterThan(5)
    const contas = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((c) => missoesDoDia(c, amanha).map((x) => x.titulo).join('|')))
    expect(contas.size).toBeGreaterThan(1)
  })

  it('mede o progresso no resumo e para na meta', () => {
    const m = missoesDoDia('conta-a', dia, { ...RESUMO_VAZIO, vitorias: 9, vitoriasDeTreino: 9, dano: 99999, aparados: 9, esquivas: 9, andaresDeRaid: 9, formasLiberadas: 9 })
    for (const x of m) {
      if (x.id === 'universo-1') continue
      expect(x.feito).toBe(x.meta)
      expect(x.completa).toBe(true)
    }
  })

  it('sem lutas, nada está feito', () => {
    for (const x of missoesDoDia('conta-a', dia)) expect(x.completa).toBe(false)
  })
})

describe('resumirLutas', () => {
  const luta = (parcial: Partial<LutaParaMissao>): LutaParaMissao => ({
    meuLado: 'PLAYER',
    venceu: true,
    modo: 'treino',
    universo: 'bleach',
    turnos: [],
    ...parcial,
  })

  it('conta vitórias por modo e por universo, só das ganhas', () => {
    const r = resumirLutas([
      luta({}),
      luta({ modo: 'raid', universo: 'naruto' }),
      luta({ venceu: false, universo: 'naruto' }),
    ])
    expect(r.vitorias).toBe(2)
    expect(r.vitoriasDeTreino).toBe(1)
    expect(r.andaresDeRaid).toBe(1)
    expect(r.vitoriasPorUniverso).toEqual({ bleach: 1, naruto: 1 })
  })

  it('dano e forma do meu lado; aparar e esquivar na linha do outro', () => {
    const r = resumirLutas([
      luta({
        venceu: false,
        turnos: [
          { side: 'PLAYER', kind: 'ATTACK', damage: 40 },
          { side: 'PLAYER', kind: 'TRANSFORM' },
          { side: 'ENEMY', kind: 'ATTACK', damage: 30, aparou: true },
          { side: 'ENEMY', kind: 'ATTACK', esquivou: true },
          { side: 'PLAYER', kind: 'ATTACK', damage: 10, aparou: true },
        ],
      }),
    ])
    expect(r.dano).toBe(50)
    expect(r.formasLiberadas).toBe(1)
    expect(r.aparados).toBe(1)
    expect(r.esquivas).toBe(1)
  })

  it('o convidado do PvP joga do lado ENEMY do motor', () => {
    const r = resumirLutas([
      luta({ meuLado: 'ENEMY', modo: 'pvp', turnos: [{ side: 'ENEMY', kind: 'ATTACK', damage: 70 }, { side: 'PLAYER', kind: 'ATTACK', damage: 5 }] }),
    ])
    expect(r.dano).toBe(70)
    expect(r.vitoriasDeTreino).toBe(0)
  })
})
