import type { Postura } from './types'

/**
 * O que vem do formulário de cada golpe (ver PainelDeAcoes): a postura e o
 * alvo, em campos escondidos. Vem do navegador, então tudo é conferido —
 * usado pelas actions da luta contra a IA e do PvP.
 */

const POSTURAS: readonly Postura[] = ['NEUTRA', 'ESQUIVA', 'APARAR', 'GUARDA', 'IMPETO']

/** A postura enviada com o golpe. Valor desconhecido vira a neutra. */
export function posturaDoFormulario(dados?: FormData): Postura {
  const valor = dados?.get('postura')
  return POSTURAS.find((p) => p === valor) ?? 'NEUTRA'
}

/**
 * O alvo enviado com o golpe, como índice no lado OPOSTO (que tem
 * `tamanhoDoOutroLado` posições). Fora do intervalo ou ausente vira
 * undefined, e o motor manda o golpe para o primeiro de pé.
 */
export function alvoDoFormulario(dados: FormData | undefined, tamanhoDoOutroLado: number): number | undefined {
  const valor = dados?.get('alvo')
  if (typeof valor !== 'string') return undefined
  const n = Number(valor)
  return Number.isInteger(n) && n >= 0 && n < tamanhoDoOutroLado ? n : undefined
}
