import { describe, it, expect } from 'vitest'
import {
  SEM_BONUS,
  applyBossOverrides,
  applyTraits,
  applyTransformation,
  comHeroi,
  computeBaseStats,
  computeFighterStats,
  createInitialState,
  custaStamina,
  energyCostFor,
  getCombatStat,
  hasBattleValue,
  heroi,
  isLegalMove,
  isStunned,
  migrarEstado,
  resolveRound,
  resolverClash,
  saborDoDot,
  scaleForLevel,
  sumStatBonuses,
  tagDeClash,
  traitEnergyCostModifier,
  vilao,
} from '@/app/lib/battle/engine'
import { ENERGIA_INICIAL, ENERGY_REGEN_PCT } from '@/app/lib/battle/constants'
import type {
  AppliedEffect,
  BaseStats,
  CombatantState,
  SkillDef,
  SkillEffect,
  StatusEffectInstance,
  TraitDef,
  TransformationDef,
} from '@/app/lib/battle/types'

// rand() só é consultado pra decidir crítico. Fixar o valor torna o dano
// determinístico: 1 nunca critica (chance máxima é 0.35), 0 sempre critica.
const NUNCA_CRITA = () => 1
const SEMPRE_CRITA = () => 0

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 100,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 100,
  stamina: 100,
  ...over,
})

function combatant(over: Partial<CombatantState> = {}): CombatantState {
  const base = heroi(createInitialState(stats(), stats()))
  return { ...base, ...over }
}

const efeito = (over: Partial<StatusEffectInstance> = {}): StatusEffectInstance => ({
  id: 'fx-1',
  type: 'BUFF',
  magnitude: 10,
  remainingRounds: 2,
  sourceSkillName: 'Teste',
  ...over,
})

const skill = (over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk-1',
  name: 'Golpe',
  power: 30,
  energyCost: 10,
  cooldown: 2,
  effects: [],
  scalingStat: 'attack',
  tags: [],
  ...over,
})

const transformacao = (over: Partial<TransformationDef> = {}): TransformationDef => ({
  id: 'tr-1',
  name: 'Modo Turbo',
  levelRequirement: 1,
  energyModifier: 0,
  attackModifier: 0,
  defenseModifier: 0,
  speedModifier: 0,
  flatHpBonus: 0,
  flatAttackBonus: 0,
  flatDefenseBonus: 0,
  flatSpeedBonus: 0,
  drainPerTurn: 0,
  triggerType: 'MANUAL',
  triggerPayload: null,
  ...over,
})

/** Contexto mínimo pra resolveRound, sem skills nem transformações. */
const ctxVazio = () => ({ playerSkills: {}, enemySkills: {}, playerTransformations: {} })
const ataqueBasico = {
  aliadas: [{ kind: 'ATTACK' as const, skillId: null }],
  inimigas: [{ kind: 'ATTACK' as const, skillId: null }],
}

describe('computeBaseStats', () => {
  it('soma os bônus da skill tree aos stats do personagem', () => {
    const r = computeBaseStats(
      { hp: 100, attack: 20, defense: 10, speed: 15, energy: 80, stamina: 60 },
      { hp: 25, attack: 5, defense: 3, speed: 2, energy: 0, stamina: 0 }
    )
    // Os três novos não vêm no personagem de teste, então caem no neutro. Que
    // eles apareçam aqui é o ponto: acurácia igual à agilidade dá evasão zero.
    expect(r).toEqual({
      hp: 125, attack: 25, defense: 13, speed: 17, energy: 80, stamina: 60,
      accuracy: 11, agility: 11, intelligence: 11,
    })
  })

  it('não altera energia — a skill tree não dá bônus de energia', () => {
    const r = computeBaseStats(
      { hp: 100, attack: 20, defense: 10, speed: 15, energy: 80, stamina: 60 },
      SEM_BONUS
    )
    expect(r.energy).toBe(80)
  })
})

describe('createInitialState', () => {
  it('começa com HP e stamina cheios, energia em ENERGIA_INICIAL, sem transformação nem efeitos', () => {
    const s = createInitialState(stats(), stats({ hp: 200 }))
    expect(heroi(s).currentHp).toBe(100)
    expect(heroi(s).maxHp).toBe(100)
    expect(heroi(s).currentEnergy).toBe(Math.round(100 * ENERGIA_INICIAL))
    expect(heroi(s).maxEnergy).toBe(100)
    expect(heroi(s).currentStamina).toBe(100)
    expect(heroi(s).activeTransformationId).toBeNull()
    expect(heroi(s).statusEffects).toEqual([])
    expect(vilao(s).maxHp).toBe(200)
    expect(s.outcome).toBeNull()
  })

  it('guarda os valores base separados dos atuais (pra reverter transformação)', () => {
    const s = createInitialState(stats({ attack: 42 }), stats())
    expect(heroi(s).attack).toBe(42)
    expect(heroi(s).baseAttack).toBe(42)
  })
})

describe('scaleForLevel', () => {
  it('não altera nada no nível 1', () => {
    const base = { hp: 100, attack: 20, defense: 10, speed: 15, energy: 50, stamina: 50 }
    expect(scaleForLevel(base, 1)).toEqual(base)
  })

  it('escala 12% por nível acima de 1 (LEVEL_SCALING)', () => {
    // nível 5 => multiplicador 1 + 4*0.12 = 1.48
    const r = scaleForLevel({ hp: 100, attack: 20, defense: 10, speed: 15, energy: 50, stamina: 50 }, 5)
    expect(r).toEqual({ hp: 148, attack: 30, defense: 15, speed: 22, energy: 74, stamina: 74 })
  })

  it('preserva campos extras do objeto original', () => {
    const r = scaleForLevel({ hp: 10, attack: 1, defense: 1, speed: 1, energy: 1, stamina: 1, nome: 'Hollow' }, 3)
    expect(r.nome).toBe('Hollow')
  })
})

describe('hasBattleValue', () => {
  it('aceita skill que causa dano', () => {
    expect(hasBattleValue({ power: 10, effects: [] })).toBe(true)
  })

  it('aceita skill sem dano mas com efeitos (buff/cura puros)', () => {
    expect(hasBattleValue({ power: 0, effects: [{ type: 'HEAL' }] })).toBe(true)
  })

  it('rejeita linha inerte: sem dano e sem efeito', () => {
    expect(hasBattleValue({ power: 0, effects: [] })).toBe(false)
  })

  it('rejeita quando effects não é array (dado solto vindo do banco)', () => {
    expect(hasBattleValue({ power: 0, effects: null })).toBe(false)
    expect(hasBattleValue({ power: 0, effects: 'nada' })).toBe(false)
  })
})

