import { describe, it, expect } from 'vitest'
import { createInitialState, resolveRound } from '@/app/lib/battle/engine'
import { impactoDaRodada, impactoDe, impactoPorLutador } from '@/app/lib/battle/rodada'
import type { AcoesDaRodada, BaseStats, CombatantState, SkillDef, TransformationDef } from '@/app/lib/battle/types'

/**
 * Combate com mais de um combatente por lado.
 *
 * O 1x1 continua sendo o caso mais jogado, e ele tem testes próprios em toda
 * parte. O que ESTE arquivo protege é o que só existe com time: a fila única
 * de iniciativa misturando os dois lados, a escolha de alvo, e a regra de que
 * um lado só perde quando TODOS caem — não quando o primeiro cai.
 */

const NUNCA_CRITA = () => 1

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 100,
  attack: 20,
  defense: 10,
  speed: 15,
  energy: 200,
  stamina: 200,
  ...over,
})

const skill = (over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk',
  name: 'Golpe',
  power: 30,
  energyCost: 0,
  cooldown: 0,
  effects: [],
  scalingStat: 'attack',
  tags: [],
  ...over,
})

/** Monta um estado com quantos combatentes se quiser de cada lado. */
function campo(aliados: BaseStats[], inimigos: BaseStats[]) {
  const molde = createInitialState(aliados[0], inimigos[0])
  const como = (base: CombatantState, s: BaseStats): CombatantState => ({
    ...base,
    currentHp: s.hp,
    maxHp: s.hp,
    baseMaxHp: s.hp,
    attack: s.attack,
    baseAttack: s.attack,
    speed: s.speed,
    baseSpeed: s.speed,
  })
  return {
    ...molde,
    aliados: aliados.map((s) => como(molde.aliados[0], s)),
    inimigos: inimigos.map((s) => como(molde.inimigos[0], s)),
  }
}

const atacar = (skillId: string | null, alvo?: number) => ({ kind: 'ATTACK' as const, skillId, alvo })

function rodada(
  estado: ReturnType<typeof campo>,
  acoes: AcoesDaRodada,
  skills: Record<string, SkillDef> = { sk: skill() }
) {
  return resolveRound(
    estado,
    acoes,
    { playerSkills: skills, enemySkills: skills, playerTransformations: {} },
    NUNCA_CRITA
  )
}

describe('a fila de iniciativa', () => {
  it('mistura os dois lados: o veloz inimigo age antes do aliado lento', () => {
    // Se a ordem fosse "time A inteiro, depois time B", o aliado lento agiria
    // antes do inimigo veloz — e velocidade deixaria de significar o que
    // significa no 1x1.
    const e = campo([stats({ speed: 30 }), stats({ speed: 5 })], [stats({ speed: 20 })])
    const r = rodada(e, {
      aliadas: [atacar('sk'), atacar('sk')],
      inimigas: [atacar('sk')],
    })

    const ordem = r.turnResults.filter((t) => t.kind === 'ATTACK').map((t) => t.side)
    expect(ordem).toEqual(['PLAYER', 'ENEMY', 'PLAYER'])
  })

  it('empate de velocidade vai para o aliado, como no 1x1', () => {
    const e = campo([stats({ speed: 15 })], [stats({ speed: 15 })])
    const r = rodada(e, { aliadas: [atacar('sk')], inimigas: [atacar('sk')] })
    expect(r.turnResults.filter((t) => t.kind === 'ATTACK')[0].side).toBe('PLAYER')
  })

  it('todo mundo de pé age uma vez por rodada', () => {
    // HP alto de propósito: se alguém cair no meio da rodada, ele não age mais
    // e a contagem deixa de medir o que este teste quer medir.
    const e = campo([stats({ hp: 900 }), stats({ hp: 900 }), stats({ hp: 900 })], [stats({ hp: 900 }), stats({ hp: 900 })])
    const r = rodada(e, {
      aliadas: [atacar('sk'), atacar('sk'), atacar('sk')],
      inimigas: [atacar('sk'), atacar('sk')],
    })
    expect(r.turnResults.filter((t) => t.kind === 'ATTACK')).toHaveLength(5)
  })
})

