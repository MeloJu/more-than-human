import { describe, it, expect } from 'vitest'
import { comLutadores, createInitialState, resolveRound } from '@/app/lib/battle/engine'
import { acaoDoChefe, type PerfilDeChefe } from '@/app/lib/battle/ai'
import { CARGA_BONUS, EXPOSTO_DANO } from '@/app/lib/battle/constants'
import type { AcoesDaRodada, BaseStats, BattleState, SkillDef, TransformationDef } from '@/app/lib/battle/types'

/**
 * O chefe estilo souls: golpe anunciado, janela de punição, presa e fase 2.
 *
 * O motor não sabe o que é chefe — ele executa CARREGAR e registra quem bateu
 * em quem. Quem decide ser chefe é acaoDoChefe. Os dois lados têm teste aqui
 * porque o aviso da tela promete exatamente o que eles fazem: se o golpe
 * anunciado não saísse, ou saísse em outro alvo, o aviso mentiria.
 */

const NUNCA_CRITA = () => 0.99

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 500,
  attack: 20,
  defense: 10,
  speed: 10,
  energy: 300,
  stamina: 300,
  accuracy: 1000,
  ...over,
})

const cero: SkillDef = {
  id: 'cero',
  name: 'Gran Rey Cero',
  power: 40,
  energyCost: 10,
  cooldown: 0,
  effects: [],
  scalingStat: 'attack',
  tags: ['cero'],
  alcance: 'DISTANCIA',
}
const garra: SkillDef = { ...cero, id: 'garra', name: 'Garra', power: 20, tags: [], alcance: 'CORPO' }
const skills = { cero, garra }

function duelo(): BattleState {
  return createInitialState(stats(), stats())
}

function rodada(estado: BattleState, acoes: AcoesDaRodada, rand: () => number = NUNCA_CRITA) {
  return resolveRound(estado, acoes, { playerSkills: skills, enemySkills: skills, playerTransformations: {} }, rand)
}

const parado = { kind: 'BLOCK' as const }