describe('isLegalMove', () => {
  it('ataque básico (skill null) é sempre legal, mesmo sem energia', () => {
    expect(isLegalMove(combatant({ currentEnergy: 0 }), null)).toBe(true)
  })

  it('rejeita skill em cooldown', () => {
    const c = combatant({ cooldowns: { 'sk-1': 2 } })
    expect(isLegalMove(c, skill())).toBe(false)
  })

  it('rejeita skill sem energia suficiente', () => {
    expect(isLegalMove(combatant({ currentEnergy: 9 }), skill({ energyCost: 10 }))).toBe(false)
  })

  it('aceita quando a energia é exatamente o custo', () => {
    expect(isLegalMove(combatant({ currentEnergy: 10 }), skill({ energyCost: 10 }))).toBe(true)
  })

  it('cooldown zerado não bloqueia', () => {
    expect(isLegalMove(combatant({ cooldowns: { 'sk-1': 0 } }), skill())).toBe(true)
  })
})

describe('getCombatStat', () => {
  it('devolve o valor base quando não há efeitos', () => {
    expect(getCombatStat(combatant({ attack: 20 }), 'attack')).toBe(20)
  })

  it('aplica BUFF como porcentagem', () => {
    const c = combatant({ attack: 20, statusEffects: [efeito({ type: 'BUFF', stat: 'attack', magnitude: 50 })] })
    expect(getCombatStat(c, 'attack')).toBe(30)
  })

  it('aplica DEBUFF como porcentagem negativa', () => {
    const c = combatant({ defense: 20, statusEffects: [efeito({ type: 'DEBUFF', stat: 'defense', magnitude: 25 })] })
    expect(getCombatStat(c, 'defense')).toBe(15)
  })

  it('soma buff e debuff no mesmo stat', () => {
    const c = combatant({
      attack: 100,
      statusEffects: [
        efeito({ id: 'a', type: 'BUFF', stat: 'attack', magnitude: 30 }),
        efeito({ id: 'b', type: 'DEBUFF', stat: 'attack', magnitude: 10 }),
      ],
    })
    expect(getCombatStat(c, 'attack')).toBe(120)
  })

  it('ignora efeitos de outro stat', () => {
    const c = combatant({ attack: 20, statusEffects: [efeito({ type: 'BUFF', stat: 'speed', magnitude: 100 })] })
    expect(getCombatStat(c, 'attack')).toBe(20)
  })

  it('nunca devolve valor negativo, mesmo com debuff acima de 100%', () => {
    const c = combatant({ attack: 20, statusEffects: [efeito({ type: 'DEBUFF', stat: 'attack', magnitude: 150 })] })
    expect(getCombatStat(c, 'attack')).toBe(0)
  })
})

describe('isStunned', () => {
  it('detecta stun ativo', () => {
    expect(isStunned(combatant({ statusEffects: [efeito({ type: 'STUN', remainingRounds: 1 })] }))).toBe(true)
  })

  it('stun expirado não conta', () => {
    expect(isStunned(combatant({ statusEffects: [efeito({ type: 'STUN', remainingRounds: 0 })] }))).toBe(false)
  })

  it('sem efeitos, não está atordoado', () => {
    expect(isStunned(combatant())).toBe(false)
  })
})

