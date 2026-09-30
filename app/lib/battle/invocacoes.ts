import type { Alcance, CombatantState, SkillDef, SkillEffect } from './types'

/**
 * As criaturas que um invocador põe em campo.
 *
 * MORAM NO CÓDIGO, NÃO NO BANCO, como o catálogo da raid: são regra de jogo
 * (quanto aguentam, quanto batem, quanto custam por rodada), não conteúdo que
 * alguém edita. O golpe que chama uma delas é uma habilidade normal do
 * catálogo, com o efeito INVOCAR apontando para o id daqui.
 *
 * OS NÚMEROS SÃO FRAÇÕES DO DONO, e não valores fixos: uma maldição do Geto no
 * nível 20 precisa ser mais forte que uma no nível 1, e ler do dono faz isso
 * sem tabela por nível. A invocação nasce com o que o dono tem NA HORA —
 * transformado, ele chama criaturas mais fortes.
 */
export type DefDeInvocacao = {
  id: string
  nome: string
  /**
   * O grupo divide o limite e é o que o CONSUMIR procura: as maldições do
   * Geto são um grupo só, com teto de 3 no campo.
   */
  grupo: string
  limiteDoGrupo: number
  /** Como o grupo aparece nas orbes ("Sombras", "Shikigami"). Ausente, o nome da invocação. */
  nomeDoGrupo?: string
  /**
   * Chamar outra do grupo com o campo cheio MANDA A ATUAL DE VOLTA, em vez de
   * falhar. É o Megumi: um shikigami por vez, e chamar o Sapo recolhe a Nue.
   */
  substitui?: boolean
  /** Rodadas de espera quando é destruída. Ausente, ESPERA_DA_INVOCACAO. */
  espera?: number
  /** Frações da vida máxima, do ataque e da defesa do dono. */
  vida: number
  ataque: number
  defesa: number
  /** O golpe que ela dá sozinha, toda rodada. */
  golpe: { nome: string; power: number; tags: string[]; alcance?: Alcance }
  /** Energia por rodada, cobrada do dono no fim da rodada. Sem ela, a invocação volta. */
  manutencao: number
  /**
   * Fração da vida MÁXIMA do dono cobrada por rodada, além da energia. É o
   * preço do Mahoraga. Nunca derruba o dono: sem vida para pagar, a
   * invocação volta, como sem energia.
   */
  manutencaoVida?: number
  /**
   * O golpe especial, que só sai por ORDEM do dono (a ação dele na rodada),
   * no lugar do ataque sozinho. O dono paga `custo` de energia.
   */
  especial?: {
    nome: string
    power: number
    custo: number
    tags: string[]
    alcance?: Alcance
    effects?: SkillEffect[]
  }
  /**
   * GUARDIÃ: enquanto está de pé, os golpes de alvo único mirados no dono vão
   * nela. Golpe em área passa por cima — não há onde se pôr na frente.
   */
  guarda?: boolean
  /** Apresentação: a cor e o kanji da orbe. */
  cor: string
  marca: string
}

