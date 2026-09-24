import type { StatBonus } from '@/app/lib/battle/types'

export const ATRIBUTOS = [
  'hp',
  'attack',
  'defense',
  'speed',
  'energy',
  'stamina',
  'accuracy',
  'agility',
  'intelligence',
] as const
export type Atributo = (typeof ATRIBUTOS)[number]

/**
 * Quanto UM ponto de nível dá em cada atributo.
 *
 * CALIBRADO POR SIMULAÇÃO, não por fórmula. A primeira versão saía de um
 * orçamento (hp + 5*atq + 5*def + 4*vel + 0,3*energia) que prometia "um ponto
 * vale o mesmo em qualquer lugar" — e o simulador mostrou que não valia.
 * Medido com um treino (5 pontos) partindo de uma luta perdida contra o mesmo
 * personagem um nível acima:
 *
 *                 antes (Ichigo / Byakuya / Goku)   agora
 *   ataque        +52 /   0 / +32 pp                +28 /   0 / +20
 *   defesa         +3 /  +7 /  +6                   +14 / +19 / +18
 *   acurácia       +3 /  +5 /  +3                    +6 / +11 /  +7
 *
 * Ataque esmagava tudo nos kits que escalam dele, e defesa e acurácia
 * rendiam quase nada para qualquer um — era "uma escolha certa e cinco
 * erradas". Agora cada personagem tem três ou quatro treinos que valem a
 * pena, e o atributo de ESCALA do kit dele continua sendo o melhor sem
 * esmagar os outros. Isso é desejado: o Ichigo treina ataque, o Byakuya
 * treina energia, e é o kit que diz qual.
 *
 * POR QUE A DEFESA PRECISOU DE 5. O dano é mitigado por 100/(100+defesa), e
 * com defesa na casa dos 20 a curva é quase plana: 10 pontos tiram só ~7% do
 * dano recebido. A mesma curva faz a defesa render cada vez menos quanto mais
 * se tem — é o limitador natural dela, e por isso ela aguenta um número maior.
 *
 * VELOCIDADE CONTINUA VALENDO METADE: decide a iniciativa E alimenta o
 * crítico, rende em duas dimensões. E mesmo a 1 por ponto ela já é o
 * segundo melhor treino do Goku e do Byakuya.
 *
 * O QUE CONTINUA SEM VALER: stamina rende zero para os três, e energia só
 * rende para quem escala dela. Não é o número daqui — a reserva nunca acaba:
 * em 100 lutas o Ichigo nunca desceu de 61% de energia, porque quem limita o
 * uso é a recarga das habilidades. Consertar isso é mexer na economia da
 * luta (regeneração), não nesta tabela.
 *
 * Guardamos os PONTOS gastos no banco, não o bônus final. Mudar um número
 * aqui reajusta todo mundo na próxima batalha, em vez de deixar personagens
 * antigos com valores calculados por uma regra que já não existe.
 */
export const ATRIBUTO_POR_PONTO: Record<Atributo, number> = {
  hp: 10,
  attack: 1,
  defense: 5,
  speed: 1,
  energy: 12,
  stamina: 12,
  /**
   * Acurácia e agilidade mudam a FREQUÊNCIA com que o resto acontece, e as
   * duas têm teto de 15 pontos de vantagem (ver ajusteDeAcerto): passou
   * disso, o ponto vale zero. A 2 por ponto, oito treinos esgotam o teto — um
   * investimento de verdade, que a mecânica se recusa a pagar além disso.
   *
   * A acurácia só passou a valer alguma coisa quando começou a SOMAR à
   * precisão do golpe; antes ela só cancelava esquiva, e esquiva normal é zero.
   *
   * Inteligência não entra em NENHUMA conta de combate. Vale +2 por ponto
   * porque desconto de treino é dinheiro, não poder, e não há motivo para
   * encarecê-la contra quem quer poder.
   */
  accuracy: 2,
  agility: 2,
  intelligence: 2,
}

export const ATRIBUTO_LABEL: Record<Atributo, string> = {
  hp: 'Vida',
  attack: 'Ataque',
  defense: 'Defesa',
  speed: 'Velocidade',
  energy: 'Energia',
  stamina: 'Stamina',
  accuracy: 'Acurácia',
  agility: 'Agilidade',
  intelligence: 'Inteligência',
}

export const ATRIBUTO_AJUDA: Record<Atributo, string> = {
  hp: 'Quanto dano você aguenta antes de cair.',
  attack: 'Aumenta o dano das habilidades que escalam de ataque — golpe físico e o kit de quem é ATACANTE.',
  defense: 'Reduz o dano recebido, e é a escala das habilidades de quem é TANQUE.',
  speed: 'Decide quem age primeiro na rodada e aumenta a chance de crítico. Por render em duas coisas, cada ponto dá metade.',
  energy: 'Reserva de ataque: quantas habilidades ofensivas você lança. Também é a escala de kidō, ki e ninjutsu.',
  stamina: 'Reserva defensiva: quantas vezes você consegue usar escudo, cura e counter antes de ficar sem.',
  accuracy:
    'Reduz a chance de o adversário desviar dos seus golpes. Só a diferença para a agilidade dele conta — contra alguém tão preciso quanto você, ninguém erra.',
  agility:
    'Chance de desviar dos golpes do adversário, até no máximo 15%. Separada de velocidade de propósito: velocidade decide a ordem da rodada, agilidade decide se o golpe encosta.',
  intelligence:
    'Barateia o treino de atributos. Não entra em nenhuma conta de dano — é o atributo de quem prefere crescer mais rápido a bater mais forte.',
}

type Alocacoes = {
  allocHp: number
  allocAttack: number
  allocDefense: number
  allocSpeed: number
  allocEnergy: number
  allocStamina: number
  allocAccuracy: number
  allocAgility: number
  allocIntelligence: number
}

/** Converte pontos gastos em bônus plano, para somar aos stats do personagem. */
export function bonusDeAtributos(a: Alocacoes): StatBonus {
  return {
    hp: a.allocHp * ATRIBUTO_POR_PONTO.hp,
    attack: a.allocAttack * ATRIBUTO_POR_PONTO.attack,
    defense: a.allocDefense * ATRIBUTO_POR_PONTO.defense,
    speed: a.allocSpeed * ATRIBUTO_POR_PONTO.speed,
    energy: a.allocEnergy * ATRIBUTO_POR_PONTO.energy,
    stamina: a.allocStamina * ATRIBUTO_POR_PONTO.stamina,
    accuracy: a.allocAccuracy * ATRIBUTO_POR_PONTO.accuracy,
    agility: a.allocAgility * ATRIBUTO_POR_PONTO.agility,
    intelligence: a.allocIntelligence * ATRIBUTO_POR_PONTO.intelligence,
  }
}

/** Nome da coluna que guarda os pontos de um atributo. */
export function colunaDe(atributo: Atributo): keyof Alocacoes {
  const mapa: Record<Atributo, keyof Alocacoes> = {
    hp: 'allocHp',
    attack: 'allocAttack',
    defense: 'allocDefense',
    speed: 'allocSpeed',
    energy: 'allocEnergy',
    stamina: 'allocStamina',
    accuracy: 'allocAccuracy',
    agility: 'allocAgility',
    intelligence: 'allocIntelligence',
  }
  return mapa[atributo]
}

export function ehAtributo(valor: string): valor is Atributo {
  return (ATRIBUTOS as readonly string[]).includes(valor)
}
