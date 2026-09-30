import type { Alcance, CombatantState, SkillDef } from './types'

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
  /** Frações da vida máxima, do ataque e da defesa do dono. */
  vida: number
  ataque: number
  defesa: number
  /** O golpe que ela dá sozinha, toda rodada. */
  golpe: { nome: string; power: number; tags: string[]; alcance?: Alcance }
  /** Energia por rodada, cobrada do dono no fim da rodada. Sem ela, a invocação volta. */
  manutencao: number
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
