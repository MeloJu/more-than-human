import { describe, it, expect } from 'vitest'
import { createInitialState, prepararTreinador, resolveRound } from '@/app/lib/battle/engine'
import { alvoDaIa, pickAiSkill } from '@/app/lib/battle/ai'
import { ESPERA_DA_INVOCACAO, INVOCACOES, invocacoesEmCampo, ordensDisponiveis, skillIdDaColuna } from '@/app/lib/battle/invocacoes'
import type { AcaoDeCombate, BaseStats, BattleState, SkillDef } from '@/app/lib/battle/types'

/**
 * Invocação em campo: a criatura com vida própria, que bate sozinha, pode ser
 * alvo, cobra manutenção do dono e, destruída, deixa o golpe que a chamou em
 * espera. Os casos do Geto (limite de maldições, Uzumaki consumindo, dragão de
 * guarda, abate) estão aqui porque são as regras gerais que ele estreia.
 */

const NUNCA_CRITA = () => 1

const stats = (over: Partial<BaseStats> = {}): BaseStats => ({
  hp: 200,
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

const chamar = skill({
  id: 'chamar',
  name: 'Espírito Amaldiçoado Menor',
  power: 0,
  effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'maldicao-menor' }],
})
const massa = skill({
  id: 'massa',
  name: 'Invocação em Massa',
  power: 0,
  effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 5, invocacao: 'maldicao-menor' }],
})
const dragao = skill({
  id: 'dragao',
  name: 'Dragão Arco-Íris',
  power: 0,
  effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'dragao-arco-iris' }],
})
const uzumaki = skill({
  id: 'uzumaki',
  name: 'Uzumaki',
  power: 30,
  tags: ['maldicao'],
  alcance: 'DISTANCIA',
  effects: [
    { type: 'CONSUMIR', target: 'SELF', magnitude: 20, grupo: 'maldicao' },
    { type: 'ABATE', target: 'SELF', magnitude: 15 },
  ],
})
const area = skill({ id: 'area', name: 'Onda', power: 30, alcance: 'AREA' })

const SKILLS: Record<string, SkillDef> = { sk: skill(), chamar, massa, dragao, uzumaki, area }

const atacar = (skillId: string | null, alvo?: number): AcaoDeCombate => ({ kind: 'ATTACK', skillId, alvo })
const parado: AcaoDeCombate = { kind: 'BLOCK' }

function inicio(eu: Partial<BaseStats> = {}, ele: Partial<BaseStats> = {}): BattleState {
  return createInitialState(stats(eu), stats(ele))
}

function rodada(estado: BattleState, minha: AcaoDeCombate, dele: AcaoDeCombate = parado) {
  return resolveRound(
    estado,
    { aliadas: [minha], inimigas: [dele] },
    { playerSkills: SKILLS, enemySkills: SKILLS, playerTransformations: {} },
    NUNCA_CRITA
  )
}

describe('chamar para o campo', () => {
  it('põe a invocação ao lado do dono, com vida própria, sem bater em ninguém', () => {
    const r = rodada(inicio(), atacar('chamar'))
    const maldicao = r.state.aliados[1]
    expect(maldicao.invocacao).toMatchObject({ def: 'maldicao-menor', dono: 0, skillId: 'chamar' })
    expect(maldicao.maxHp).toBe(Math.round(200 * INVOCACOES['maldicao-menor'].vida))
    expect(r.turnResults.find((t) => t.kind === 'SUMMON')).toMatchObject({ side: 'PLAYER', posicao: 0, invocadas: [1] })
    expect(r.turnResults.some((t) => t.kind === 'ATTACK' && t.side === 'PLAYER')).toBe(false)
  })

  it('só bate a partir da rodada seguinte, no alvo do dono', () => {
    const primeira = rodada(inicio(), atacar('chamar'))
    expect(primeira.turnResults.some((t) => t.kind === 'ATTACK' && t.posicao === 1)).toBe(false)

    const segunda = rodada(primeira.state, atacar(null, 0))
    const golpe = segunda.turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'PLAYER' && t.posicao === 1)
    expect(golpe?.skillName).toBe(INVOCACOES['maldicao-menor'].golpe.nome)
    expect(golpe?.posicaoDoAlvo).toBe(0)
  })

  it('respeita o limite do grupo: três maldições, e a quarta não vem', () => {
    const r = rodada(inicio(), atacar('massa'))
    expect(invocacoesEmCampo(r.state.aliados, 0)).toEqual({ maldicao: 3 })

    const mais = rodada(r.state, atacar('chamar'))
    expect(invocacoesEmCampo(mais.state.aliados, 0)).toEqual({ maldicao: 3 })
    expect(mais.turnResults.find((t) => t.kind === 'SUMMON')?.invocadas).toEqual([])
  })

  it('numera as do mesmo tipo, para o log e o alvo dizerem qual', () => {
    const r = rodada(inicio(), atacar('massa'))
    expect(r.state.aliados.slice(1).map((c) => c.nome)).toEqual(['Maldição 1', 'Maldição 2', 'Maldição 3'])
  })
})