describe('applyTransformation', () => {
  it('o bônus plano vai no atributo; o percentual de ataque e defesa vai no GOLPE', () => {
    // Ver applyTransformation: multiplicar o atributo quase não mudava o dano
    // e não valia nada para quem escala de energia.
    const c = combatant({ attack: 20, baseAttack: 20 })
    const t = transformacao({ flatAttackBonus: 10, attackModifier: 0.5, defenseModifier: 0.2 })
    const r = applyTransformation(c, t)
    expect(r.attack).toBe(30)
    expect(r.formaDano).toBe(0.5)
    expect(r.formaGuarda).toBe(0.2)
  })

  it('a forma aumenta o dano de golpe que escala de ENERGIA, não só de ataque', () => {
    const kidō = skill({ id: 'kido', power: 30, energyCost: 0, scalingStat: 'energy' })
    const rodada = (s: ReturnType<typeof createInitialState>) =>
      resolveRound(
        s,
        { aliadas: [{ kind: 'ATTACK', skillId: 'kido' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
        { ...ctxVazio(), playerSkills: { kido: kidō } },
        NUNCA_CRITA
      )
    const base = createInitialState(stats({ hp: 1000 }), stats({ hp: 1000 }))
    const semForma = rodada(base)
    const comForma = rodada(comHeroi(base, applyTransformation(heroi(base), transformacao({ attackModifier: 0.5 }))))
    const dano = (r: ReturnType<typeof rodada>) => 1000 - vilao(r.state).currentHp
    expect(dano(comForma)).toBeGreaterThan(dano(semForma) * 1.4)
  })

  it('a guarda da forma corta o dano recebido', () => {
    const base = createInitialState(stats({ hp: 1000 }), stats({ hp: 1000, attack: 40 }))
    const semForma = resolveRound(base, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    const guardado = comHeroi(base, applyTransformation(heroi(base), transformacao({ defenseModifier: 0.5 })))
    const comForma = resolveRound(guardado, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(1000 - heroi(comForma.state).currentHp).toBeLessThan(1000 - heroi(semForma.state).currentHp)
  })

  it('aumenta HP máximo e atual pelo bônus plano', () => {
    const c = combatant({ currentHp: 50, maxHp: 100, baseMaxHp: 100 })
    const r = applyTransformation(c, transformacao({ flatHpBonus: 40 }))
    expect(r.maxHp).toBe(140)
    expect(r.currentHp).toBe(90)
  })

  it('não deixa o HP atual passar do novo máximo', () => {
    const c = combatant({ currentHp: 100, maxHp: 100, baseMaxHp: 100 })
    const r = applyTransformation(c, transformacao({ flatHpBonus: 20 }))
    expect(r.currentHp).toBeLessThanOrEqual(r.maxHp)
    expect(r.currentHp).toBe(120)
  })

  it('reduz energia atual se o novo máximo for menor', () => {
    const c = combatant({ currentEnergy: 100, maxEnergy: 100, baseMaxEnergy: 100 })
    const r = applyTransformation(c, transformacao({ energyModifier: -0.5 }))
    expect(r.maxEnergy).toBe(50)
    expect(r.currentEnergy).toBe(50)
  })

  it('registra qual transformação está ativa', () => {
    const r = applyTransformation(combatant(), transformacao({ id: 'ssj' }))
    expect(r.activeTransformationId).toBe('ssj')
  })

  it('recalcula a partir da base, então transformar duas vezes não acumula', () => {
    const c = combatant({ attack: 20, baseAttack: 20 })
    const t = transformacao({ attackModifier: 1, speedModifier: 1, flatAttackBonus: 5 })
    const duas = applyTransformation(applyTransformation(c, t), t)
    expect(duas.attack).toBe(25)
    expect(duas.formaDano).toBe(1)
    expect(duas.speed).toBe(applyTransformation(c, t).speed)
  })
})

describe('resolveRound — dano e energia', () => {
  it('ataque básico tira HP do inimigo', () => {
    const s = createInitialState(stats(), stats())
    const { state, turnResults } = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(vilao(state).currentHp).toBeLessThan(100)
    expect(turnResults.some((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')).toBe(true)
  })

  it('crítico multiplica o dano por 1.5', () => {
    const s = createInitialState(stats(), stats())
    const normal = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    const critico = resolveRound(s, ataqueBasico, ctxVazio(), SEMPRE_CRITA)
    const dNormal = normal.turnResults.find((t) => t.side === 'PLAYER')!.damage!
    const dCritico = critico.turnResults.find((t) => t.side === 'PLAYER')!.damage!
    expect(dCritico).toBe(Math.round(dNormal * 1.5))
    expect(critico.turnResults.find((t) => t.side === 'PLAYER')!.isCrit).toBe(true)
  })

  it('defesa alta reduz o dano recebido', () => {
    const fraco = createInitialState(stats(), stats({ defense: 0 }))
    const forte = createInitialState(stats(), stats({ defense: 200 }))
    const dFraco = resolveRound(fraco, ataqueBasico, ctxVazio(), NUNCA_CRITA).turnResults.find((t) => t.side === 'PLAYER')!.damage!
    const dForte = resolveRound(forte, ataqueBasico, ctxVazio(), NUNCA_CRITA).turnResults.find((t) => t.side === 'PLAYER')!.damage!
    expect(dForte).toBeLessThan(dFraco)
  })

  it('dano mínimo é 1, mesmo com defesa absurda', () => {
    const s = createInitialState(stats({ attack: 1 }), stats({ defense: 100000 }))
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.turnResults.find((t) => t.side === 'PLAYER')!.damage).toBeGreaterThanOrEqual(1)
  })

  it('usar skill consome energia e coloca em cooldown', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentEnergy = 100
    const sk = skill({ energyCost: 25, cooldown: 3 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'sk-1' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { 'sk-1': sk } },
      NUNCA_CRITA
    )
    // cheia, a regeneração do início da rodada esbarra no teto; depois paga 25
    expect(heroi(r.state).currentEnergy).toBe(100 - 25)
    expect(heroi(r.state).cooldowns['sk-1']).toBe(3)
  })

  it('energia regenera ENERGY_REGEN_PCT do máximo no início da rodada', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentEnergy = 50
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(heroi(r.state).currentEnergy).toBe(50 + Math.round(100 * ENERGY_REGEN_PCT))
  })

  it('energia regenerada não passa do máximo', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentEnergy = 100
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(heroi(r.state).currentEnergy).toBe(100)
  })
})

describe('resolveRound — efeitos de status', () => {
  it('SHIELD absorve o dano antes do HP', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'SHIELD', magnitude: 1000, remainingRounds: 5 })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(vilao(r.state).currentHp).toBe(100)
  })

  it('COUNTER anula o ataque e reflete parte do dano no atacante', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'COUNTER', magnitude: 50, remainingRounds: 5 })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    const golpe = r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!
    expect(golpe.countered).toBe(true)
    expect(golpe.damage).toBe(0)
    expect(golpe.reflectedDamage).toBeGreaterThan(0)
    expect(heroi(r.state).currentHp).toBeLessThan(100)
  })

  it('COUNTER é consumido depois de refletir uma vez', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'COUNTER', magnitude: 50, remainingRounds: 5 })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(vilao(r.state).statusEffects.filter((e) => e.type === 'COUNTER')).toHaveLength(0)
  })

  it('DOT tira HP no início da rodada e gera um resultado próprio', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'DOT', magnitude: 15, remainingRounds: 3, sourceSkillName: 'Veneno' })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    const tick = r.turnResults.find((t) => t.kind === 'DOT_TICK')
    expect(tick).toBeDefined()
    expect(tick!.damage).toBe(15)
    expect(tick!.skillName).toBe('Veneno')
  })

  it('quem está atordoado perde o turno', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'STUN', remainingRounds: 3 })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.turnResults.some((t) => t.side === 'ENEMY' && t.kind === 'STUNNED')).toBe(true)
    expect(heroi(r.state).currentHp).toBe(100) // inimigo não atacou
  })

  it('efeitos perdem uma rodada de duração e somem ao zerar', () => {
    const s = createInitialState(stats(), stats())
    vilao(s).statusEffects = [efeito({ type: 'BUFF', stat: 'attack', magnitude: 10, remainingRounds: 1 })]
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(vilao(r.state).statusEffects).toHaveLength(0)
  })

  it('HEAL não cura acima do HP máximo', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentHp = 95
    const cura: SkillEffect = { type: 'HEAL', target: 'SELF', magnitude: 999 }
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'cura' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { cura: skill({ id: 'cura', power: 0, effects: [cura] }) } },
      NUNCA_CRITA
    )
    expect(heroi(r.state).currentHp).toBeLessThanOrEqual(100)
  })

  it('LIFESTEAL cura o atacante em % do dano causado', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentHp = 50
    const roubo: SkillEffect = { type: 'LIFESTEAL', target: 'SELF', magnitude: 100 }
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'vamp' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { vamp: skill({ id: 'vamp', power: 30, effects: [roubo] }) } },
      NUNCA_CRITA
    )
    expect(heroi(r.state).currentHp).toBeGreaterThan(50 - 30)
  })
})

