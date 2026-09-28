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
 * CALIBRADO POR SIMULAÇÃO, não por fórmula: +5 pontos num atributo, e quanto
 * isso muda a vitória contra o mesmo personagem um nível acima, com a IA
 * pilotando os dois lados (formas incluídas) e a média dos dois lados da
 * mesa — o lado do jogador leva vantagem no empate de iniciativa.
 *
 *                 vida  ataque defesa  veloc. energia stamina agilid.
 *   Ichigo         +22    +32    +26    +10    +37     −4     +17
 *   Byakuya         +9      0     +9    +42     +1      0     +18
 *   Goku            +2     +3     +8     +6    +13      0      +3
 *   Naruto         +50    +10    +52    +40    +12      0     +23
 *   Broly          +33      0    +80    +29    +15      0     +29
 *
 * Cada personagem tem dois ou três treinos que valem a pena, e o kit decide
 * quais — que é o desejado: não existe "o" atributo certo.
 *
 * MEDIÇÕES ANTERIORES ESTAVAM ERRADAS. O golpe que perdia um choque saía de
 * graça (ver resolveRound), e em espelho os dois lados se chocavam toda
 * rodada sem gastar nada. A tabela que existia aqui foi medida assim.
 *
 * ENERGIA CAIU DE 12 PARA 6 quando a economia de energia passou a existir
 * (a luta começa com 40% dela — ver ENERGY_REGEN_PCT). A 12, ela virou o
 * melhor treino de todo mundo: +72 pontos para o Goku, +51 para o Ichigo.
 *
 * STAMINA SEGUE VALENDO QUASE ZERO, e não é este número: nas lutas medidas
 * ela nunca acaba, porque a manutenção da forma fica perto da regeneração.
 * Ela passa a contar em luta longa, de raid, onde a forma precisa durar.
 *
 * POR QUE A DEFESA PRECISOU DE 5. O dano é mitigado por 100/(100+defesa), e
 * com defesa na casa dos 20 a curva é quase plana: 10 pontos tiram só ~7% do
 * dano recebido. A mesma curva faz a defesa render cada vez menos quanto mais
 * se tem — é o limitador natural dela, e por isso ela aguenta um número maior.
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
  energy: 6,
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
