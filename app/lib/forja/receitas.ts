/**
 * A forja da Lisbeth: o que se faz com o que a raid deixa cair.
 *
 * MORA EM CÓDIGO, como o catálogo da raid: é regra de jogo (o que custa o
 * quê), não conteúdo que alguém edita. Materiais e equipamentos são citados
 * pelo NOME do catálogo (prisma/catalog/itens.js e equipment.js).
 *
 * Desenho aprovado em 30/09/2026:
 * - RECEITAS: material + moeda viram equipamento que a loja não vende — os
 *   épicos e lendários que saíram dela, e as peças exclusivas da forja.
 * - REFINO: +1 a +3 numa peça que o jogador já tem; cada nível soma
 *   REFINO_POR_NIVEL dos bônus dela.
 */

export type Custo = { materiais: { item: string; quantidade: number }[]; moedas: number }

const EPICO: Custo = {
  materiais: [
    { item: 'Fragmento de Máscara', quantidade: 6 },
    { item: 'Resíduo de Cero', quantidade: 3 },
    { item: 'Garra de Adjuchas', quantidade: 2 },
  ],
  moedas: 250,
}

const LENDARIO: Custo = {
  materiais: [
    { item: 'Fragmento de Máscara', quantidade: 8 },
    { item: 'Garra de Adjuchas', quantidade: 3 },
    { item: 'Núcleo de Vasto Lorde', quantidade: 2 },
    { item: 'Osso da Pantera', quantidade: 1 },
  ],
  moedas: 450,
}

/**
 * As receitas, por nome do equipamento. A Garra da Pantera NÃO está aqui de
 * propósito: é o troféu do Grimmjow, e só sai dele.
 */
export const RECEITAS: { equipamento: string; custo: Custo; exclusiva?: boolean }[] = [
  // Os épicos e lendários que a loja deixou de vender.
  { equipamento: 'Sode no Shirayuki', custo: EPICO },
  { equipamento: 'Shinsō', custo: EPICO },
  { equipamento: 'Senbonzakura', custo: EPICO },
  { equipamento: 'Haori de Capitão', custo: EPICO },
  { equipamento: 'Fragmento de Máscara Hollow', custo: EPICO },
  { equipamento: 'Zangetsu', custo: LENDARIO },
  { equipamento: 'Kyōka Suigetsu', custo: LENDARIO },
  { equipamento: 'Haori do Capitão-Comandante', custo: LENDARIO },
  // Exclusivas da forja.
  {
    equipamento: 'Couraça de Hierro',
    exclusiva: true,
    custo: {
      materiais: [
        { item: 'Garra de Adjuchas', quantidade: 3 },
        { item: 'Resíduo de Cero', quantidade: 2 },
        { item: 'Núcleo de Vasto Lorde', quantidade: 1 },
      ],
      moedas: 300,
    },
  },
  {
    equipamento: 'Dark Repulser',
    exclusiva: true,
    custo: {
      materiais: [
        { item: 'Garra de Adjuchas', quantidade: 4 },
        { item: 'Núcleo de Vasto Lorde', quantidade: 2 },
        { item: 'Osso da Pantera', quantidade: 2 },
      ],
      moedas: 600,
    },
  },
]

export function receitaDe(equipamento: string) {
  return RECEITAS.find((r) => r.equipamento === equipamento)
}

/** Até onde o refino vai. */
export const REFINO_MAXIMO = 3

/** Quanto dos bônus da peça cada nível de refino soma. */
export const REFINO_POR_NIVEL = 0.15

/** Um bônus da peça, já com o refino. */
export function bonusRefinado(valor: number, refino: number): number {
  return Math.round(valor * (1 + REFINO_POR_NIVEL * Math.max(0, Math.min(REFINO_MAXIMO, refino))))
}

/**
 * O custo de levar uma peça ao nível `nivel` de refino (1 a 3). Cresce com o
 * nível e com a raridade: refinar um lendário pede o material do fundo da
 * raid, refinar um comum pede só fragmento.
 */
export function custoDoRefino(raridade: string, nivel: number): Custo {
  const n = Math.max(1, Math.min(REFINO_MAXIMO, nivel))
  switch (raridade) {
    case 'LENDARIO':
      return { materiais: [{ item: 'Garra de Adjuchas', quantidade: 2 * n }, { item: 'Núcleo de Vasto Lorde', quantidade: n }], moedas: 160 * n }
    case 'EPICO':
      return { materiais: [{ item: 'Resíduo de Cero', quantidade: 2 * n }, { item: 'Garra de Adjuchas', quantidade: n }], moedas: 100 * n }
    case 'RARO':
      return { materiais: [{ item: 'Fragmento de Máscara', quantidade: 2 * n }, { item: 'Resíduo de Cero', quantidade: n }], moedas: 60 * n }
    default:
      return { materiais: [{ item: 'Fragmento de Máscara', quantidade: 2 * n }], moedas: 30 * n }
  }
}