describe('resolveRound — ordem, transformação e desfecho', () => {
  it('quem tem mais velocidade age primeiro', () => {
    const s = createInitialState(stats({ speed: 1 }), stats({ speed: 100 }))
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    const ataques = r.turnResults.filter((t) => t.kind === 'ATTACK')
    expect(ataques[0].side).toBe('ENEMY')
  })

  it('empate de velocidade favorece o jogador', () => {
    const s = createInitialState(stats({ speed: 10 }), stats({ speed: 10 }))
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.turnResults.filter((t) => t.kind === 'ATTACK')[0].side).toBe('PLAYER')
  })

  it('ação TRANSFORM aplica a transformação e não ataca', () => {
    const s = createInitialState(stats(), stats())
    const t = transformacao({ id: 'ssj', attackModifier: 1 })
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'TRANSFORM', transformationId: 'ssj' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerTransformations: { ssj: t } },
      NUNCA_CRITA
    )
    expect(heroi(r.state).activeTransformationId).toBe('ssj')
    expect(r.turnResults.some((x) => x.kind === 'TRANSFORM')).toBe(true)
    expect(r.turnResults.some((x) => x.side === 'PLAYER' && x.kind === 'ATTACK')).toBe(false)
  })

  it('transformação com LOW_HP dispara sozinha quando o HP está baixo', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentHp = 20 // 20% <= 30% padrão
    const t = transformacao({ id: 'rage', triggerType: 'LOW_HP', triggerPayload: { threshold: 0.3 } })
    const r = resolveRound(s, ataqueBasico, { ...ctxVazio(), playerTransformations: { rage: t } }, NUNCA_CRITA)
    expect(heroi(r.state).activeTransformationId).toBe('rage')
  })

  it('transformação com drain reverte quando falta energia pra sustentar', () => {
    const s = createInitialState(stats(), stats())
    heroi(s).currentEnergy = 0
    heroi(s).activeTransformationId = 'caro'
    const t = transformacao({ id: 'caro', drainPerTurn: 50, attackModifier: 1 })
    const r = resolveRound(s, ataqueBasico, { ...ctxVazio(), playerTransformations: { caro: t } }, NUNCA_CRITA)
    expect(heroi(r.state).activeTransformationId).toBeNull()
    expect(heroi(r.state).attack).toBe(heroi(r.state).baseAttack)
  })

  it('zerar o HP do inimigo resulta em PLAYER_WIN', () => {
    const s = createInitialState(stats({ attack: 500 }), stats({ hp: 1, defense: 0 }))
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.state.outcome).toBe('PLAYER_WIN')
  })

  it('HP nunca fica negativo', () => {
    const s = createInitialState(stats({ attack: 9999 }), stats({ hp: 1, defense: 0 }))
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(vilao(r.state).currentHp).toBe(0)
  })

  it('batalha já encerrada não é sobrescrita por uma rodada sem morte', () => {
    const s = createInitialState(stats(), stats())
    s.outcome = 'PLAYER_WIN'
    const r = resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.state.outcome).toBe('PLAYER_WIN')
  })

  it('não muta o estado recebido (pureza)', () => {
    const s = createInitialState(stats(), stats())
    const copia = structuredClone(s)
    resolveRound(s, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(s).toEqual(copia)
  })
})

describe('sumStatBonuses', () => {
  it('sem fontes, devolve tudo zerado', () => {
    expect(sumStatBonuses()).toEqual(SEM_BONUS)
  })

  it('soma árvore de skills e equipamento campo a campo', () => {
    const arvore = { hp: 10, attack: 2, defense: 1, speed: 0, energy: 0, stamina: 0 }
    const equipamento = { hp: 8, attack: 0, defense: 3, speed: 5, energy: 0, stamina: 0 }
    expect(sumStatBonuses(arvore, equipamento)).toEqual({
      hp: 18, attack: 2, defense: 4, speed: 5, energy: 0, stamina: 0,
      accuracy: 0, agility: 0, intelligence: 0,
    })
  })

  it('bônus negativo (ex: Fragmento de Máscara Hollow) subtrai', () => {
    expect(sumStatBonuses({ hp: 20, attack: 0, defense: 0, speed: 0, energy: 0, stamina: 0 }, { hp: -10, attack: 12, defense: 0, speed: 0 })).toEqual({
      hp: 10,
      attack: 12,
      defense: 0,
      speed: 0,
      energy: 0,
      stamina: 0,
      accuracy: 0,
      agility: 0,
      intelligence: 0,
    })
  })

  it('aceita mais de duas fontes', () => {
    const um = { hp: 1, attack: 1, defense: 1, speed: 1, energy: 0, stamina: 0 }
    expect(sumStatBonuses(um, um, um)).toEqual({
      hp: 3, attack: 3, defense: 3, speed: 3, energy: 0, stamina: 0,
      accuracy: 0, agility: 0, intelligence: 0,
    })
  })
})

// A correção estrutural: antes, só o inimigo do modo história escalava por
// nível. O jogador ficava parado, então dificuldade e progressão divergiam
// até a história virar invencível.
describe('computeFighterStats', () => {
  const base = { hp: 130, attack: 18, defense: 11, speed: 12, energy: 100, stamina: 90 }
  const semBonus = SEM_BONUS

  it('no nível 1 é idêntico a só somar os bônus', () => {
    const bonus = { hp: 10, attack: 2, defense: 0, speed: 0, energy: 0, stamina: 0 }
    expect(computeFighterStats(base, 1, bonus)).toEqual(computeBaseStats(base, bonus))
  })

  it('escala o personagem pelo nível', () => {
    // nível 5 => 1 + 4*0.12 = 1.48
    // Acurácia, agilidade e inteligência NÃO são multiplicadas pelo nível —
    // seguem em 11 enquanto o resto cresce 48%. Ver o comentário em
    // schema.prisma: se escalassem, a diferença entre acurácia e agilidade
    // cresceria junto e a evasão inflaria sozinha ao longo do jogo.
    expect(computeFighterStats(base, 5, semBonus)).toEqual({
      hp: 192, attack: 27, defense: 16, speed: 18, energy: 148, stamina: 133,
      accuracy: 11, agility: 11, intelligence: 11,
    })
  })

  it('bônus plano NÃO é escalado — entra depois, valor cheio', () => {
    const bonus = { hp: 100, attack: 100, defense: 100, speed: 100, energy: 0, stamina: 0 }
    const semEle = computeFighterStats(base, 5, semBonus)
    const comEle = computeFighterStats(base, 5, bonus)
    expect(comEle.hp - semEle.hp).toBe(100)
    expect(comEle.attack - semEle.attack).toBe(100)
    expect(comEle.defense - semEle.defense).toBe(100)
    expect(comEle.speed - semEle.speed).toBe(100)
  })

  it('escala antes de somar, e não o contrário', () => {
    const bonus = { hp: 10, attack: 2, defense: 0, speed: 0, energy: 0, stamina: 0 }
    // se somasse antes de escalar, o HP seria round((130+10)*1.48) = 207
    expect(computeFighterStats(base, 5, bonus).hp).toBe(202)
  })

  it('dois personagens iguais no mesmo nível continuam simétricos', () => {
    expect(computeFighterStats(base, 7, semBonus)).toEqual(computeFighterStats(base, 7, semBonus))
  })

  it('o bônus perde peso relativo conforme o nível sobe (a gear se supera)', () => {
    const bonus = { hp: 0, attack: 2, defense: 0, speed: 0, energy: 0, stamina: 0 }
    const peso = (lv: number) => 2 / computeFighterStats(base, lv, bonus).attack
    expect(peso(10)).toBeLessThan(peso(1))
  })
})

