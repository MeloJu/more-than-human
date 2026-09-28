import { ativarForma, custoDaPostura, isLegalMove, podeAtivar, podeBloquear } from './engine'
import { alcanceDe } from './alcance'
import type { AcaoDeCombate, CombatantState, Postura, SkillDef, TransformationDef } from './types'

const LOW_HP_HEAL_THRESHOLD = 0.4

/**
 * Dano ESPERADO de uma habilidade: poder descontado da chance de errar.
 *
 * Existe porque as duas funções abaixo ordenavam por poder cru, e com
 * precisão isso passou a estar errado. Um golpe de poder 45 com 88% de
 * precisão rende 39,6 em média — menos que um de 42 que nunca erra. Sem esta
 * conta, a precisão seria só um imposto silencioso sobre as habilidades
 * grandes, e a escolha que ela existe para criar não apareceria em lugar
 * nenhum: nem no loadout automático, nem na jogada da IA.
 *
 * Não é a conta completa de dano — ignora escala por atributo e defesa do
 * alvo — e não precisa ser. Ela serve para ORDENAR habilidades do mesmo
 * personagem, e esses dois fatores são aproximadamente iguais para todas elas.
 */
export function danoEsperado(skill: SkillDef): number {
  return skill.power * ((skill.precision ?? 100) / 100)
}

/**
 * Escolhe um loadout padrão a partir das habilidades disponíveis.
 *
 * Usada pelos DOIS lados: monta o arsenal do inimigo e preenche os slots
 * vazios do jogador. Ter uma regra só é o ponto — enquanto eram duas, cada
 * lado errava de um jeito diferente.
 *
 * POR QUE EXISTE, LADO DO INIMIGO: até aqui ele entrava em batalha com TODAS as
 * habilidades do personagem, sem filtro de nível e sem teto de quantidade,
 * enquanto o jogador só leva o que cabe nos slots do loadout — 4 no começo do
 * jogo. Um Izuru Kira de nível 2 chegava com o arsenal inteiro que ele teria
 * algum dia, kidō de alto nível incluído.
 *
 * Isso também explica a queixa de que "a IA não tem cooldown". Ela tem: o
 * cooldown decrementa dos dois lados a cada rodada. O que acontecia é que,
 * com vinte e poucas habilidades, sempre sobrava outra grande fora de
 * cooldown — três kidō pesados seguidos eram três kidō DIFERENTES.
 *
 * A escolha imita o que um jogador faria: os golpes mais fortes que couberem,
 * mas garantindo UM barato. Sem o barato, o turno seguinte ao golpe grande é
 * ataque básico — o mesmo critério que já tinha sido medido para os kits de
 * assinatura dos personagens jogáveis.
 *
 * POR QUE EXISTE, LADO DO JOGADOR: o preenchimento automático usava
 * `Object.keys(eligible)`, que é a ordem em que o banco devolveu as linhas, e
 * pegava as primeiras. Ou seja, o jogador começava com quatro habilidades
 * QUAISQUER — o Galick Gun do Vegeta podia ficar de fora enquanto um buff
 * entrava. Ele sempre pôde trocar à mão, mas o padrão não devia ser sorteio.
 *
 * É determinístico de propósito: o estado da batalha é gravado como snapshot
 * na criação, então a mesma entrada tem que dar sempre o mesmo loadout.
 */
