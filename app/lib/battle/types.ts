export type Outcome = 'PLAYER_WIN' | 'ENEMY_WIN' | 'DRAW' | null
export type Side = 'PLAYER' | 'ENEMY'
export type TransformationTrigger = 'MANUAL' | 'LOW_HP' | 'ON_DAMAGE_TAKEN' | 'ENERGY_CHARGE'
export type Stat = 'attack' | 'defense' | 'speed'

/**
 * Atributo do qual uma habilidade tira força. Espelha o enum ScalingStat do
 * Prisma. Note que inclui 'energy', que NÃO é um Stat: energia não recebe
 * BUFF/DEBUFF e é lida do tamanho da reserva, não do valor atual.
 */
export type ScalingStat = 'attack' | 'defense' | 'speed' | 'energy'
/**
 * DOMINIO e o unico efeito que nao e um numero aplicado ao alvo: e um ESTADO
 * do lancador que muda as regras enquanto dura. Ver dominioAberto em engine.ts.
 */
export type EffectType =
  | 'BUFF'
  | 'DEBUFF'
  | 'DOT'
  | 'STUN'
  | 'COUNTER'
  | 'SHIELD'
  | 'HEAL'
  | 'LIFESTEAL'
  | 'DOMAIN'
  /**
   * Traz um ALIADO CAÍDO de volta, com uma fração da vida máxima dele.
   *
   * É o único efeito que precisa enxergar o time inteiro — os outros mexem em
   * quem lança ou em quem recebe o golpe, e este procura entre os aliados
   * alguém que já está fora. Por isso não é aplicado por applySkillEffects
   * como os demais: só resolveRound conhece os dois times.
   */
  | 'REVIVE'
  /**
   * Os três a seguir NÃO viram status persistente em ninguém — são
   * modificadores da fórmula de dano, consumidos inteiramente dentro do
   * mesmo golpe que os carrega. Por isso `target` neles é sempre 'SELF' por
   * convenção (descrevem uma propriedade do ATAQUE, não algo infligido no
   * adversário), e applySkillEffects os filtra para fora do caminho que cria
   * StatusEffectInstance — do mesmo jeito que já faz com LIFESTEAL e REVIVE.
   */
  /** Dano bônus quando o alvo está com a vida abaixo do limiar (ver EXECUCAO_LIMIAR_HP). */
  | 'EXECUTE'
  /** Ignora uma fração da defesa do alvo neste golpe. */
  | 'PIERCE'
  /** Dano bônus quando o alvo está atordoado — a jogada de quem prende com Bakudō e finaliza com Hadō. */
  | 'COMBO_STUN'
  /**
   * Dano bônus quando a ÚLTIMA AÇÃO do lançador carregava a combo-tag exigida
   * (ver `comboTag` abaixo e `comboPreparado` em CombatantState). É a
   * finalização de uma sequência de duas ações — carrega numa rodada,
   * finaliza na outra — e quebra com qualquer ação diferente no meio,
   * inclusive bloquear, se transformar ou ficar atordoado.
   */
  | 'COMBO_FOLLOWUP'

// Mechanical definition attached to a Skill (Skill.effects in the DB). A
// skill can carry several of these alongside its normal power-based damage
// (e.g. a strike that also applies a bleed DOT).
export type SkillEffect = {
  type: EffectType
  /**
   * ALIADO_CAIDO existe só para REVIVE: nem quem lança nem quem apanha, mas
   * um terceiro que está fora da luta. Sem este valor, um efeito de
   * ressurreição cairia no ramo de 'ENEMY' e seria aplicado no adversário.
   */
  target: 'SELF' | 'ENEMY' | 'ALIADO_CAIDO'
  /**
   * SÓ para COMBO_FOLLOWUP: a combo-tag que precisa ter sido a última
   * carregada pelo lançador. Uma STRING e não um vínculo direto a outra
   * habilidade de propósito — várias cargas diferentes podem alimentar a
   * mesma finalização (ou uma finalização escolher entre mais de uma linha
   * de abertura), do jeito que a tag já funciona pra clash e pra sabor de
   * DOT em outros lugares do motor.
   */
  comboTag?: string
  stat?: Stat // BUFF/DEBUFF only
  magnitude: number // % for BUFF/DEBUFF/LIFESTEAL, flat amount for DOT/SHIELD/HEAL, % reflected for COUNTER
  duration?: number // rounds; absent = instantaneous (HEAL, LIFESTEAL)
  /**
   * EMPILHÁVEL — pensado pra DOT/DEBUFF. Reaplicar a MESMA habilidade
   * enquanto o efeito anterior dela ainda está de pé SOMA a magnitude em vez
   * de só renovar a duração (o comportamento padrão, sem isto). Sem `stack`,
   * bater duas vezes com a mesma queimadura não deixa a queimadura mais
   * forte — só a mantém viva. Com `stack`, cada golpe piora o que já estava
   * lá, até o teto de `maxStacks`.
   */
  stack?: boolean
  /** Só COM `stack: true`. Teto em NÚMERO DE PILHAS, não em magnitude — o teto real é magnitude-base × maxStacks. Ausente vale 3. */
  maxStacks?: number
}

