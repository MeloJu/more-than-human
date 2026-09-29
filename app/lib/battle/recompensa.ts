import { prisma } from '@/app/lib/prisma'

/**
 * Recompensa da batalha contra IA.
 *
 * Antes ela pagava 25 de XP fixos e ZERO moedas. Duas consequências: treinar
 * não financiava equipamento, e o XP era inútil depois de alguns níveis —
 * subir do 9 para o 10 custa 900, então 25 por vitória é ruído.
 */

/** Vitórias pagas por dia, por personagem. */
export const VITORIAS_PAGAS_POR_DIA = 5

/**
 * XP e moeda por vitória, MULTIPLICADOS PELO NÍVEL.
 *
 * O valor fixo não funcionava porque o custo de subir de nível cresce
 * linearmente (100 × nível) enquanto a recompensa ficava parada: no nível 10 o
 * jogador precisava de 36 vitórias para um nível, no nível 20 precisava de 72.
 * "Ir treinar antes do chefe" virava esperar uma semana, que não é preparo, é
 * espera.
 *
 * Com a recompensa escalando junto, o teto diário limita o RITMO sem congelar
 * a progressão: cinco vitórias no nível 10 valem cinco vezes mais que no nível
 * 2, e o número de dias por nível fica aproximadamente constante.
 */
export const XP_POR_NIVEL_NA_VITORIA = 25
export const MOEDA_POR_NIVEL_NA_VITORIA = 12

export function recompensaDaVitoria(nivel: number): { xp: number; moedas: number } {
  return {
    xp: XP_POR_NIVEL_NA_VITORIA * nivel,
    moedas: MOEDA_POR_NIVEL_NA_VITORIA * nivel,
  }
}

/**
 * Começo do dia corrente em UTC.
 *
 * O fuso é fixado de propósito e documentado: sem isso, "hoje" mudaria com o
 * relógio do servidor e o jogador perto da meia-noite não teria como saber
 * quando o teto reinicia. UTC é arbitrário, mas é PREVISÍVEL.
 */
export function inicioDoDiaUtc(agora: Date = new Date()): Date {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
}

/**
 * Quantas vitórias contra IA este personagem já teve hoje.
 *
 * A assinatura de uma batalha contra IA é: inimigo é personagem do catálogo,
 * não é monstro, não veio de estágio de história e não tem oponente humano.
 * Contar sobre a tabela Battle que já existe evita uma tabela de contador que
 * poderia divergir do que de fato aconteceu.
 */
export async function vitoriasContraIaHoje(userCharacterId: string, agora?: Date): Promise<number> {
  return prisma.battle.count({
    where: {
      playerCharacterId: userCharacterId,
      status: 'FINISHED',
      outcome: 'PLAYER_WIN',
      enemyCharacterId: { not: null },
      enemyMonsterId: null,
      storyStageId: null,
      opponentUserId: null,
      // A luta de um andar de raid pode ter personagem do elenco como
      // inimigo (o chefe), e não é treino contra IA.
      raidRunId: null,
      updatedAt: { gte: inicioDoDiaUtc(agora) },
    },
  })
}

/**
 * Decide o que uma vitória contra IA paga, respeitando o teto do dia.
 *
 * O TETO CORTA A RECOMPENSA, NÃO A PARTIDA. Bloquear o botão puniria quem
 * perdeu as cinco primeiras lutas do dia, e obrigaria a tela a carregar o
 * contador antes de deixar jogar. Deixar jogar de graça é mais amigável e
 * dispensa estado de UI.
 *
 * `jaVenceuHoje` é a contagem ANTES desta vitória.
 */
export function recompensaComTeto(
  nivel: number,
  jaVenceuHoje: number
): { xp: number; moedas: number; dentroDoTeto: boolean } {
  const dentroDoTeto = jaVenceuHoje < VITORIAS_PAGAS_POR_DIA
  if (!dentroDoTeto) return { xp: 0, moedas: 0, dentroDoTeto: false }
  const { xp, moedas } = recompensaDaVitoria(nivel)
  return { xp, moedas, dentroDoTeto: true }
}
