import {
  BASIC_ATTACK_POWER,
  CRIT_BASE_CHANCE,
  CRIT_MAX_CHANCE,
  CRIT_MULTIPLIER,
  CRIT_SPEED_COEFFICIENT,
  ENERGY_REGEN_PCT,
  STAMINA_REGEN_PCT,
  LEVEL_SCALING,
  ACERTO_MINIMO,
  ATRIBUTO_NEUTRO,
  BLOQUEIO_CUSTO_BASE,
  BLOQUEIO_REDUCAO,
  GUARDA_POR_DANO,
  GUARDA_QUEBRADA_ATORDOA,
  SEVERIDADE,
  DOMAIN_DAMAGE_BONUS,
  EXECUCAO_LIMIAR_HP,
  BONUS_DE_ACURACIA_MAXIMO,
  EVASAO_MAXIMA,
  EVASAO_POR_PONTO,
  SCALING_BASE,
  SCALING_REFERENCE,
} from './constants'
import type {
  AcaoDeCombate,
  AcoesDaRodada,
  AppliedEffect,
  BaseStats,
  BattleState,
  BattleStateGravado,
  CombatantState,
  DotFlavor,
  Outcome,
  ScalingStat,
  Side,
  SkillDef,
  SkillEffect,
  Stat,
  StatBonus,
  StatusEffectInstance,
  TraitDef,
  TransformationDef,
  TransformationTrigger,
  TurnResult,
} from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Deduz a natureza de um dano contínuo a partir das tags da habilidade.
 *
 * As tags do catálogo são bagunçadas — há 'fire' e 'fogo', 'poison' e
 * 'veneno', 'bleed' e 'sangramento' —, então a leitura aceita as duas
 * línguas. Nada disso mudava nada antes; é a segunda vez que as tags, que o
 * schema chamava de "flavor only", decidem alguma coisa.
 *
 * Sem correspondência, fica indefinido e a tela cai no genérico.
 */
/**
 * As tags que identificam cada natureza de dano contínuo, em ordem de
 * prioridade.
 *
 * A PRIMEIRA VERSÃO SÓ OLHAVA QUATRO PARES DE TAGS e, na prática, não
 * funcionava: das 131 habilidades que aplicam dano contínuo, 95 não tinham
 * nenhuma delas e caíam todas no ícone genérico. O jogador via fogo em
 * absolutamente tudo — veneno, corte, maldição, kidō — e a distinção que a
 * tela prometia não existia em lugar nenhum.
 *
 * O erro foi construir a tela e não conferir se o DADO alimentava ela. Esta
 * lista saiu de um censo das tags que as habilidades com DOT realmente têm,
 * não de suposição.
 *
 * A ORDEM É A REGRA: o sabor explícito vence sempre, depois vem o elemento, e
 * `espiritual` fica por último por ser o balde mais largo. Um Hadō marcado
 * como `fogo` é queimadura, não energia espiritual.
 */
const TAGS_DO_SABOR: [DotFlavor, string[]][] = [
  // Sabor declarado na própria habilidade: vence tudo.
  ['queimadura', ['fogo', 'fire', 'burn']],
  ['veneno', ['veneno', 'poison']],
  ['sangramento', ['sangramento', 'bleed']],
  ['maldicao', ['maldicao', 'decay']],

  // Elemento ou natureza do golpe, quando o sabor não foi declarado.
  ['congelamento', ['gelo', 'ice', 'agua', 'water']],
  ['sangramento', ['espada', 'blades', 'corte', 'pierce', 'fisico']],
  ['veneno', ['planta', 'natureza', 'dreno']],
  ['maldicao', ['sombra', 'shikigami', 'alma', 'dominio']],
  ['queimadura', ['cinza', 'ash', 'explosao']],

  // O balde largo, e o que mais muda a tela: 70 das 131 habilidades com dano
  // contínuo são kidō. Elas não são fogo — são queimadura de energia
  // espiritual, e mereciam ícone próprio em vez de emprestar o das outras.
  ['espiritual', ['hado', 'kido', 'ki', 'cero', 'quincy', 'hollow', 'beam', 'reiatsu']],
]

export function saborDoDot(tags: string[]): DotFlavor | undefined {
  for (const [sabor, gatilhos] of TAGS_DO_SABOR) {
    if (tags.some((t) => gatilhos.includes(t))) return sabor
  }
  return undefined
}

function makeEffectId(): string {
  return `fx-${Math.random().toString(36).slice(2, 10)}`
}

function makeCombatant(stats: BaseStats, energyCostModifier = 0): CombatantState {
  return {
    currentHp: stats.hp,
    maxHp: stats.hp,
    baseMaxHp: stats.hp,
    currentEnergy: stats.energy,
    maxEnergy: stats.energy,
    currentStamina: stats.stamina,
    maxStamina: stats.stamina,
    baseMaxEnergy: stats.energy,
    attack: stats.attack,
    baseAttack: stats.attack,
    defense: stats.defense,
    baseDefense: stats.defense,
    speed: stats.speed,
    baseSpeed: stats.speed,
    accuracy: stats.accuracy,
    agility: stats.agility,
    cooldowns: {},
    activeTransformationId: null,
    energyCostModifier,
    statusEffects: [],
  }
}

/** Character base stats + flat bonuses from unlocked skill-tree nodes. Battles always start untransformed. */
export function computeBaseStats(
  character: {
    hp: number
    attack: number
    defense: number
    speed: number
    energy: number
    stamina: number
    accuracy?: number
    agility?: number
    intelligence?: number
  },
  bonus: StatBonus
): BaseStats {
  return {
    hp: character.hp + bonus.hp,
    attack: character.attack + bonus.attack,
    defense: character.defense + bonus.defense,
    speed: character.speed + bonus.speed,
    energy: character.energy + bonus.energy,
    stamina: character.stamina + bonus.stamina,
    accuracy: (character.accuracy ?? ATRIBUTO_NEUTRO) + (bonus.accuracy ?? 0),
    agility: (character.agility ?? ATRIBUTO_NEUTRO) + (bonus.agility ?? 0),
    intelligence: (character.intelligence ?? ATRIBUTO_NEUTRO) + (bonus.intelligence ?? 0),
  }
}

/**
 * Soma fontes de bônus plano (árvore de skills, equipamento, ...) num único
 * bloco antes dele virar stat de batalha. Existe pra que adicionar uma nova
 * fonte não signifique tocar em cada chamador de computeBaseStats.
 */
export const SEM_BONUS: StatBonus = {
  hp: 0,
  attack: 0,
  defense: 0,
  speed: 0,
  energy: 0,
  stamina: 0,
  accuracy: 0,
  agility: 0,
  intelligence: 0,
}

export function sumStatBonuses(...bonuses: Partial<StatBonus>[]): StatBonus {
  return bonuses.reduce<StatBonus>(
    (acc, b) => ({
      hp: acc.hp + (b.hp ?? 0),
      attack: acc.attack + (b.attack ?? 0),
      defense: acc.defense + (b.defense ?? 0),
      speed: acc.speed + (b.speed ?? 0),
      energy: acc.energy + (b.energy ?? 0),
      stamina: acc.stamina + (b.stamina ?? 0),
      accuracy: (acc.accuracy ?? 0) + (b.accuracy ?? 0),
      agility: (acc.agility ?? 0) + (b.agility ?? 0),
      intelligence: (acc.intelligence ?? 0) + (b.intelligence ?? 0),
    }),
    { ...SEM_BONUS }
  )
}

/**
 * Stats com que um combatente entra em batalha: personagem escalado pelo
 * nível, mais os bônus planos (árvore de habilidades, equipamento).
 *
 * Único lugar onde stats de batalha nascem. Antes, só o inimigo do modo
 * história escalava por nível e o jogador ficava parado — o que fazia a
 * dificuldade e a progressão divergirem até a história virar invencível.
 *
 * A ORDEM É DELIBERADA: escala primeiro, soma bônus depois. É a mesma que o
 * modo história já usava para o inimigo, então os dois lados do combate
 * passam a ter exatamente a mesma forma. E mantém árvore e equipamento como
 * impulso de começo de jogo, que perde peso relativo conforme o nível sobe —
 * a gear inicial se supera, como em qualquer RPG. Escalar os bônus junto os
 * tornaria permanentemente decisivos, que não é o desenho.
 */
export function computeFighterStats(
  character: { hp: number; attack: number; defense: number; speed: number; energy: number; stamina: number },
  level: number,
  bonus: StatBonus
): BaseStats {
  return computeBaseStats(scaleForLevel(character, level), bonus)
}

/**
 * Substitui, campo a campo, os atributos de um combatente pelos do chefe.
 *
 * Um estágio de história pode dar atributos próprios ao inimigo em vez de
 * herdar os do personagem jogável correspondente. Campo nulo ou ausente
 * mantém o valor que veio da escala por nível, então dá para ajustar uma
 * dimensão só — normalmente velocidade, que é a que mais desequilibra por
 * decidir iniciativa e crítico ao mesmo tempo.
 */
export function applyBossOverrides(
  stats: BaseStats,
  overrides: {
    bossHp?: number | null
    bossAttack?: number | null
    bossDefense?: number | null
    bossSpeed?: number | null
    bossEnergy?: number | null
    bossStamina?: number | null
  }
): BaseStats {
  return {
    // O spread não é estilo: sem ele, todo atributo novo some silenciosamente
    // aqui. Foi o que aconteceu com acurácia e agilidade — o chefe caía no
    // valor neutro e a evasão contra ele mudava sem ninguém ter pedido.
    // Chefe não tem override para os três, e não deve mesmo: eles não têm
    // teto de escala como os outros.
    ...stats,
    hp: overrides.bossHp ?? stats.hp,
    attack: overrides.bossAttack ?? stats.attack,
    defense: overrides.bossDefense ?? stats.defense,
    speed: overrides.bossSpeed ?? stats.speed,
    energy: overrides.bossEnergy ?? stats.energy,
    stamina: overrides.bossStamina ?? stats.stamina,
  }
}

/**
 * O terceiro parâmetro é opcional para não obrigar todo chamador a conhecer
 * traços passivos: quem não tem traço nenhum não muda nada.
 */
/**
 * Aplica traços passivos a um bloco de atributos.
 *
 * Percentual primeiro, plano depois — a mesma ordem de computeFighterStats,
 * para que um traço de +10% não multiplique também o bônus plano de
 * equipamento e acabe valendo mais do que diz.
 */