// A live instance of an effect sitting on a combatant mid-battle.
export type StatusEffectInstance = {
  id: string
  type: EffectType
  stat?: Stat
  magnitude: number
  remainingRounds: number
  sourceSkillName: string
  /**
   * A NATUREZA do dano contínuo — queimadura, veneno, sangramento, maldição.
   *
   * Existe um único EffectType DOT servindo às quatro, e é assim de propósito:
   * mecanicamente elas são a mesma coisa, dano por rodada. O que muda é como
   * se lê na tela, e sem este campo a instância não tinha como saber: só as
   * TAGS da habilidade de origem distinguem, e a instância guardava apenas o
   * nome dela.
   *
   * Opcional porque batalhas em andamento foram gravadas antes do campo.
   */
  flavor?: DotFlavor
}

/** Naturezas de dano contínuo que a tela sabe apresentar. */
export type DotFlavor =
  | 'queimadura'
  | 'veneno'
  | 'sangramento'
  | 'maldicao'
  | 'congelamento'
  | 'espiritual'

// A combatant's stats are split into "base" (character + skill tree bonuses,
// fixed for the whole battle) and "current" (base, or transformed if a
// transformation is active) so a transformation can be cleanly reverted
// (e.g. when its drainPerTurn can no longer be paid) without losing the
// pre-transformation baseline. Buff/debuff modifiers are NOT baked into
// these fields — they're read live off statusEffects via getCombatStat()
// so expiry never requires "undoing" arithmetic.
export type CombatantState = {
  /**
   * Identidade dentro da batalha, para acao e alvo poderem apontar para um
   * combatente especifico quando ha mais de um por lado.
   *
   * Opcionais porque batalha em andamento foi gravada antes deles existirem —
   * num 1x1 o lado ja identifica sozinho quem e quem, entao a ausencia nao
   * atrapalha nada.
   */
  id?: string
  nome?: string
  currentHp: number
  maxHp: number
  baseMaxHp: number
  currentEnergy: number
  maxEnergy: number
  /**
   * Reserva defensiva. Opcional porque batalhas em andamento foram gravadas
   * antes deste campo existir — ausente vale 0, e um combatente sem stamina
   * simplesmente não consegue usar habilidade defensiva, que é o mesmo que
   * ficar sem energia para atacar.
   */
  currentStamina?: number
  maxStamina?: number
  baseMaxEnergy: number
  attack: number
  baseAttack: number
  defense: number
  baseDefense: number
  speed: number
  baseSpeed: number
  /**
   * Acurácia e agilidade não têm par `base` como os outros, porque nada as
   * modifica em batalha: não há BUFF nem transformação que mexa nelas, e elas
   * não escalam por nível. São o número da build, do começo ao fim da luta.
   */
  accuracy?: number
  agility?: number
  /**
   * A combo-tag da ÚLTIMA AÇÃO deste combatente, se ela carregava uma —
   * ver COMBO_FOLLOWUP. `undefined` quando não há combo preparado: nem
   * declarado ainda, nem quebrado por uma ação diferente no meio.
   */
  comboPreparado?: string
  cooldowns: Record<string, number> // skillId -> rounds remaining
  activeTransformationId: string | null
  /**
   * Fração descontada do custo de energia de toda habilidade, vinda de traço
   * passivo. -0.3 = 30% mais barato. Opcional porque batalhas em andamento
   * foram gravadas antes deste campo existir; ausente vale 0.
   */
  energyCostModifier?: number
  statusEffects: StatusEffectInstance[]
}

