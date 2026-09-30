import { ehLutador } from '@/app/lib/battle/invocacoes'
import type { BattleState, CombatantState, Outcome } from '@/app/lib/battle/types'

/**
 * O que atravessa de um andar para o outro, e como a incursão anda.
 *
 * Funções puras: quem grava é app/lib/raid/actions.ts. Separadas para serem
 * testadas sem banco — a regra de "não reseta" é a identidade da raid, e
 * errar nela (curar sem querer entre andares) apagaria a raid sem nenhum
 * teste de tela perceber.
 */

/** Como um lutador da party sai de um andar. */
export type Reserva = { hp: number; energia: number; stamina: number }

/**
 * Fotografa a party no fim do andar, por posição. As invocações ficam: são
 * chamadas de novo a cada andar, e moram depois dos lutadores no array, então
 * tirá-las não mexe na posição de ninguém.
 */
export function reservasDoTime(aliados: CombatantState[]): Reserva[] {
  return aliados.filter(ehLutador).map((c) => ({
    hp: Math.max(0, c.currentHp),
    energia: Math.max(0, c.currentEnergy),
    stamina: Math.max(0, c.currentStamina ?? 0),
  }))
}

/**
 * Leva a party para o andar seguinte do jeito que ela saiu do anterior.
 *
 * NADA É RECUPERADO: nem vida, nem energia, nem stamina, e quem caiu continua
 * caído. A forma ativa e os efeitos não atravessam — cada andar é uma luta
 * nova, e carregar um Bankai de graça pelo corredor seria um andar a menos de
 * custo de manutenção.
 *
 * Os valores são limitados ao máximo de agora: se o personagem subiu de nível
 * no meio da raid, o máximo cresceu, mas o que ele tinha não.
 */
export function comReservas(state: BattleState, reservas: Reserva[] | null | undefined): BattleState {
  if (!reservas) return state
  return {
    ...state,
    aliados: state.aliados.map((c, i) => {
      const r = reservas[i]
      if (!r) return c
      return {
        ...c,
        currentHp: Math.min(c.maxHp, r.hp),
        currentEnergy: Math.min(c.maxEnergy, r.energia),
        currentStamina: Math.min(c.maxStamina ?? 0, r.stamina),
      }
    }),
  }
}

export type Avanco =
  | { status: 'ATIVA'; andar: number }
  | { status: 'VENCIDA'; andar: number }
  | { status: 'PERDIDA'; andar: number }

/**
 * Para onde a incursão vai depois do andar `andar` terminar com `outcome`.
 *
 * Só a vitória avança. Empate conta como derrota: o andar não foi limpo, e a
 * party não tem como passar por inimigos de pé.
 */
export function avancar(andar: number, totalDeAndares: number, outcome: Outcome): Avanco {
  if (outcome !== 'PLAYER_WIN') return { status: 'PERDIDA', andar }
  if (andar + 1 >= totalDeAndares) return { status: 'VENCIDA', andar }
  return { status: 'ATIVA', andar: andar + 1 }
}

/**
 * Moedas por nível ao vencer a raid inteira.
 *
 * O bônus é o que paga a raid: os andares dão XP como qualquer luta, mas só
 * quem chega ao fim leva as moedas. Dez vezes o que uma vitória de treino
 * rende, porque são cinco lutas seguidas sem descanso — e é a moeda que
 * compra os contratos da próxima.
 */
export const MOEDA_POR_NIVEL_NA_RAID = 120

export function recompensaDaRaid(nivel: number): number {
  return MOEDA_POR_NIVEL_NA_RAID * Math.max(1, nivel)
}
