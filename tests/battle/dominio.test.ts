import { describe, it, expect } from 'vitest'
import { comHeroi, comVilao, createInitialState, heroi, resolveRound, vilao } from '@/app/lib/battle/engine'
import type { BaseStats, CombatantState, SkillDef, SkillEffect, StatusEffectInstance } from '@/app/lib/battle/types'

/**
 * O domínio como ESTADO, não como golpe.
 *
 * O que estes testes protegem é a diferença entre as duas coisas. Antes, as
 * cinco Expansões de Domínio eram números grandes com recarga grande — nada
 * que uma habilidade comum não pudesse ser. Um teste que só checasse dano não
 * teria notado a troca, porque o dano é justamente a parte que DIMINUIU.
 */

const NUNCA_CRITA = () => 1

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
  cooldown: 2,
  effects: [],
  scalingStat: 'attack',
  tags: [],
  ...over,
})

/**
 * Uma Expansão de Domínio: golpe médio que abre o estado.
 *
 * `efeitosExtras` reproduz o catálogo real — cada domínio de verdade carrega
 * um segundo efeito (debuff, DOT ou stun no inimigo) além do DOMAIN em si, e
 * agora um terceiro (o "up" de defesa). É esse segundo/terceiro efeito que
 * vazava mesmo quando o domínio perdia o choque.
 */
const dominio = (id: string, nome: string, manutencao: number, efeitosExtras: SkillEffect[] = []): SkillDef =>
  skill({
    id,
    name: nome,
    power: 30,
    energyCost: 40,
    cooldown: 6,
    tags: ['dominio', 'ultimate'],
    effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: manutencao, duration: 3 }, ...efeitosExtras],
  })

/** O domínio com o kit completo do catálogo: debuff no inimigo + "up" de defesa em si mesmo. */
const dominioCompleto = (id: string, nome: string, manutencao: number): SkillDef =>
  dominio(id, nome, manutencao, [
    { type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 20, duration: 2 },
    { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: manutencao, duration: 3 },
  ])

const dominioAtivo = (c: CombatantState) => c.statusEffects.find((e) => e.type === 'DOMAIN')

const efeitoDe = (tipo: StatusEffectInstance['type'], over: Partial<StatusEffectInstance> = {}): StatusEffectInstance => ({
  id: `fx-${tipo}`,
  type: tipo,
  magnitude: 50,
  remainingRounds: 3,
  sourceSkillName: 'Preparo',
  ...over,
})

/** Jogador age, inimigo não faz nada — isola o efeito de um lado só. */
function jogadorUsa(state: ReturnType<typeof createInitialState>, sk: SkillDef, inimigoUsa: SkillDef | null = null) {
  return resolveRound(
    state,
    { aliadas: [{ kind: 'ATTACK', skillId: sk.id }], inimigas: [{ kind: 'ATTACK', skillId: inimigoUsa?.id ?? null }] },
    {
      playerSkills: { [sk.id]: sk },
      enemySkills: inimigoUsa ? { [inimigoUsa.id]: inimigoUsa } : {},
      playerTransformations: {},
    },
    NUNCA_CRITA
  )
}

describe('abertura do domínio', () => {
  it('abre o estado no lançador e registra no log', () => {
    const s = createInitialState(stats(), stats())
    const r = jogadorUsa(s, dominio('d-1', 'Vazio Infinito', 22))

    expect(dominioAtivo(heroi(r.state))).toMatchObject({ magnitude: 22, remainingRounds: 3 })
    expect(dominioAtivo(vilao(r.state))).toBeUndefined()
    expect(r.turnResults.some((t) => t.kind === 'DOMAIN_OPEN' && t.side === 'PLAYER')).toBe(true)
  })

  it('reabrir troca o domínio em vez de acumular dois', () => {
    const s = createInitialState(stats(), stats())
    const primeiro = jogadorUsa(s, dominio('d-1', 'Vazio Infinito', 22))
    const segundo = jogadorUsa(primeiro.state, dominio('d-2', 'Outro Domínio', 15))

    expect(heroi(segundo.state).statusEffects.filter((e) => e.type === 'DOMAIN')).toHaveLength(1)
    expect(dominioAtivo(heroi(segundo.state))!.magnitude).toBe(15)
  })
})