export function applyTraits(stats: BaseStats, traits: TraitDef[]): BaseStats {
  if (traits.length === 0) return stats
  const pct = traits.reduce(
    (a, t) => ({
      hp: a.hp,
      attack: a.attack + t.attackModifier,
      defense: a.defense + t.defenseModifier,
      speed: a.speed + t.speedModifier,
      energy: a.energy + t.energyModifier,
    }),
    { hp: 0, attack: 0, defense: 0, speed: 0, energy: 0 }
  )
  const plano = traits.reduce(
    (a, t) => ({
      hp: a.hp + t.flatHpBonus,
      attack: a.attack + t.flatAttackBonus,
      defense: a.defense + t.flatDefenseBonus,
      speed: a.speed + t.flatSpeedBonus,
    }),
    { hp: 0, attack: 0, defense: 0, speed: 0 }
  )
  return {
    // Mesmo motivo do spread em applyBossOverrides: nenhum traço mexe em
    // acurácia, agilidade ou inteligência, e sem isto eles seriam apagados
    // por passar por aqui.
    ...stats,
    hp: Math.round(stats.hp) + plano.hp,
    attack: Math.round(stats.attack * (1 + pct.attack)) + plano.attack,
    defense: Math.round(stats.defense * (1 + pct.defense)) + plano.defense,
    speed: Math.round(stats.speed * (1 + pct.speed)) + plano.speed,
    energy: Math.round(stats.energy * (1 + pct.energy)),
    // Stamina não tem modificador próprio de traço, e é decisão: mais um
    // eixo por traço multiplicaria os casos sem acrescentar escolha. Um traço
    // que quisesse mexer em defesa mexe em defesa.
    stamina: stats.stamina,
  }
}

/** Soma o desconto de custo de energia de todos os traços ativos. */
export function traitEnergyCostModifier(traits: TraitDef[]): number {
  return traits.reduce((a, t) => a + t.energyCostModifier, 0)
}

export function createInitialState(
  player: BaseStats,
  enemy: BaseStats,
  passivos?: { player?: number; enemy?: number }
): BattleState {
  return {
    version: 2,
    aliados: [makeCombatant(player, passivos?.player ?? 0)],
    inimigos: [makeCombatant(enemy, passivos?.enemy ?? 0)],
    outcome: null,
  }
}

/**
 * O principal de cada lado — o índice 0.
 *
 * Existem porque a maior parte do jogo continua sendo 1x1, e escrever
 * `state.aliados[0]` em toda tela e todo teste diria "pegue o primeiro de uma
 * lista" quando o que se quer dizer é "o personagem do jogador". O nome curto
 * é o ponto: ele marca a intenção, e marca também os lugares que ainda
 * assumem um combatente por lado, para quando o time de verdade chegar.
 */
export function heroi(state: BattleState): CombatantState {
  return state.aliados[0]
}

export function vilao(state: BattleState): CombatantState {
  return state.inimigos[0]
}

/**
 * Devolve o estado com o principal de um lado modificado.
 *
 * O par de heroi()/vilao() para ESCRITA. Sem eles, todo lugar que quer mexer
 * no combatente principal precisa escrever
 * `{ ...state, aliados: [{ ...state.aliados[0], ... }, ...state.aliados.slice(1)] }`,
 * que é ruidoso o suficiente para alguém eventualmente esquecer o `slice(1)`
 * e apagar o resto do time sem perceber.
 */
export function comHeroi(state: BattleState, patch: Partial<CombatantState>): BattleState {
  return { ...state, aliados: [{ ...state.aliados[0], ...patch }, ...state.aliados.slice(1)] }
}

export function comVilao(state: BattleState, patch: Partial<CombatantState>): BattleState {
  return { ...state, inimigos: [{ ...state.inimigos[0], ...patch }, ...state.inimigos.slice(1)] }
}

/**
 * Traz um estado gravado para a forma atual.
 *
 * NÃO É CÓDIGO DEFENSIVO: toda batalha começada antes desta mudança está
 * gravada como `{ player, enemy }` no JSON da coluna `state`, e continua assim
 * até terminar. Sem esta função elas quebrariam no meio da luta — o jogador
 * perderia a partida em andamento por causa de um refactor, que é o tipo de
 * dano que nenhuma melhoria de arquitetura justifica.
 *
 * Aplicada na FRONTEIRA (ao ler do banco), não espalhada: do ponto de leitura
 * para dentro, só existe uma forma de estado.
 */
export function migrarEstado(gravado: BattleStateGravado): BattleState {
  if (gravado.version === 2) return gravado
  return {
    version: 2,
    aliados: [gravado.player],
    inimigos: [gravado.enemy],
    outcome: gravado.outcome,
  }
}

/**
 * Custo de energia de uma habilidade para ESTE combatente, já com o desconto
 * de traço passivo. Nunca desce abaixo de 1 quando a habilidade custa algo:
 * um traço muito forte não deve tornar tudo gratuito, senão energia deixa de
 * ser recurso e a rotação de habilidades perde o sentido.
 */
export function energyCostFor(c: CombatantState, energyCost: number): number {
  if (energyCost <= 0) return 0
  const fator = 1 + (c.energyCostModifier ?? 0)
  return Math.max(1, Math.round(energyCost * fator))
}

/**
 * Scales a combatant's raw stat block by level — story mode's enemies are
 * catalog characters/monsters with `enemyLevel` applied, so a stage's enemy
 * is stronger without needing a stat row of its own.
 */
export function scaleForLevel<T extends { hp: number; attack: number; defense: number; speed: number; energy: number; stamina: number }>(
  base: T,
  level: number
): T {
  const m = 1 + (level - 1) * LEVEL_SCALING
  return {
    ...base,
    hp: Math.round(base.hp * m),
    attack: Math.round(base.attack * m),
    defense: Math.round(base.defense * m),
    speed: Math.round(base.speed * m),
    energy: Math.round(base.energy * m),
    stamina: Math.round(base.stamina * m),
  }
}

/** A skill only counts as usable in battle if it deals damage or does something (has effects) — a 0-power, no-effect row is inert data. */
export function hasBattleValue(skill: { power: number; effects: unknown }): boolean {
  return skill.power > 0 || (Array.isArray(skill.effects) && skill.effects.length > 0)
}

/**
 * Se esta habilidade é paga com STAMINA em vez de energia.
 *
 * A regra é derivada do que a habilidade FAZ, e não de um campo escrito à
 * mão: é defensiva quando não causa dano nenhum e traz proteção — escudo,
 * cura, counter, ou buff em si mesmo. Deriva porque são 581 habilidades no
 * catálogo, e um campo novo em cada uma seria 581 oportunidades de errar.
 *
 * A exigência de poder ZERO é o que impede o abuso óbvio: uma habilidade que
 * bate forte E dá escudo continua saindo da energia, senão o atacante pagaria
 * o próprio dano com a barra defensiva.
 *
 * O efeito de jogo é a decisão que a stamina existe para criar: atacar e se
 * proteger deixam de disputar a mesma barra, então quem tem reserva defensiva
 * alta aguenta muitas rodadas — e o adversário precisa estourar antes de ela
 * voltar, em vez de simplesmente esperar.
 */
export function custaStamina(skill: SkillDef): boolean {
  if (skill.power > 0) return false
  return skill.effects.some(
    (e) => e.type === 'SHIELD' || e.type === 'HEAL' || e.type === 'COUNTER' || (e.type === 'BUFF' && e.target === 'SELF')
  )
}

/** Quanto o combatente tem da reserva que ESTA habilidade consome. */
function reservaPara(c: CombatantState, skill: SkillDef): number {
  return custaStamina(skill) ? c.currentStamina ?? 0 : c.currentEnergy
}

export function isLegalMove(combatant: CombatantState, skill: SkillDef | null): boolean {
  if (!skill) return true // Basic Attack is always legal
  const onCooldown = (combatant.cooldowns[skill.id] ?? 0) > 0
  return !onCooldown && reservaPara(combatant, skill) >= energyCostFor(combatant, skill.energyCost)
}

/**
 * attack/defense/speed on CombatantState already bake in base stats + skill
 * tree + active transformation. BUFF/DEBUFF are deliberately NOT baked in —
 * they're summed here from statusEffects instead, so an effect expiring is
 * just removing it from the list, never "undo" arithmetic.
 */
export function getCombatStat(c: CombatantState, stat: Stat): number {
  const base = c[stat]
  let modifierPct = 0
  for (const effect of c.statusEffects) {
    if (effect.stat !== stat) continue
    if (effect.type === 'BUFF') modifierPct += effect.magnitude
    else if (effect.type === 'DEBUFF') modifierPct -= effect.magnitude
  }
  return Math.max(0, Math.round(base * (1 + modifierPct / 100)))
}

export function isStunned(c: CombatantState): boolean {
  return c.statusEffects.some((e) => e.type === 'STUN' && e.remainingRounds > 0)
}

/**
 * Valor do atributo do qual uma habilidade escala.
 *
 * Energia é lida de maxEnergy, NÃO de currentEnergy, e isso é deliberado: com
 * a energia atual, cada lançamento enfraqueceria o próximo e um conjurador
 * entraria em espiral de morte justamente por usar as habilidades dele.
 * maxEnergy é atributo de build; currentEnergy é recurso da rodada.
 *
 * Os outros três passam por getCombatStat para respeitar BUFF/DEBUFF ativos —
 * energia não tem buff porque não é um Stat.
 */
function scalingValue(c: CombatantState, stat: ScalingStat): number {
  return stat === 'energy' ? c.maxEnergy : getCombatStat(c, stat)
}

/**
 * Bônus plano que o atributo de escala soma a um valor base (poder, cura,
 * escudo). É proporcional a quão acima da média do elenco o lançador está
 * naquele atributo — ver SCALING_REFERENCE para por que não é um coeficiente
 * fixo por atributo.
 */
function scaledBonus(c: CombatantState, stat: ScalingStat): number {
  return SCALING_BASE * (scalingValue(c, stat) / SCALING_REFERENCE[stat])
}