describe('escala por atributo', () => {
  // Um turno em que só o jogador age com a skill dada, sem crítico.
  const usa = (s: ReturnType<typeof createInitialState>, sk: SkillDef) =>
    resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK' as const, skillId: sk.id }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { [sk.id]: sk } },
      NUNCA_CRITA
    ).turnResults.find((t) => t.side === 'PLAYER')!

  it('skill que escala de ataque ignora a energia do lançador', () => {
    const sk = skill({ power: 20, energyCost: 0, effects: [], scalingStat: 'attack' })
    const pouca = usa(createInitialState(stats({ energy: 50 }), stats()), sk).damage!
    const muita = usa(createInitialState(stats({ energy: 300 }), stats()), sk).damage!
    expect(pouca).toBe(muita)
  })

  it('skill que escala de energia bate mais forte com reserva maior', () => {
    const sk = skill({ power: 20, energyCost: 0, effects: [], scalingStat: 'energy' })
    const pouca = usa(createInitialState(stats({ energy: 50 }), stats()), sk).damage!
    const muita = usa(createInitialState(stats({ energy: 300 }), stats()), sk).damage!
    expect(muita).toBeGreaterThan(pouca)
  })

  it('escala da reserva MÁXIMA, não da atual — gastar energia não enfraquece', () => {
    const sk = skill({ id: 'kido', power: 20, energyCost: 0, effects: [], scalingStat: 'energy' })
    const cheio = createInitialState(stats({ energy: 200 }), stats())
    const gasto = comHeroi(cheio, { currentEnergy: 10 })
    expect(usa(gasto, sk).damage!).toBe(usa(cheio, sk).damage!)
  })

  it('cura escala com o atributo de quem lança', () => {
    const sk = skill({
      power: 0,
      energyCost: 0,
      scalingStat: 'energy',
      effects: [{ type: 'HEAL', target: 'SELF', magnitude: 10 }],
    })
    const ferido = (energia: number) => {
      const s = createInitialState(stats({ energy: energia }), stats())
      return comHeroi(s, { currentHp: 1 })
    }
    expect(usa(ferido(300), sk).healed!).toBeGreaterThan(usa(ferido(50), sk).healed!)
  })

  it('escudo escala, mas dano contínuo não — DOT multiplica pela duração', () => {
    const escudo = skill({
      power: 0,
      energyCost: 0,
      scalingStat: 'energy',
      effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 10, duration: 2 }],
    })
    const dot = skill({
      power: 0,
      energyCost: 0,
      scalingStat: 'energy',
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 2 }],
    })
    const mag = (sk: SkillDef, energia: number) =>
      usa(createInitialState(stats({ energy: energia }), stats()), sk).effectsApplied!.find(
        (e: AppliedEffect) => e.type === sk.effects[0].type
      )!.magnitude

    expect(mag(escudo, 300)).toBeGreaterThan(mag(escudo, 50))
    expect(mag(dot, 300)).toBe(mag(dot, 50))
  })

  it('ataque básico escala de ataque, porque é golpe físico e não técnica', () => {
    const s = (atk: number) => createInitialState(stats({ attack: atk }), stats())
    const dano = (atk: number) =>
      resolveRound(s(atk), ataqueBasico, ctxVazio(), NUNCA_CRITA).turnResults.find((t) => t.side === 'PLAYER')!.damage!
    expect(dano(40)).toBeGreaterThan(dano(10))
  })
})

describe('reaplicar efeito renova, não empilha', () => {
  const usa = (s: ReturnType<typeof createInitialState>, sk: SkillDef) =>
    resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK' as const, skillId: sk.id }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { [sk.id]: sk } },
      NUNCA_CRITA
    )

  const veneno = skill({
    id: 'veneno',
    name: 'Veneno',
    power: 0,
    energyCost: 0,
    cooldown: 0,
    effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 3 }],
  })

  it('a mesma habilidade lançada duas vezes deixa UMA instância', () => {
    let s = createInitialState(stats(), stats())
    s = usa(s, veneno).state
    s = usa(s, veneno).state
    expect(vilao(s).statusEffects.filter((e) => e.type === 'DOT')).toHaveLength(1)
  })

  it('renovar devolve a duração cheia', () => {
    let s = createInitialState(stats(), stats())
    s = usa(s, veneno).state
    const depoisDeUma = vilao(s).statusEffects.find((e) => e.type === 'DOT')!.remainingRounds
    s = usa(s, veneno).state
    expect(vilao(s).statusEffects.find((e) => e.type === 'DOT')!.remainingRounds).toBeGreaterThanOrEqual(
      depoisDeUma
    )
  })

  it('habilidades DIFERENTES continuam empilhando', () => {
    const outro = skill({
      id: 'veneno2',
      name: 'Outro Veneno',
      power: 0,
      energyCost: 0,
      cooldown: 0,
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 3 }],
    })
    let s = createInitialState(stats(), stats())
    s = usa(s, veneno).state
    s = usa(s, outro).state
    expect(vilao(s).statusEffects.filter((e) => e.type === 'DOT')).toHaveLength(2)
  })

  it('uma habilidade com buff de dois atributos mantém os dois', () => {
    const duplo = skill({
      id: 'duplo',
      name: 'Orgulho',
      power: 0,
      energyCost: 0,
      cooldown: 0,
      effects: [
        { type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 15, duration: 3 },
        { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 15, duration: 3 },
      ],
    })
    let s = createInitialState(stats(), stats())
    s = usa(s, duplo).state
    s = usa(s, duplo).state
    const buffs = heroi(s).statusEffects.filter((e) => e.type === 'BUFF')
    expect(buffs).toHaveLength(2)
    expect(buffs.map((b) => b.stat).sort()).toEqual(['attack', 'defense'])
  })

  it('o dano por rodada do veneno não cresce ao relançar', () => {
    let s = createInitialState(stats(), stats())
    s = usa(s, veneno).state
    const hp1 = vilao(s).currentHp
    s = usa(s, veneno).state
    const tick1 = hp1 - vilao(s).currentHp
    s = usa(s, veneno).state
    const tick2 = vilao(s).currentHp
    s = usa(s, veneno).state
    expect(tick2 - vilao(s).currentHp).toBe(tick1)
  })
})

describe('applyBossOverrides', () => {
  const base = stats({ hp: 200, attack: 40, defense: 20, speed: 30, energy: 300 })

  it('sem override nenhum, devolve os stats intactos', () => {
    expect(applyBossOverrides(base, {})).toEqual(base)
  })

  it('nulo também significa "usa o valor do personagem"', () => {
    expect(applyBossOverrides(base, { bossSpeed: null, bossHp: null })).toEqual(base)
  })

  it('substitui só o campo dado, o que permite corrigir uma dimensão só', () => {
    const r = applyBossOverrides(base, { bossSpeed: 22 })
    expect(r.speed).toBe(22)
    expect(r.hp).toBe(200)
    expect(r.attack).toBe(40)
    expect(r.energy).toBe(300)
  })

  it('aceita zero como valor legítimo, não como ausência', () => {
    expect(applyBossOverrides(base, { bossAttack: 0 }).attack).toBe(0)
  })

  it('substitui todos quando todos são dados', () => {
    expect(
      applyBossOverrides(base, {
        bossHp: 1,
        bossAttack: 2,
        bossDefense: 3,
        bossSpeed: 4,
        bossEnergy: 5,
        bossStamina: 6,
      })
    ).toEqual({ hp: 1, attack: 2, defense: 3, speed: 4, energy: 5, stamina: 6 })
  })
})