describe('perder a invocação', () => {
  it('destruída, deixa o golpe que a chamou em espera', () => {
    const chamou = rodada(inicio(), atacar('chamar')).state
    // O inimigo mira a maldição, que é frágil.
    const r = rodada(chamou, atacar(null, 0), atacar('sk', 1))
    expect(r.state.aliados[1].invocacao?.fora).toBe(true)
    expect(r.state.aliados[0].cooldowns.chamar).toBe(ESPERA_DA_INVOCACAO)
  })

  it('reaproveita a vaga de quem saiu, em vez de crescer o time', () => {
    const chamou = rodada(inicio(), atacar('chamar')).state
    const caiu = rodada(chamou, atacar(null, 0), atacar('sk', 1)).state
    const semEspera = { ...caiu, aliados: [{ ...caiu.aliados[0], cooldowns: {} }, caiu.aliados[1]] }
    const r = rodada(semEspera, atacar('chamar'))
    expect(r.state.aliados).toHaveLength(2)
    expect(r.state.aliados[1].invocacao?.fora).toBeFalsy()
  })

  it('o dono caído leva as invocações, e o lado perde mesmo com elas de pé', () => {
    const chamou = rodada(inicio({ hp: 30 }), atacar('massa')).state
    const r = rodada(chamou, atacar(null, 0), atacar('sk', 0))
    expect(r.state.aliados[0].currentHp).toBe(0)
    expect(r.state.aliados.slice(1).every((c) => c.invocacao?.fora)).toBe(true)
    expect(r.state.outcome).toBe('ENEMY_WIN')
  })

  it('sem energia para a manutenção, a invocação volta — sem espera', () => {
    const chamou = rodada(inicio(), atacar('chamar')).state
    const semEnergia = { ...chamou, aliados: [{ ...chamou.aliados[0], currentEnergy: 0, maxEnergy: 0 }, chamou.aliados[1]] }
    const r = rodada(semEnergia, parado)
    expect(r.state.aliados[1].invocacao?.fora).toBe(true)
    expect(r.state.aliados[0].cooldowns.chamar ?? 0).toBe(0)
    expect(r.turnResults.find((t) => t.kind === 'SUMMON')?.recolhida).toBe(true)
  })

  it('ressurreição não traz invocação de volta', () => {
    const chamou = rodada(inicio(), atacar('chamar')).state
    const caiu = rodada(chamou, atacar(null, 0), atacar('sk', 1)).state
    const reviver = skill({ id: 'reviver', power: 0, effects: [{ type: 'REVIVE', target: 'ALIADO_CAIDO', magnitude: 50 }] })
    const r = resolveRound(
      caiu,
      { aliadas: [atacar('reviver')], inimigas: [parado] },
      { playerSkills: { ...SKILLS, reviver }, enemySkills: SKILLS, playerTransformations: {} },
      NUNCA_CRITA
    )
    expect(r.state.aliados[1].currentHp).toBe(0)
    expect(r.turnResults.some((t) => t.kind === 'REVIVE')).toBe(false)
  })
})

