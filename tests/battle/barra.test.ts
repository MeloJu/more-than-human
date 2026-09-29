import { describe, it, expect } from 'vitest'
import { corDaVida, duracaoDaQueda } from '@/app/lib/battle/barra'

describe('a barra que escorre', () => {
  it('golpe maior leva mais tempo para escorrer', () => {
    expect(duracaoDaQueda(0.05)).toBeLessThan(duracaoDaQueda(0.4))
  })

  it('arranhão ainda leva meio segundo, para o olho ver', () => {
    expect(duracaoDaQueda(0)).toBe(0.5)
  })

  it('nunca passa de 1,6s, mesmo tirando a vida inteira', () => {
    expect(duracaoDaQueda(1)).toBe(1.6)
    expect(duracaoDaQueda(3)).toBe(1.6)
  })

  it('a cor da vida muda nas faixas do Pokémon', () => {
    expect(corDaVida(0.8)).toBe('#22c55e')
    expect(corDaVida(0.5)).toBe('#f59e0b')
    expect(corDaVida(0.21)).toBe('#f59e0b')
    expect(corDaVida(0.2)).toBe('#ef4444')
    expect(corDaVida(0)).toBe('#ef4444')
  })
})