describe('traços passivos', () => {
  const traco = (over: Partial<TraitDef> = {}): TraitDef => ({
    name: 'Traço',
    energyModifier: 0,
    attackModifier: 0,
    defenseModifier: 0,
    speedModifier: 0,
    flatHpBonus: 0,
    flatAttackBonus: 0,
    flatDefenseBonus: 0,
    flatSpeedBonus: 0,
    energyCostModifier: 0,
    ...over,
  })

  it('sem traço nenhum, devolve os stats intactos', () => {
    const s = stats()
    expect(applyTraits(s, [])).toBe(s)
  })

  it('modificador percentual multiplica o atributo', () => {
    const r = applyTraits(stats({ speed: 20 }), [traco({ speedModifier: 0.5 })])
    expect(r.speed).toBe(30)
  })

  it('bônus plano soma DEPOIS do percentual', () => {
    // 20 * 1.5 = 30, e só então +5. Se somasse antes daria 37.
    const r = applyTraits(stats({ speed: 20 }), [traco({ speedModifier: 0.5, flatSpeedBonus: 5 })])
    expect(r.speed).toBe(35)
  })

  it('traço com lado ruim reduz de verdade', () => {
    const r = applyTraits(stats({ attack: 20, defense: 20 }), [
      traco({ attackModifier: 0.12, defenseModifier: -0.06 }),
    ])
    expect(r.attack).toBe(22)
    expect(r.defense).toBe(19)
  })

  it('vários traços somam os percentuais', () => {
    const r = applyTraits(stats({ attack: 100 }), [
      traco({ attackModifier: 0.1 }),
      traco({ name: 'B', attackModifier: 0.2 }),
    ])
    expect(r.attack).toBe(130)
  })

  it('desconto de custo de energia barateia a habilidade', () => {
    const c = combatant({ energyCostModifier: -0.3 })
    expect(energyCostFor(c, 20)).toBe(14)
  })

  it('habilidade gratuita continua gratuita', () => {
    expect(energyCostFor(combatant({ energyCostModifier: -0.9 }), 0)).toBe(0)
  })

  it('desconto extremo nunca zera o custo de quem custa algo', () => {
    // Energia tem que continuar sendo recurso, senão a rotação perde sentido.
    expect(energyCostFor(combatant({ energyCostModifier: -0.99 }), 20)).toBe(1)
  })

  it('batalha antiga, gravada sem o campo, é tratada como sem desconto', () => {
    const c = combatant()
    delete (c as { energyCostModifier?: number }).energyCostModifier
    expect(energyCostFor(c, 20)).toBe(20)
  })

  it('traitEnergyCostModifier soma os descontos', () => {
    expect(
      traitEnergyCostModifier([traco({ energyCostModifier: -0.3 }), traco({ name: 'B', energyCostModifier: -0.15 })])
    ).toBeCloseTo(-0.45)
  })
})

describe('stamina — reserva defensiva separada', () => {
  const escudo = skill({
    id: 'escudo',
    power: 0,
    energyCost: 20,
    cooldown: 0,
    effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 20, duration: 2 }],
  })
  const golpe = skill({ id: 'golpe', power: 20, energyCost: 20, cooldown: 0, effects: [] })

  it('habilidade puramente defensiva sai da stamina', () => {
    expect(custaStamina(escudo)).toBe(true)
    expect(custaStamina(skill({ power: 0, effects: [{ type: 'HEAL', target: 'SELF', magnitude: 10 }] }))).toBe(true)
    expect(custaStamina(skill({ power: 0, effects: [{ type: 'COUNTER', target: 'SELF', magnitude: 40, duration: 1 }] }))).toBe(true)
  })

  it('buff em si mesmo é defensivo; debuff no inimigo não é', () => {
    const proprio = skill({ power: 0, effects: [{ type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 10, duration: 2 }] })
    const alheio = skill({ power: 0, effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 10, duration: 2 }] })
    expect(custaStamina(proprio)).toBe(true)
    expect(custaStamina(alheio)).toBe(false)
  })

  it('habilidade que causa dano E protege continua saindo da energia', () => {
    // Senão o atacante pagaria o próprio dano com a barra defensiva.
    const hibrida = skill({ power: 25, effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 20, duration: 2 }] })
    expect(custaStamina(hibrida)).toBe(false)
  })

  it('sem stamina, a defensiva é ilegal mesmo com energia cheia', () => {
    const c = combatant({ currentEnergy: 100, currentStamina: 0, maxStamina: 100 })
    expect(isLegalMove(c, escudo)).toBe(false)
    expect(isLegalMove(c, golpe)).toBe(true)
  })

  it('sem energia, o golpe é ilegal mesmo com stamina cheia', () => {
    const c = combatant({ currentEnergy: 0, currentStamina: 100, maxStamina: 100 })
    expect(isLegalMove(c, golpe)).toBe(false)
    expect(isLegalMove(c, escudo)).toBe(true)
  })

  it('usar defensiva NÃO gasta energia, e vice-versa', () => {
    const s = createInitialState(stats({ energy: 100, stamina: 100 }), stats())
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'escudo' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { escudo } },
      NUNCA_CRITA
    )
    // A energia só varia pela regeneração da rodada, nunca pelo custo.
    expect(heroi(r.state).currentEnergy).toBeGreaterThanOrEqual(heroi(s).currentEnergy)
    expect(heroi(r.state).currentStamina!).toBeLessThan(100)
  })

  it('stamina regenera mais devagar que energia — é o que impede defesa infinita', () => {
    const s = createInitialState(stats({ energy: 100, stamina: 100 }), stats())
    const gasto = comHeroi(s, { currentEnergy: 0, currentStamina: 0 })
    const r = resolveRound(gasto, ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(heroi(r.state).currentStamina!).toBeLessThan(heroi(r.state).currentEnergy)
  })

  it('batalha antiga, sem o campo, trata stamina como zero em vez de quebrar', () => {
    const c = combatant()
    delete (c as { currentStamina?: number }).currentStamina
    delete (c as { maxStamina?: number }).maxStamina
    expect(isLegalMove(c, escudo)).toBe(false)
    expect(isLegalMove(c, golpe)).toBe(true)
  })
})

