import { ATRIBUTOS, colunaDe } from './atributos'

/**
 * Redistribuir: devolver todos os pontos de atributo para serem gastos de novo.
 *
 * POR QUE EXISTE. Os pontos são guardados como ALOCAÇÃO, e o quanto cada um
 * vale mora numa tabela (ATRIBUTO_POR_PONTO). Isso é o que deixa o
 * balanceamento reajustar todo mundo de uma vez — e é também o que fez quem
 * tinha investido em ataque perder metade do ganho quando o ataque passou a
 * render 1 por ponto em vez de 2, sem ter como desfazer a escolha. Toda
 * mudança de balanceamento vai fazer isso com alguém; a saída é deixar a
 * pessoa refazer.
 *
 * Devolve TUDO, ponto de nível e ponto treinado juntos. Na batalha os dois
 * valem exatamente o mesmo (ver treino.ts), então separá-los aqui só criaria
 * uma distinção que o jogo não tem.
 */

/**
 * Preço de redistribuir depois da primeira vez.
 *
 * A PRIMEIRA É DE GRAÇA porque ela existe para consertar uma mudança que o
 * jogador não escolheu. As seguintes cobram para a escolha continuar sendo
 * escolha: de graça, o certo seria refazer a build antes de cada luta,
 * conforme o adversário — e aí atributo deixaria de ser identidade do
 * personagem. 150 é pouco mais que uma vitória contra IA no nível 10.
 */
export const REDISTRIBUICAO_CUSTO = 150

export function custoDaRedistribuicao(feitas: number): number {
  return feitas === 0 ? 0 : REDISTRIBUICAO_CUSTO
}

/** Quantos pontos estão investidos em atributo, somando todas as colunas. */
export function pontosAlocados(personagem: Record<string, unknown>): number {
  return ATRIBUTOS.reduce((soma, a) => soma + Number(personagem[colunaDe(a)] ?? 0), 0)
}

/** Os dados que zeram todas as colunas de alocação. */
export function alocacoesZeradas(): Record<ReturnType<typeof colunaDe>, number> {
  return Object.fromEntries(ATRIBUTOS.map((a) => [colunaDe(a), 0])) as Record<ReturnType<typeof colunaDe>, number>
}