describe('Uzumaki: consumir e abater', () => {
  it('consome as maldições em campo, e cada uma soma poder ao golpe', () => {
    const tres = rodada(inicio(), atacar('massa')).state
    const semNenhuma = rodada(inicio(), atacar('uzumaki', 0))
    const comTres = rodada(tres, atacar('uzumaki', 0))

    const golpe = comTres.turnResults.find((t) => t.kind === 'ATTACK' && t.skillName === 'Uzumaki')
    const seco = semNenhuma.turnResults.find((t) => t.kind === 'ATTACK' && t.skillName === 'Uzumaki')
    expect(golpe?.consumidas).toBe(3)
    expect(golpe?.damage ?? 0).toBeGreaterThan(seco?.damage ?? 0)
    // Consumidas saem de campo e não abrem espera.
    expect(invocacoesEmCampo(comTres.state.aliados, 0)).toEqual({})
    expect(comTres.state.aliados[0].cooldowns.massa ?? 0).toBe(0)
  })

  it('abaixo de 15% depois do golpe, o inimigo comum cai na hora', () => {
    const e = inicio()
    const ferido = { ...e, inimigos: [{ ...e.inimigos[0], currentHp: 40 }] }
    const r = rodada(ferido, atacar('uzumaki', 0))
    const golpe = r.turnResults.find((t) => t.skillName === 'Uzumaki')
    expect(golpe?.abatido).toBe(true)
    expect(r.state.inimigos[0].currentHp).toBe(0)
    expect(r.state.outcome).toBe('PLAYER_WIN')
  })

  it('chefe não cai pelo abate', () => {
    const e = inicio()
    const chefe = { ...e, inimigos: [{ ...e.inimigos[0], currentHp: 40, chefe: true }] }
    const r = rodada(chefe, atacar('uzumaki', 0))
    expect(r.turnResults.find((t) => t.skillName === 'Uzumaki')?.abatido).toBeUndefined()
    expect(r.state.inimigos[0].currentHp).toBeGreaterThan(0)
  })
})

describe('Dragão Arco-Íris: a guardiã', () => {
  it('se põe na frente do dono contra golpe de alvo único', () => {
    const comDragao = rodada(inicio(), atacar('dragao')).state
    const r = rodada(comDragao, parado, atacar('sk', 0))
    const golpe = r.turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')
    expect(golpe?.interceptou).toBe(true)
    expect(golpe?.posicaoDoAlvo).toBe(1)
    expect(r.state.aliados[0].currentHp).toBe(200)
  })

  it('golpe em área passa por cima e pega o dono', () => {
    const comDragao = rodada(inicio(), atacar('dragao')).state
    const r = rodada(comDragao, parado, atacar('area', 0))
    const golpe = r.turnResults.find((t) => t.kind === 'ATTACK' && t.side === 'ENEMY')
    expect(golpe?.interceptou).toBeUndefined()
    expect(golpe?.posicaoDoAlvo).toBe(0)
  })
})

describe('a IA de invocador', () => {
  const geto = () => inicio().aliados[0]

  it('chama a guardiã primeiro, se couber', () => {
    expect(pickAiSkill(geto(), [chamar, dragao, uzumaki], undefined, {})).toBe('dragao')
  })

  it('enche as maldições antes de soltar o Uzumaki', () => {
    expect(pickAiSkill(geto(), [chamar, massa, uzumaki], undefined, { maldicao: 0 })).toBe('massa')
    expect(pickAiSkill(geto(), [chamar, uzumaki], undefined, { maldicao: 2 })).toBe('uzumaki')
  })

  it('com o campo cheio, não gasta a rodada chamando', () => {
    const golpe = skill({ id: 'golpe', power: 20 })
    expect(pickAiSkill(geto(), [chamar, golpe], undefined, { maldicao: 3 })).toBe('golpe')
  })

  it('sem saber o campo, não invoca', () => {
    const golpe = skill({ id: 'golpe', power: 20 })
    expect(pickAiSkill(geto(), [chamar, golpe])).toBe('golpe')
  })

  it('mira invocação com metade do peso de um lutador', () => {
    const tres = rodada(inicio(), atacar('massa')).state.aliados
    // Pesos 2,1,1,1: o dono ocupa [0, 0.4) do sorteio.
    expect(alvoDaIa(tres, () => 0.39)).toBe(0)
    expect(alvoDaIa(tres, () => 0.41)).toBe(1)
    expect(alvoDaIa(tres, () => 0.99)).toBe(3)
  })
})

