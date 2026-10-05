import { prisma } from '@/app/lib/prisma'
import { inicioDoDiaUtc } from '@/app/lib/battle/recompensa'

/**
 * A RECOMPENSA DIÁRIA: uma sequência de 7 dias, resgatada na Central.
 *
 * Desenho decidido no doc de to-do ("Login diário: o gancho, com uma
 * ressalva"):
 * - O resgate só abre depois da PRIMEIRA VITÓRIA DO DIA — qualquer luta: IA,
 *   história, andar de raid ou PvP. Login puro premiaria quem só abre o site;
 *   assim o gancho continua diário, mas quem resgata jogou.
 * - Faltar um dia zera; depois do dia 7 a sequência volta ao dia 1.
 * - O dia 7 paga um PONTO DE ATRIBUTO, não só moeda: moeda já tem dois ralos
 *   (loja e treino), e o ponto é o recurso que hoje só vem de subir de nível.
 *
 * "Dia" é o mesmo do teto de vitórias da IA (inicioDoDiaUtc): vira à
 * meia-noite UTC, 21h em Brasília.
 */

export const DIAS_DA_SEQUENCIA = 7

/** Moedas de cada dia da sequência, do dia 1 ao 7. */
export const MOEDAS_DO_DIA = [50, 75, 100, 150, 200, 250, 400] as const

const UM_DIA_MS = 24 * 60 * 60 * 1000

export type SituacaoDoResgate = {
  /** Já resgatou hoje: o botão some até amanhã. */
  resgatadoHoje: boolean
  /** O dia (1 a 7) que o próximo resgate paga — ou o que foi resgatado hoje. */
  dia: number
  /** Dias já resgatados no ciclo atual; 0 quando a sequência quebrou. */
  feitos: number
}

/**
 * Em que pé está a sequência, a partir do último resgate e do dia em que ele
 * caiu. A sequência continua se o último resgate foi ontem (ou hoje); antes
 * disso ela quebrou e o próximo é o dia 1.
 */
export function situacaoDoResgate(ultimo: Date | null, sequencia: number, agora: Date = new Date()): SituacaoDoResgate {
  const hoje = inicioDoDiaUtc(agora).getTime()
  if (ultimo && ultimo.getTime() >= hoje) {
    return { resgatadoHoje: true, dia: sequencia, feitos: sequencia }
  }
  const seguida = ultimo !== null && ultimo.getTime() >= hoje - UM_DIA_MS && sequencia < DIAS_DA_SEQUENCIA
  const feitos = seguida ? sequencia : 0
  return { resgatadoHoje: false, dia: feitos + 1, feitos }
}

/** O que o resgate de um dia da sequência paga. */
export function recompensaDoDia(dia: number): { moedas: number; pontos: number } {
  const indice = Math.min(DIAS_DA_SEQUENCIA, Math.max(1, dia)) - 1
  return { moedas: MOEDAS_DO_DIA[indice], pontos: dia === DIAS_DA_SEQUENCIA ? 1 : 0 }
}

/**
 * A conta venceu alguma luta hoje? Qualquer modo conta. No PvP a pessoa pode
 * ser o convidado, e aí a vitória dela é o ENEMY_WIN do motor.
 */
export async function venceuHoje(userId: string, agora: Date = new Date()): Promise<boolean> {
  const vitoria = await prisma.battle.findFirst({
    where: {
      status: 'FINISHED',
      updatedAt: { gte: inicioDoDiaUtc(agora) },
      OR: [
        { userId, outcome: 'PLAYER_WIN' },
        { opponentUserId: userId, outcome: 'ENEMY_WIN' },
      ],
    },
    select: { id: true },
  })
  return vitoria !== null
}
