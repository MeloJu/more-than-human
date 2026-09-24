import { describe, it, expect } from 'vitest'
import {
  ajusteDeAcerto,
  applyBossOverrides,
  applyTraits,
  comHeroi,
  createInitialState,
  evasaoContra,
  heroi,
  resolveRound,
  resolverAcerto,
  vilao,
} from '@/app/lib/battle/engine'
import { ACERTO_MINIMO, ATRIBUTO_NEUTRO, BONUS_DE_ACURACIA_MAXIMO, EVASAO_MAXIMA } from '@/app/lib/battle/constants'
import { custoDoTreino, descontoDeInteligencia, treinosQueCabem } from '@/app/lib/progression/treino'
import type { BaseStats, CombatantState, SkillDef } from '@/app/lib/battle/types'

/**
 * Acurácia, agilidade, precisão e inteligência.
 *
 * O que estes testes protegem mais do que qualquer outra coisa é a INÉRCIA:
 * onde a mecânica não se aplica — precisão 100 contra evasão 0, que é o caso
 * de quase todo o catálogo hoje — nada pode mudar, nem mesmo o consumo da
 * sequência aleatória. Foi exatamente aí que a primeira versão errou.
 */

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 200,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 200,
  stamina: 100,
  ...over,
})

const skill = (over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk-1',
  name: 'Golpe',
  power: 30,
  energyCost: 10,
  cooldown: 0,
  effects: [],
  scalingStat: 'attack',
  tags: [],
  ...over,
})

const lutador = (over: Partial<CombatantState> = {}): CombatantState => ({
  ...heroi(createInitialState(stats(), stats())),
  ...over,
})