describe('dreno de vida da transformação', () => {
  const forma = (over: Partial<TransformationDef> = {}): TransformationDef =>
    transformacao({ id: 'portoes', drainPerTurn: 0, drainHpPerTurn: 10, ...over })

  const comForma = (hp: number, t: TransformationDef) => {
    const s = createInitialState(stats({ hp: 200 }), stats())
    return comHeroi(s, { currentHp: hp, activeTransformationId: t.id })
  }

  const rodada = (estado: ReturnType<typeof comForma>, t: TransformationDef) =>
    resolveRound(estado, ataqueBasico, { ...ctxVazio(), playerTransformations: { [t.id]: t } }, NUNCA_CRITA)

  it('tira vida a cada rodada', () => {
    const t = forma()
    const r = rodada(comForma(200, t), t)
    // 10 do dreno, mais o que o inimigo causar — o dreno tem que ter cobrado.
    expect(heroi(r.state).currentHp).toBeLessThanOrEqual(190)
    expect(heroi(r.state).activeTransformationId).toBe('portoes')
  })

  it('NÃO mata: ao chegar no limite, a forma cai e sobra 1 de HP', () => {
    // Deixar a transformação matar quem a usou é fiel à obra e péssimo de
    // jogar — perde-se a luta por uma escolha feita cinco rodadas antes.
    const t = forma({ drainHpPerTurn: 50 })
    const r = rodada(comForma(30, t), t)
    expect(heroi(r.state).activeTransformationId).toBe(null)
    expect(heroi(r.state).currentHp).toBeGreaterThanOrEqual(0)
  })

  it('sem energia para sustentar, a forma cai ANTES de cobrar vida', () => {
    const t = forma({ drainPerTurn: 40, drainHpPerTurn: 10 })
    const s = comForma(200, t)
    const semEnergia = comHeroi(s, { currentEnergy: 5 })
    const r = rodada(semEnergia, t)
    expect(heroi(r.state).activeTransformationId).toBe(null)
  })

  it('forma sem dreno nenhum não cobra nada', () => {
    const t = forma({ drainPerTurn: 0, drainHpPerTurn: 0 })
    const antes = comForma(200, t)
    const r = rodada(antes, t)
    expect(heroi(r.state).activeTransformationId).toBe('portoes')
  })

  it('transformação antiga, gravada sem o campo, é tratada como sem dreno de vida', () => {
    const t = forma()
    delete (t as { drainHpPerTurn?: number }).drainHpPerTurn
    const r = rodada(comForma(200, t), t)
    expect(heroi(r.state).activeTransformationId).toBe('portoes')
  })
})

describe('choque de golpes', () => {
  const feixe = (id: string, power: number) =>
    skill({ id, name: id, power, energyCost: 0, cooldown: 0, effects: [], tags: ['beam'] })

  it('duas habilidades da mesma natureza se chocam', () => {
    expect(tagDeClash(feixe('a', 20), feixe('b', 20))).toBe('beam')
  })

  it('naturezas diferentes não se chocam', () => {
    const lamina = skill({ id: 'l', power: 20, tags: ['espada'] })
    expect(tagDeClash(feixe('a', 20), lamina)).toBe(null)
  })

  it('ataque básico não choca — não há força a opor', () => {
    expect(tagDeClash(null, feixe('b', 20))).toBe(null)
    expect(tagDeClash(feixe('a', 20), null)).toBe(null)
  })

  it('habilidade sem dano não choca, mesmo com a tag', () => {
    const escudoComTag = skill({ id: 's', power: 0, tags: ['beam'] })
    expect(tagDeClash(escudoComTag, feixe('b', 20))).toBe(null)
  })

  it('tag que não está na lista não gera choque', () => {
    const fogo = skill({ id: 'f', power: 20, tags: ['fogo'] })
    const outroFogo = skill({ id: 'f2', power: 20, tags: ['fogo'] })
    expect(tagDeClash(fogo, outroFogo)).toBe(null)
  })

  it('o golpe muito mais forte vence o choque', () => {
    const c = combatant()
    const r = resolverClash(c, c, feixe('forte', 200), feixe('fraco', 5), () => 0.5)
    expect(r.vencedor).toBe('PLAYER')
  })

  it('golpes iguais empatam, e os dois se anulam', () => {
    const c = combatant()
    expect(resolverClash(c, c, feixe('a', 30), feixe('b', 30), () => 0.5).vencedor).toBe(null)
  })

  it('na batalha, o choque anula o golpe do perdedor', () => {
    const s = createInitialState(stats(), stats())
    const meu = feixe('meu', 200)
    const dele = feixe('dele', 5)
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'meu' }], inimigas: [{ kind: 'ATTACK', skillId: 'dele' }] },
      { ...ctxVazio(), playerSkills: { meu }, enemySkills: { dele } },
      NUNCA_CRITA
    )
    expect(r.turnResults.some((t) => t.kind === 'CLASH')).toBe(true)
    // O inimigo perdeu: não deve haver ataque dele na rodada.
    expect(r.turnResults.some((t) => t.side === 'ENEMY' && t.kind === 'ATTACK')).toBe(false)
    expect(vilao(r.state).currentHp).toBeLessThan(100)
  })

  it('o golpe anulado no choque ainda é PAGO: gasta energia e entra em recarga', () => {
    // Sem isso, perder o choque saía de graça e a técnica voltava na rodada
    // seguinte; num espelho os dois se chocavam para sempre sem gastar nada.
    const s = createInitialState(stats({ hp: 5000 }), stats({ hp: 5000 }))
    const meu = { ...feixe('meu', 200), energyCost: 30, cooldown: 3 }
    const dele = { ...feixe('dele', 5), energyCost: 30, cooldown: 3 }
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'meu' }], inimigas: [{ kind: 'ATTACK', skillId: 'dele' }] },
      { ...ctxVazio(), playerSkills: { meu }, enemySkills: { dele } },
      NUNCA_CRITA
    )
    expect(r.turnResults.some((t) => t.kind === 'CLASH')).toBe(true)
    expect(vilao(r.state).currentEnergy).toBe(heroi(r.state).currentEnergy)
    expect(vilao(r.state).currentEnergy).toBeLessThan(100)
    expect(vilao(r.state).cooldowns['dele']).toBeGreaterThan(0)
  })

  it('empate no choque gasta a rodada dos dois', () => {
    const s = createInitialState(stats(), stats())
    const a = feixe('a', 30)
    const b = feixe('b', 30)
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'a' }], inimigas: [{ kind: 'ATTACK', skillId: 'b' }] },
      { ...ctxVazio(), playerSkills: { a }, enemySkills: { b } },
      NUNCA_CRITA
    )
    expect(r.turnResults.filter((t) => t.kind === 'ATTACK')).toHaveLength(0)
    expect(heroi(r.state).currentHp).toBe(100)
    expect(vilao(r.state).currentHp).toBe(100)
  })
})

