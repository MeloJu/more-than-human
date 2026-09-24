import { describe, it, expect } from 'vitest'
import {
  ATRIBUTOS,
  ATRIBUTO_POR_PONTO,
  bonusDeAtributos,
  colunaDe,
  ehAtributo,
} from '@/app/lib/progression/atributos'

const zerado = {
  allocHp: 0,
  allocAttack: 0,
  allocDefense: 0,
  allocSpeed: 0,
  allocEnergy: 0,
  allocStamina: 0,
  allocAccuracy: 0,
  allocAgility: 0,
  allocIntelligence: 0,
}

describe('atributos alocáveis', () => {
  it('sem ponto gasto, não dá bônus nenhum', () => {
    expect(bonusDeAtributos(zerado)).toEqual({
      hp: 0, attack: 0, defense: 0, speed: 0, energy: 0, stamina: 0,
      accuracy: 0, agility: 0, intelligence: 0,
    })
  })

  it('converte pontos em bônus pelo valor de cada atributo', () => {
    expect(bonusDeAtributos({ ...zerado, allocHp: 3, allocAttack: 2 })).toEqual({
      hp: 30,
      attack: 2,
      defense: 0,
      speed: 0,
      energy: 0,
      stamina: 0,
      accuracy: 0,
      agility: 0,
      intelligence: 0,
    })
  })

  it('velocidade nunca rende mais por ponto que ataque — ela conta em duas dimensões', () => {
    // Ela decide iniciativa E alimenta o crítico. No simulador, mesmo a 1 por
    // ponto ela já é o segundo melhor treino de Goku e Byakuya; a mais que o
    // ataque viraria "a resposta certa para todo personagem".
    expect(ATRIBUTO_POR_PONTO.speed).toBeLessThanOrEqual(ATRIBUTO_POR_PONTO.attack)
  })

  it('defesa rende mais pontos que ataque, porque a curva dela é plana', () => {
    // Mitigação é 100/(100+defesa): com defesa ~20, dez pontos tiram só ~7% do
    // dano. Com a mesma quantidade de ataque, defesa rendia +3 pp de vitória
    // contra +52 pp do ataque. O número maior é o que a iguala.
    expect(ATRIBUTO_POR_PONTO.defense).toBeGreaterThan(ATRIBUTO_POR_PONTO.attack)
  })

  it('acurácia e agilidade valem o mesmo — são os dois lados da mesma disputa', () => {
    expect(ATRIBUTO_POR_PONTO.accuracy).toBe(ATRIBUTO_POR_PONTO.agility)
  })

  it('as duas reservas rendem igual entre si', () => {
    expect(ATRIBUTO_POR_PONTO.energy).toBe(ATRIBUTO_POR_PONTO.stamina)
  })

  it('todo atributo tem valor por ponto e nome de coluna', () => {
    for (const a of ATRIBUTOS) {
      expect(ATRIBUTO_POR_PONTO[a]).toBeGreaterThan(0)
      expect(colunaDe(a)).toMatch(/^alloc/)
    }
  })

  it('nomes de coluna não se repetem entre atributos', () => {
    const colunas = ATRIBUTOS.map(colunaDe)
    expect(new Set(colunas).size).toBe(ATRIBUTOS.length)
  })

  it('ehAtributo rejeita entrada que não é atributo', () => {
    // A action é alcançável por POST direto, então isto é fronteira de
    // confiança e não conveniência de tipo.
    expect(ehAtributo('attack')).toBe(true)
    expect(ehAtributo('allocAttack')).toBe(false)
    expect(ehAtributo('')).toBe(false)
    expect(ehAtributo('__proto__')).toBe(false)
  })
})