/**
 * Quanto a disputa entre acurácia e agilidade mexe na chance de acerto, com
 * sinal: negativo quando o alvo esquiva, positivo quando o atacante mira bem.
 *
 * Só a DIFERENÇA conta, não o valor absoluto: dois personagens com 18 e 18 se
 * acertam do mesmo jeito que dois com 8 e 8. Isso impede a inflação — subir
 * os dois números do elenco inteiro não muda nada, e é por isso que nenhum
 * dos dois escala por nível.
 *
 * POR QUE A ACURÁCIA PASSOU A SOMAR. Antes ela só cancelava a esquiva do alvo,
 * e como todo mundo nasce com 11 nos dois, a esquiva normal já era zero: um
 * ponto de acurácia não mudava nada em quase nenhuma luta. Medido no
 * simulador, +5 pontos treinados em acurácia davam 0,0 ponto percentual de
 * vitória. Agora ela compensa a imprecisão do próprio golpe — é o que dá
 * sentido a treinar para acertar o golpe grande.
 */
export function ajusteDeAcerto(atacante: CombatantState, alvo: CombatantState): number {
  const diferenca = (atacante.accuracy ?? ATRIBUTO_NEUTRO) - (alvo.agility ?? ATRIBUTO_NEUTRO)
  return clamp(diferenca * EVASAO_POR_PONTO, -EVASAO_MAXIMA, BONUS_DE_ACURACIA_MAXIMO)
}

/** Só a parte que favorece o alvo: quanto ele esquiva deste atacante, de 0 ao teto. */
export function evasaoContra(atacante: CombatantState, alvo: CombatantState): number {
  return Math.max(0, -ajusteDeAcerto(atacante, alvo))
}

/**
 * Se o golpe acerta.
 *
 * Duas coisas independentes se SOMAM:
 *
 * - PRECISÃO é da habilidade. Não depende de quem lança nem de quem recebe —
 *   é o golpe ser largo e difícil de encaixar. É o que permite existir uma
 *   habilidade que bate muito e erra às vezes, quebrando a regra de que a de
 *   maior número é sempre a melhor escolha.
 * - A DISPUTA acurácia × agilidade é build, e responde a investimento dos dois
 *   lados: tira até 15% para quem esquiva, soma até 15% para quem mira.
 *
 * Soma e não produto porque a acurácia agora precisa conseguir SUBIR a
 * chance, e produto só sabe descer. O piso (ACERTO_MINIMO) segura o caso em
 * que golpe impreciso e alvo esquivo se empilham.
 *
 * Só vale para golpe com poder. Habilidade de suporte não erra: escudo, cura
 * e buff são lançados em si mesmo, e um escudo que falha é frustração pura —
 * o jogador gastou a rodada defensiva e não recebeu nem informação em troca.
 */
export function resolverAcerto(
  atacante: CombatantState,
  alvo: CombatantState,
  precisao: number,
  rand: () => number
): { acertou: boolean; chance: number } {
  const chance = clamp(precisao / 100 + ajusteDeAcerto(atacante, alvo), ACERTO_MINIMO, 1)

  // NÃO CONSOME ALEATORIEDADE quando o acerto é certo, e isso não é
  // microotimização: rand() é a mesma sequência que decide crítico e choque,
  // então gastar um número a mais por golpe deslocaria toda simulação com
  // semente. Como precisão 100 contra evasão 0 é o caso de quase todo o
  // catálogo hoje, pular o sorteio faz a mecânica ser literalmente inerte
  // onde ela não se aplica — as medições de balanceamento anteriores
  // continuam valendo dígito por dígito.
  if (chance >= 1) return { acertou: true, chance: 1 }
  return { acertou: rand() < chance, chance }
}

/**
 * Três golpes com o mesmo poder deixam de dar o mesmo dano quando um deles
 * pune quem já está fraco, outro passa direto pela defesa, e o terceiro
 * pesa mais em quem não pode reagir. `effects` traz PIERCE/EXECUTE/COMBO_STUN
 * quando a habilidade os carrega — nenhum dos três vira status em ninguém,
 * são lidos aqui e só aqui, dentro do mesmo golpe que os declarou.
 */
function computeDamage(
  attacker: CombatantState,
  defender: CombatantState,
  power: number,
  scalingStat: ScalingStat,
  rand: () => number,
  effects: SkillEffect[] = []
): { damage: number; isCrit: boolean } {
  const perfurante = effects.find((e) => e.type === 'PIERCE')
  const defBase = getCombatStat(defender, 'defense')
  const def = perfurante ? defBase * (1 - perfurante.magnitude / 100) : defBase
  const atkSpeed = getCombatStat(attacker, 'speed')
  const defSpeed = getCombatStat(defender, 'speed')
  // Dentro do próprio domínio a técnica é amplificada — ver DOMAIN_DAMAGE_BONUS.
  const amplificacao = dominioAberto(attacker) ? 1 + DOMAIN_DAMAGE_BONUS : 1
  let raw = (power + scaledBonus(attacker, scalingStat)) * amplificacao

  // EXECUTE: golpe de acabamento — o alvo já está abaixo do limiar de vida.
  const execucao = effects.find((e) => e.type === 'EXECUTE')
  if (execucao && defender.maxHp > 0 && defender.currentHp / defender.maxHp <= EXECUCAO_LIMIAR_HP) {
    raw *= 1 + execucao.magnitude / 100
  }

  // COMBO_STUN: a jogada de quem prende com Bakudō e finaliza com Hadō —
  // vale tanto para quem acabou de atordoar quanto pra quem chega depois e
  // aproveita, já que o status de STUN não distingue quem o causou.
  const comboStun = effects.find((e) => e.type === 'COMBO_STUN')
  if (comboStun && isStunned(defender)) {
    raw *= 1 + comboStun.magnitude / 100
  }

  // COMBO_FOLLOWUP: a finalização de uma sequência de duas ações. Só rende
  // se a ÚLTIMA ação do atacante carregava exatamente a combo-tag exigida —
  // ver comboPreparado em CombatantState e por que ele quebra com qualquer
  // ação diferente no meio.
  const finalizacao = effects.find((e) => e.type === 'COMBO_FOLLOWUP')
  if (finalizacao && finalizacao.comboTag !== undefined && attacker.comboPreparado === finalizacao.comboTag) {
    raw *= 1 + finalizacao.magnitude / 100
  }

  const mitigated = raw * (100 / (100 + def))
  const critChance = clamp(
    CRIT_BASE_CHANCE + Math.max(0, atkSpeed - defSpeed) * CRIT_SPEED_COEFFICIENT,
    CRIT_BASE_CHANCE,
    CRIT_MAX_CHANCE
  )
  const isCrit = rand() < critChance
  let damage = Math.max(1, Math.round(mitigated))
  if (isCrit) damage = Math.round(damage * CRIT_MULTIPLIER)
  return { damage, isCrit }
}

/** Applies damage to a defender, absorbing into an active SHIELD first. Returns the actual HP lost. */
/**
 * O DOMÍNIO, e por que ele não é só uma habilidade forte.
 *
 * As cinco Expansões de Domínio eram, mecanicamente, indistinguíveis de
 * qualquer outro ultimate: poder alto, custo alto, recarga 6. A tag `dominio`
 * existia e não fazia nada. Na ficção o domínio não é um golpe — é um espaço
 * fechado onde a técnica de quem abriu ACERTA, e é isso que ele passa a ser
 * aqui.
 *
 * Enquanto um combatente tem domínio aberto:
 *
 * 1. ACERTO GARANTIDO. Os golpes dele atravessam counter e escudo. É a única
 *    coisa no jogo que faz isso, e é o que dá ao domínio um lugar próprio:
 *    contra um oponente escondido atrás de defesa, nenhum número de poder
 *    resolve — abrir o domínio resolve.
 *
 * 2. MANUTENÇÃO. Cobra energia toda rodada (a `magnitude` da instância). Sem
 *    energia, o domínio cai sozinho. É o que impede "abriu, ganhou": o dono
 *    tem uma janela, não um estado permanente.
 *
 * 3. CHOQUE DE DOMÍNIOS. Abrir o seu contra um já aberto resolve os dois na
 *    hora. Ganha o de manutenção mais cara — o domínio mais caro de sustentar
 *    é o mais refinado — e o perdedor desaba atordoado. Empate derruba os
 *    dois. Note que isto NÃO é o choque de golpes de resolverClash, que exige
 *    os dois lançarem no mesmo turno e por isso quase nunca dispara: aqui
 *    basta um domínio estar aberto quando o outro abre, que é situação comum.
 */
/**
 * A combo-tag que esta habilidade carrega como CARGA, se ela carregar
 * alguma — a primeira tag prefixada `combo:` que ela tiver. Uma habilidade
 * sem tag de combo devolve undefined, e usá-la limpa qualquer combo que
 * estivesse preparado (ver o uso em performSkillUse).
 */
function tagDeComboDaHabilidade(skill: SkillDef | null): string | undefined {
  return skill?.tags.find((t) => t.startsWith('combo:'))
}

function dominioAberto(c: CombatantState): StatusEffectInstance | undefined {
  return c.statusEffects.find((e) => e.type === 'DOMAIN' && e.remainingRounds > 0)
}

function applyDamageWithShield(target: CombatantState, amount: number): { target: CombatantState; actualDamage: number } {
  const hpBefore = target.currentHp
  const shieldIdx = target.statusEffects.findIndex((e) => e.type === 'SHIELD' && e.remainingRounds > 0)
  if (shieldIdx === -1) {
    const currentHp = Math.max(0, target.currentHp - amount)
    return { target: { ...target, currentHp }, actualDamage: hpBefore - currentHp }
  }
  const shield = target.statusEffects[shieldIdx]
  const absorbed = Math.min(shield.magnitude, amount)
  const remaining = amount - absorbed
  const statusEffects = [...target.statusEffects]
  if (shield.magnitude - absorbed <= 0) statusEffects.splice(shieldIdx, 1)
  else statusEffects[shieldIdx] = { ...shield, magnitude: shield.magnitude - absorbed }
  const currentHp = Math.max(0, target.currentHp - remaining)
  return { target: { ...target, currentHp, statusEffects }, actualDamage: hpBefore - currentHp }
}