describe('escolha de alvo', () => {
  it('bate em quem a ação apontou, não sempre no primeiro', () => {
    const e = campo([stats({ speed: 99 })], [stats(), stats()])
    const r = rodada(e, { aliadas: [atacar('sk', 1)], inimigas: [atacar(null), atacar(null)] })

    expect(r.state.inimigos[0].currentHp).toBe(100)
    expect(r.state.inimigos[1].currentHp).toBeLessThan(100)
  })

  it('sem alvo declarado, bate no primeiro de pé', () => {
    const e = campo([stats({ speed: 99 })], [stats(), stats()])
    const r = rodada(e, { aliadas: [atacar('sk')], inimigas: [atacar(null), atacar(null)] })
    expect(r.state.inimigos[0].currentHp).toBeLessThan(100)
  })

  it('redireciona quando o alvo escolhido cai antes da vez de quem escolheu', () => {
    // O alvo foi escolhido no começo da rodada; alguém mais rápido pode
    // derrubá-lo no meio dela. Desperdiçar a ação puniria o jogador por uma
    // coisa que ele não tinha como prever — a intenção era ATACAR, e ela
    // continua válida.
    const e = campo(
      [stats({ speed: 99, attack: 500 }), stats({ speed: 1 })],
      [stats({ hp: 10 }), stats()]
    )
    const r = rodada(e, {
      aliadas: [atacar('sk', 0), atacar('sk', 0)],
      inimigas: [atacar(null), atacar(null)],
    })

    expect(r.state.inimigos[0].currentHp).toBe(0)
    // O aliado lento mirava no que já caiu, e acertou o outro.
    expect(r.state.inimigos[1].currentHp).toBeLessThan(100)
  })

  it('alvo fora do alcance do array cai no primeiro de pé', () => {
    const e = campo([stats({ speed: 99 })], [stats()])
    const r = rodada(e, { aliadas: [atacar('sk', 7)], inimigas: [atacar(null)] })
    expect(r.state.inimigos[0].currentHp).toBeLessThan(100)
  })
})