/**
 * Quanto uma habilidade PROTEGE quem a usa, para desempatar habilidades de
 * dano esperado igual — o caso comum sendo várias de poder 0 competindo pelo
 * mesmo slot.
 *
 * POR QUE ISTO EXISTE: o desempate era só "a mais barata vence", e isso trata
 * energia como se fosse o único eixo de valor. Não é — cura e escudo mantêm
 * quem os usa vivo, e um debuff de 6% de velocidade no adversário não faz
 * nada sozinho, sem um ataque no mesmo loadout para aproveitar a vantagem.
 *
 * MEDIDO NA UNOHANA: no nível 2 ela tem seis habilidades elegíveis para
 * quatro slots. Pelo custo puro, o loadout escolhia Bakudō #1: Sai (debuff de
 * velocidade, e9) e Calm Composure (buff de defesa, e16) — E DEIXAVA DE FORA
 * Healing Touch (cura, e20) e Minazuki: Mist Balm (escudo, e18), suas duas
 * ferramentas de sobrevivência. Ela chegava no estágio 2 sem cura e sem
 * escudo, e perdia 0% das vezes. Rangiku e Ukitake têm o mesmo problema
 * escondido: perdem a própria defesa para o `guarda firme` de sempre, e não
 * sentem porque têm golpe suficiente para não precisar do slot.
 *
 * A ordem escolhida — cura/escudo/counter primeiro, buff depois, debuff por
 * último — segue o que cada efeito faz por SI MESMO: os três primeiros
 * mantêm o lançador na luta sozinhos; buff em si mesmo rende só com o resto
 * do kit; debuff no adversário não rende NADA sozinho.
 */
function valorDeProtecao(skill: SkillDef): number {
  const tipos = new Set(skill.effects.map((e) => e.type))
  if (tipos.has('HEAL') || tipos.has('SHIELD') || tipos.has('COUNTER')) return 2
  if (tipos.has('BUFF')) return 1
  return 0
}

export function escolherLoadoutPadrao(skills: SkillDef[], slots: number): SkillDef[] {
  if (slots <= 0) return []
  if (skills.length <= slots) return skills

  // Desempate por id mantém a ordem estável quando poder e custo empatam.
  // valorDeProtecao entra ENTRE dano esperado e custo: primeiro quem bate
  // mais forte, depois quem protege melhor, só então quem é mais barato.
  const porPoder = [...skills].sort(
    (a, b) =>
      danoEsperado(b) - danoEsperado(a) ||
      valorDeProtecao(b) - valorDeProtecao(a) ||
      a.energyCost - b.energyCost ||
      a.id.localeCompare(b.id)
  )
  const escolhidas = porPoder.slice(0, slots)

  // SÓ ENTRE HABILIDADES DE ATAQUE, e isso não é um recorte novo — é o que o
  // comentário desta garantia sempre disse: "senão o turno pós-cooldown vira
  // ataque básico" é sobre ter uma OFENSIVA barata disponível, nunca foi sobre
  // ter uma utilitária barata. Antes de restringir, a garantia varria toda
  // habilidade por custo, e podia empurrar para fora um buff ou uma cura
  // razoável em troca de um debuff quase inofensivo só por ele custar menos —
  // o mesmo defeito de "mais barato vence" que valorDeProtecao corrige acima,
  // só que escapando por esta segunda porta.
  const maisBarataOfensiva = [...skills]
    .filter((sk) => sk.power > 0)
    .sort((a, b) => a.energyCost - b.energyCost || danoEsperado(b) - danoEsperado(a) || a.id.localeCompare(b.id))[0]
  if (maisBarataOfensiva && !escolhidas.some((s) => s.id === maisBarataOfensiva.id)) {
    escolhidas[escolhidas.length - 1] = maisBarataOfensiva
  }
  return escolhidas
}


/**
 * Priority AI, not a full decision tree:
 * 1. Below 40% HP and a HEAL skill is available -> use it.
 * 2. Highest-power damage skill available -> use it (previous greedy behavior).
 * 3. No damage skill available (cooldown/energy), but a support skill is -> use it,
 *    so buffs/debuffs/shields/counters actually see play instead of always
 *    losing out to Basic Attack.
 * 4. Otherwise, Basic Attack (null).
 */