describe('o golpe carregado', () => {
  it('carregar gasta a rodada, avisa e não fere ninguém', () => {
    const r = rodada(duelo(), { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero', alvo: 0 }] })
    const linha = r.turnResults.find((t) => t.kind === 'CHARGE')
    expect(linha).toMatchObject({ side: 'ENEMY', skillName: 'Gran Rey Cero', posicaoDoAlvo: 0 })
    expect(r.state.inimigos[0].carregando).toEqual({ skillId: 'cero', alvo: 0 })
    expect(r.turnResults.some((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')).toBe(false)
  })

  it('na rodada seguinte ele sai sozinho, mesmo que a ação declarada seja outra', () => {
    const carregou = rodada(duelo(), { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero' }] }).state
    const r = rodada(carregou, { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: 'garra' }] })
    const golpe = r.turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')
    expect(golpe?.skillName).toBe('Gran Rey Cero')
    expect(golpe?.carregado).toBe(true)
    expect(r.state.inimigos[0].carregando).toBeUndefined()
  })

  it('bate mais forte que o mesmo golpe solto', () => {
    const solto = rodada(duelo(), { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [{ kind: 'ATTACK', skillId: 'cero' }] })
    const carregou = rodada(duelo(), { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero' }] }).state
    const carregado = rodada(carregou, { aliadas: [{ kind: 'ATTACK', skillId: null }], inimigas: [] })
    const dano = (r: typeof solto) => r.turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')?.damage ?? 0
    expect(dano(carregado)).toBeGreaterThan(dano(solto) * (1 + CARGA_BONUS * 0.5))
  })

  it('atordoado no meio da carga, perde a carga', () => {
    const carregou = rodada(duelo(), { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero' }] }).state
    const atordoado: BattleState = {
      ...carregou,
      inimigos: [
        {
          ...carregou.inimigos[0],
          statusEffects: [{ id: 's', type: 'STUN', magnitude: 1, remainingRounds: 2, sourceSkillName: 'Bakudō' }],
        },
      ],
    }
    const r = rodada(atordoado, { aliadas: [parado], inimigas: [] })
    expect(r.turnResults.find((t) => t.kind === 'CHARGE')?.cargaPerdida).toBe(true)
    expect(r.state.inimigos[0].carregando).toBeUndefined()
    expect(r.turnResults.some((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')).toBe(false)
  })

  it('não carrega o que não poderia usar agora', () => {
    // Em recarga: a regeneração do começo da rodada não resolve isso, ao
    // contrário de energia baixa.
    const emRecarga: BattleState = { ...duelo(), inimigos: [{ ...duelo().inimigos[0], cooldowns: { cero: 3 } }] }
    const r = rodada(emRecarga, { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero' }] })
    expect(r.state.inimigos[0].carregando).toBeUndefined()
  })
})

describe('a janela de punição', () => {
  function depoisDoDisparo() {
    const carregou = rodada(duelo(), { aliadas: [parado], inimigas: [{ kind: 'CARREGAR', skillId: 'cero' }] }).state
    return rodada(carregou, { aliadas: [parado], inimigas: [] }).state
  }

  it('abre quando o golpe carregado sai', () => {
    expect(depoisDoDisparo().inimigos[0].exposto).toBeGreaterThan(0)
  })

  it('exposto, ele leva mais dano na rodada seguinte', () => {
    const exposto = depoisDoDisparo()
    const normal = { ...exposto, inimigos: [{ ...exposto.inimigos[0], exposto: undefined }] }
    const bate = { aliadas: [{ kind: 'ATTACK' as const, skillId: 'garra' }], inimigas: [parado] }
    const dano = (e: BattleState) =>
      rodada(e, bate).turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'PLAYER')?.damage ?? 0
    // Bloqueando, os dois apanham igual — a diferença é só a exposição.
    expect(dano(exposto)).toBeGreaterThanOrEqual(Math.floor(dano(normal) * (1 + EXPOSTO_DANO)) - 1)
    expect(dano(exposto)).toBeGreaterThan(dano(normal))
  })

  it('fecha depois da rodada seguinte', () => {
    const exposto = depoisDoDisparo()
    const umaRodada = rodada(exposto, { aliadas: [parado], inimigas: [parado] }).state
    const duas = rodada(umaRodada, { aliadas: [parado], inimigas: [parado] }).state
    expect(umaRodada.inimigos[0].exposto).toBeGreaterThan(0)
    expect(duas.inimigos[0].exposto).toBeUndefined()
  })
})

describe('quem mais bateu', () => {
  it('fica gravado em quem apanhou, pela posição de quem bateu', () => {
    const e = comLutadores(duelo(), 'PLAYER', [{ base: stats({ attack: 60 }), nivel: 1, nome: 'Forte' }])
    const r = rodada(e, {
      aliadas: [{ kind: 'ATTACK', skillId: null }, { kind: 'ATTACK', skillId: 'cero' }],
      inimigas: [parado],
    })
    expect(r.state.inimigos[0].maiorAgressor).toBe(1)
  })

  it('some quando ninguém bateu na rodada', () => {
    const e = { ...duelo(), inimigos: [{ ...duelo().inimigos[0], maiorAgressor: 0 }] }
    const r = rodada(e, { aliadas: [parado], inimigas: [parado] })
    expect(r.state.inimigos[0].maiorAgressor).toBeUndefined()
  })
})

describe('a IA do chefe', () => {
  const pantera: TransformationDef = {
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
    drainPerTurn: 1,
    consumesTurn: false,
    triggerType: 'MANUAL',
    triggerPayload: null,
  }
  const perfil: PerfilDeChefe = {
    predador: true,
    golpeCarregado: 'Gran Rey Cero',
    faseDois: { vida: 0.5, forma: 'Resurrección: Pantera' },
  }
  const time = comLutadores(duelo(), 'PLAYER', [
    { base: stats(), nivel: 1, nome: 'A' },
    { base: stats(), nivel: 1, nome: 'B' },
  ]).aliados
  const chefe = duelo().inimigos[0]
  const NAO_CARREGA = () => 0.99

  it('persegue quem mais bateu nele', () => {
    const acao = acaoDoChefe({ ...chefe, maiorAgressor: 2 }, [garra, cero], {}, time, perfil, { rand: NAO_CARREGA })
    expect(acao).toMatchObject({ alvo: 2 })
  })

  it('se a presa caiu, escolhe outra de pé', () => {
    const caida = time.map((c, i) => (i === 2 ? { ...c, currentHp: 0 } : c))
    const acao = acaoDoChefe({ ...chefe, maiorAgressor: 2 }, [garra, cero], {}, caida, perfil, { rand: NAO_CARREGA })
    expect(acao.kind === 'ATTACK' || acao.kind === 'CARREGAR' ? acao.alvo : -1).not.toBe(2)
  })

  it('o golpe carregado nunca sai solto', () => {
    for (let i = 0; i < 20; i++) {
      const acao = acaoDoChefe(chefe, [garra, cero], {}, time, perfil, { rand: NAO_CARREGA })
      if (acao.kind === 'ATTACK') expect(acao.skillId).not.toBe('cero')
    }
  })

  it('carrega sempre depois de uma sequência preparada', () => {
    const acao = acaoDoChefe({ ...chefe, comboPreparado: 'garra' }, [garra, cero], {}, time, perfil, { rand: NAO_CARREGA })
    expect(acao.kind).toBe('CARREGAR')
  })

  it('não solta a forma antes da metade da vida', () => {
    const inteiro = { ...chefe, currentHp: chefe.maxHp }
    const acao = acaoDoChefe(inteiro, [garra], { pantera }, time, { ...perfil, golpeCarregado: undefined })
    expect(acao.kind === 'ATTACK' ? acao.liberar : undefined).toBeUndefined()
    expect(acao.kind).not.toBe('TRANSFORM')
  })

  it('solta a forma na virada, sem gastar a rodada', () => {
    const ferido = { ...chefe, currentHp: Math.floor(chefe.maxHp * 0.4) }
    const acao = acaoDoChefe(ferido, [garra], { pantera }, time, perfil)
    expect(acao).toMatchObject({ kind: 'ATTACK', liberar: 'pantera' })
  })
})
