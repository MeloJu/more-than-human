/**
 * Quem pode entrar em qual tier de raid.
 *
 * POR QUE O MONSTRO DE RAID NÃO ESCALA COM O NÍVEL DO JOGADOR.
 *
 * Até aqui a raid tinha um monstro só (o Hollow, escrito à mão em
 * `startRaidBattle`), e ele era escalado por `computeFighterStats(monster,
 * nivelDoJogador, ...)` para não virar passeio no nível 30. Com um monstro só
 * isso era o certo a fazer, e o próprio código dizia ser paliativo.
 *
 * Com quatro tiers, escalar deixa de funcionar — e não por gosto, por
 * medição. Se os dois lados crescem pelo mesmo `LEVEL_SCALING`, a razão entre
 * eles nunca muda, e o nível deixa de significar qualquer coisa. Simulado com
 * 200 amostras por célula, ataque básico dos dois lados:
 *
 *   nível  Hollow  Menos  Adjuchas  Vasto Lorde   <- monstro ESCALADO
 *       1    100%    85%        0%           0%
 *      10    100%    93%        0%           0%
 *      30    100%   100%        0%           0%
 *
 * Adjuchas é impossível no nível 1 e continua impossível no nível 30. Subir
 * de nível não aproxima ninguém de tier nenhum: a escada não é uma escada.
 *
 * Com stats FIXOS, a mesma simulação vira progressão de verdade:
 *
 *   nível  Hollow  Menos  Adjuchas  Vasto Lorde   <- monstro FIXO
 *       1    100%    85%        0%           0%
 *       3    100%   100%        4%           0%
 *       5    100%   100%      100%           0%
 *       8    100%   100%      100%         100%
 *
 * É o que `tier` sempre quis dizer, e o motivo de o campo existir no schema
 * desde o começo com o comentário "future difficulty/progression gate".
 */

/**
 * Nível em que cada tier deixa de ser impossível.
 *
 * Saem da tabela de monstro fixo acima: é o primeiro nível medido em que a
 * luta passa de perdida para vencível. O portão é GUARDA-CORPO, não ajuste de
 * dificuldade — ele existe para ninguém gastar uma tarde num Vasto Lorde
 * matematicamente invencível, não para garantir que a luta seja justa.
 *
 * Que a luta vire fácil logo depois de liberada (0% para 100% em dois níveis)
 * é problema dos MONSTROS, não do portão: os quatro dividem uma habilidade só
 * (`basicClaw`), então tier hoje é só uma barra de vida maior. Isso se
 * resolve dando kit próprio a cada um — está no plano, e é a próxima etapa da
 * raid.
 *
 * A medição usou ataque básico dos dois lados. O jogador real chega com até 4
 * habilidades e o monstro continua com uma, então na prática ele vence um
 * pouco mais cedo do que a tabela diz — o que é seguro, porque erra para o
 * lado de destravar tarde, não cedo.
 */
export const NIVEL_MINIMO_POR_TIER: Record<number, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
}

/**
 * Tier desconhecido é tratado como o mais alto já mapeado, não como liberado.
 *
 * Um monstro novo entra no catálogo antes de alguém pensar no portão dele, e
 * o padrão seguro nesse intervalo é ficar trancado para quem é de nível
 * baixo, não abrir para todo mundo.
 */
export function nivelMinimoDoTier(tier: number): number {
  const mapeado = NIVEL_MINIMO_POR_TIER[tier]
  if (mapeado !== undefined) return mapeado
  return Math.max(...Object.values(NIVEL_MINIMO_POR_TIER))
}

export function tierLiberado(tier: number, nivelDoJogador: number): boolean {
  return nivelDoJogador >= nivelMinimoDoTier(tier)
}