export const INVOCACOES: Record<string, DefDeInvocacao> = {
  // Suguru Geto — as maldições que ele absorveu. Frágeis, batem pouco, e o
  // valor delas está em somar: três em campo são o Uzumaki carregado.
  'maldicao-menor': {
    id: 'maldicao-menor',
    nome: 'Maldição',
    grupo: 'maldicao',
    limiteDoGrupo: 3,
    vida: 0.08,
    ataque: 0.35,
    defesa: 0.5,
    golpe: { nome: 'Garras da Maldição', power: 9, tags: ['maldicao'], alcance: 'CORPO' },
    manutencao: 3,
    cor: '#8b5cf6',
    marca: '呪',
  },
  // O dragão que o Geto usa de escudo contra o Toji e o Gojo.
  'dragao-arco-iris': {
    id: 'dragao-arco-iris',
    nome: 'Dragão Arco-Íris',
    grupo: 'dragao',
    limiteDoGrupo: 1,
    vida: 0.3,
    ataque: 0.5,
    defesa: 1,
    golpe: { nome: 'Mandíbulas do Dragão', power: 14, tags: ['maldicao'], alcance: 'CORPO' },
    manutencao: 7,
    guarda: true,
    cor: '#38bdf8',
    marca: '竜',
  },

  // Megumi Fushiguro — as Dez Sombras. Um shikigami por vez (`substitui`), e
  // o que o Megumi faz na rodada é lutar com o bastão ou dar a ordem do
  // golpe especial. Desenho aprovado no protótipo do canvas da raid.
  nue: {
    id: 'nue',
    nome: 'Nue',
    grupo: 'shikigami',
    nomeDoGrupo: 'Shikigami',
    limiteDoGrupo: 1,
    substitui: true,
    vida: 0.22,
    ataque: 0.45,
    defesa: 0.6,
    golpe: { nome: 'Garras da Nue', power: 9, tags: ['shikigami', 'eletrico'], alcance: 'CORPO' },
    manutencao: 3,
    especial: {
      nome: 'Rasante Elétrico',
      power: 24,
      custo: 8,
      tags: ['shikigami', 'eletrico'],
      alcance: 'CORPO',
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 10, duration: 2 }],
    },
    cor: '#c4b5fd',
    marca: '鵺',
  },
  'caes-divinos': {
    id: 'caes-divinos',
    nome: 'Cães Divinos',
    grupo: 'shikigami',
    nomeDoGrupo: 'Shikigami',
    limiteDoGrupo: 1,
    substitui: true,
    vida: 0.25,
    ataque: 0.55,
    defesa: 0.7,
    golpe: { nome: 'Mordida', power: 11, tags: ['shikigami'], alcance: 'CORPO' },
    manutencao: 4,
    especial: { nome: 'Mordida Dupla', power: 31, custo: 10, tags: ['shikigami'], alcance: 'CORPO' },
    cor: '#e4e4e7',
    marca: '犬',
  },
  sapo: {
    id: 'sapo',
    nome: 'Sapo',
    grupo: 'shikigami',
    nomeDoGrupo: 'Shikigami',
    limiteDoGrupo: 1,
    substitui: true,
    vida: 0.22,
    ataque: 0.4,
    defesa: 0.8,
    golpe: { nome: 'Língua', power: 6, tags: ['shikigami'], alcance: 'DISTANCIA' },
    manutencao: 5,
    especial: {
      nome: 'Puxão da Língua',
      power: 40,
      custo: 12,
      tags: ['shikigami'],
      alcance: 'DISTANCIA',
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 2 }],
    },
    cor: '#86efac',
    marca: '蟇',
  },
  'max-elephant': {
    id: 'max-elephant',
    nome: 'Max Elephant',
    grupo: 'shikigami',
    nomeDoGrupo: 'Shikigami',
    limiteDoGrupo: 1,
    substitui: true,
    vida: 0.3,
    ataque: 0.6,
    defesa: 1,
    golpe: { nome: 'Pisoteio', power: 11, tags: ['shikigami'], alcance: 'CORPO' },
    manutencao: 8,
    especial: { nome: 'Inundação', power: 32, custo: 22, tags: ['shikigami', 'agua'], alcance: 'AREA' },
    cor: '#7dd3fc',
    marca: '象',
  },
  // O general divino. Não aceita ordem — na obra ele não obedece a ninguém —
  // e cobra vida do Megumi a cada rodada em que está em campo.
  mahoraga: {
    id: 'mahoraga',
    nome: 'Mahoraga',
    grupo: 'shikigami',
    nomeDoGrupo: 'Shikigami',
    limiteDoGrupo: 1,
    substitui: true,
    vida: 0.7,
    ataque: 1.25,
    defesa: 1.2,
    golpe: { nome: 'Espada da Extinção', power: 34, tags: ['shikigami', 'espada'], alcance: 'CORPO' },
    manutencao: 0,
    manutencaoVida: 0.025,
    cor: '#fbbf24',
    marca: '輪',
  },

  // Sung Jin Woo — o exército das sombras. Até três em campo, de qualquer
  // tipo, e sombra destruída volta rápido (espera 2): na obra elas se
  // refazem com a mana do Monarca.
  'soldado-sombra': {
    id: 'soldado-sombra',
    nome: 'Soldado das Sombras',
    grupo: 'sombra',
    nomeDoGrupo: 'Sombras',
    limiteDoGrupo: 3,
    espera: 2,
    vida: 0.07,
    ataque: 0.3,
    defesa: 0.5,
    golpe: { nome: 'Lâmina Sombria', power: 7, tags: ['sombra'], alcance: 'CORPO' },
    manutencao: 3,
    cor: '#818cf8',
    marca: '兵',
  },
  igris: {
    id: 'igris',
    nome: 'Igris',
    grupo: 'sombra',
    nomeDoGrupo: 'Sombras',
    limiteDoGrupo: 3,
    espera: 2,
    vida: 0.16,
    ataque: 0.55,
    defesa: 0.9,
    golpe: { nome: 'Espada Carmesim', power: 14, tags: ['sombra', 'espada'], alcance: 'CORPO' },
    manutencao: 6,
    cor: '#dc2626',
    marca: '騎',
  },
  tank: {
    id: 'tank',
    nome: 'Tank',
    grupo: 'sombra',
    nomeDoGrupo: 'Sombras',
    limiteDoGrupo: 3,
    espera: 2,
    vida: 0.2,
    ataque: 0.4,
    defesa: 1,
    golpe: { nome: 'Garra de Urso', power: 8, tags: ['sombra'], alcance: 'CORPO' },
    manutencao: 6,
    guarda: true,
    cor: '#a8a29e',
    marca: '盾',
  },
  beru: {
    id: 'beru',
    nome: 'Beru',
    grupo: 'sombra',
    nomeDoGrupo: 'Sombras',
    limiteDoGrupo: 3,
    espera: 2,
    vida: 0.2,
    ataque: 0.65,
    defesa: 0.8,
    golpe: { nome: 'Garras do Rei', power: 16, tags: ['sombra'], alcance: 'CORPO' },
    manutencao: 10,
    cor: '#2dd4bf',
    marca: '蟻',
  },
}

