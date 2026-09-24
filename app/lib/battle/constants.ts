import type { ScalingStat } from './types'

export const ENERGY_REGEN_PCT = 0.08

/**
 * Regeneração de stamina por rodada, MENOR que a de energia de propósito.
 *
 * É o que impede o suporte de se tornar invencível por defesa. Com regen
 * igual à da energia, quem tivesse reserva alta poderia se proteger toda
 * rodada para sempre e a luta nunca fecharia — que é exatamente a falha que
 * a stamina existe para evitar, não para criar.
 *
 * Com 5%, uma reserva de 160 devolve 8 por rodada: dá para se proteger
 * seguidamente por um tempo, e não indefinidamente. O atacante tem uma
 * janela real para estourar, que é a decisão que a mecânica quer provocar.
 */
export const STAMINA_REGEN_PCT = 0.05
export const MAX_ROUNDS = 50

export const CRIT_BASE_CHANCE = 0.05
export const CRIT_MAX_CHANCE = 0.35
export const CRIT_SPEED_COEFFICIENT = 0.01
export const CRIT_MULTIPLIER = 1.5

/**
 * Valor neutro de acurácia, agilidade e inteligência.
 *
 * Importa que seja UM só para os três: acurácia igual à agilidade dá evasão
 * zero, então um combatente que não declara nenhum dos dois — batalha gravada
 * antes das colunas existirem, monstro de raid, qualquer caso não migrado —
 * se comporta exatamente como se comportava antes de a mecânica existir.
 */
export const ATRIBUTO_NEUTRO = 11

/**
 * Teto da evasão. É baixo de propósito, e é a decisão mais importante daqui.
 *
 * Uma luta dura de 7 a 14 rodadas. Com evasão alta, uma sequência de erros
 * decide a partida sem que ninguém tenha jogado melhor — e o jogador não tem
 * como reagir a isso, porque não houve escolha errada, houve sorte. Errar
 * precisa ser um custo real e ocasional, não um segundo dado de vitória.
 *
 * 15% significa aproximadamente um golpe perdido a cada sete: o suficiente
 * para investir em agilidade valer a pena, longe do suficiente para virar a
 * mecânica principal.
 */
export const EVASAO_MAXIMA = 0.15

/**
 * Quanto cada ponto de diferença entre acurácia e agilidade mexe na chance de
 * acertar — para os dois lados. Agilidade acima da acurácia de quem ataca
 * tira; acurácia acima da agilidade do alvo SOMA. Ver ajusteDeAcerto.
 */
export const EVASAO_POR_PONTO = 0.01

/**
 * Teto do que a acurácia pode SOMAR à precisão de um golpe.
 *
 * Existe porque a acurácia passou a compensar a imprecisão da própria
 * habilidade, e sem teto um investimento grande tornaria todo golpe certeiro —
 * a aposta do golpe grande deixaria de existir. Com 15, um golpe de 80% chega
 * a 95% e nunca a 100%: treinar reduz o risco, não o apaga. Simétrico ao teto
 * da evasão de propósito — os dois atributos valem o mesmo tanto.
 */
export const BONUS_DE_ACURACIA_MAXIMO = 0.15

/**
 * Piso da chance de acertar.
 *
 * Precisão e evasão se multiplicam, então uma habilidade imprecisa contra um
 * alvo esquivo poderia empilhar para bem abaixo do que qualquer uma das duas
 * prometia. O piso garante que nenhum golpe seja um chute: se você escolheu
 * gastar a rodada e a energia, a chance nunca cai abaixo de dois terços.
 */
export const ACERTO_MINIMO = 0.66

/**
 * BLOQUEIO, e por que a stamina é a barra de guarda.
 *
 * Até aqui nunca havia motivo para não atacar: a rodada não era uma decisão,
 * era uma consulta a qual habilidade tinha o maior dano esperado disponível.
 * Bloquear gasta a rodada inteira e devolve redução de dano — a primeira
 * troca de verdade que o combate oferece.
 *
 * O QUE FAZ ISSO FUNCIONAR é não ter barra nova. O dano que o bloqueio impede
 * é cobrado da stamina, que já existe, já é separada da energia e já regenera
 * mais devagar de propósito. Daí o guard break sai sem nenhuma mecânica
 * inventada: quando não há stamina para pagar o que foi impedido, a guarda
 * quebra, o golpe entra inteiro e quem bloqueou perde a rodada seguinte.
 *
 * E a diferença de stamina entre as classes, que já estava no catálogo, vira
 * identidade defensiva de graça: SUPORTE tem 175 e aguenta sete bloqueios,
 * CONJURADOR tem 75 e aguenta três. O conjurador não pode encastelar, que é
 * exatamente o que se quer dele.
 *
 * O RISCO É O EMPATE POR TEMPO — os dois lados encastelando até MAX_ROUNDS.
 * A trava é a regeneração baixa da stamina somada ao guard break: dá para
 * bloquear várias rodadas seguidas, nunca indefinidamente.
 */