function golpe(jogadorStats: BaseStats, inimigoStats: BaseStats, sk: SkillDef, rand: () => number) {
  const s = createInitialState(jogadorStats, inimigoStats)
  return resolveRound(
    s,
    { aliadas: [{ kind: 'ATTACK', skillId: sk.id }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
    { playerSkills: { [sk.id]: sk }, enemySkills: {}, playerTransformations: {} },
    rand
  )
}

describe('evasão', () => {
  it('é zero quando acurácia e agilidade se igualam, em qualquer valor', () => {
    for (const n of [5, 11, 30, 100]) {
      expect(evasaoContra(lutador({ accuracy: n }), lutador({ agility: n }))).toBe(0)
    }
  })

  it('só a diferença conta — subir os dois lados junto não muda nada', () => {
    const a = evasaoContra(lutador({ accuracy: 10 }), lutador({ agility: 16 }))
    const b = evasaoContra(lutador({ accuracy: 40 }), lutador({ agility: 46 }))
    expect(a).toBe(b)
  })

  it('evasão nunca é negativa — o que sobra de acurácia vira AJUSTE positivo, não evasão', () => {
    expect(evasaoContra(lutador({ accuracy: 50 }), lutador({ agility: 10 }))).toBe(0)
    expect(ajusteDeAcerto(lutador({ accuracy: 21 }), lutador({ agility: 11 }))).toBeCloseTo(0.1, 5)
  })

  it('o ajuste da acurácia também tem teto', () => {
    expect(ajusteDeAcerto(lutador({ accuracy: 999 }), lutador({ agility: 1 }))).toBe(BONUS_DE_ACURACIA_MAXIMO)
  })

  it('respeita o teto, por maior que seja a vantagem', () => {
    expect(evasaoContra(lutador({ accuracy: 1 }), lutador({ agility: 999 }))).toBe(EVASAO_MAXIMA)
  })

  it('quem não declara os atributos cai no neutro', () => {
    expect(evasaoContra(lutador({ accuracy: undefined }), lutador({ agility: ATRIBUTO_NEUTRO }))).toBe(0)
  })
})

describe('resolução do acerto', () => {
  it('acerto certo não consome aleatoriedade', () => {
    // O detalhe que mais importa aqui. rand() é a mesma sequência que decide
    // crítico e choque: gastar um número a mais por golpe deslocaria toda
    // simulação com semente, e as medições de balanceamento feitas antes
    // desta mecânica deixariam de valer.
    let chamadas = 0
    const contando = () => {
      chamadas += 1
      return 0.5
    }
    const r = resolverAcerto(lutador(), lutador(), 100, contando)
    expect(r).toEqual({ acertou: true, chance: 1 })
    expect(chamadas).toBe(0)
  })

  it('precisão baixa vira chance de errar', () => {
    expect(resolverAcerto(lutador(), lutador(), 70, () => 0.9).acertou).toBe(false)
    expect(resolverAcerto(lutador(), lutador(), 70, () => 0.5).acertou).toBe(true)
  })

  it('precisão e esquiva se somam', () => {
    const esquivo = lutador({ agility: ATRIBUTO_NEUTRO + 10 })
    const { chance } = resolverAcerto(lutador(), esquivo, 80, () => 0.5)
    expect(chance).toBeCloseTo(0.7, 5)
  })

  it('acurácia treinada SOBE a chance de um golpe impreciso — é o que faz treinar valer', () => {
    // A regra que motivou a mudança: antes, acurácia acima da agilidade do
    // alvo não fazia nada, e +5 pontos treinados rendiam 0,0 pp de vitória.
    const mira = lutador({ accuracy: ATRIBUTO_NEUTRO + 10 })
    expect(resolverAcerto(mira, lutador(), 80, () => 0.5).chance).toBeCloseTo(0.9, 5)
  })

  it('mas não torna o golpe grande certeiro: 80% para no teto, abaixo de 100%', () => {
    const mira = lutador({ accuracy: 999 })
    const { chance } = resolverAcerto(mira, lutador(), 80, () => 0.5)
    expect(chance).toBeCloseTo(0.8 + BONUS_DE_ACURACIA_MAXIMO, 5)
    expect(chance).toBeLessThan(1)
  })

  it('e nunca passa de 100%', () => {
    const mira = lutador({ accuracy: 999 })
    expect(resolverAcerto(mira, lutador(), 94, () => 0.5).chance).toBe(1)
  })

  it('respeita o piso: nem a pior combinação vira um chute', () => {
    const esquivo = lutador({ agility: 999 })
    const { chance } = resolverAcerto(lutador({ accuracy: 1 }), esquivo, 10, () => 0.5)
    expect(chance).toBe(ACERTO_MINIMO)
  })
})

describe('o golpe errado, na rodada', () => {
  const impreciso = skill({ precision: 1 })

  it('não causa dano e é registrado como erro', () => {
    const r = golpe(stats(), stats(), impreciso, () => 0.99)
    const ataque = r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!
    expect(ataque.errou).toBe(true)
    expect(vilao(r.state).currentHp).toBe(200)
  })

  it('não entrega efeito no alvo, pelo mesmo motivo do counter: não encostou', () => {
    const comVeneno = skill({
      precision: 1,
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 9, duration: 3 }],
    })
    const r = golpe(stats(), stats(), comVeneno, () => 0.99)
    expect(vilao(r.state).statusEffects).toHaveLength(0)
  })

  it('mas o efeito em si mesmo continua valendo — o lançador agiu', () => {
    const comBuff = skill({
      precision: 1,
      effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 20, duration: 2 }],
    })
    const r = golpe(stats(), stats(), comBuff, () => 0.99)
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF')).toBe(true)
  })

  it('custa a energia e a recarga do mesmo jeito — errar é o risco, não um desconto', () => {
    const r = golpe(stats(), stats(), skill({ precision: 1, cooldown: 3 }), () => 0.99)
    expect(heroi(r.state).currentEnergy).toBeLessThan(200)
    expect(heroi(r.state).cooldowns['sk-1']).toBe(3)
  })

  it('o acerto garantido do domínio vence a esquiva também', () => {
    const s = createInitialState(stats(), stats({ }))
    const comDominio = comHeroi(s, {
        statusEffects: [
          { id: 'd', type: 'DOMAIN' as const, magnitude: 5, remainingRounds: 3, sourceSkillName: 'Vazio' },
        ],
    })
    const r = resolveRound(
      comDominio,
      { aliadas: [{ kind: 'ATTACK', skillId: impreciso.id }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { playerSkills: { [impreciso.id]: impreciso }, enemySkills: {}, playerTransformations: {} },
      () => 0.99
    )
    const ataque = r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!
    expect(ataque.errou).toBeUndefined()
    expect(vilao(r.state).currentHp).toBeLessThan(200)
  })

  it('habilidade sem precisão declarada nunca erra — o catálogo inteiro segue igual', () => {
    const r = golpe(stats(), stats(), skill(), () => 0.999999)
    expect(r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.errou).toBeUndefined()
    expect(vilao(r.state).currentHp).toBeLessThan(200)
  })
})