/**
 * Rodadas que o golpe de invocação fica em espera quando a criatura é
 * DESTRUÍDA. É a fantasia do invocador: o poder dele está fora dele, e pode
 * ser tirado. Consumida (CONSUMIR) ou recolhida por falta de energia não abre
 * espera — foi escolha do dono, não perda.
 */
export const ESPERA_DA_INVOCACAO = 3

export function defDeInvocacao(id: string): DefDeInvocacao | undefined {
  return INVOCACOES[id]
}

/** Id do golpe sintético de uma invocação — não é linha do banco. */
export function idDoGolpeDaInvocacao(def: DefDeInvocacao): string {
  return `invocacao:${def.id}`
}

/**
 * O id que vai na coluna Turn.skillId. O golpe da invocação é sintético — não
 * existe linha de Skill com ele —, e a chave estrangeira recusaria a gravação
 * da rodada inteira. Na coluna ele fica nulo, como o ataque básico; o nome e o
 * id continuam no JSON do resultado, que é o que o log lê.
 */
export function skillIdDaColuna(skillId: string | null): string | null {
  return skillId?.startsWith('invocacao:') ? null : skillId
}

/** O golpe especial, por ordem do dono, no formato que o motor entende. */
export function especialDaInvocacao(def: DefDeInvocacao): SkillDef | undefined {
  if (!def.especial) return undefined
  return {
    id: `invocacao:${def.id}:especial`,
    name: def.especial.nome,
    power: def.especial.power,
    energyCost: 0,
    cooldown: 0,
    effects: def.especial.effects ?? [],
    scalingStat: 'attack',
    tags: def.especial.tags,
    alcance: def.especial.alcance,
  }
}