/**
 * Remove a instância anterior do MESMO efeito vinda da MESMA habilidade, para
 * que reaplicar renove a duração em vez de empilhar.
 *
 * POR QUE: 132 das 524 habilidades do catálogo têm um efeito com duração maior
 * ou igual ao cooldown, ou seja, podem ser lançadas de novo antes do efeito
 * anterior expirar. Sem esta regra, cada relançamento somava mais uma cópia,
 * sem teto. O Senbonzakura do Byakuya (DOT 7 por 3 rodadas, cooldown 2) virava
 * 7, depois 14, depois 21 de dano por rodada, e a luta deixava de ser
 * vencível por qualquer jogada. Medido: o estágio 6 dava 0% de vitória mesmo
 * dando ao jogador a velocidade do inimigo E mais 50% de dano.
 *
 * A CHAVE INCLUI O ATRIBUTO de propósito: uma habilidade que aplica BUFF de
 * ataque e BUFF de defesa (o Prince's Pride do Vegeta) precisa manter os dois.
 * Só é duplicata o mesmo tipo, no mesmo atributo, da mesma habilidade.
 *
 * Habilidades DIFERENTES continuam somando — dois venenos distintos empilham,
 * que é o comportamento desejado. O que não pode é o mesmo veneno consigo.
 */
/**
 * Soma a magnitude de um efeito EMPILHÁVEL à instância que já estava de pé,
 * até o teto de maxStacks (padrão 3) multiplicado pela magnitude-base — não
 * um contador de pilhas à parte, porque nada mais no motor (DOT tick,
 * leitura de DEBUFF) precisaria saber quantas pilhas existem: só a
 * magnitude final, que já é o que eles leem hoje.
 */
function magnitudeEmpilhada(magnitudeAtual: number, efeito: SkillEffect): number {
  const teto = efeito.magnitude * (efeito.maxStacks ?? 3)
  return Math.min(magnitudeAtual + efeito.magnitude, teto)
}

function semDuplicataDaMesmaSkill(
  efeitos: StatusEffectInstance[],
  novo: StatusEffectInstance
): StatusEffectInstance[] {
  return efeitos.filter(
    (e) => !(e.sourceSkillName === novo.sourceSkillName && e.type === novo.type && e.stat === novo.stat)
  )
}

/** Applies BUFF/DEBUFF/DOT/STUN/SHIELD/COUNTER/HEAL. LIFESTEAL is handled by the caller (needs actual damage dealt). */
function applySkillEffects(
  side: Side,
  user: CombatantState,
  target: CombatantState,
  effects: SkillEffect[],
  skillName: string,
  scalingStat: ScalingStat,
  skillTags: string[]
): { user: CombatantState; target: CombatantState; applied: AppliedEffect[]; healed: number; eventos: TurnResult[] } {
  // CURA e ESCUDO escalam junto com dano, senão um suporte que investe no
  // próprio atributo continua curando o mesmo tanto do nível 1 ao 40 — que
  // era exatamente o caso antes: magnitude era número fixo.
  //
  // DOT, BUFF e DEBUFF ficam fixos de propósito. DOT aplica por rodada e
  // multiplica pela duração, e BUFF/DEBUFF são porcentagem: os três precisam
  // de calibragem própria, e escalar junto os deixaria desproporcionais.
  const bonus = Math.round(scaledBonus(user, scalingStat))
  let newUser = user
  let newTarget = target
  const applied: AppliedEffect[] = []
  const eventos: TurnResult[] = []
  let healed = 0
  const ladoOposto: Side = side === 'PLAYER' ? 'ENEMY' : 'PLAYER'

  for (const effect of effects) {
    const targetSide: Side = effect.target === 'SELF' ? side : side === 'PLAYER' ? 'ENEMY' : 'PLAYER'

    if (effect.type === 'HEAL') {
      const total = effect.magnitude + bonus
      const amount = Math.min(total, newUser.maxHp - newUser.currentHp)
      newUser = { ...newUser, currentHp: newUser.currentHp + amount }
      healed += amount
      applied.push({ type: 'HEAL', target: side, magnitude: total })
      continue
    }

    // DOMÍNIO: estado do lançador, e a única aplicação que pode ser recusada
    // — o domínio do oponente disputa com o seu. Ver dominioAberto.
    if (effect.type === 'DOMAIN') {
      const meu: StatusEffectInstance = {
        id: makeEffectId(),
        type: 'DOMAIN',
        magnitude: effect.magnitude,
        remainingRounds: effect.duration ?? 3,
        sourceSkillName: skillName,
      }
      const dele = dominioAberto(newTarget)

      if (dele) {
        const atordoar = (c: CombatantState): CombatantState => ({
          ...c,
          statusEffects: [
            ...c.statusEffects.filter((e) => e.type !== 'DOMAIN'),
            { id: makeEffectId(), type: 'STUN', magnitude: 1, remainingRounds: 1, sourceSkillName: skillName },
          ],
        })
        const vencedor = meu.magnitude > dele.magnitude ? side : dele.magnitude > meu.magnitude ? ladoOposto : null

        if (vencedor === side) {
          newTarget = atordoar(newTarget)
          newUser = { ...newUser, statusEffects: [...newUser.statusEffects.filter((e) => e.type !== 'DOMAIN'), meu] }
        } else if (vencedor === ladoOposto) {
          newUser = atordoar(newUser)
        } else {
          // Domínios equivalentes se anulam e derrubam os dois donos.
          newUser = atordoar(newUser)
          newTarget = atordoar(newTarget)
        }

        eventos.push({
          version: 1,
          side: vencedor ?? side,
          kind: 'DOMAIN_CLASH',
          skillId: null,
          skillName: vencedor === null ? 'Domínios anulados' : skillName,
        })

        // O DOMÍNIO SÓ ABRIU SE VENCEU O CHOQUE. Perdendo ou empatando, os
        // efeitos que vinham junto — debuff no adversário, o "up" de defesa em
        // si mesmo — não têm o que aplicar: a técnica nunca chegou a existir.
        // `break` e não `continue`, porque precisa parar de processar o RESTO
        // do array de efeitos desta habilidade, não só pular este.
        if (vencedor !== side) break
        continue
      }

      newUser = { ...newUser, statusEffects: [...newUser.statusEffects.filter((e) => e.type !== 'DOMAIN'), meu] }
      eventos.push({ version: 1, side, kind: 'DOMAIN_OPEN', skillId: null, skillName })
      applied.push({ type: 'DOMAIN', target: side, magnitude: meu.magnitude, duration: meu.remainingRounds })
      continue
    }

    // EMPILHÁVEL: busca a instância anterior DESTA MESMA habilidade antes de
    // decidir a magnitude — só faz sentido procurar quando o efeito pede
    // stack, senão qualquer DOT comum pagaria o custo de uma busca à toa.
    const colecaoAtual = effect.target === 'SELF' ? newUser.statusEffects : newTarget.statusEffects
    const pilhaAnterior = effect.stack
      ? colecaoAtual.find((e) => e.sourceSkillName === skillName && e.type === effect.type && e.stat === effect.stat)
      : undefined
    const magnitudeBase = effect.type === 'SHIELD' ? effect.magnitude + bonus : effect.magnitude
    const magnitude = pilhaAnterior ? magnitudeEmpilhada(pilhaAnterior.magnitude, effect) : magnitudeBase

    const instance: StatusEffectInstance = {
      id: makeEffectId(),
      type: effect.type,
      stat: effect.stat,
      magnitude,
      remainingRounds: effect.duration ?? 1,
      sourceSkillName: skillName,
      ...(effect.type === 'DOT' ? { flavor: saborDoDot(skillTags) } : {}),
    }

    if (effect.target === 'SELF') {
      // A new COUNTER replaces any existing one instead of stacking, to keep the reflect math simple.
      const existing =
        effect.type === 'COUNTER'
          ? newUser.statusEffects.filter((e) => e.type !== 'COUNTER')
          : semDuplicataDaMesmaSkill(newUser.statusEffects, instance)
      newUser = { ...newUser, statusEffects: [...existing, instance] }
    } else {
      newTarget = {
        ...newTarget,
        statusEffects: [...semDuplicataDaMesmaSkill(newTarget.statusEffects, instance), instance],
      }
    }
    applied.push({
      type: effect.type,
      target: targetSide,
      stat: effect.stat,
      magnitude: instance.magnitude,
      duration: effect.duration,
      ...(instance.flavor ? { flavor: instance.flavor } : {}),
    })
  }

  return { user: newUser, target: newTarget, applied, healed, eventos }
}

/** Dano que ignora escudo — ver dominioAberto. */
/**
 * Passa o golpe pela guarda de quem está bloqueando.
 *
 * Três resultados possíveis, e o do meio é o que dá graça à mecânica:
 *
 * - GUARDA AGUENTA: o dano cai para 40% e os 60% impedidos são debitados da
 *   stamina, um para um. Você trocou vida por reserva defensiva.
 * - GUARDA QUEBRA: não havia stamina para pagar o que seria impedido. O golpe
 *   entra INTEIRO, a stamina zera e quem bloqueou perde a rodada seguinte. É
 *   a punição por bloquear o que não dava para bloquear — e é o que impede
 *   encastelar de ser sempre a resposta certa.
 * - NÃO ESTAVA BLOQUEANDO: nada muda.
 *
 * A quebra acontecer no golpe que ESTOURA a reserva, e não quando ela já está
 * vazia, é deliberado: assim o atacante pode escolher gastar um golpe grande
 * justamente para forçá-la, que é a jogada que a mecânica existe para criar.
 */
/**
 * Se este combatente consegue erguer a guarda, e quanto isso custa de entrada.
 *
 * Sem stamina para o custo base não há bloqueio — a ação simplesmente não
 * está disponível, do mesmo jeito que uma habilidade sem energia.
 */
export function custoDeErguerGuarda(c: CombatantState): number {
  return Math.max(1, Math.round((c.maxStamina ?? 0) * BLOQUEIO_CUSTO_BASE))
}

export function podeBloquear(c: CombatantState): boolean {
  return (c.currentStamina ?? 0) >= custoDeErguerGuarda(c)
}

/** Cobra o custo de entrada da guarda. */
function erguerGuarda(c: CombatantState): CombatantState {
  return { ...c, currentStamina: Math.max(0, (c.currentStamina ?? 0) - custoDeErguerGuarda(c)) }
}