/**
 * O estado de uma batalha: DOIS TIMES, nao dois combatentes.
 *
 * A forma antiga era `{ player, enemy }`, e ela decidia sozinha que toda luta
 * do jogo tem exatamente duas pessoas. Raid, invocacao e combate em time
 * esbarravam todos na mesma parede, e nenhum deles cabia sem mudar isto
 * primeiro.
 *
 * O INDICE 0 DE CADA LADO E O PRINCIPAL: `aliados[0]` e o personagem do
 * jogador, `inimigos[0]` e quem a tela mostra como o adversario. Um 1x1 e o
 * caso degenerado de um array de um elemento, entao a mecanica inteira
 * continua valendo sem ramo especial.
 *
 * O lado a que alguem pertence e IMPLICITO no array em que ele esta. Marcar
 * cada combatente com um campo `side` seria a mesma informacao guardada duas
 * vezes, com a chance de as duas discordarem.
 */
export type BattleState = {
  version: 2
  aliados: CombatantState[]
  inimigos: CombatantState[]
  outcome: Outcome
}

/**
 * A forma anterior, ainda gravada nas batalhas em andamento.
 *
 * Nao e codigo morto: o estado vive como snapshot JSON na coluna `state` da
 * tabela Battle, entao toda luta comecada antes desta mudanca continua neste
 * formato ate terminar. Ver migrarEstado.
 */
export type BattleStateV1 = {
  version: 1
  player: CombatantState
  enemy: CombatantState
  outcome: Outcome
}

/** O que sai do banco: pode ser qualquer uma das duas formas. */
export type BattleStateGravado = BattleState | BattleStateV1

export type AppliedEffect = {
  type: EffectType
  target: Side
  stat?: Stat
  magnitude: number
  duration?: number
  /** DOT: a natureza, para o log poder mostrar o ícone certo. */
  flavor?: DotFlavor
}

export type TurnResult = {
  version: 1
  side: Side
  kind:
    | 'ATTACK'
    | 'TRANSFORM'
    | 'SUPPORT'
    | 'STUNNED'
    | 'DOT_TICK'
    | 'CLASH'
    | 'DOMAIN_OPEN'
    | 'DOMAIN_CLASH'
    | 'DOMAIN_FALL'
    | 'BLOCK'
    | 'GUARD_BREAK'
    | 'REVIVE'
  /** CLASH: a natureza do choque ('beam', 'espada', 'fisico'). */
  clashTag?: string
  skillId: string | null // null = Basic Attack (synthesized, not a DB row)
  skillName: string
  transformationId?: string
  damage?: number
  isCrit?: boolean
  /** ATTACK: o golpe passou por counter/escudo porque o dono tinha dominio aberto. */
  acertoGarantido?: boolean
  /** ATTACK: o golpe passou longe — ver resolverAcerto. */
  errou?: boolean
  /** ATTACK: o alvo estava bloqueando e a guarda aguentou. */
  bloqueado?: boolean
  /** ATTACK/BLOCK: stamina consumida pela guarda ao aparar o golpe. */
  guardaGasta?: number
  /** REVIVE: vida com que o aliado voltou. */
  vidaDeVolta?: number
  /**
   * Intensidade do golpe, em fração da vida máxima do alvo. Calculada aqui
   * porque a tela não conhece a vida máxima — ver SEVERIDADE.
   */
  severidade?: 'raspao' | 'solido' | 'pesado' | 'devastador'
  countered?: boolean // true if this attack was negated + reflected by the defender's COUNTER
  reflectedDamage?: number // damage dealt back to the attacker when countered
  healed?: number // self-heal amount (HEAL or LIFESTEAL)
  energySpent?: number
  targetHpBefore?: number
  targetHpAfter?: number
  effectsApplied?: AppliedEffect[]
}

export type SkillDef = {
  id: string
  name: string
  power: number
  energyCost: number
  cooldown: number
  /**
   * Confiabilidade da habilidade em si, 0-100. Ausente vale 100, que é o
   * comportamento antigo de nunca errar.
   */
  precision?: number
  effects: SkillEffect[]
  /**
   * Categoria da habilidade ('HADO', 'BAKUDO', 'TAIJUTSU'...). Como
   * `description`, é dado de APRESENTAÇÃO — o motor nunca lê. Vem junto
   * porque SkillDef é o que atravessa a fronteira banco->tela, e é a única
   * informação disponível para escolher ícone de um golpe de dano puro, que
   * não tem efeito nenhum de onde deduzir.
   */
  category?: string
  scalingStat: ScalingStat
  /**
   * Marcadores temáticos da habilidade — 'beam', 'espada', 'fogo'. O schema
   * as chamava de "flavor only"; o clash é o primeiro lugar onde elas decidem
   * alguma coisa.
   */
  tags: string[]
  /**
   * Fala/lore exibida ao usar a skill — ver TurnLogEntry. Nunca lido pelo
   * MOTOR (não afeta dano, custo, nada): é dado de apresentação carregado
   * junto porque SkillDef é o que atravessa a fronteira banco->batalha.
   */
  description?: string
}