export const BLOQUEIO_REDUCAO = 0.6

/**
 * Quanto de stamina custa cada ponto de dano impedido pela guarda.
 *
 * 1 para 1 é o número honesto: a stamina que você gasta é exatamente o dano
 * que você não tomou. Qualquer outro valor precisaria de justificativa
 * própria, e não há nenhuma — a conversão É a mecânica.
 */
export const GUARDA_POR_DANO = 1

/**
 * Fração da stamina máxima que custa DECLARAR o bloqueio, mesmo sem levar
 * golpe nenhum.
 *
 * Existe para fechar um buraco do desenho original: se a guarda só cobrasse
 * ao aparar, dois lados sem energia poderiam bloquear indefinidamente sem
 * gastar nada, e a luta terminaria por MAX_ROUNDS. Com um custo de entrada,
 * encastelar tem prazo mesmo quando ninguém ataca — e a stamina volta a ser o
 * único relógio que a defesa obedece.
 *
 * PRECISA SER MAIOR QUE STAMINA_REGEN_PCT, e a primeira versão errou nisso: os
 * dois estavam em 5%, então a regeneração pagava exatamente o custo de entrada
 * e erguer a guarda era de graça em regime permanente — a trava não travava
 * nada. Um teste pegou, e é a razão de os dois números estarem no mesmo
 * arquivo, um perto do outro: eles são um par, não duas constantes.
 *
 * Com 10% contra 5% de regeneração, a guarda pura drena 5% líquidos por
 * rodada: cerca de vinte rodadas de encastelamento antes de a reserva acabar
 * sozinha, mesmo sem levar um golpe.
 */
export const BLOQUEIO_CUSTO_BASE = 0.1

/** Rodadas perdidas por quem teve a guarda quebrada. */
export const GUARDA_QUEBRADA_ATORDOA = 1

/**
 * Quanto do máximo de vida um golpe precisa levar para ser narrado em cada
 * nível de intensidade.
 *
 * A severidade é calculada no MOTOR e gravada no turno, e não deduzida na
 * tela, por uma razão prática: a tela tem o dano mas não tem a vida máxima do
 * alvo, e plumbar isso por duas páginas de batalha seria pior do que gravar
 * um campo que o motor já sabe calcular.
 */
export const SEVERIDADE = { raspao: 0.05, solido: 0.12, pesado: 0.22 }

/**
 * Abaixo de que fração da vida máxima o efeito EXECUTE dá o bônus de dano.
 *
 * Um número SÓ, e não um por habilidade — a mesma escolha já feita para
 * BLOQUEIO_REDUCAO e DOMAIN_DAMAGE_BONUS: cada habilidade varia SÓ o quanto
 * de bônus dá (a magnitude), não o limiar. Um limiar por skill seria uma
 * variável a mais que ninguém pediria e que só serviria para inflar o número
 * de uma até parecer "sempre executa".
 *
 * 30% é baixo o bastante para não substituir dano normal na maior parte da
 * luta — é uma jogada de acabamento, não a estratégia inteira.
 */
export const EXECUCAO_LIMIAR_HP = 0.3

export const BASIC_ATTACK_POWER = 12

/**
 * Bônus que uma habilidade ganha do atributo de escala, quando quem lança é
 * exatamente a média do elenco naquele atributo. Equivale ao antigo
 * ataque * 0.5 para um personagem de ataque médio (19.8 * 0.5 = 9.9).
 */
export const SCALING_BASE = 10