function passarPelaGuarda(
  defensor: CombatantState,
  dano: number
): { dano: number; defensor: CombatantState; bloqueado: boolean; guardaGasta: number; quebrou: boolean } {
  const impedido = Math.round(dano * BLOQUEIO_REDUCAO)
  const custo = Math.round(impedido * GUARDA_POR_DANO)
  const reserva = defensor.currentStamina ?? 0

  if (custo > reserva) {
    return {
      dano,
      defensor: {
        ...defensor,
        currentStamina: 0,
        statusEffects: [
          ...defensor.statusEffects,
          {
            id: makeEffectId(),
            type: 'STUN',
            magnitude: 1,
            remainingRounds: GUARDA_QUEBRADA_ATORDOA,
            sourceSkillName: 'Guarda quebrada',
          },
        ],
      },
      bloqueado: false,
      guardaGasta: reserva,
      quebrou: true,
    }
  }

  return {
    dano: dano - impedido,
    defensor: { ...defensor, currentStamina: reserva - custo },
    bloqueado: true,
    guardaGasta: custo,
    quebrou: false,
  }
}

/** Intensidade do golpe em fração da vida máxima do alvo — ver SEVERIDADE. */
function severidadeDe(dano: number, maxHp: number): TurnResult['severidade'] {
  if (maxHp <= 0) return undefined
  const fracao = dano / maxHp
  if (fracao < SEVERIDADE.raspao) return 'raspao'
  if (fracao < SEVERIDADE.solido) return 'solido'
  if (fracao < SEVERIDADE.pesado) return 'pesado'
  return 'devastador'
}

function aplicarDanoDireto(target: CombatantState, amount: number): { target: CombatantState; actualDamage: number } {
  const currentHp = Math.max(0, target.currentHp - amount)
  return { target: { ...target, currentHp }, actualDamage: target.currentHp - currentHp }
}

function performSkillUse(
  side: Side,
  attacker: CombatantState,
  defender: CombatantState,
  skill: SkillDef | null,
  rand: () => number,
  /** Se o defensor declarou bloqueio nesta rodada — ver passarPelaGuarda. */
  defensorBloqueia = false
): {
  attacker: CombatantState
  defender: CombatantState
  turnResult: TurnResult
  eventos: TurnResult[]
  /**
   * Fração da vida máxima com que um aliado caído deve voltar, quando a
   * habilidade pede ressurreição.
   *
   * Sai daqui como INTENÇÃO em vez de ser aplicada como os outros efeitos
   * porque esta função enxerga só duas pessoas — quem bate e quem apanha — e
   * ressurreição precisa procurar entre os aliados alguém que já saiu da
   * luta. Quem tem os dois times é resolveRound.
   */
  reviveSolicitado?: number
} {
  const power = skill ? skill.power : BASIC_ATTACK_POWER
  const energyCost = skill ? energyCostFor(attacker, skill.energyCost) : 0
  const effects = skill ? skill.effects : []
  // Ataque básico escala de ataque: é golpe físico, não técnica.
  const scalingStat: ScalingStat = skill ? skill.scalingStat : 'attack'

  // O custo sai da reserva certa: defesa da stamina, o resto da energia.
  const daStamina = skill ? custaStamina(skill) : false
  let newAttacker: CombatantState = {
    ...attacker,
    currentEnergy: daStamina ? attacker.currentEnergy : Math.max(0, attacker.currentEnergy - energyCost),
    currentStamina: daStamina
      ? Math.max(0, (attacker.currentStamina ?? 0) - energyCost)
      : attacker.currentStamina,
    cooldowns: skill ? { ...attacker.cooldowns, [skill.id]: skill.cooldown } : attacker.cooldowns,
    // comboPreparado NÃO muda aqui, de propósito: ele ainda precisa valer
    // COMO ESTAVA (a carga da rodada passada) na hora de computeDamage
    // decidir se ESTE golpe é a finalização dela. Só é atualizado pro valor
    // desta habilidade no FIM da função — ver o retorno.
  }
  let newDefender = defender

  let damage: number | undefined
  let isCrit: boolean | undefined
  let errou = false
  let bloqueado = false
  let guardaGasta = 0
  let guardaQuebrou = false
  let countered = false
  let reflectedDamage: number | undefined
  let targetHpBefore: number | undefined
  let targetHpAfter: number | undefined
  let healed = 0

  // Dentro do próprio domínio a técnica acerta: counter e escudo não valem.
  const acertoGarantido = dominioAberto(newAttacker) !== undefined

  if (power > 0) {
    targetHpBefore = newDefender.currentHp
    targetHpAfter = newDefender.currentHp

    // O acerto garantido do domínio também vence a esquiva: "a técnica acerta"
    // não pode valer contra escudo e counter e falhar contra agilidade.
    errou = acertoGarantido
      ? false
      : !resolverAcerto(newAttacker, newDefender, skill?.precision ?? 100, rand).acertou
  }

  if (power > 0 && !errou) {
    const counterIdx = acertoGarantido
      ? -1
      : newDefender.statusEffects.findIndex((e) => e.type === 'COUNTER' && e.remainingRounds > 0)
    const computed = computeDamage(newAttacker, newDefender, power, scalingStat, rand, effects)

    if (counterIdx !== -1) {
      countered = true
      const counter = newDefender.statusEffects[counterIdx]
      reflectedDamage = Math.round((computed.damage * counter.magnitude) / 100)
      newDefender = { ...newDefender, statusEffects: newDefender.statusEffects.filter((_, i) => i !== counterIdx) }
      newAttacker = { ...newAttacker, currentHp: Math.max(0, newAttacker.currentHp - reflectedDamage) }
      damage = 0
      targetHpAfter = newDefender.currentHp
    } else {
      // A GUARDA VEM ANTES DO ESCUDO, e a ordem importa: bloquear é uma
      // decisão desta rodada, o escudo é um efeito que já estava lá. Aparar
      // primeiro e só então gastar escudo faz o escudo render mais, que é o
      // prêmio de quem se preparou E se defendeu.
      let danoFinal = computed.damage
      if (defensorBloqueia) {
        const guarda = passarPelaGuarda(newDefender, computed.damage)
        danoFinal = guarda.dano
        newDefender = guarda.defensor
        bloqueado = guarda.bloqueado
        guardaGasta = guarda.guardaGasta
        guardaQuebrou = guarda.quebrou
      }

      const applied = acertoGarantido
        ? aplicarDanoDireto(newDefender, danoFinal)
        : applyDamageWithShield(newDefender, danoFinal)
      newDefender = applied.target
      damage = danoFinal
      isCrit = computed.isCrit
      targetHpAfter = newDefender.currentHp

      const lifesteal = effects.find((e) => e.type === 'LIFESTEAL')
      if (lifesteal && applied.actualDamage > 0) {
        const healAmt = Math.min(Math.round((applied.actualDamage * lifesteal.magnitude) / 100), newAttacker.maxHp - newAttacker.currentHp)
        newAttacker = { ...newAttacker, currentHp: newAttacker.currentHp + healAmt }
        healed += healAmt
      }
    }
  }

  // A countered attack didn't land, so effects aimed at the enemy shouldn't apply either —
  // but self-targeted effects (a buff/heal on the caster) still do, since the caster still acted.
  // Golpe que errou não entrega efeito no alvo, pela mesma razão do counter:
  // ele não encostou. O que é lançado em si mesmo continua valendo, porque o
  // lançador agiu de qualquer forma.
  const naoEncostou = countered || errou
  // PIERCE/EXECUTE/COMBO_STUN já foram totalmente consumidos dentro de
  // computeDamage — chegam até aqui e, sem este filtro, cairiam no caminho
  // genérico e virariam status persistente em alguém, o que não são.
  const MODIFICADORES_DE_DANO = new Set(['PIERCE', 'EXECUTE', 'COMBO_STUN', 'COMBO_FOLLOWUP'])
  const supportEffects = effects.filter(
    (e) =>
      e.type !== 'LIFESTEAL' &&
      e.type !== 'REVIVE' &&
      !MODIFICADORES_DE_DANO.has(e.type) &&
      (!naoEncostou || e.target === 'SELF')
  )
  // A ressurreição não é anulada por counter nem por erro: ela não vai no
  // adversário, então não há nada para o adversário aparar. Quem lançou pagou
  // e agiu, e o aliado caído não tem culpa do golpe ter passado longe.
  const revive = effects.find((e) => e.type === 'REVIVE')
  const supportResult = applySkillEffects(side, newAttacker, newDefender, supportEffects, skill?.name ?? 'Ataque Básico', scalingStat, skill?.tags ?? [])
  newAttacker = supportResult.user
  newDefender = supportResult.target
  healed += supportResult.healed

  const turnResult: TurnResult = {
    version: 1,
    side,
    kind: power > 0 ? 'ATTACK' : 'SUPPORT',
    skillId: skill?.id ?? null,
    skillName: skill?.name ?? 'Ataque Básico',
    damage,
    isCrit,
    acertoGarantido: acertoGarantido && power > 0 ? true : undefined,
    errou: errou || undefined,
    bloqueado: bloqueado || undefined,
    guardaGasta: guardaGasta > 0 ? guardaGasta : undefined,
    severidade: typeof damage === 'number' && damage > 0 ? severidadeDe(damage, newDefender.maxHp) : undefined,
    countered: countered || undefined,
    reflectedDamage,
    healed: healed > 0 ? healed : undefined,
    energySpent: energyCost,
    targetHpBefore,
    targetHpAfter,
    effectsApplied: supportResult.applied.length > 0 ? supportResult.applied : undefined,
  }

  const eventos = [...supportResult.eventos]
  if (guardaQuebrou) {
    eventos.push({
      version: 1,
      side: side === 'PLAYER' ? 'ENEMY' : 'PLAYER',
      kind: 'GUARD_BREAK',
      skillId: null,
      skillName: skill?.name ?? 'Ataque Básico',
    })
  }

  // SÓ AGORA comboPreparado passa a valer o desta habilidade — depois que
  // computeDamage já leu o valor ANTIGO (a carga da rodada passada) pra
  // decidir se ESTE golpe era a finalização dela. Atualizar antes teria
  // feito toda finalização se auto-anular, porque a finalização em si não
  // carrega combo-tag nenhuma.
  newAttacker = { ...newAttacker, comboPreparado: tagDeComboDaHabilidade(skill) }

  return {
    attacker: newAttacker,
    defender: newDefender,
    turnResult,
    eventos,
    ...(revive ? { reviveSolicitado: revive.magnitude } : {}),
  }
}