export function pickAiSkill(
  self: CombatantState,
  availableSkills: SkillDef[],
  /**
   * O oponente. Só é consultado para uma decisão — não abrir um domínio que
   * vai perder o choque —, e é opcional porque sem ele a IA apenas deixa de
   * fazer essa checagem.
   */
  oponente?: CombatantState
): string | null {
  const legal = availableSkills.filter((s) => isLegalMove(self, s))
  if (legal.length === 0) return null


  const hpRatio = self.maxHp > 0 ? self.currentHp / self.maxHp : 0
  if (hpRatio < LOW_HP_HEAL_THRESHOLD) {
    const heal = legal.find((s) => s.effects.some((e) => e.type === 'HEAL'))
    if (heal) return heal.id
  }

  // DOMÍNIO, antes da regra de maior poder — senão a IA nunca abriria um.
  //
  // O domínio bate MENOS que os outros golpes de nível 14, porque o valor dele
  // está no estado: três rodadas de dano amplificado que atravessa escudo e
  // counter. A regra gulosa abaixo escolhe por poder, então um chefe com
  // Expansão de Domínio escolheria qualquer outra coisa, sempre — a mecânica
  // existiria e nunca apareceria em jogo contra a IA.
  //
  // Abrir cedo é quase sempre certo, porque a amplificação vale para tudo que
  // vier depois; a única checagem é não reabrir por cima do próprio domínio,
  // que jogaria fora as rodadas restantes. Contra um domínio inimigo já aberto
  // ela também abre: deixar o outro de pé é pior que disputar, mesmo perdendo.
  if (!self.statusEffects.some((e) => e.type === 'DOMAIN')) {
    const dominio = legal.find((s) => s.effects.some((e) => e.type === 'DOMAIN'))
    const dominioInimigo = oponente?.statusEffects.find((e) => e.type === 'DOMAIN' && e.remainingRounds > 0)
    const minhaForca = dominio?.effects.find((e) => e.type === 'DOMAIN')?.magnitude ?? 0

    // Abrir um domínio mais fraco contra um já aberto é a pior jogada do jogo:
    // custa a energia, a rodada, e ainda entrega um atordoamento. Aqui a IA
    // recusa a disputa e luta normalmente, guardando o domínio para quando o
    // do outro cair. Empate ela aceita — anular os dois tira a amplificação do
    // oponente, que é um bom negócio para quem estava sem domínio.
    const disputaPerdida = dominioInimigo !== undefined && minhaForca < dominioInimigo.magnitude
    if (dominio && !disputaPerdida) return dominio.id
  }

  const damageSkills = legal
    .filter((s) => s.power > 0)
    .sort((a, b) => danoEsperado(b) - danoEsperado(a) || a.energyCost - b.energyCost)
  if (damageSkills.length > 0) return damageSkills[0].id

  const supportSkills = legal.filter((s) => s.power === 0)
  if (supportSkills.length > 0) return supportSkills[0].id

  return null
}


/**
 * Se a IA deve gastar a rodada bloqueando em vez de agir.
 *
 * A REGRA É "meu melhor golpe não vale a rodada". Ela dispara quando não
 * sobrou nenhuma habilidade ofensiva pagável — o que restaria seria o ataque
 * básico, de poder 12 — e ainda há guarda para erguer. Nesse momento bloquear
 * é objetivamente melhor: você impede 60% de um golpe inteiro em vez de
 * entregar 12 de poder, e a energia regenera enquanto isso.
 *
 * POR QUE NÃO É MAIS ESPERTA QUE ISSO: a IA não sabe o que o oponente vai
 * fazer, e num jogo de escolha simultânea qualquer regra mais elaborada seria
 * adivinhação disfarçada. Bloquear quando não há nada bom a fazer é a única
 * leitura que não depende de prever o outro.
 *
 * O EFEITO COLATERAL BOM: a IA para de dar ataques básicos de 12 enquanto
 * espera energia, que era o comportamento mais visivelmente burro dela.
 */