describe('quem cai fica caído', () => {
  const derrubado = (c: CombatantState): CombatantState => ({ ...c, currentHp: 0 })

  it('combatente caído não age', () => {
    const e = campo([stats(), stats()], [stats()])
    const comUmCaido = { ...e, aliados: [e.aliados[0], derrubado(e.aliados[1])] }
    const r = rodada(comUmCaido, {
      aliadas: [atacar('sk'), atacar('sk')],
      inimigas: [atacar(null)],
    })
    expect(r.turnResults.filter((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')).toHaveLength(1)
  })

  it('combatente caído não recebe golpe: o ataque vai para quem está de pé', () => {
    const e = campo([stats({ speed: 99 })], [stats(), stats()])
    const comUmCaido = { ...e, inimigos: [derrubado(e.inimigos[0]), e.inimigos[1]] }
    const r = rodada(comUmCaido, { aliadas: [atacar('sk', 0)], inimigas: [atacar(null), atacar(null)] })

    expect(r.state.inimigos[0].currentHp).toBe(0)
    expect(r.state.inimigos[1].currentHp).toBeLessThan(100)
  })
})

describe('o desfecho', () => {
  it('não termina enquanto sobrar UM de pé do lado', () => {
    // A diferença central para o 1x1: lá, o primeiro a cair decidia a luta.
    const e = campo([stats()], [stats({ hp: 1 }), stats()])
    const r = rodada(e, { aliadas: [atacar('sk')], inimigas: [atacar(null), atacar(null)] })

    expect(r.state.inimigos[0].currentHp).toBe(0)
    expect(r.state.outcome).toBeNull()
  })

  it('vitória quando o último inimigo cai', () => {
    const e = campo([stats({ attack: 500, speed: 99 })], [stats({ hp: 1 })])
    const r = rodada(e, { aliadas: [atacar('sk')], inimigas: [atacar(null)] })
    expect(r.state.outcome).toBe('PLAYER_WIN')
  })

  it('derrota quando o último aliado cai', () => {
    const e = campo([stats({ hp: 1, speed: 1 })], [stats({ attack: 500, speed: 99 })])
    const r = rodada(e, { aliadas: [atacar(null)], inimigas: [atacar('sk')] })
    expect(r.state.outcome).toBe('ENEMY_WIN')
  })

  it('um time grande sobrevive à queda de metade dele', () => {
    // O que sobra em pé precisa AGUENTAR o golpe: com HP normal ele cairia na
    // mesma rodada e o teste mediria a derrota, não a sobrevivência.
    const e = campo([stats({ hp: 5000 }), stats(), stats()], [stats({ attack: 500, speed: 99 })])
    const doisCaidos = {
      ...e,
      aliados: [e.aliados[0], { ...e.aliados[1], currentHp: 0 }, { ...e.aliados[2], currentHp: 0 }],
    }
    const r = rodada(doisCaidos, {
      aliadas: [atacar('sk'), atacar('sk'), atacar('sk')],
      inimigas: [atacar(null)],
    })
    expect(r.state.outcome).toBeNull()
  })
})

describe('choque de golpes com mais de dois em campo', () => {
  const feixe = skill({ id: 'feixe', tags: ['beam'] })

  it('exige que os dois tenham escolhido UM AO OUTRO', () => {
    // Dois golpes só se encontram no meio se estiverem indo um na direção do
    // outro. Sem reciprocidade, o choque viraria uma bagunça de quem chocou
    // com quem assim que houvesse três em campo.
    // 2x2 com as miras CRUZADAS: 0 bate em 0, mas 0 do outro lado bate em 1.
    // Com um inimigo só, qualquer mira dele seria recíproca com alguém.
    const e = campo(
      [stats({ speed: 20, hp: 900 }), stats({ speed: 10, hp: 900 })],
      [stats({ speed: 15, hp: 900 }), stats({ speed: 12, hp: 900 })]
    )
    const r = rodada(
      e,
      {
        aliadas: [atacar('feixe', 0), atacar('feixe', 1)],
        inimigas: [atacar('feixe', 1), atacar('feixe', 0)],
      },
      { feixe }
    )
    expect(r.turnResults.some((t) => t.kind === 'CLASH')).toBe(false)
  })

  it('dispara quando os dois se escolhem', () => {
    const e = campo([stats({ speed: 20 })], [stats({ speed: 15 })])
    const r = rodada(
      e,
      { aliadas: [atacar('feixe', 0)], inimigas: [atacar('feixe', 0)] },
      { feixe }
    )
    expect(r.turnResults.some((t) => t.kind === 'CLASH')).toBe(true)
  })
})

describe('ressurreição', () => {
  // A exceção à regra de que quem cai fica caído. Existe com dono: são as duas
  // curandeiras que fazem isso na obra, não um botão do sistema.
  const reviver = (over: Partial<SkillDef> = {}) =>
    skill({
      id: 'reviver',
      name: 'Rejeição',
      power: 0,
      energyCost: 0,
      effects: [{ type: 'REVIVE', target: 'ALIADO_CAIDO', magnitude: 30 }],
      ...over,
    })

  const comCaido = () => {
    const e = campo([stats({ speed: 99 }), stats({ hp: 200 })], [stats({ hp: 900 })])
    return { ...e, aliados: [e.aliados[0], { ...e.aliados[1], currentHp: 0 }] }
  }

  it('traz o aliado caído de volta com a fração declarada da vida máxima', () => {
    const r = rodada(
      comCaido(),
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    // 30% de 200.
    expect(r.state.aliados[1].currentHp).toBe(60)
  })

  it('nunca traz de volta com a vida cheia — voltar inteiro apagaria a queda', () => {
    const r = rodada(
      comCaido(),
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    expect(r.state.aliados[1].currentHp).toBeLessThan(r.state.aliados[1].maxHp)
  })

  it('registra a volta no log', () => {
    const r = rodada(
      comCaido(),
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    expect(r.turnResults.some((t) => t.kind === 'REVIVE' && t.side === 'PLAYER')).toBe(true)
  })

  it('quem voltou já age na rodada seguinte', () => {
    const primeiro = rodada(
      comCaido(),
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    const segundo = rodada(
      primeiro.state as ReturnType<typeof campo>,
      { aliadas: [atacar(null), atacar('sk')], inimigas: [atacar(null)] },
      { sk: skill(), reviver: reviver() }
    )
    expect(segundo.turnResults.filter((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')).toHaveLength(2)
  })

  it('sem ninguém caído, não acontece nada — e a rodada segue', () => {
    const inteiro = campo([stats({ speed: 99 }), stats()], [stats({ hp: 900 })])
    const r = rodada(
      inteiro,
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    expect(r.turnResults.some((t) => t.kind === 'REVIVE')).toBe(false)
  })

  it('não ressuscita ninguém do lado inimigo', () => {
    const e = campo([stats({ speed: 99 })], [stats(), stats({ hp: 900 })])
    const comInimigoCaido = { ...e, inimigos: [{ ...e.inimigos[0], currentHp: 0 }, e.inimigos[1]] }
    const r = rodada(
      comInimigoCaido,
      { aliadas: [atacar('reviver')], inimigas: [atacar(null), atacar(null)] },
      { reviver: reviver() }
    )
    expect(r.state.inimigos[0].currentHp).toBe(0)
  })

  it('traz de volta o PRIMEIRO da fila, não o mais forte nem o mais recente', () => {
    const e = campo([stats({ speed: 99 }), stats({ hp: 100 }), stats({ hp: 400 })], [stats({ hp: 900 })])
    const doisCaidos = {
      ...e,
      aliados: [e.aliados[0], { ...e.aliados[1], currentHp: 0 }, { ...e.aliados[2], currentHp: 0 }],
    }
    const r = rodada(
      doisCaidos,
      { aliadas: [atacar('reviver'), atacar(null), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver() }
    )
    expect(r.state.aliados[1].currentHp).toBeGreaterThan(0)
    expect(r.state.aliados[2].currentHp).toBe(0)
  })

  it('a ressurreição não é anulada quando o golpe de quem lança erra', () => {
    // Ela não vai no adversário, então não há o que ele apare — e o aliado
    // caído não tem culpa do golpe ter passado longe.
    const r = rodada(
      comCaido(),
      { aliadas: [atacar('reviver'), atacar(null)], inimigas: [atacar(null)] },
      { reviver: reviver({ precision: 1 }) }
    )
    expect(r.state.aliados[1].currentHp).toBe(60)
  })
})

describe('o log diz QUEM, não só o lado', () => {
  // Com time, "o jogador bateu" não diz qual dos três — e a tela precisa
  // saber qual carta anima. Ver TurnResult.posicao.
  it('o golpe carrega a posição de quem bateu e a do alvo', () => {
    const e = campo([stats({ speed: 5 }), stats({ speed: 30 })], [stats({ speed: 1 }), stats({ speed: 2 })])
    const r = rodada(e, { aliadas: [atacar('sk', 1), atacar('sk', 0)], inimigas: [] })
    const golpes = r.turnResults.filter((t) => t.kind === 'ATTACK' && t.side === 'PLAYER')
    // O aliado 1 é o mais veloz, então age primeiro, no inimigo 0.
    expect(golpes.map((t) => [t.posicao, t.posicaoDoAlvo])).toEqual([[1, 0], [0, 1]])
  })

  it('dano contínuo sai na posição de quem sofre', () => {
    const e = campo([stats(), stats()], [stats()])
    e.aliados[1] = {
      ...e.aliados[1],
      statusEffects: [{ id: 'd', type: 'DOT', magnitude: 7, remainingRounds: 2, sourceSkillName: 'Veneno' }],
    }
    const r = rodada(e, { aliadas: [], inimigas: [] })
    const tique = r.turnResults.find((t) => t.kind === 'DOT_TICK')
    expect(tique?.posicao).toBe(1)
  })

  it('o impacto da rodada separa o aliado do principal', () => {
    const e = campo([stats({ speed: 1 }), stats({ speed: 1 })], [stats({ speed: 30 })])
    const r = rodada(e, { aliadas: [], inimigas: [atacar('sk', 1)] })
    const porLutador = impactoPorLutador(r.turnResults)
    expect(impactoDe(porLutador, 'PLAYER', 1).dano).toBeGreaterThan(0)
    // A carta do jogador não treme pelo golpe que pegou no aliado.
    expect(impactoDe(porLutador, 'PLAYER', 0).dano).toBe(0)
    expect(impactoDaRodada(r.turnResults).PLAYER.dano).toBe(0)
  })
})

describe('forma para qualquer posição', () => {
  const pantera: TransformationDef = {
    id: 'pantera',
    name: 'Pantera',
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
    triggerType: 'MANUAL',
    triggerPayload: null,
  }

  it('o aliado controlado pela IA se transforma com a forma dele', () => {
    const e = campo([stats(), stats()], [stats()])
    const r = resolveRound(
      e,
      { aliadas: [atacar('sk'), { kind: 'TRANSFORM', transformationId: 'pantera' }], inimigas: [] },
      {
        playerSkills: { sk: skill() },
        enemySkills: { sk: skill() },
        playerTransformations: {},
        formasPorPosicao: { PLAYER: [{}, { pantera }] },
      },
      NUNCA_CRITA
    )
    expect(r.state.aliados[1].activeTransformationId).toBe('pantera')
    expect(r.state.aliados[0].activeTransformationId).toBeFalsy()
    const linha = r.turnResults.find((t) => t.kind === 'TRANSFORM')
    expect(linha?.posicao).toBe(1)
  })

  it('sem forma declarada para a posição, o aliado não se transforma', () => {
    // O índice 0 continua caindo em playerTransformations; os outros ficam
    // sem forma, como sempre ficaram.
    const e = campo([stats(), stats()], [stats()])
    const r = resolveRound(
      e,
      { aliadas: [atacar('sk'), { kind: 'TRANSFORM', transformationId: 'pantera' }], inimigas: [] },
      { playerSkills: { sk: skill() }, enemySkills: { sk: skill() }, playerTransformations: { pantera } },
      NUNCA_CRITA
    )
    expect(r.state.aliados[1].activeTransformationId).toBeFalsy()
  })
})

describe('golpe em área (EM_AREA)', () => {
  const onda = skill({ id: 'onda', name: 'Cero Gigante', power: 20, energyCost: 30, alcance: 'AREA', effects: [{ type: 'EM_AREA', target: 'ENEMY', magnitude: 0 }] })

  it('acerta todo mundo do outro lado, e quem lança paga uma vez', () => {
    const e = campo([stats({ energy: 200 })], [stats(), stats(), stats()])
    const antes = e.aliados[0].currentEnergy
    const r = resolveRound(
      e,
      { aliadas: [atacar('onda', 0)], inimigas: [{ kind: 'BLOCK' }, { kind: 'BLOCK' }, { kind: 'BLOCK' }] },
      { playerSkills: { onda }, enemySkills: { onda }, playerTransformations: {} },
      NUNCA_CRITA
    )
    const golpes = r.turnResults.filter((t) => t.kind === 'ATTACK' && t.side === 'PLAYER')
    expect(golpes.map((g) => g.posicaoDoAlvo)).toEqual([0, 1, 2])
    expect(golpes.every((g) => g.emArea)).toBe(true)
    expect(r.state.inimigos.every((c) => c.currentHp < 100)).toBe(true)
    expect(antes - r.state.aliados[0].currentEnergy).toBeLessThanOrEqual(30)
  })

  it('num 1x1 é um golpe comum', () => {
    const e = campo([stats()], [stats()])
    const r = resolveRound(
      e,
      { aliadas: [atacar('onda')], inimigas: [{ kind: 'BLOCK' }] },
      { playerSkills: { onda }, enemySkills: { onda }, playerTransformations: {} },
      NUNCA_CRITA
    )
    expect(r.turnResults.filter((t) => t.kind === 'ATTACK')).toHaveLength(1)
  })
})
