import type { Andar } from './catalogo'

/** O que um andar vencido deixou: material por nome, e o equipamento do chefe se caiu. */
export type Recompensa = {
  itens: { nome: string; quantidade: number }[]
  equipamento?: string
}

/**
 * O loot de um andar vencido.
 *
 * FUNÇÃO PURA, com a sorte por parâmetro: quem grava é a transação da rodada
 * (ver persistRound), e o teste fixa a sorte para conferir as regras.
 *
 * - Cada material do andar sai entre `min` e `max`, sorteado por igual.
 * - O equipamento do chefe sai com a chance dele, e GARANTIDO na primeira
 *   vitória na raid — o prêmio de quem derrubou o chefe pela primeira vez
 *   não pode depender de sorte.
 * - Equipamento que o jogador já tem não cai de novo: a conta só guarda uma
 *   cópia de cada peça, e um drop repetido seria um prêmio que não chega.
 */
export function sortearLoot(
  andar: Pick<Andar, 'loot' | 'equipamento'>,
  rand: () => number,
  situacao: { primeiraVitoria: boolean; jaTemEquipamento: boolean }
): Recompensa {
  const itens = (andar.loot ?? [])
    .map(({ item, min, max }) => ({ nome: item, quantidade: min + Math.floor(rand() * (max - min + 1)) }))
    .filter((i) => i.quantidade > 0)

  const equip = andar.equipamento
  const caiu = equip && !situacao.jaTemEquipamento && (situacao.primeiraVitoria || rand() < equip.chance)
  return caiu ? { itens, equipamento: equip.nome } : { itens }
}