export function deveBloquear(self: CombatantState, availableSkills: SkillDef[]): boolean {
  if (!podeBloquear(self)) return false

  // PRECISA TER GOLPE PARA ESTAR RECARREGANDO. Sem esta linha, quem tem o
  // arsenal vazio bloqueia toda rodada para sempre — e dois assim empatam por
  // MAX_ROUNDS sem nunca trocar um golpe. Foi o que a simulação mostrou na
  // primeira versão. Para quem não tem habilidade nenhuma, o ataque básico
  // não é um consolo: é literalmente a jogada dele.
  const temArsenalOfensivo = availableSkills.some((s) => s.power > 0)
  if (!temArsenalOfensivo) return false

  // Habilidade de suporte pagável vale mais que a guarda em qualquer caso:
  // escudo e cura continuam valendo depois da rodada, o bloqueio não.
  if (availableSkills.some((s) => s.power === 0 && isLegalMove(self, s))) return false

  // RECARGA: nenhum golpe pagável, então o que restaria é o ataque básico de
  // poder 12. Impedir 60% de um golpe inteiro vale mais que isso.
  //
  // ESTA É A ÚNICA REGRA, e a segunda foi MEDIDA E DESCARTADA — de propósito,
  // não por esquecimento. "Bloquear com a vida no fim" é o que um humano faz,
  // e deixaria a quebra de guarda alcançável para quem joga contra a IA (hoje
  // ela quase não bloqueia, porque as lutas duram cerca de seis rodadas e a
  // energia raramente acaba nesse tempo).
  //
  // O problema é o tamanho do efeito. Com limiar de 25% de vida, Kenpachi vai
  // de 2% para 73% no estágio 2 e Yuji cai de 87% para 15% no estágio 3;
  // baixando para 15% o Yuji continua em 15%. Defender no fim da luta é
  // simplesmente muito forte — vale para os dois lados, e vira a partida.
  //
  // Uma heurística de IA não deveria mover balanceamento nessa escala sem uma
  // recurva dos estágios junto. A regra volta quando essa recurva for feita.
  return !availableSkills.some((s) => s.power > 0 && isLegalMove(self, s))
}

/**
 * Quantas rodadas a IA precisa conseguir SUSTENTAR uma forma para liberá-la.
 *
 * Sem essa margem, a IA liberaria a forma assim que desse para pagar a
 * ativação — e ela cairia na rodada seguinte por falta de manutenção, com a
 * ativação jogada fora. Três rodadas é o mínimo para a forma pagar o que
 * custou numa luta que dura de seis a dez.
 */
export const RODADAS_DE_FORMA_MINIMAS = 3

/**
 * A forma que a IA deve liberar agora, ou null.
 *
 * Só as de gatilho MANUAL: as automáticas (Ultra Instinct, Wrathful) o motor
 * dispara sozinho, para a IA e para o jogador igual. Entre as que dá para
 * pagar E sustentar, a de nível mais alto — que é a mais forte.
 */
export function escolherFormaDaIa(
  self: CombatantState,
  formas: Record<string, TransformationDef>
): TransformationDef | null {
  if (self.activeTransformationId) return null
  const candidatas = Object.values(formas).filter((t) => {
    if (t.triggerType !== 'MANUAL' || !podeAtivar(self, t)) return false
    const energiaDepois = self.currentEnergy - (t.activationCost ?? 0)
    const staminaDepois = (self.currentStamina ?? 0) - (t.activationStaminaCost ?? 0)
    return (
      energiaDepois >= t.drainPerTurn * RODADAS_DE_FORMA_MINIMAS &&
      staminaDepois >= (t.drainStaminaPerTurn ?? 0) * RODADAS_DE_FORMA_MINIMAS
    )
  })
  if (candidatas.length === 0) return null
  return candidatas.sort((a, b) => b.levelRequirement - a.levelRequirement)[0]
}

/**
 * A ação completa da IA numa rodada: bloquear, transformar ou atacar.
 *
 * Existe para que batalha, simulador e qualquer modo futuro decidam da MESMA
 * forma — antes cada chamador montava "bloqueia? senão ataca" à mão.
 *
 * Forma que gasta a rodada vira a ação da rodada. Forma que não gasta vai
 * junto do ataque, em `liberar`, e o golpe é escolhido JÁ COM a forma paga:
 * escolher antes poderia apontar uma habilidade que a ativação deixou sem
 * energia para pagar.
 */