/**
 * As invocações do dono que aceitam ordem AGORA: em campo, com golpe
 * especial, e que não acabaram de chegar (quem chegou ainda não age).
 */
export function ordensDisponiveis(time: CombatantState[], dono: number): { posicao: number; def: DefDeInvocacao }[] {
  const ordens: { posicao: number; def: DefDeInvocacao }[] = []
  time.forEach((c, posicao) => {
    if (c.invocacao?.dono !== dono || !emCampo(c) || c.invocacao.recemChegada) return
    const def = defDeInvocacao(c.invocacao.def)
    if (def?.especial) ordens.push({ posicao, def })
  })
  return ordens
}

/**
 * A ordem como BOTÃO: o especial vestido de habilidade, para a tela usar o
 * mesmo botão das habilidades (custo, efeitos, dica). O custo é o mesmo que o
 * motor cobra — energyCostFor sobre `custo`, no dono.
 */
export function golpeDeOrdem(def: DefDeInvocacao, posicao: number): SkillDef | undefined {
  if (!def.especial) return undefined
  return {
    id: `ordem-${posicao}`,
    name: `Ordem: ${def.especial.nome}`,
    power: def.especial.power,
    energyCost: def.especial.custo,
    cooldown: 0,
    effects: def.especial.effects ?? [],
    scalingStat: 'attack',
    tags: def.especial.tags,
    alcance: def.especial.alcance,
    description: `${def.nome} usa ${def.especial.nome} no lugar do ataque sozinho desta rodada.`,
  }
}

/** O golpe que a invocação dá sozinha, no formato que o motor entende. */
export function golpeDaInvocacao(def: DefDeInvocacao): SkillDef {
  return {
    id: idDoGolpeDaInvocacao(def),
    name: def.golpe.nome,
    power: def.golpe.power,
    energyCost: 0,
    cooldown: 0,
    effects: [],
    scalingStat: 'attack',
    tags: def.golpe.tags,
    alcance: def.golpe.alcance,
  }
}

/** Está em campo agora: não saiu e está de pé. */
export function emCampo(c: CombatantState): boolean {
  return Boolean(c.invocacao) && !c.invocacao?.fora && c.currentHp > 0
}

/** Quantas invocações de cada grupo o dono tem em campo. */
export function invocacoesEmCampo(time: CombatantState[], dono: number): Record<string, number> {
  const contagem: Record<string, number> = {}
  for (const c of time) {
    if (!c.invocacao || c.invocacao.dono !== dono || !emCampo(c)) continue
    const def = defDeInvocacao(c.invocacao.def)
    if (!def) continue
    contagem[def.grupo] = (contagem[def.grupo] ?? 0) + 1
  }
  return contagem
}

/** Quantas mais deste grupo ainda cabem no campo do dono. */
export function vagasDoGrupo(time: CombatantState[], dono: number, def: DefDeInvocacao): number {
  return Math.max(0, def.limiteDoGrupo - (invocacoesEmCampo(time, dono)[def.grupo] ?? 0))
}

/** A invocação que o golpe chama, se ele chama alguma. */
export function invocacaoDoGolpe(skill: SkillDef | null): { def: DefDeInvocacao; quantidade: number } | undefined {
  const efeito = skill?.effects.find((e) => e.type === 'INVOCAR')
  const def = efeito?.invocacao ? defDeInvocacao(efeito.invocacao) : undefined
  return def && efeito ? { def, quantidade: Math.max(1, efeito.magnitude) } : undefined
}

/** Lutador de verdade (não invocação): é quem decide a luta. */
export function ehLutador(c: CombatantState): boolean {
  return !c.invocacao
}