/** Traço passivo já resolvido para uso no motor. Ver model Trait. */
export type TraitDef = {
  name: string
  energyModifier: number
  attackModifier: number
  defenseModifier: number
  speedModifier: number
  flatHpBonus: number
  flatAttackBonus: number
  flatDefenseBonus: number
  flatSpeedBonus: number
  energyCostModifier: number
}

export type TransformationDef = {
  id: string
  name: string
  levelRequirement: number
  energyModifier: number
  attackModifier: number
  defenseModifier: number
  speedModifier: number
  flatHpBonus: number
  flatAttackBonus: number
  flatDefenseBonus: number
  flatSpeedBonus: number
  drainPerTurn: number
  /** Vida por rodada. Opcional: transformações antigas não tinham o campo. */
  drainHpPerTurn?: number
  /** Se ativar gasta a rodada. Ausente vale true — o comportamento antigo. */
  consumesTurn?: boolean
  /** Energia cobrada uma vez, na ativação. */
  activationCost?: number
  triggerType: TransformationTrigger
  triggerPayload: unknown
}

/**
 * Bônus PLANO somado aos stats base: árvore de habilidade, equipamento e
 * pontos de atributo. Energia e stamina entram aqui desde que existe alocação
 * livre — antes só HP, ataque, defesa e velocidade recebiam bônus, e um
 * personagem não tinha como investir nas duas reservas.
 */
export type StatBonus = {
  hp: number
  attack: number
  defense: number
  speed: number
  energy: number
  stamina: number
  accuracy?: number
  agility?: number
  intelligence?: number
}

export type BaseStats = {
  hp: number
  attack: number
  defense: number
  speed: number
  energy: number
  stamina: number
  /**
   * Acurácia, agilidade e inteligência.
   *
   * Opcionais porque batalhas em andamento foram gravadas antes deles: um
   * combatente sem os três cai no valor neutro, e acurácia igual à agilidade
   * dá evasão zero — ou seja, batalha antiga se comporta exatamente como se
   * comportava. Ver ATRIBUTO_NEUTRO.
   */
  accuracy?: number
  agility?: number
  intelligence?: number
}

/**
 * O que UM combatente faz na rodada — vale para os dois lados.
 *
 * Antes eram duas formas diferentes: o jogador tinha este union completo e o
 * inimigo tinha `{ skillId, bloquear }`. A assimetria dizia, sem querer, que
 * inimigo não se transforma — o que era verdade num 1x1 contra um Character
 * do catálogo, e deixa de ser assim que existir um aliado controlado pela
 * máquina ou um chefe de raid que muda de forma no meio da luta.
 */
export type AcaoDeCombate =
  | {
      kind: 'ATTACK'
      skillId: string | null
      /**
       * Índice do alvo no array do lado OPOSTO. Ausente significa "o primeiro
       * que ainda estiver de pé", que num 1x1 é sempre a resposta certa.
       */
      alvo?: number
    }
  | { kind: 'TRANSFORM'; transformationId: string }
  /**
   * Gasta a rodada inteira para reduzir o dano recebido, pagando com stamina.
   * Não tem alvo nem habilidade: é uma postura, não um golpe.
   */
  | { kind: 'BLOCK' }

/** O mesmo tipo, com o nome que o lado do jogador já usava. */
export type PlayerAction = AcaoDeCombate

/**
 * As ações de uma rodada, PARALELAS aos arrays de combatentes do estado:
 * `aliadas[i]` é o que `state.aliados[i]` faz.
 *
 * Posicional em vez de indexado por id porque o estado já é uma lista
 * ordenada — uma segunda chave seria a mesma informação com uma chance a mais
 * de as duas discordarem. Combatente caído tem ação ignorada, então o
 * chamador não precisa saber quem está de pé para montar a lista.
 */
export type AcoesDaRodada = {
  aliadas: AcaoDeCombate[]
  inimigas: AcaoDeCombate[]
}