function regenEnergy(c: CombatantState): CombatantState {
  const regen = Math.round(c.maxEnergy * ENERGY_REGEN_PCT)
  const maxStamina = c.maxStamina ?? 0
  const stamina = Math.min(maxStamina, (c.currentStamina ?? 0) + Math.round(maxStamina * STAMINA_REGEN_PCT))
  return {
    ...c,
    currentEnergy: Math.min(c.maxEnergy, c.currentEnergy + regen),
    currentStamina: stamina,
  }
}

/**
 * Cobra a manutenção do domínio aberto, e o derruba se não houver com que pagar.
 *
 * É o que separa o domínio de um buff permanente: quem abre tem uma janela
 * paga em energia, não um estado de graça. Roda depois da regeneração, para
 * que a regeneração possa custear a rodada.
 */
function manterDominio(side: Side, c: CombatantState): { combatant: CombatantState; results: TurnResult[] } {
  const dominio = dominioAberto(c)
  if (!dominio) return { combatant: c, results: [] }

  // AS DUAS RESERVAS, não só energia. Um domínio aberto não é só cursed
  // energy sustentada — é a presença inteira de quem abriu expandida sobre o
  // espaço, e falta de fôlego (stamina) derruba tanto quanto falta de
  // energia. Falhando em qualquer uma das duas, o domínio cai.
  const semEnergia = c.currentEnergy < dominio.magnitude
  const semStamina = (c.currentStamina ?? 0) < dominio.magnitude
  if (semEnergia || semStamina) {
    return {
      combatant: {
        ...c,
        // O "up" que o domínio concede cai junto: ele é a espinha do estado,
        // não um buff avulso que sobrevive à queda do espaço que o sustenta.
        statusEffects: c.statusEffects.filter(
          (e) => e !== dominio && !(e.type === 'BUFF' && e.sourceSkillName === dominio.sourceSkillName)
        ),
      },
      results: [{ version: 1, side, kind: 'DOMAIN_FALL', skillId: null, skillName: dominio.sourceSkillName }],
    }
  }
  return {
    combatant: {
      ...c,
      currentEnergy: c.currentEnergy - dominio.magnitude,
      currentStamina: Math.max(0, (c.currentStamina ?? 0) - dominio.magnitude),
    },
    results: [],
  }
}

function tickCooldowns(c: CombatantState): CombatantState {
  const cooldowns: Record<string, number> = {}
  for (const [id, remaining] of Object.entries(c.cooldowns)) {
    const next = remaining - 1
    if (next > 0) cooldowns[id] = next
  }
  return { ...c, cooldowns }
}

/** DOT damage + duration countdown for every status effect (BUFF/DEBUFF/DOT/STUN/SHIELD/COUNTER alike). */
function tickStatusEffects(side: Side, c: CombatantState): { combatant: CombatantState; results: TurnResult[] } {
  const results: TurnResult[] = []
  let hp = c.currentHp
  for (const effect of c.statusEffects) {
    if (effect.type === 'DOT' && effect.remainingRounds > 0 && hp > 0) {
      const before = hp
      hp = Math.max(0, hp - effect.magnitude)
      results.push({
        version: 1,
        side,
        kind: 'DOT_TICK',
        skillId: null,
        skillName: effect.sourceSkillName,
        damage: before - hp,
        targetHpBefore: before,
        targetHpAfter: hp,
      })
    }
  }
  const statusEffects = c.statusEffects.map((e) => ({ ...e, remainingRounds: e.remainingRounds - 1 })).filter((e) => e.remainingRounds > 0)
  return { combatant: { ...c, currentHp: hp, statusEffects }, results }
}

export function applyTransformation(c: CombatantState, t: TransformationDef): CombatantState {
  const maxHp = c.baseMaxHp + t.flatHpBonus
  const maxEnergy = Math.max(1, Math.round(c.baseMaxEnergy * (1 + t.energyModifier)))
  return {
    ...c,
    maxHp,
    currentHp: Math.min(c.currentHp + t.flatHpBonus, maxHp),
    maxEnergy,
    currentEnergy: Math.min(c.currentEnergy, maxEnergy),
    attack: Math.round((c.baseAttack + t.flatAttackBonus) * (1 + t.attackModifier)),
    defense: Math.round((c.baseDefense + t.flatDefenseBonus) * (1 + t.defenseModifier)),
    speed: Math.round((c.baseSpeed + t.flatSpeedBonus) * (1 + t.speedModifier)),
    activeTransformationId: t.id,
  }
}

function revertTransformation(c: CombatantState): CombatantState {
  return {
    ...c,
    maxHp: c.baseMaxHp,
    currentHp: Math.min(c.currentHp, c.baseMaxHp),
    maxEnergy: c.baseMaxEnergy,
    currentEnergy: Math.min(c.currentEnergy, c.baseMaxEnergy),
    attack: c.baseAttack,
    defense: c.baseDefense,
    speed: c.baseSpeed,
    activeTransformationId: null,
  }
}

/**
 * Cobra o preço por rodada de uma forma ativa.
 *
 * SÃO DOIS PREÇOS DE NATUREZA DIFERENTE, e por isso não compartilham campo.
 * Ficar sem ENERGIA faz a forma CAIR — é o Super Saiyan 3, que se sustenta
 * enquanto houver fôlego. Ficar sem VIDA mataria — é o custo dos Oito Portões
 * e do Mangekyō, que na obra cobram o corpo.
 *
 * O dreno de vida NÃO MATA. Ao chegar em 1 de HP a forma cai e o personagem
 * fica de pé, queimado. A alternativa — deixar a própria transformação matar
 * quem a usou — é fiel à obra e péssima de jogar: o jogador perderia a luta
 * por uma escolha feita cinco rodadas antes, sem nada na tela avisando. O
 * risco continua real, porque sair da forma em 1 de HP é perder do mesmo
 * jeito na rodada seguinte; só que aí é o adversário que decide, não a
 * aritmética.
 */
function applyDrain(c: CombatantState, transformations: Record<string, TransformationDef>): CombatantState {
  if (!c.activeTransformationId) return c
  const t = transformations[c.activeTransformationId]
  if (!t) return c

  const drenoHp = t.drainHpPerTurn ?? 0
  if (t.drainPerTurn <= 0 && drenoHp <= 0) return c

  // Sem energia para sustentar, a forma cai antes de cobrar qualquer vida.
  if (t.drainPerTurn > 0 && c.currentEnergy < t.drainPerTurn) return revertTransformation(c)

  const comEnergia =
    t.drainPerTurn > 0 ? { ...c, currentEnergy: c.currentEnergy - t.drainPerTurn } : c
  if (drenoHp <= 0) return comEnergia

  if (comEnergia.currentHp <= drenoHp) {
    return { ...revertTransformation(comEnergia), currentHp: 1 }
  }
  return { ...comEnergia, currentHp: comEnergia.currentHp - drenoHp }
}

function readNumber(payload: unknown, key: string): number | undefined {
  if (payload && typeof payload === 'object' && key in payload) {
    const value = (payload as Record<string, unknown>)[key]
    return typeof value === 'number' ? value : undefined
  }
  return undefined
}

/**
 * ON_DAMAGE_TAKEN payloads in the seed use two different shapes: a flat
 * `damageThreshold` (Broly) or a stacking `{stacks, bonusPerStack}` (Vegeta's
 * Ultra Ego). v1 does not model incremental stacking — any payload without a
 * recognizable `damageThreshold` just activates on the first hit taken.
 */
function evaluateAutoTrigger(
  trigger: TransformationTrigger,
  payload: unknown,
  ctx: { hpRatio: number; energyRatio: number; lastDamageTaken: number }
): boolean {
  switch (trigger) {
    case 'LOW_HP':
      return ctx.hpRatio <= (readNumber(payload, 'threshold') ?? 0.3)
    case 'ENERGY_CHARGE':
      return ctx.energyRatio >= (readNumber(payload, 'threshold') ?? 0.8)
    case 'ON_DAMAGE_TAKEN':
      return ctx.lastDamageTaken >= (readNumber(payload, 'damageThreshold') ?? 1)
    case 'MANUAL':
    default:
      return false
  }
}

function maybeAutoTransform(
  c: CombatantState,
  transformations: Record<string, TransformationDef>,
  triggers: TransformationTrigger[],
  lastDamageTaken: number
): { combatant: CombatantState; transformation: TransformationDef } | null {
  if (c.activeTransformationId) return null // v1: no stacking/overriding once transformed
  const hpRatio = c.maxHp > 0 ? c.currentHp / c.maxHp : 0
  const energyRatio = c.maxEnergy > 0 ? c.currentEnergy / c.maxEnergy : 0
  const candidates = Object.values(transformations).filter(
    (t) => triggers.includes(t.triggerType) && evaluateAutoTrigger(t.triggerType, t.triggerPayload, { hpRatio, energyRatio, lastDamageTaken })
  )
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.levelRequirement - a.levelRequirement)
  const chosen = candidates[0]
  return { combatant: applyTransformation(c, chosen), transformation: chosen }
}

function makeTransformResult(side: Side, t: TransformationDef): TurnResult {
  return { version: 1, side, kind: 'TRANSFORM', skillId: null, skillName: t.name, transformationId: t.id }
}

function makeStunResult(side: Side): TurnResult {
  return { version: 1, side, kind: 'STUNNED', skillId: null, skillName: 'Atordoado' }
}

/**
 * Tags em que duas habilidades podem se CHOCAR.
 *
 * O conjunto é pequeno e explícito de propósito. As tags do catálogo são
 * bagunçadas — misturam mecânica ('buff', 'stun') com tema, e há duplicatas
 * em duas línguas ('fire' e 'fogo', 'ice' e 'gelo'). Só entram aqui as em que
 * "duas forças se encontrando" faz sentido e que TODAS causam dano: feixe
 * contra feixe é o choque de Dragon Ball, lâmina contra lâmina é o de Bleach,
 * punho contra punho é qualquer luta. Hadō e cero entram porque no arco que
 * existe é o choque que de fato acontece — dois feiticeiros lançando o mesmo
 * tipo de magia um contra o outro.
 *
 * MEDIÇÃO HONESTA: contra a IA o choque quase nunca dispara, e as taxas de
 * vitória da história ficaram IDÊNTICAS às de antes dele. O motivo não é o
 * conjunto de tags — é que pickAiSkill escolhe sempre a de maior poder e
 * portanto nunca DECIDE contestar. Este é um mecanismo de escolha humana e de
 * PvP; ele só vai brilhar quando a IA souber jogar tempo, ou contra outro
 * jogador.
 */
