import { describe, it, expect } from 'vitest'
import { MOEDAS_DO_DIA, recompensaDoDia, situacaoDoResgate } from '@/app/lib/login/diario'

// Meio-dia de 1º de outubro, UTC.
const agora = new Date(Date.UTC(2026, 9, 1, 12))
const dias = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000)

describe('situacaoDoResgate', () => {
  it('quem nunca resgatou começa no dia 1', () => {
    expect(situacaoDoResgate(null, 0, agora)).toEqual({ resgatadoHoje: false, dia: 1, feitos: 0 })
  })

  it('resgate ontem continua a sequência', () => {
    expect(situacaoDoResgate(dias(-1), 3, agora)).toEqual({ resgatadoHoje: false, dia: 4, feitos: 3 })
  })

  it('resgate hoje fecha o botão e mostra o dia resgatado', () => {
    expect(situacaoDoResgate(dias(0), 4, agora)).toEqual({ resgatadoHoje: true, dia: 4, feitos: 4 })
  })

  it('faltar um dia zera', () => {
    expect(situacaoDoResgate(dias(-2), 5, agora)).toEqual({ resgatadoHoje: false, dia: 1, feitos: 0 })
  })

  it('depois do dia 7 volta ao dia 1', () => {
    expect(situacaoDoResgate(dias(-1), 7, agora)).toEqual({ resgatadoHoje: false, dia: 1, feitos: 0 })
  })

  it('o dia vira à meia-noite UTC, não 24h depois do resgate', () => {
    // Resgatou às 23h de ontem; às 0h01 de hoje já é outro dia.
    const ontemTarde = new Date(Date.UTC(2026, 8, 30, 23))
    const logoDepois = new Date(Date.UTC(2026, 9, 1, 0, 1))
    expect(situacaoDoResgate(ontemTarde, 2, logoDepois)).toEqual({ resgatadoHoje: false, dia: 3, feitos: 2 })
  })
})

describe('recompensaDoDia', () => {
  it('paga as moedas da tabela e o ponto só no dia 7', () => {
    for (let dia = 1; dia <= 7; dia++) {
      expect(recompensaDoDia(dia)).toEqual({ moedas: MOEDAS_DO_DIA[dia - 1], pontos: dia === 7 ? 1 : 0 })
    }
  })

  it('a semana inteira paga 1225 moedas e 1 ponto', () => {
    const semana = [1, 2, 3, 4, 5, 6, 7].map(recompensaDoDia)
    expect(semana.reduce((s, r) => s + r.moedas, 0)).toBe(1225)
    expect(semana.reduce((s, r) => s + r.pontos, 0)).toBe(1)
  })
})
