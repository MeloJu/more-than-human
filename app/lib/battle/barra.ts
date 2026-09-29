/**
 * As regras da barra de recurso que escorre (ver StatBar). Separadas do
 * componente para serem testadas sem montar React.
 */

/**
 * Quanto tempo a barra leva para escorrer, em segundos, pela fração da
 * reserva que se perdeu. Um arranhão passa rápido; um golpe devastador se
 * arrasta — é o tempo que faz o golpe pesar na tela. Teto de 1,6s para a
 * rodada não ficar esperando a animação.
 */
export function duracaoDaQueda(fracaoPerdida: number): number {
  return Math.min(1.6, 0.5 + Math.max(0, fracaoPerdida) * 2)
}

/** A cor da barra de vida pela fração que resta: a regra do Pokémon. */
export function corDaVida(fracao: number): string {
  if (fracao > 0.5) return '#22c55e'
  if (fracao > 0.2) return '#f59e0b'
  return '#ef4444'
}