describe('forma que não gasta a rodada', () => {
  // O motor não decide nada sobre isso — quem decide é a action, que aplica a
  // forma sem resolver rodada. O que o motor precisa garantir é que a forma
  // aplicada é a mesma nos dois caminhos.
  it('aplicar a forma dá o mesmo resultado, gaste ou não a rodada', () => {
    const c = combatant({ attack: 20, baseAttack: 20 })
    const gasta = transformacao({ id: 'ss', attackModifier: 0.5 })
    const naoGasta = transformacao({ id: 'bankai', attackModifier: 0.5, consumesTurn: false, activationCost: 30 })
    expect(applyTransformation(c, gasta).attack).toBe(applyTransformation(c, naoGasta).attack)
  })

  it('applyTransformation só aplica: quem cobra a ativação é ativarForma', () => {
    // Registrado como teste porque é fácil supor o contrário e cobrar duas
    // vezes. Ver tests/battle/preco-da-forma.test.ts para a cobrança.
    const c = combatant({ currentEnergy: 100 })
    const forma = transformacao({ attackModifier: 0.2, consumesTurn: false, activationCost: 40 })
    expect(applyTransformation(c, forma).currentEnergy).toBe(100)
  })
})

describe('natureza do dano contínuo', () => {
  it('lê fogo, veneno, sangramento e maldição das tags', () => {
    expect(saborDoDot(['fogo'])).toBe('queimadura')
    expect(saborDoDot(['veneno'])).toBe('veneno')
    expect(saborDoDot(['sangramento'])).toBe('sangramento')
    expect(saborDoDot(['maldicao'])).toBe('maldicao')
  })

  it('aceita as duas línguas, porque o catálogo tem as duas', () => {
    // 'fire' e 'fogo', 'poison' e 'veneno', 'bleed' e 'sangramento' convivem
    // no banco desde antes das tags significarem alguma coisa.
    expect(saborDoDot(['fire'])).toBe('queimadura')
    expect(saborDoDot(['poison'])).toBe('veneno')
    expect(saborDoDot(['bleed'])).toBe('sangramento')
    expect(saborDoDot(['decay'])).toBe('maldicao')
  })

  it('sem tag NENHUMA reconhecida, fica indefinido e a tela cai no genérico', () => {
    expect(saborDoDot([])).toBeUndefined()
    expect(saborDoDot(['ultimate', 'canon'])).toBeUndefined()
  })

  it('deduz o sabor do elemento quando ele não foi declarado', () => {
    // A primeira versão só reconhecia as quatro tags de sabor explícitas, e na
    // prática não funcionava: 95 das 131 habilidades com dano contínuo não
    // tinham nenhuma delas e caíam todas no mesmo ícone. O jogador via fogo em
    // tudo — inclusive em corte, veneno e kidō.
    expect(saborDoDot(['espada'])).toBe('sangramento')
    expect(saborDoDot(['pierce'])).toBe('sangramento')
    expect(saborDoDot(['gelo'])).toBe('congelamento')
    expect(saborDoDot(['planta', 'dreno'])).toBe('veneno')
    expect(saborDoDot(['shikigami'])).toBe('maldicao')
    expect(saborDoDot(['cinza'])).toBe('queimadura')
  })

  it('kidō e energia viram queimadura espiritual, não fogo', () => {
    // São 70 das 131: o maior grupo de todos, e o que mais fazia a tela
    // parecer que só existia fogo no jogo.
    expect(saborDoDot(['hado', 'kido'])).toBe('espiritual')
    expect(saborDoDot(['ki', 'beam'])).toBe('espiritual')
    expect(saborDoDot(['cero'])).toBe('espiritual')
  })

  it('o sabor declarado vence o elemento — a ordem da tabela é a regra', () => {
    // Um Hadō de fogo é queimadura, não energia espiritual.
    expect(saborDoDot(['hado', 'kido', 'fogo'])).toBe('queimadura')
    expect(saborDoDot(['espada', 'veneno'])).toBe('veneno')
  })

  it('o efeito aplicado carrega a natureza da habilidade de origem', () => {
    const veneno = skill({
      id: 'v',
      name: 'Corrosão',
      power: 0,
      energyCost: 0,
      cooldown: 0,
      tags: ['maldicao', 'veneno'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 3 }],
    })
    const s = createInitialState(stats(), stats())
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'v' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { v: veneno } },
      NUNCA_CRITA
    )
    const dot = vilao(r.state).statusEffects.find((e) => e.type === 'DOT')
    expect(dot?.flavor).toBe('veneno')
  })

  it('efeito que não é DOT não recebe natureza', () => {
    const escudo = skill({
      id: 'e',
      power: 0,
      energyCost: 0,
      cooldown: 0,
      tags: ['fogo'],
      effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 10, duration: 2 }],
    })
    const s = createInitialState(stats(), stats())
    const r = resolveRound(
      s,
      { aliadas: [{ kind: 'ATTACK', skillId: 'e' }], inimigas: [{ kind: 'ATTACK', skillId: null }] },
      { ...ctxVazio(), playerSkills: { e: escudo } },
      NUNCA_CRITA
    )
    expect(heroi(r.state).statusEffects.find((x) => x.type === 'SHIELD')?.flavor).toBeUndefined()
  })
})

describe('migração do estado gravado', () => {
  // Batalha em andamento vive como snapshot JSON na coluna `state`. Toda luta
  // começada antes de o estado virar time está gravada na forma antiga, e
  // continua assim até terminar — se a migração falhar, o jogador perde a
  // partida em curso por causa de um refactor.
  const v1 = {
    version: 1 as const,
    player: combatant({ currentHp: 42 }),
    enemy: combatant({ currentHp: 17 }),
    outcome: null,
  }

  it('lê a forma antiga e devolve times de um', () => {
    const m = migrarEstado(v1)
    expect(m.version).toBe(2)
    expect(m.aliados).toHaveLength(1)
    expect(m.inimigos).toHaveLength(1)
    expect(heroi(m).currentHp).toBe(42)
    expect(vilao(m).currentHp).toBe(17)
  })

  it('preserva o desfecho já decidido', () => {
    expect(migrarEstado({ ...v1, outcome: 'PLAYER_WIN' }).outcome).toBe('PLAYER_WIN')
  })

  it('é idempotente: a forma nova passa intacta', () => {
    const novo = createInitialState(stats(), stats())
    expect(migrarEstado(novo)).toBe(novo)
  })

  it('uma rodada resolvida a partir da forma antiga já sai na forma nova', () => {
    const r = resolveRound(migrarEstado(v1), ataqueBasico, ctxVazio(), NUNCA_CRITA)
    expect(r.state.version).toBe(2)
    expect(r.state.aliados).toHaveLength(1)
  })
})