describe('gravar a rodada', () => {
  it('o golpe sintético da invocação não vai para a coluna de habilidade', () => {
    const chamou = rodada(inicio(), atacar('chamar')).state
    const r = rodada(chamou, atacar(null, 0))
    const golpe = r.turnResults.find((t) => t.kind === 'ATTACK' && t.posicao === 1)
    expect(golpe?.skillId).toBe('invocacao:maldicao-menor')
    expect(skillIdDaColuna(golpe?.skillId ?? null)).toBeNull()
    expect(skillIdDaColuna('chamar')).toBe('chamar')
  })
})

describe('o nome no log', () => {
  it('é gravado na linha, e não muda quando a vaga é reaproveitada', () => {
    const chamou = rodada(inicio(), atacar('dragao')).state
    const r = rodada(chamou, atacar(null, 0))
    const golpe = r.turnResults.find((t) => t.kind === 'ATTACK' && t.posicao === 1)
    expect(golpe?.nomeDoAtor).toBe('Dragão Arco-Íris')
    const contra = rodada(chamou, parado, atacar('sk', 0)).turnResults.find((t) => t.side === 'ENEMY' && t.kind === 'ATTACK')
    expect(contra?.nomeDoAlvo).toBe('Dragão Arco-Íris')
  })
})

describe('Megumi: um shikigami por vez, e a ordem', () => {
  const invocar = (id: string, def: string) =>
    skill({ id, name: id, power: 0, effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: def }] })
  const MEGUMI: Record<string, SkillDef> = {
    ...SKILLS,
    nue: invocar('nue', 'nue'),
    sapo: invocar('sapo', 'sapo'),
    mahoraga: invocar('mahoraga', 'mahoraga'),
    soldado: invocar('soldado', 'soldado-sombra'),
  }
  const r = (e: BattleState, minha: AcaoDeCombate, dele: AcaoDeCombate = parado) =>
    resolveRound(e, { aliadas: [minha], inimigas: [dele] }, { playerSkills: MEGUMI, enemySkills: MEGUMI, playerTransformations: {} }, NUNCA_CRITA)

  it('chamar outro shikigami manda o atual de volta, sem espera', () => {
    const comNue = r(inicio(), atacar('nue')).state
    const troca = r(comNue, atacar('sapo'))
    expect(invocacoesEmCampo(troca.state.aliados, 0)).toEqual({ shikigami: 1 })
    // A vaga da Nue foi reaproveitada pelo Sapo.
    expect(troca.state.aliados).toHaveLength(2)
    expect(troca.state.aliados[1].invocacao?.def).toBe('sapo')
    expect(troca.state.aliados[0].cooldowns.nue ?? 0).toBe(0)
    expect(troca.turnResults.find((x) => x.kind === 'SUMMON')?.substituida).toBe('Nue')
  })

  it('depois da rodada em que chegou, já aceita ordem', () => {
    const comNue = r(inicio(), atacar('nue')).state
    expect(comNue.aliados[1].invocacao?.recemChegada).toBeUndefined()
    expect(ordensDisponiveis(comNue.aliados, 0).map((o) => o.posicao)).toEqual([1])
  })

  it('quem chega na vaga de outro não herda o golpe dele na mesma rodada', () => {
    const comNue = r(inicio(), atacar('nue')).state
    const troca = r(comNue, atacar('sapo'))
    expect(troca.turnResults.some((x) => x.kind === 'ATTACK' && x.side === 'PLAYER' && x.posicao === 1)).toBe(false)
  })

  it('a ordem troca o ataque sozinho pelo especial, e o dono paga', () => {
    const comNue = r(inicio(), atacar('nue')).state
    const semOrdem = r(comNue, atacar(null, 0))
    const ordem = r(comNue, { kind: 'ORDEM', invocacao: 1, alvo: 0 })
    const golpes = ordem.turnResults.filter((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')
    expect(golpes).toHaveLength(1)
    expect(golpes[0]).toMatchObject({ posicao: 1, skillName: 'Rasante Elétrico', ordem: true })
    expect(semOrdem.state.aliados[0].currentEnergy - ordem.state.aliados[0].currentEnergy).toBe(INVOCACOES.nue.especial?.custo)
  })

  it('sem energia para a ordem, o shikigami ataca sozinho como sempre', () => {
    const comNue = r(inicio(), atacar('nue')).state
    const semEnergia = { ...comNue, aliados: [{ ...comNue.aliados[0], currentEnergy: 0, maxEnergy: 0 }, comNue.aliados[1]] }
    const ordem = r(semEnergia, { kind: 'ORDEM', invocacao: 1, alvo: 0 })
    const golpe = ordem.turnResults.find((x) => x.kind === 'ATTACK' && x.posicao === 1)
    expect(golpe?.skillName).toBe(INVOCACOES.nue.golpe.nome)
    expect(golpe?.ordem).toBeUndefined()
  })

  it('o Mahoraga cobra vida do Megumi a cada rodada, e volta quando ela não dá', () => {
    const comMahoraga = r(inicio(), atacar('mahoraga'))
    const custo = Math.round(200 * (INVOCACOES.mahoraga.manutencaoVida ?? 0))
    expect(comMahoraga.state.aliados[0].currentHp).toBe(200 - custo)
    const quase = { ...comMahoraga.state, aliados: [{ ...comMahoraga.state.aliados[0], currentHp: custo }, comMahoraga.state.aliados[1]] }
    const volta = r(quase, parado)
    expect(volta.state.aliados[0].currentHp).toBe(custo)
    expect(volta.state.aliados[1].invocacao?.fora).toBe(true)
  })

  it('a roda do Mahoraga: o mesmo golpe entra mais fraco da segunda vez', () => {
    const e = inicio({ hp: 1000 })
    const comMahoraga = r(e, atacar('mahoraga')).state
    const primeiro = r(comMahoraga, parado, atacar('sk', 1))
    const golpe1 = primeiro.turnResults.find((x) => x.side === 'ENEMY' && x.kind === 'ATTACK')
    expect(golpe1?.adaptou).toBe(true)
    expect(primeiro.state.aliados[1].adaptacao?.sk).toBe(INVOCACOES.mahoraga.adapta?.porGolpe)

    const segundo = r(primeiro.state, parado, atacar('sk', 1))
    const golpe2 = segundo.turnResults.find((x) => x.side === 'ENEMY' && x.kind === 'ATTACK')
    expect(golpe2?.damage ?? 0).toBeLessThan(golpe1?.damage ?? 0)

    // Outro golpe não foi aprendido: entra inteiro.
    const outro = r(primeiro.state, parado, atacar(null, 1))
    expect(outro.state.aliados[1].adaptacao?.['ataque-basico']).toBe(INVOCACOES.mahoraga.adapta?.porGolpe)
  })

  it('a sombra destruída do Jin-Woo volta mais rápido que a espera padrão', () => {
    const comSoldado = r(inicio(), atacar('soldado')).state
    const caiu = r(comSoldado, atacar(null, 0), atacar('sk', 1))
    expect(caiu.state.aliados[0].cooldowns.soldado).toBe(INVOCACOES['soldado-sombra'].espera)
    expect(INVOCACOES['soldado-sombra'].espera).toBeLessThan(ESPERA_DA_INVOCACAO)
  })
})