/**
 * Média do elenco em cada atributo, usada para NORMALIZAR a escala.
 *
 * POR QUE NORMALIZAR: a primeira versão disto era um coeficiente fixo por
 * atributo, calibrado por "paridade de arquétipo". Estava errado, e a
 * simulação mostrou: o Vegeta caiu de 81% para 0% de vitória no estágio 2.
 *
 * A causa é que os atributos vivem em escalas numéricas diferentes — ataque
 * vai de 15 a 26, energia de 95 a 170. Todo personagem tem uma reserva de
 * energia grande, inclusive os que não são conjuradores, então qualquer
 * coeficiente que fizesse energia valer a pena para um CONJURADOR fazia
 * energia valer a pena para TODO MUNDO. Trocava "ataque é rei" por "energia
 * é rei", que é o mesmo defeito com outro nome.
 *
 * Normalizando, o bônus deixa de perguntar "quantos pontos você tem" e passa
 * a perguntar "quão acima da média você está NESTE atributo". Aí 26 de ataque
 * (1.31x a média) e 170 de energia (1.38x) valem quase o mesmo, e a escolha
 * de build volta a ser sobre o personagem em vez de sobre qual número é
 * naturalmente maior.
 *
 * Os valores saem do elenco real. Se a média mudar muito com personagens
 * novos, estes números precisam ser revisados junto — por isso estão aqui,
 * num lugar só, e não espalhados.
 *
 * ENERGIA ESTAVA EM 165, e a média real era 123. As outras três batiam com a
 * média a menos de 2%; só essa não. O efeito era silencioso e grande: as três
 * classes que escalam por energia — CONJURADOR, INVOCADOR e SUPORTE, metade
 * do elenco — dividiam por um número 34% maior que o das outras e somavam
 * ~9,5 de bônus por golpe onde ATACANTE e VELOZ somavam ~13. Não era um
 * personagem fraco: era a classe inteira pagando um imposto invisível.
 *
 * O aviso acima já existia e mesmo assim o número envelheceu, porque conferir
 * exigia abrir o banco e fazer a conta à mão. Agora a conta é
 * `npm run balance:referencia`, que compara estes valores com o elenco e
 * mostra o bônus que cada classe de fato recebe.
 */
export const SCALING_REFERENCE: Record<ScalingStat, number> = {
  attack: 19.8,
  defense: 12.4,
  speed: 13.9,
  energy: 123,
}

/**
 * Quanto o dano do dono cresce enquanto o domínio dele está aberto.
 *
 * A primeira versão do domínio dava só o acerto garantido — atravessar escudo
 * e counter. Medindo, isso o deixou ESTREITO DEMAIS: contra um oponente que
 * não se defende ele não valia nada, e como o poder direto tinha caído de ~50
 * para ~30 para pagar pelo estado, abrir o domínio contra alguém desprotegido
 * era estritamente pior que bater. O Sukuna chefe do estágio 8 ficou mais
 * fraco depois da mudança, não mais forte.
 *
 * O erro foi de leitura da obra: dentro do próprio domínio a técnica não só
 * acerta, ela é amplificada — o espaço é do dono. Com +20%, três rodadas
 * pagam de volta o poder que a habilidade perdeu, e o domínio passa a valer a
 * pena SEMPRE, com o acerto garantido como o extra que decide as lutas contra
 * quem se esconde atrás de defesa.
 */
export const DOMAIN_DAMAGE_BONUS = 0.2

export const XP_ON_WIN = 25
export const XP_ON_LOSS = 5

// Fração do xpReward que uma REJOGADA de estágio já concluído paga. Antes era
// 1 (valor cheio, sem limite), o que fazia repetir o mesmo estágio ser o
// caminho mais rápido do jogo. Ver battleXpGained.
export const STORY_REPLAY_XP_RATIO = 0.5
export const XP_PER_LEVEL = 100 // xp needed for level N -> N+1 is N * XP_PER_LEVEL

// A normal AI battle pays XP_ON_WIN/XP_ON_LOSS as-is. Raids multiply by the
// Monster's own `tier` instead (see loadEnemyProfile) — a harder Hollow is
// worth more XP without a separate reward table.
export const NORMAL_BATTLE_XP_MULTIPLIER = 1

export const NPC_WINS_ON_WIN = 1

// Diferença de nível máxima aceita no pareamento de PvP, para cima ou para
// baixo. Com os dois lados escalando por nível, uma diferença grande deixa de
// ser vantagem e vira atropelo — e desistir passa a ser a única jogada
// racional do lado fraco. O custo é esperar mais na fila.
export const PVP_LEVEL_RANGE = 2

// How much an enemy's stats scale per level above 1, used to turn a story
// stage's `enemyLevel` into an actual stat block (see engine.ts's
// scaleForLevel). Story mode is its first caller, but this is combatant
// scaling math, not a story-specific rule.
export const LEVEL_SCALING = 0.12
