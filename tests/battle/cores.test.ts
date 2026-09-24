import { describe, it, expect } from 'vitest'
import { coresDoConfronto, distanciaDeMatiz, matiz, DISTANCIA_MINIMA_DE_MATIZ } from '@/app/lib/battle/cores'

describe('matiz e distância', () => {
  it('lê a matiz das primárias', () => {
    expect(matiz('#ff0000')).toBeCloseTo(0)
    expect(matiz('#00ff00')).toBeCloseTo(120)
    expect(matiz('#0000ff')).toBeCloseTo(240)
  })

  it('cinza não tem matiz', () => {
    expect(matiz('#808080')).toBeNull()
  })

  it('a distância dá a volta no círculo: 350° e 10° estão a 20°, não a 340°', () => {
    // vermelho puxado para o roxo e vermelho puxado para o laranja
    expect(distanciaDeMatiz('#ff002a', '#ff2a00')).toBeLessThan(25)
  })

  it('cor inválida conta como distante, e não como igual', () => {
    expect(distanciaDeMatiz(null, '#ff0000')).toBe(180)
    expect(distanciaDeMatiz('var(--accent)', '#ff0000')).toBe(180)
  })
})

describe('coresDoConfronto', () => {
  // Os valores reais que colidiram na tela: Ichigo laranja, Jean Grey
  // amarela, a 10 graus de matiz.
  const ichigo = { primaria: '#f8b659', secundaria: '#79c0d8' }
  const jeanGrey = { primaria: '#f8d059', secundaria: '#8b39c6' }

  it('cores já distantes ficam como estão', () => {
    const r = coresDoConfronto(ichigo, { primaria: '#4fb3f5', secundaria: null })
    expect(r).toEqual({ jogador: '#f8b659', inimigo: '#4fb3f5' })
  })

  it('colisão: o adversário troca para a SECUNDÁRIA dele (Jean Grey vira o roxo da Fênix)', () => {
    const r = coresDoConfronto(ichigo, jeanGrey)
    expect(r.jogador).toBe('#f8b659')
    expect(r.inimigo).toBe('#8b39c6')
  })

  it('o jogador nunca troca de cor, mesmo quando é ele que "colide"', () => {
    const r = coresDoConfronto(jeanGrey, ichigo)
    expect(r.jogador).toBe(jeanGrey.primaria)
  })

  it('sem secundária, cai na reserva do tema mais distante — e ela é legível', () => {
    const r = coresDoConfronto(ichigo, { primaria: '#f8a050', secundaria: null })
    expect(distanciaDeMatiz(r.jogador, r.inimigo)).toBeGreaterThanOrEqual(DISTANCIA_MINIMA_DE_MATIZ)
  })

  it('secundária que também colide é descartada', () => {
    const r = coresDoConfronto(ichigo, { primaria: '#f8d059', secundaria: '#f8a050' })
    expect(r.inimigo).not.toBe('#f8a050')
    expect(distanciaDeMatiz(r.jogador, r.inimigo)).toBeGreaterThanOrEqual(DISTANCIA_MINIMA_DE_MATIZ)
  })

  it('personagem sem cor nenhuma usa os padrões do tema, que já são opostos', () => {
    const r = coresDoConfronto({ primaria: null, secundaria: null }, { primaria: null, secundaria: null })
    expect(r).toEqual({ jogador: '#ff6b1a', inimigo: '#4dd0e1' })
  })

  it('em qualquer caso, os dois lados terminam distinguíveis', () => {
    const paleta = ['#f8b659', '#f8d059', '#4fb3f5', '#c6395c', '#e51a2b', '#5cc639', '#8b39c6', null]
    for (const a of paleta) {
      for (const b of paleta) {
        const r = coresDoConfronto({ primaria: a, secundaria: null }, { primaria: b, secundaria: null })
        expect(distanciaDeMatiz(r.jogador, r.inimigo)).toBeGreaterThanOrEqual(DISTANCIA_MINIMA_DE_MATIZ)
      }
    }
  })
})