describe('acerto garantido', () => {
  it('o golpe atravessa o escudo do oponente', () => {
    const base = createInitialState(stats(), stats())
    const comEscudo = comVilao(base, { statusEffects: [efeitoDe('SHIELD', { magnitude: 500 })] })

    const semDominio = jogadorUsa(comEscudo, skill())
    expect(vilao(semDominio.state).currentHp).toBe(200)

    const comDominio = comHeroi(comEscudo, { statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })] })
    const r = jogadorUsa(comDominio, skill())
    expect(vilao(r.state).currentHp).toBeLessThan(200)
    expect(r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.acertoGarantido).toBe(true)
  })

  it('o golpe não é refletido pelo counter do oponente', () => {
    const base = createInitialState(stats(), stats())
    const comCounter = comVilao(base, { statusEffects: [efeitoDe('COUNTER', { magnitude: 100 })] })

    const semDominio = jogadorUsa(comCounter, skill())
    expect(semDominio.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.countered).toBe(true)
    expect(heroi(semDominio.state).currentHp).toBeLessThan(200)

    const comDominio = comHeroi(comCounter, { statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })] })
    const r = jogadorUsa(comDominio, skill())
    expect(r.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.countered).toBeUndefined()
    expect(vilao(r.state).currentHp).toBeLessThan(200)
  })

  it('amplifica o dano em 20% mesmo contra um oponente sem defesa', () => {
    // A primeira versão do domínio dava SÓ o acerto garantido, e com isso
    // abrir contra alguém desprotegido era estritamente pior que bater — o
    // poder direto da habilidade tinha caído para pagar pelo estado. Sem esta
    // amplificação o domínio é uma armadilha para quem o usa.
    const base = createInitialState(stats(), stats())
    const semDominio = jogadorUsa(base, skill())
    const comDominio = jogadorUsa(
      comHeroi(base, { statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })] }),
      skill()
    )
    const dSem = semDominio.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.damage!
    const dCom = comDominio.turnResults.find((t) => t.side === 'PLAYER' && t.kind === 'ATTACK')!.damage!
    // Razão, não igualdade exata: a amplificação entra em `raw`, antes da
    // mitigação por defesa e do arredondamento final, então reproduzir a
    // conta a partir do dano já arredondado erra por 1.
    expect(dCom / dSem).toBeCloseTo(1.2, 1)
  })
})

describe('manutenção', () => {
  it('cobra energia por rodada de quem mantém aberto', () => {
    const base = createInitialState(stats(), stats())
    const comDominio = comHeroi(base, { currentEnergy: 100, statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })] })
    const r = jogadorUsa(comDominio, skill({ energyCost: 0 }))

    // 100 + 12 de regeneração (6% de 200) − 20 de manutenção.
    expect(heroi(r.state).currentEnergy).toBe(92)
  })

  it('o domínio cai quando não há energia para sustentar', () => {
    const base = createInitialState(stats(), stats())
    const semGas = comHeroi(base, { currentEnergy: 0, statusEffects: [efeitoDe('DOMAIN', { magnitude: 90 })] })
    const r = jogadorUsa(semGas, skill({ energyCost: 0 }))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(r.turnResults.some((t) => t.kind === 'DOMAIN_FALL' && t.side === 'PLAYER')).toBe(true)
  })

  it('expira sozinho ao fim da duração', () => {
    const base = createInitialState(stats(), stats())
    let s = jogadorUsa(base, dominio('d-1', 'Vazio Infinito', 5)).state
    for (let i = 0; i < 3; i++) s = jogadorUsa(s, skill({ energyCost: 0 })).state
    expect(dominioAtivo(heroi(s))).toBeUndefined()
  })
})

describe('choque de domínios', () => {
  const abrirNoInimigo = (manutencao: number) => {
    const base = createInitialState(stats(), stats())
    return comVilao(base, { statusEffects: [efeitoDe('DOMAIN', { magnitude: manutencao })] })
  }

  it('o domínio de manutenção mais cara vence e atordoa o outro', () => {
    const r = jogadorUsa(abrirNoInimigo(13), dominio('d-1', 'Vazio Infinito', 22))

    expect(dominioAtivo(heroi(r.state))!.magnitude).toBe(22)
    expect(dominioAtivo(vilao(r.state))).toBeUndefined()
    expect(vilao(r.state).statusEffects.some((e) => e.type === 'STUN')).toBe(true)
    expect(r.turnResults.some((t) => t.kind === 'DOMAIN_CLASH' && t.side === 'PLAYER')).toBe(true)
  })

  it('abrir um domínio mais fraco custa a rodada: o seu nem chega a abrir', () => {
    const r = jogadorUsa(abrirNoInimigo(22), dominio('d-1', 'Jardim Sombrio', 13))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(dominioAtivo(vilao(r.state))!.magnitude).toBe(22)
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'STUN')).toBe(true)
  })

  it('domínios equivalentes se anulam e derrubam os dois donos', () => {
    const r = jogadorUsa(abrirNoInimigo(20), dominio('d-1', 'Santuário Malévolo', 20))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(dominioAtivo(vilao(r.state))).toBeUndefined()
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'STUN')).toBe(true)
    expect(vilao(r.state).statusEffects.some((e) => e.type === 'STUN')).toBe(true)
    expect(r.turnResults.some((t) => t.kind === 'DOMAIN_CLASH' && t.skillName === 'Domínios anulados')).toBe(true)
  })
})