export function acaoDaIa(
  self: CombatantState,
  skills: SkillDef[],
  oponente?: CombatantState,
  formas: Record<string, TransformationDef> = {},
  /**
   * O que a IA sabe do adversário para escolher a postura: o arsenal dele
   * (não a escolha desta rodada, que ela não vê) e a fonte de sorte. Sem o
   * arsenal, ela escolhe a postura sem palpite sobre o alcance do golpe.
   */
  leitura: { skillsDoOponente?: SkillDef[]; rand?: () => number } = {}
): AcaoDeCombate {
  const forma = escolherFormaDaIa(self, formas)
  if (forma && forma.consumesTurn !== false) return { kind: 'TRANSFORM', transformationId: forma.id }
  if (deveBloquear(self, skills)) return { kind: 'BLOCK' }

  const ativa = forma ?? (self.activeTransformationId ? formas[self.activeTransformationId] : undefined)
  const base = forma ? ativarForma(self, forma) : self
  const visto = ativa ? comManutencaoReservada(base, ativa) : base
  const skillId = pickAiSkill(visto, skills, oponente)
  const postura = escolherPosturaDaIa(visto, skills.find((s) => s.id === skillId) ?? null, oponente, leitura)
  return { kind: 'ATTACK', skillId, postura, ...(forma ? { liberar: forma.id } : {}) }
}

/**
 * Abaixo de quanto da stamina máxima a IA para de se posicionar e fica na
 * neutra para recuperar. Sem esse piso ela gastaria a reserva inteira em
 * postura e não teria como sustentar forma nem erguer guarda quando precisa.
 */
export const IA_STAMINA_MINIMA = 0.3

/**
 * A postura que a IA escolhe, junto com o golpe.
 *
 * ELA NÃO VÊ A SUA ESCOLHA. O palpite sai do arsenal do adversário: o golpe
 * que ELE pagaria agora, e o alcance desse golpe. Contra quem vem de perto,
 * aparar; contra quem dispara, esquivar; contra área, guarda. E com sorte no
 * meio, para a IA não ser previsível — se ela sempre aparasse contra o
 * Kenpachi, bastaria nunca atacar de perto nela.
 */
export function escolherPosturaDaIa(
  self: CombatantState,
  meuGolpe: SkillDef | null,
  oponente: CombatantState | undefined,
  leitura: { skillsDoOponente?: SkillDef[]; rand?: () => number }
): Postura {
  const rand = leitura.rand ?? Math.random
  const max = self.maxStamina ?? 0
  const sobra = (self.currentStamina ?? 0) - custoDaPostura(self, 'APARAR')
  if (max <= 0 || sobra < max * IA_STAMINA_MINIMA) return 'NEUTRA'

  // Adversário quase caído: avançar para fechar a luta.
  if (oponente && oponente.maxHp > 0 && oponente.currentHp / oponente.maxHp <= 0.25 && meuGolpe) return 'IMPETO'

  const palpite = oponente && leitura.skillsDoOponente
    ? alcanceDe(leitura.skillsDoOponente.find((s) => s.id === pickAiSkill(oponente, leitura.skillsDoOponente!)) ?? null)
    : null

  const sorteio = rand()
  if (palpite === 'CORPO') return sorteio < 0.45 ? 'APARAR' : sorteio < 0.65 ? 'GUARDA' : 'NEUTRA'
  if (palpite === 'DISTANCIA') return sorteio < 0.45 ? 'ESQUIVA' : sorteio < 0.65 ? 'GUARDA' : 'NEUTRA'
  if (palpite === 'AREA') return sorteio < 0.55 ? 'GUARDA' : 'NEUTRA'
  return sorteio < 0.3 ? 'GUARDA' : sorteio < 0.5 ? 'ESQUIVA' : 'NEUTRA'
}

/**
 * O combatente como a IA deve enxergá-lo na hora de escolher o golpe: com a
 * manutenção da forma JÁ separada da reserva.
 *
 * Sem isso a IA gastava toda a energia em habilidade, a forma não tinha com
 * que se pagar no fim da rodada e caía — e a IA a liberava de novo, pagando
 * outra ativação (e, no Super Saiyan, outra rodada inteira). Medido, lutar
 * SEM forma chegava a render 72 pontos a mais de vitória que lutar com ela.
 */
function comManutencaoReservada(c: CombatantState, forma: TransformationDef): CombatantState {
  return {
    ...c,
    currentEnergy: c.currentEnergy - forma.drainPerTurn,
    currentStamina: (c.currentStamina ?? 0) - (forma.drainStaminaPerTurn ?? 0),
  }
}
