import { describe, it, expect } from 'vitest'
import { acaoDaIa, escolherFormaDaIa, RODADAS_DE_FORMA_MINIMAS } from '@/app/lib/battle/ai'
import { comVilao, createInitialState, resolveRound, vilao } from '@/app/lib/battle/engine'
import type { BaseStats, SkillDef, TransformationDef } from '@/app/lib/battle/types'

/**
 * A IA se transforma, pagando o mesmo preço que o jogador. Antes o inimigo
 * entrava sempre na forma base — um Grimmjow que nunca soltava a Pantera.
 */

const NUNCA_CRITA = () => 1

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 300,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 200,
  stamina: 200,
  ...over,
})

const forma = (over: Partial<TransformationDef> = {}): TransformationDef => ({
  id: 'pantera',
  name: 'Resurrección: Pantera',
  levelRequirement: 12,
  energyModifier: 0,
  attackModifier: 0.3,
  defenseModifier: 0,
  speedModifier: 0,
  flatHpBonus: 0,
  flatAttackBonus: 0,
  flatDefenseBonus: 0,
  flatSpeedBonus: 0,
  drainPerTurn: 5,
  activationCost: 30,
  activationStaminaCost: 20,
  drainStaminaPerTurn: 10,
  consumesTurn: false,
  triggerType: 'MANUAL',
  triggerPayload: null,
  ...over,
})

const golpe: SkillDef = {
  id: 'garra',
  name: 'Garra',
  power: 20,
  energyCost: 10,
  cooldown: 1,
  effects: [],
  scalingStat: 'attack',
  tags: [],
}

/** O inimigo com a reserva que o teste quer, a partir de um estado novo. */
const inimigo = (energia: number, stamina = 200) =>
  vilao(comVilao(createInitialState(stats(), stats()), { currentEnergy: energia, currentStamina: stamina }))

describe('escolherFormaDaIa', () => {
  it('libera a forma quando consegue pagar e sustentar', () => {
    expect(escolherFormaDaIa(inimigo(200), { pantera: forma() })?.id).toBe('pantera')
  })

  it(`não libera o que não sustenta por ${RODADAS_DE_FORMA_MINIMAS} rodadas — a ativação seria jogada fora`, () => {
    // Paga os 20 de ativação, mas sobram 5: a forma cairia na rodada seguinte.
    expect(escolherFormaDaIa(inimigo(200, 25), { pantera: forma() })).toBeNull()
  })

  it('entre as que dá, escolhe a de nível mais alto', () => {
    const fraca = forma({ id: 'fraca', levelRequirement: 5 })
    const forte = forma({ id: 'forte', levelRequirement: 20 })
    expect(escolherFormaDaIa(inimigo(200), { fraca, forte })?.id).toBe('forte')
  })

  it('não mexe em forma automática — essa o motor dispara sozinho', () => {
    expect(escolherFormaDaIa(inimigo(200), { ui: forma({ id: 'ui', triggerType: 'LOW_HP' }) })).toBeNull()
  })

  it('já transformado, não troca de forma', () => {
    const transformado = { ...inimigo(200), activeTransformationId: 'pantera' }
    expect(escolherFormaDaIa(transformado, { pantera: forma(), outra: forma({ id: 'outra' }) })).toBeNull()
  })
})

describe('acaoDaIa', () => {
  it('forma que gasta a rodada vira a ação da rodada', () => {
    const ssj = forma({ id: 'ssj', consumesTurn: true })
    expect(acaoDaIa(inimigo(200), [golpe], undefined, { ssj })).toEqual({ kind: 'TRANSFORM', transformationId: 'ssj' })
  })

  it('forma que não gasta vai junto do ataque', () => {
    const acao = acaoDaIa(inimigo(200), [golpe], undefined, { pantera: forma() })
    expect(acao).toMatchObject({ kind: 'ATTACK', liberar: 'pantera' })
  })

  it('sem formas, é o ataque de sempre', () => {
    expect(acaoDaIa(inimigo(200), [golpe])).toMatchObject({ kind: 'ATTACK', skillId: 'garra' })
  })
})

describe('forma do inimigo no motor', () => {
  const ctx = (formas: Record<string, TransformationDef>) => ({
    playerSkills: {},
    enemySkills: { garra: golpe },
    playerTransformations: {},
    enemyTransformations: formas,
  })

  it('liberada no turno, a forma entra ANTES do golpe e aparece no log', () => {
    const s = comVilao(createInitialState(stats(), stats()), { currentEnergy: 200 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: 'garra', liberar: 'pantera' }] },
      ctx({ pantera: forma() }),
      NUNCA_CRITA
    )
    expect(vilao(r.state).activeTransformationId).toBe('pantera')
    const doInimigo = r.turnResults.filter((t) => t.side === 'ENEMY').map((t) => t.kind)
    expect(doInimigo.indexOf('TRANSFORM')).toBeLessThan(doInimigo.indexOf('ATTACK'))
  })

  it('o inimigo paga a manutenção, e a forma cai sem stamina', () => {
    const s = comVilao(createInitialState(stats(), stats()), { activeTransformationId: 'pantera', currentStamina: 0 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      ctx({ pantera: forma({ drainStaminaPerTurn: 50 }) }),
      NUNCA_CRITA
    )
    expect(vilao(r.state).activeTransformationId).toBeNull()
  })

  it('forma automática do inimigo dispara sozinha', () => {
    const s = comVilao(createInitialState(stats(), stats()), { currentHp: 50, currentEnergy: 200 })
    const ui = forma({ id: 'ui', triggerType: 'LOW_HP', triggerPayload: { threshold: 0.3 } })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      ctx({ ui }),
      NUNCA_CRITA
    )
    expect(vilao(r.state).activeTransformationId).toBe('ui')
  })
})
