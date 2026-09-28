import { describe, it, expect } from 'vitest'
import {
  ativarForma,
  comHeroi,
  createInitialState,
  faltaParaAtivar,
  heroi,
  podeAtivar,
  resolveRound,
} from '@/app/lib/battle/engine'
import type { BaseStats, TransformationDef } from '@/app/lib/battle/types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalogo = require('../../prisma/catalog/transformations') as {
  transformations: (Partial<TransformationDef> & { character: string; name: string; levelRequirement: number })[]
}

/**
 * Toda forma cobra para ativar e para se manter, em energia E stamina.
 *
 * Antes só o Bankai cobrava a ativação, e só dez formas tinham manutenção:
 * transformar era só ganho, e treinar energia ou stamina não valia nada. O
 * que estes testes travam é que nenhum caminho de entrada numa forma — clique,
 * rodada, gatilho automático — escape do preço.
 */

const NUNCA_CRITA = () => 1

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 200,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 100,
  stamina: 100,
  ...over,
})

const forma = (over: Partial<TransformationDef> = {}): TransformationDef => ({
  id: 'bankai',
  name: 'Bankai',
  levelRequirement: 1,
  energyModifier: 0,
  attackModifier: 0.3,
  defenseModifier: 0,
  speedModifier: 0,
  flatHpBonus: 0,
  flatAttackBonus: 0,
  flatDefenseBonus: 0,
  flatSpeedBonus: 0,
  drainPerTurn: 0,
  activationCost: 30,
  activationStaminaCost: 20,
  drainStaminaPerTurn: 0,
  triggerType: 'MANUAL',
  triggerPayload: null,
  ...over,
})

const ataqueBasico = {
  aliadas: [{ kind: 'ATTACK' as const, skillId: null }],
  inimigas: [{ kind: 'ATTACK' as const, skillId: null }],
}

const rodada = (s: ReturnType<typeof createInitialState>, t: TransformationDef, aliadas = ataqueBasico.aliadas) =>
  resolveRound(s, { ...ataqueBasico, aliadas }, { playerSkills: {}, enemySkills: {}, playerTransformations: { [t.id]: t } }, NUNCA_CRITA)

/** A luta começa com parte da energia (ENERGIA_INICIAL); estes testes partem da reserva cheia. */
const cheio = () => ({ ...heroi(createInitialState(stats(), stats())), currentEnergy: 100 })

describe('ativação', () => {
  it('cobra energia e stamina', () => {
    const c = cheio()
    const r = ativarForma(c, forma())
    expect(r.currentEnergy).toBe(70)
    expect(r.currentStamina).toBe(80)
    expect(r.activeTransformationId).toBe('bankai')
  })

  it('cobra ANTES de aplicar: a forma que corta a energia máxima não encarece a ativação', () => {
    // Energia 100, teto cai para 50. Cobrando antes: 100 − 30 = 70, cortado a
    // 50. Cobrando depois, sairia do que sobrou do corte: 50 − 30 = 20.
    const c = cheio()
    const r = ativarForma(c, forma({ energyModifier: -0.5 }))
    expect(r.currentEnergy).toBe(50)
  })

  it('diz qual recurso falta, e quanto', () => {
    const c = { ...heroi(createInitialState(stats(), stats())), currentEnergy: 10, currentStamina: 100 }
    expect(faltaParaAtivar(c, forma())).toEqual({ energia: 20, stamina: 0 })
    expect(podeAtivar(c, forma())).toBe(false)
  })

  it('sem stamina, a ação de transformar na rodada não acontece', () => {
    const s = comHeroi(createInitialState(stats(), stats()), { currentStamina: 5 })
    const t = forma()
    const r = rodada(s, t, [{ kind: 'TRANSFORM' as const, transformationId: t.id }] as never)
    expect(heroi(r.state).activeTransformationId).toBeNull()
  })

  it('forma automática também paga, e não dispara se não puder', () => {
    const automatica = forma({ id: 'ui', triggerType: 'LOW_HP', triggerPayload: { threshold: 0.3 } })

    const semStamina = comHeroi(createInitialState(stats(), stats()), { currentHp: 40, currentStamina: 0 })
    expect(heroi(rodada(semStamina, automatica).state).activeTransformationId).toBeNull()

    const comTudo = comHeroi(createInitialState(stats(), stats()), { currentHp: 40 })
    const r = rodada(comTudo, automatica)
    expect(heroi(r.state).activeTransformationId).toBe('ui')
    expect(heroi(r.state).currentStamina).toBeLessThan(100)
  })
})

describe('manutenção', () => {
  const transformado = (t: TransformationDef, over = {}) =>
    comHeroi(createInitialState(stats(), stats()), { activeTransformationId: t.id, ...over })

  it('cobra stamina por rodada', () => {
    const t = forma({ drainStaminaPerTurn: 12 })
    // Stamina a meio caminho, para a regeneração não esbarrar no teto.
    const semForma = rodada(comHeroi(createInitialState(stats(), stats()), { currentStamina: 50 }), forma({ id: 'outra' }))
    const comForma = rodada(transformado(t, { currentStamina: 50 }), t)
    expect(heroi(comForma.state).activeTransformationId).toBe('bankai')
    expect(heroi(comForma.state).currentStamina).toBe((heroi(semForma.state).currentStamina ?? 0) - 12)
  })

  it('sem stamina para manter, a forma cai sem cobrar a energia', () => {
    const t = forma({ drainPerTurn: 10, drainStaminaPerTurn: 50 })
    const r = rodada(transformado(t, { currentStamina: 0 }), t)
    const controle = rodada(createInitialState(stats(), stats()), forma({ id: 'outra' }))
    expect(heroi(r.state).activeTransformationId).toBeNull()
    expect(heroi(r.state).currentEnergy).toBe(heroi(controle.state).currentEnergy)
  })
})

describe('preço no catálogo', () => {
  const porNome = (personagem: string, nome: string) =>
    catalogo.transformations.find((t) => t.character === personagem && t.name === nome)!

  it('toda forma cobra as quatro coisas', () => {
    for (const t of catalogo.transformations) {
      expect(t.activationCost, t.name).toBeGreaterThan(0)
      expect(t.activationStaminaCost, t.name).toBeGreaterThan(0)
      expect(t.drainPerTurn, t.name).toBeGreaterThan(0)
      expect(t.drainStaminaPerTurn, t.name).toBeGreaterThan(0)
    }
  })

  it('forma mais forte custa mais', () => {
    const ss1 = porNome('Goku', 'Super Saiyan')
    const ss2 = porNome('Goku', 'Super Saiyan 2')
    expect(ss2.activationCost!).toBeGreaterThan(ss1.activationCost!)
    expect(ss2.drainStaminaPerTurn!).toBeGreaterThan(ss1.drainStaminaPerTurn!)
  })

  it('a manutenção pesa na STAMINA, não na energia', () => {
    // Energia é o recurso dos golpes desde que a luta começa com 40% dela; com
    // o preço da forma em energia, lutar transformado ficava pior que lutar
    // sem forma. Ver o bloco de preço em prisma/catalog/transformations.js.
    for (const t of catalogo.transformations.filter((t) => t.levelRequirement >= 10)) {
      expect(t.drainStaminaPerTurn!, t.name).toBeGreaterThan(t.drainPerTurn!)
    }
  })
})