describe('o "up": o domínio é a transformação de quem não tem transformação', () => {
  // Decisão de desenho: em vez de construir uma Transformation própria para
  // os cinco de Jujutsu, o domínio ganhou o que faltava para cumprir esse
  // papel — um buff de verdade, na mesma magnitude da manutenção.

  it('concede um buff de defesa em si mesmo, do tamanho da manutenção', () => {
    const s = createInitialState(stats(), stats())
    const r = jogadorUsa(s, dominioCompleto('d-1', 'Vazio Infinito', 22))

    const buff = heroi(r.state).statusEffects.find((e) => e.type === 'BUFF' && e.stat === 'defense')
    expect(buff).toMatchObject({ magnitude: 22, remainingRounds: 3 })
  })

  it('o buff cai junto quando o domínio colapsa por falta de energia', () => {
    const base = createInitialState(stats(), stats())
    // Abre primeiro, com energia de sobra...
    const aberto = jogadorUsa(base, dominioCompleto('d-1', 'Vazio Infinito', 22)).state
    // ...e a rodada seguinte não tem energia para pagar a manutenção.
    const seco = comHeroi(aberto, { currentEnergy: 0 })
    const r = jogadorUsa(seco, skill({ energyCost: 0 }))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF' && e.stat === 'defense')).toBe(false)
  })

  it('o buff cai junto quando o domínio colapsa por falta de stamina', () => {
    const base = createInitialState(stats(), stats())
    const aberto = jogadorUsa(base, dominioCompleto('d-1', 'Vazio Infinito', 22)).state
    const semFolego = comHeroi(aberto, { currentStamina: 0 })
    const r = jogadorUsa(semFolego, skill({ energyCost: 0 }))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF' && e.stat === 'defense')).toBe(false)
  })
})

describe('manutenção também drena stamina', () => {
  it('cobra as DUAS reservas por rodada, não só energia', () => {
    const base = createInitialState(stats(), stats())
    // currentStamina abaixo do máximo (100) de propósito, com a mesma folga
    // proporcional que o teste de energia já usa — senão a regeneração
    // esbarra no teto e não soma nada, e o teste mediria só a manutenção.
    const comDominio = comHeroi(base, {
      currentEnergy: 100,
      currentStamina: 50,
      statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })],
    })
    const r = jogadorUsa(comDominio, skill({ energyCost: 0 }))

    // 100 + 12 de regeneração de energia (6% de 200) − 20 de manutenção.
    expect(heroi(r.state).currentEnergy).toBe(92)
    // 50 + 5 de regeneração de stamina (5% de 100) − 20 de manutenção.
    expect(heroi(r.state).currentStamina).toBe(35)
  })

  it('o domínio cai por falta de STAMINA mesmo com energia de sobra', () => {
    const base = createInitialState(stats(), stats())
    const semFolego = comHeroi(base, {
      currentEnergy: 200,
      currentStamina: 0,
      statusEffects: [efeitoDe('DOMAIN', { magnitude: 20 })],
    })
    const r = jogadorUsa(semFolego, skill({ energyCost: 0 }))

    expect(dominioAtivo(heroi(r.state))).toBeUndefined()
    expect(r.turnResults.some((t) => t.kind === 'DOMAIN_FALL' && t.side === 'PLAYER')).toBe(true)
    // A energia não devia ter sido cobrada: o domínio caiu antes de pagar.
    expect(heroi(r.state).currentEnergy).toBe(200)
  })
})

describe('choque de domínios: só quem VENCE ganha os efeitos do próprio domínio', () => {
  // Bug real, achado ao adicionar o "up": perdendo ou empatando o choque, a
  // técnica nunca chega a abrir — mas o debuff que vem junto dela (e agora o
  // buff) continuava sendo aplicado de qualquer jeito. Alguém que acabou de
  // ser atordoado por perder o choque saía do choque protegido, o que não
  // fazia sentido nenhum.
  const abrirNoInimigo = (manutencao: number) => {
    const base = createInitialState(stats(), stats())
    return comVilao(base, { statusEffects: [efeitoDe('DOMAIN', { magnitude: manutencao })] })
  }

  it('vencendo, o debuff no inimigo E o buff em si mesmo se aplicam normalmente', () => {
    const r = jogadorUsa(abrirNoInimigo(13), dominioCompleto('d-1', 'Vazio Infinito', 22))

    expect(vilao(r.state).statusEffects.some((e) => e.type === 'DEBUFF' && e.stat === 'attack')).toBe(true)
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF' && e.stat === 'defense')).toBe(true)
  })

  it('perdendo, nem o debuff no inimigo nem o buff em si mesmo se aplicam', () => {
    const r = jogadorUsa(abrirNoInimigo(22), dominioCompleto('d-1', 'Jardim Sombrio', 13))

    // O choque foi perdido — só o atordoamento acontece.
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'STUN')).toBe(true)
    expect(vilao(r.state).statusEffects.some((e) => e.type === 'DEBUFF' && e.stat === 'attack')).toBe(false)
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF' && e.stat === 'defense')).toBe(false)
  })

  it('empatando, nenhum dos dois lados ganha o próprio debuff nem o próprio buff', () => {
    const r = jogadorUsa(abrirNoInimigo(20), dominioCompleto('d-1', 'Santuário Malévolo', 20))

    expect(vilao(r.state).statusEffects.some((e) => e.type === 'DEBUFF' && e.stat === 'attack')).toBe(false)
    expect(heroi(r.state).statusEffects.some((e) => e.type === 'BUFF' && e.stat === 'defense')).toBe(false)
  })
})