describe('inteligência e o preço do treino', () => {
  it('no valor neutro não desconta nada — o desconto é resultado de uma decisão', () => {
    expect(descontoDeInteligencia(ATRIBUTO_NEUTRO)).toBe(0)
    expect(custoDoTreino(0, ATRIBUTO_NEUTRO)).toBe(custoDoTreino(0))
  })

  it('abaixo do neutro também não encarece', () => {
    expect(descontoDeInteligencia(0)).toBe(0)
  })

  it('desconta 2% por ponto acima do neutro', () => {
    expect(descontoDeInteligencia(ATRIBUTO_NEUTRO + 5)).toBeCloseTo(0.1, 5)
    expect(custoDoTreino(0, ATRIBUTO_NEUTRO + 5)).toBe(72)
  })

  it('para no teto de 40%, para inteligência não se pagar sozinha', () => {
    expect(descontoDeInteligencia(ATRIBUTO_NEUTRO + 500)).toBe(0.4)
    expect(custoDoTreino(0, ATRIBUTO_NEUTRO + 500)).toBe(48)
  })

  it('inteligência alta faz caber mais treinos no mesmo saldo', () => {
    const burro = treinosQueCabem(600, 0, ATRIBUTO_NEUTRO)
    const esperto = treinosQueCabem(600, 0, ATRIBUTO_NEUTRO + 20)
    expect(esperto).toBeGreaterThan(burro)
  })
})

describe('os três sobrevivem às transformações do bloco de stats', () => {
  // Um bug real, pego pela medição e não pelos testes: applyBossOverrides e
  // applyTraits montavam o objeto campo a campo, então TODO atributo novo era
  // apagado ao passar por elas. O chefe caía no valor neutro e a evasão
  // contra ele mudava sem ninguém ter pedido.
  //
  // O teste é genérico de propósito — compara o conjunto de chaves — para que
  // o quarto atributo, quando existir, não repita a mesma história.
  const completo = stats({ accuracy: 13, agility: 16, intelligence: 9 })

  it('applyBossOverrides preserva o que ele não sobrescreve', () => {
    const r = applyBossOverrides(completo, { bossHp: 500, bossSpeed: 40 })
    expect(r).toMatchObject({ hp: 500, speed: 40, accuracy: 13, agility: 16, intelligence: 9 })
    expect(Object.keys(r).sort()).toEqual(Object.keys(completo).sort())
  })

  it('applyTraits preserva o que nenhum traço modifica', () => {
    const r = applyTraits(completo, [
      {
        name: 'Teste',
        energyModifier: 0,
        attackModifier: 0.5,
        defenseModifier: 0,
        speedModifier: 0,
        flatHpBonus: 10,
        flatAttackBonus: 0,
        flatDefenseBonus: 0,
        flatSpeedBonus: 0,
        energyCostModifier: 0,
      },
    ])
    expect(r).toMatchObject({ accuracy: 13, agility: 16, intelligence: 9 })
    expect(Object.keys(r).sort()).toEqual(Object.keys(completo).sort())
  })
})