describe('Red: o treinador', () => {
  const comandar = (id: string, pokemon: string, over: Partial<SkillDef> = {}) =>
    skill({ id, name: id, power: 30, effects: [{ type: 'COMANDO', target: 'SELF', magnitude: 0, invocacao: pokemon }], ...over })
  const RED: Record<string, SkillDef> = {
    ...SKILLS,
    choque: comandar('choque', 'pikachu', { energyCost: 10 }),
    chamas: comandar('chamas', 'charizard'),
    garra: comandar('garra', 'mega-charizard-x'),
    mega: skill({ id: 'mega', name: 'Mega Evolução', power: 0, cooldown: 99, effects: [{ type: 'EVOLUIR', target: 'SELF', magnitude: 0, invocacao: 'charizard', para: 'mega-charizard-x' }] }),
  }
  const r = (e: BattleState, minha: AcaoDeCombate, dele: AcaoDeCombate = parado) =>
    resolveRound(e, { aliadas: [minha], inimigas: [dele] }, { playerSkills: RED, enemySkills: RED, playerTransformations: {} }, NUNCA_CRITA)
  const comTime = () => prepararTreinador(inicio(), 'PLAYER', 0, ['pikachu', 'charizard'])

  it('o time entra com o primeiro em campo, e a vida do Red é a do time', () => {
    const e = comTime()
    expect(e.aliados[0].treinador).toBe(true)
    expect(e.aliados[1].invocacao?.fora).toBeFalsy()
    expect(e.aliados[2].invocacao?.fora).toBe(true)
    expect(e.aliados[0].currentHp).toBe(e.aliados[1].currentHp + e.aliados[2].currentHp)
  })

  it('o golpe comandado sai do Pokémon, e o Red paga', () => {
    const e = comTime()
    const semGolpe = r(e, parado)
    const comGolpe = r(e, atacar('choque', 0))
    const golpe = comGolpe.turnResults.find((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')
    expect(golpe?.posicao).toBe(1)
    expect(golpe?.nomeDoAtor).toBe('Pikachu')
    expect(semGolpe.state.aliados[0].currentEnergy - comGolpe.state.aliados[0].currentEnergy).toBe(10)
  })

  it('sem golpe pronto, o Pokémon em campo dá a Investida — o Red nunca bate', () => {
    const golpe = r(comTime(), atacar(null, 0)).turnResults.find((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')
    expect(golpe).toMatchObject({ posicao: 1, skillName: 'Investida' })
  })

  it('golpe de Pokémon que não está em campo não sai', () => {
    const golpes = r(comTime(), atacar('chamas', 0)).turnResults.filter((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')
    expect(golpes).toHaveLength(0)
  })

  it('o Red não é alvo: o inimigo bate no Pokémon em campo', () => {
    const golpe = r(comTime(), parado, atacar('sk', 0)).turnResults.find((x) => x.kind === 'ATTACK' && x.side === 'ENEMY')
    expect(golpe?.posicaoDoAlvo).toBe(1)
  })

  it('a troca gasta a rodada, e quem entra já apanha', () => {
    const t = r(comTime(), { kind: 'TROCAR', invocacao: 2 }, atacar('sk', 0))
    expect(t.state.aliados[1].invocacao?.fora).toBe(true)
    expect(t.state.aliados[2].invocacao?.fora).toBeFalsy()
    expect(t.turnResults.find((x) => x.side === 'ENEMY' && x.kind === 'ATTACK')?.posicaoDoAlvo).toBe(2)
    expect(t.turnResults.find((x) => x.kind === 'SUMMON')).toMatchObject({ troca: true, substituida: 'Pikachu' })
  })

  it('sem Pokémon em campo, o Red manda o próximo sozinho, e ele não bate na rodada da entrada', () => {
    const e = comTime()
    const semCampo = { ...e, aliados: e.aliados.map((c, i) => (i === 1 ? { ...c, currentHp: 0, invocacao: { ...c.invocacao!, fora: true } } : c)) }
    const r1 = r(semCampo, atacar('chamas', 0))
    expect(r1.state.aliados[2].invocacao?.fora).toBeFalsy()
    expect(r1.turnResults.some((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')).toBe(false)
  })

  it('desmaiado o time inteiro, o Red perde', () => {
    const e = comTime()
    const quase = { ...e, aliados: e.aliados.map((c, i) => (i === 1 ? { ...c, currentHp: 1 } : i === 2 ? { ...c, currentHp: 0 } : c)) }
    const fim = r(quase, parado, atacar('sk', 0))
    expect(fim.state.aliados[0].currentHp).toBe(0)
    expect(fim.state.outcome).toBe('ENEMY_WIN')
  })

  it('a Mega Evolução transforma o Charizard em campo, e os golpes do Mega X passam a sair', () => {
    const e = prepararTreinador(inicio(), 'PLAYER', 0, ['charizard'])
    const antes = e.aliados[1].maxHp
    const mega = r(e, atacar('mega'))
    expect(mega.state.aliados[1].invocacao?.def).toBe('mega-charizard-x')
    expect(mega.state.aliados[1].maxHp).toBeGreaterThan(antes)
    expect(mega.turnResults.find((x) => x.kind === 'SUMMON')?.evoluiu).toBe('Charizard')
    const garra = r(mega.state, atacar('garra', 0)).turnResults.find((x) => x.kind === 'ATTACK' && x.side === 'PLAYER')
    expect(garra?.posicao).toBe(1)
  })
})