export const TAGS_DE_CLASH = ['beam', 'espada', 'fisico', 'hado', 'cero'] as const

/** A tag em que estas duas habilidades se chocam, ou null se não há choque. */
export function tagDeClash(a: SkillDef | null, b: SkillDef | null): string | null {
  // Ataque básico não choca, e nem habilidade que não causa dano: não há força
  // a opor.
  if (!a || !b || a.power <= 0 || b.power <= 0) return null
  return TAGS_DE_CLASH.find((t) => a.tags.includes(t) && b.tags.includes(t)) ?? null
}

/** Quanto o vencedor do choque tem o próprio golpe amplificado. */
export const CLASH_BONUS_DO_VENCEDOR = 0.35

/**
 * Margem, em fração, dentro da qual o choque termina EMPATADO e os dois
 * golpes se anulam. Sem ela, uma diferença de um ponto de poder decidiria a
 * troca inteira, o que faria o choque parecer arbitrário em vez de disputado.
 */
export const CLASH_MARGEM_DE_EMPATE = 0.12

/**
 * Resolve o choque entre dois golpes da mesma natureza.
 *
 * A força de cada lado é o poder do golpe mais o bônus do atributo de escala —
 * a mesma conta que decide o dano —, com uma variação aleatória de até 15%
 * para que o choque não seja sempre previsível a partir da ficha.
 *
 * O perdedor tem o golpe ANULADO na rodada e o vencedor bate mais forte. É por
 * isso que levar um feixe para uma luta de feixes é aposta: ganhar troca uma
 * rodada por vantagem grande, perder troca por nada.
 */
export function resolverClash(
  atacante: CombatantState,
  defensor: CombatantState,
  aSkill: SkillDef,
  bSkill: SkillDef,
  rand: () => number
): { vencedor: Side | null } {
  const forca = (c: CombatantState, sk: SkillDef) =>
    (sk.power + scaledBonus(c, sk.scalingStat)) * (0.85 + rand() * 0.3)

  const fa = forca(atacante, aSkill)
  const fb = forca(defensor, bSkill)
  const total = fa + fb
  if (total <= 0) return { vencedor: null }
  if (Math.abs(fa - fb) / total < CLASH_MARGEM_DE_EMPATE) return { vencedor: null }
  return { vencedor: fa > fb ? 'PLAYER' : 'ENEMY' }
}

/**
 * Um combatente em campo, junto com onde ele está.
 *
 * A posição (lado + índice) é o endereço dele: é assim que uma ação diz em
 * quem bate e é assim que o resultado volta para o array certo. Guardar isso
 * aqui, e não dentro de CombatantState, mantém o estado gravado sem
 * informação redundante — o lado já é o array em que ele está.
 */
type EmCampo = { lado: Side; indice: number }

const LADO_ALIADO: Side = 'PLAYER'

function estaDePe(c: CombatantState): boolean {
  return c.currentHp > 0
}

/**
 * A ordem em que todos agem na rodada.
 *
 * UMA FILA SÓ, com os dois lados misturados, ordenada por velocidade. Não é
 * "o time A joga, depois o time B": o veloz do lado inimigo age antes do
 * tanque do seu, que é o que faz velocidade continuar significando a mesma
 * coisa que significava no 1x1.
 *
 * O EMPATE VAI PARA O ALIADO, preservando exatamente a regra anterior
 * (`speed do jogador >= speed do inimigo` colocava o jogador primeiro). Entre
 * dois do mesmo lado, o de índice menor age antes — arbitrário, mas precisa
 * ser determinístico: o estado é um snapshot gravado, e a mesma entrada tem
 * que dar sempre a mesma rodada.
 */
function ordemDeIniciativa(state: BattleState): EmCampo[] {
  const todos: EmCampo[] = [
    ...state.aliados.map((_, indice) => ({ lado: LADO_ALIADO, indice })),
    ...state.inimigos.map((_, indice) => ({ lado: 'ENEMY' as Side, indice })),
  ]

  return todos.sort((a, b) => {
    const va = getCombatStat(combatenteEm(state, a), 'speed')
    const vb = getCombatStat(combatenteEm(state, b), 'speed')
    if (va !== vb) return vb - va
    if (a.lado !== b.lado) return a.lado === LADO_ALIADO ? -1 : 1
    return a.indice - b.indice
  })
}

function combatenteEm(state: BattleState, onde: EmCampo): CombatantState {
  return onde.lado === LADO_ALIADO ? state.aliados[onde.indice] : state.inimigos[onde.indice]
}

function comCombatenteEm(state: BattleState, onde: EmCampo, c: CombatantState): BattleState {
  if (onde.lado === LADO_ALIADO) {
    const aliados = [...state.aliados]
    aliados[onde.indice] = c
    return { ...state, aliados }
  }
  const inimigos = [...state.inimigos]
  inimigos[onde.indice] = c
  return { ...state, inimigos }
}

function timeOposto(state: BattleState, lado: Side): CombatantState[] {
  return lado === LADO_ALIADO ? state.inimigos : state.aliados
}

/**
 * Em quem este combatente bate.
 *
 * O alvo pedido só vale se ainda estiver de pé — quem escolheu o alvo fez isso
 * no começo da rodada, e alguém mais rápido pode tê-lo derrubado no meio dela.
 * Redirecionar para o primeiro vivo é melhor que desperdiçar a ação: o jogador
 * escolheu ATACAR, e a intenção continua válida mesmo com o alvo caído.
 */
function alvoDe(state: BattleState, atacante: EmCampo, pedido: number | undefined): EmCampo | null {
  const oposto = timeOposto(state, atacante.lado)
  const ladoAlvo: Side = atacante.lado === LADO_ALIADO ? 'ENEMY' : LADO_ALIADO

  if (pedido !== undefined && oposto[pedido] && estaDePe(oposto[pedido])) {
    return { lado: ladoAlvo, indice: pedido }
  }
  const primeiroVivo = oposto.findIndex(estaDePe)
  return primeiroVivo === -1 ? null : { lado: ladoAlvo, indice: primeiroVivo }
}

function acaoDe(input: AcoesDaRodada, onde: EmCampo): AcaoDeCombate | undefined {
  return onde.lado === LADO_ALIADO ? input.aliadas[onde.indice] : input.inimigas[onde.indice]
}

/**
 * Traz de volta o primeiro aliado caído do lado de quem lançou.
 *
 * QUEM CAI FICA CAÍDO é a regra, e esta é a única exceção — de propósito. Sem
 * exceção nenhuma, perder um aliado na segunda rodada de uma raid condena as
 * outras dez a um jogo já perdido, e o jogador percebe isso muito antes do
 * fim. Com ressurreição para todo mundo, morrer deixa de custar.
 *
 * A saída é ela ser RARA e ter dono: quem revive são as duas curandeiras que
 * fazem isso na obra — a Orihime, que rejeitou a morte do Ichigo, e a
 * Unohana, que se curava no meio da luta contra o Kenpachi. Não é um botão do
 * sistema, é a técnica de dois personagens.
 *
 * VOLTA COM UMA FRAÇÃO DA VIDA (ver as habilidades no catálogo), nunca cheia:
 * voltar inteiro apagaria a queda, e voltar com pouco significa que o inimigo
 * pode derrubar de novo — quem foi trazido de volta vira uma coisa a proteger,
 * o que dá ao suporte um segundo turno de trabalho em vez de um botão que
 * resolve.
 *
 * O PRIMEIRO da fila, e não o mais forte nem o mais recente: precisa ser
 * determinístico, e qualquer outro critério seria uma regra a mais para o
 * jogador ter que adivinhar.
 */
function reviverAliado(
  state: BattleState,
  lado: Side,
  porcentagem: number
): { state: BattleState; resultado: TurnResult } | null {
  const time = lado === LADO_ALIADO ? state.aliados : state.inimigos
  const indice = time.findIndex((c) => !estaDePe(c))
  if (indice === -1) return null

  const caido = time[indice]
  const vida = Math.max(1, Math.round(caido.maxHp * (porcentagem / 100)))

  return {
    state: comCombatenteEm(state, { lado, indice }, { ...caido, currentHp: vida }),
    resultado: {
      version: 1,
      side: lado,
      kind: 'REVIVE',
      skillId: null,
      skillName: caido.nome ?? 'Aliado caído',
      vidaDeVolta: vida,
    },
  }
}

const mesmoLugar = (a: EmCampo, b: EmCampo) => a.lado === b.lado && a.indice === b.indice

export function resolveRound(
  state: BattleState,
  input: AcoesDaRodada,
  ctx: {
    playerSkills: Record<string, SkillDef>
    enemySkills: Record<string, SkillDef>
    /**
     * Transformações de `aliados[0]`, o personagem do jogador.
     *
     * Um mapa só, e não um por combatente, porque hoje ninguém mais tem
     * transformação desbloqueada: o inimigo entra como Character puro do
     * catálogo, sem nenhuma. Quando existir aliado controlado pela máquina
     * com forma própria, isto vira um mapa por posição.
     */
    playerTransformations: Record<string, TransformationDef>
  },
  rand: () => number = Math.random
): { state: BattleState; turnResults: TurnResult[] } {
  let atual: BattleState = {
    ...state,
    aliados: state.aliados.map((c) => ({ ...c })),
    inimigos: state.inimigos.map((c) => ({ ...c })),
  }
  const turnResults: TurnResult[] = []

  const posicoes: EmCampo[] = [
    ...atual.aliados.map((_, indice) => ({ lado: LADO_ALIADO, indice })),
    ...atual.inimigos.map((_, indice) => ({ lado: 'ENEMY' as Side, indice })),
  ]
  const vivos = () => posicoes.filter((p) => estaDePe(combatenteEm(atual, p)))

  // 1. Início da rodada: regeneração, recarga, manutenção de domínio e o tique
  //    dos efeitos — para todo mundo que estiver de pé.
  //
  //    A ORDEM DAS TRÊS FASES é preservada de propósito (todas as regenerações,
  //    depois todos os domínios, depois todos os status) em vez de fazer as
  //    três de cada combatente juntas: é a ordem em que o log saía antes, e
  //    mudá-la mudaria a leitura de toda batalha antiga sem nenhum ganho.
  for (const p of vivos()) {
    atual = comCombatenteEm(atual, p, tickCooldowns(regenEnergy(combatenteEm(atual, p))))
  }
  for (const p of vivos()) {
    const r = manterDominio(p.lado, combatenteEm(atual, p))
    atual = comCombatenteEm(atual, p, r.combatant)
    turnResults.push(...r.results)
  }
  for (const p of vivos()) {
    const r = tickStatusEffects(p.lado, combatenteEm(atual, p))
    atual = comCombatenteEm(atual, p, r.combatant)
    turnResults.push(...r.results)
  }

  // 2. Transformação automática de início de rodada. Só o principal aliado
  //    tem formas hoje — ver o comentário de ctx.playerTransformations.
  const heroiEmCampo: EmCampo = { lado: LADO_ALIADO, indice: 0 }
  if (estaDePe(combatenteEm(atual, heroiEmCampo))) {
    const auto = maybeAutoTransform(
      combatenteEm(atual, heroiEmCampo),
      ctx.playerTransformations,
      ['LOW_HP', 'ENERGY_CHARGE'],
      0
    )
    if (auto) {
      atual = comCombatenteEm(atual, heroiEmCampo, auto.combatant)
      turnResults.push(makeTransformResult(LADO_ALIADO, auto.transformation))
    }
  }

  // 3. BLOQUEIO, antes da ordem de iniciativa e não no turno de quem bloqueou:
  //    a guarda precisa estar de pé quando o oponente ataca, e quem é mais
  //    lento também bloqueia — senão bloquear só serviria a quem já tem a
  //    vantagem da iniciativa, que é o contrário do que ele existe para fazer.
  const bloqueando = new Set<string>()
  const chave = (p: EmCampo) => `${p.lado}:${p.indice}`

  for (const p of vivos()) {
    const c = combatenteEm(atual, p)
    if (acaoDe(input, p)?.kind !== 'BLOCK') continue
    if (isStunned(c) || !podeBloquear(c)) continue

    const custo = custoDeErguerGuarda(c)
    // Bloquear é uma ação diferente de continuar a sequência — quebra
    // qualquer combo que estivesse preparado.
    atual = comCombatenteEm(atual, p, { ...erguerGuarda(c), comboPreparado: undefined })
    bloqueando.add(chave(p))
    turnResults.push({
      version: 1,
      side: p.lado,
      kind: 'BLOCK',
      skillId: null,
      skillName: 'Bloqueio',
      guardaGasta: custo,
    })
  }

  // 4. Habilidade e alvo de cada um, resolvidos ANTES de qualquer golpe sair.
  //    Tem que ser antes: o choque compara os dois golpes partindo juntos, e
  //    isso não existiria se cada um fosse escolhido na sua vez.
  const golpes = new Map<string, { skill: SkillDef | null; alvo: EmCampo | null }>()
  for (const p of vivos()) {
    const acao = acaoDe(input, p)
    if (!acao || acao.kind !== 'ATTACK' || bloqueando.has(chave(p))) continue

    const catalogo = p.lado === LADO_ALIADO ? ctx.playerSkills : ctx.enemySkills
    golpes.set(chave(p), {
      skill: acao.skillId ? catalogo[acao.skillId] ?? null : null,
      alvo: alvoDe(atual, p, acao.alvo),
    })
  }

  // 5. CHOQUE DE GOLPES, entre dois que escolheram UM AO OUTRO.
  //
  //    A exigência de reciprocidade é o que dá sentido ao choque com mais de
  //    dois em campo: dois golpes só se encontram no meio se estiverem indo um
  //    na direção do outro. Num 1x1 isso é sempre verdade, então a regra
  //    antiga é o caso particular desta.
  //
  //    Cada combatente entra em no máximo um choque, e os pares são varridos
  //    em ordem fixa — o estado é um snapshot gravado, e a mesma entrada tem
  //    que dar sempre a mesma rodada.
  const anulados = new Set<string>()
  const jaChocou = new Set<string>()

  for (const a of vivos()) {
    if (a.lado !== LADO_ALIADO || jaChocou.has(chave(a))) continue
    const meu = golpes.get(chave(a))
    if (!meu?.alvo || !meu.skill) continue

    const b = meu.alvo
    if (jaChocou.has(chave(b))) continue
    const dele = golpes.get(chave(b))
    if (!dele?.alvo || !dele.skill || !mesmoLugar(dele.alvo, a)) continue

    const ca = combatenteEm(atual, a)
    const cb = combatenteEm(atual, b)
    if (isStunned(ca) || isStunned(cb)) continue
    if (bloqueando.has(chave(a)) || bloqueando.has(chave(b))) continue

    const tag = tagDeClash(meu.skill, dele.skill)
    if (!tag) continue

    const { vencedor } = resolverClash(ca, cb, meu.skill, dele.skill, rand)
    turnResults.push({
      version: 1,
      side: vencedor ?? LADO_ALIADO,
      kind: 'CLASH',
      clashTag: tag,
      skillId: null,
      skillName: vencedor === null ? 'Choque equilibrado' : 'Choque',
    })

    // O perdedor tem o golpe anulado; o vencedor bate mais forte. Empate anula
    // os dois — a rodada foi gasta na disputa.
    const amplificar = (sk: SkillDef): SkillDef => ({
      ...sk,
      power: Math.round(sk.power * (1 + CLASH_BONUS_DO_VENCEDOR)),
    })
    if (vencedor === a.lado) {
      golpes.set(chave(a), { ...meu, skill: amplificar(meu.skill) })
      anulados.add(chave(b))
    } else if (vencedor === b.lado) {
      golpes.set(chave(b), { ...dele, skill: amplificar(dele.skill) })
      anulados.add(chave(a))
    } else {
      anulados.add(chave(a))
      anulados.add(chave(b))
    }
    jaChocou.add(chave(a))
    jaChocou.add(chave(b))
  }

  // 6. Cada um age na sua vez, na fila única de iniciativa.
  const ordem = ordemDeIniciativa(atual)

  for (const p of ordem) {
    // Um lado inteiro no chão encerra a rodada: não há mais em quem bater.
    if (!atual.aliados.some(estaDePe) || !atual.inimigos.some(estaDePe)) break

    const c = combatenteEm(atual, p)
    if (!estaDePe(c)) continue

    if (isStunned(c)) {
      turnResults.push(makeStunResult(p.lado))
      // Ficar atordoado não foi uma escolha, mas a janela da sequência
      // passou do mesmo jeito — o combo quebra aqui também.
      if (c.comboPreparado !== undefined) atual = comCombatenteEm(atual, p, { ...c, comboPreparado: undefined })
      continue
    }

    const acao = acaoDe(input, p)

    if (acao?.kind === 'TRANSFORM' && p.lado === LADO_ALIADO && p.indice === 0) {
      const t = ctx.playerTransformations[acao.transformationId]
      if (t) {
        // Se transformar também é uma ação diferente — quebra o combo.
        atual = comCombatenteEm(atual, p, { ...applyTransformation(c, t), comboPreparado: undefined })
        turnResults.push(makeTransformResult(p.lado, t))
      }
      continue
    }

    if (bloqueando.has(chave(p)) || anulados.has(chave(p))) continue

    const golpe = golpes.get(chave(p))
    // Quem não declarou ataque nesta rodada não age.
    if (!golpe) continue

    // O ALVO É RECONFERIDO AQUI, e não só na hora de escolher: alguém mais
    // rápido pode ter derrubado quem este ia atacar no meio da mesma rodada.
    // Desperdiçar a ação puniria o jogador por uma coisa que ele não tinha
    // como prever — a intenção era ATACAR, e ela continua válida. Sem alvo
    // nenhum de pé, aí sim não há o que fazer.
    const mira = golpe.alvo && estaDePe(combatenteEm(atual, golpe.alvo))
      ? golpe.alvo
      : alvoDe(atual, p, undefined)
    if (!mira) continue

    const alvoAtual = combatenteEm(atual, mira)

    const hpAntes = c.currentHp
    const r = performSkillUse(
      p.lado,
      c,
      alvoAtual,
      golpe.skill,
      rand,
      bloqueando.has(chave(mira))
    )
    atual = comCombatenteEm(atual, p, r.attacker)
    atual = comCombatenteEm(atual, mira, r.defender)
    turnResults.push(r.turnResult, ...r.eventos)

    // Ressurreição depois do golpe: quem lança pode ter derrubado alguém na
    // mesma ação (counter), e o aliado que acabou de cair já conta.
    if (r.reviveSolicitado !== undefined) {
      const volta = reviverAliado(atual, p.lado, r.reviveSolicitado)
      if (volta) {
        atual = volta.state
        turnResults.push(volta.resultado)
      }
    }

    // Transformação por dano recebido, do lado de quem apanhou E de quem
    // levou counter — as duas são "tomei dano", e o counter machuca o atacante.
    for (const machucado of [p, mira]) {
      if (machucado.lado !== LADO_ALIADO || machucado.indice !== 0) continue
      const depois = combatenteEm(atual, machucado)
      if (!estaDePe(depois)) continue
      const sofrido = mesmoLugar(machucado, p) ? hpAntes - depois.currentHp : r.turnResult.damage ?? 0
      if (sofrido <= 0) continue
      const auto = maybeAutoTransform(depois, ctx.playerTransformations, ['ON_DAMAGE_TAKEN'], sofrido)
      if (auto) {
        atual = comCombatenteEm(atual, machucado, auto.combatant)
        turnResults.push(makeTransformResult(LADO_ALIADO, auto.transformation))
      }
    }
  }

  // 7. Fim da rodada: dreno das formas ativas (só o principal aliado as tem).
  atual = comCombatenteEm(atual, heroiEmCampo, applyDrain(combatenteEm(atual, heroiEmCampo), ctx.playerTransformations))

  // 8. Desfecho: um lado perde quando TODOS caem, não quando o primeiro cai.
  const aliadosDePe = atual.aliados.some(estaDePe)
  const inimigosDePe = atual.inimigos.some(estaDePe)

  let outcome: Outcome = state.outcome
  if (!aliadosDePe && !inimigosDePe) outcome = 'DRAW'
  else if (!inimigosDePe) outcome = 'PLAYER_WIN'
  else if (!aliadosDePe) outcome = 'ENEMY_WIN'

  return { state: { ...atual, outcome }, turnResults }
}
