import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'

type Db = Prisma.TransactionClient | typeof prisma

/** Ordem das raridades, da mais comum à mais rara — para ordenar a mochila. */
export const ORDEM_DA_RARIDADE = { COMUM: 0, RARO: 1, EPICO: 2, LENDARIO: 3 } as const

/**
 * A mochila da conta: o que tem quantidade. Zero não aparece — a linha pode
 * ficar no banco depois de gastar tudo (ver gastarItens), e mostrar "0×"
 * seria ruído.
 */
export async function getMochila(userId: string) {
  const linhas = await prisma.userItem.findMany({
    where: { userId, quantidade: { gt: 0 } },
    include: { item: true },
  })
  return linhas.sort(
    (a, b) =>
      a.item.tipo.localeCompare(b.item.tipo) ||
      ORDEM_DA_RARIDADE[a.item.raridade] - ORDEM_DA_RARIDADE[b.item.raridade] ||
      a.item.nome.localeCompare(b.item.nome)
  )
}

/** O que a loja vende da mochila: os itens com preço (as poções). */
export async function getItensDaLoja(userId: string) {
  const [itens, mochila] = await Promise.all([
    prisma.item.findMany({ where: { preco: { not: null } }, orderBy: { preco: 'asc' } }),
    prisma.userItem.findMany({ where: { userId }, select: { itemId: true, quantidade: true } }),
  ])
  const tenho = new Map(mochila.map((m) => [m.itemId, m.quantidade]))
  return itens.map((item) => ({ ...item, quantidade: tenho.get(item.id) ?? 0 }))
}

/**
 * Soma itens na mochila, por nome do catálogo. Usada pelo loot da raid, dentro
 * da transação da rodada que venceu o andar — o drop e a vitória são gravados
 * juntos ou não são gravados.
 */
export async function darItens(db: Db, userId: string, itens: { nome: string; quantidade: number }[]): Promise<void> {
  if (itens.length === 0) return
  const catalogo = await db.item.findMany({ where: { nome: { in: itens.map((i) => i.nome) } }, select: { id: true, nome: true } })
  for (const { nome, quantidade } of itens) {
    const item = catalogo.find((c) => c.nome === nome)
    if (!item || quantidade <= 0) continue
    await db.userItem.upsert({
      where: { userId_itemId: { userId, itemId: item.id } },
      create: { userId, itemId: item.id, quantidade },
      update: { quantidade: { increment: quantidade } },
    })
  }
}

/**
 * Tira itens da mochila, ATOMICAMENTE: cada débito só acontece se a quantidade
 * cobre (updateMany com `gte`), como o débito de moedas da loja. Falta de
 * qualquer um lança 'FALTA_ITEM' — o chamador roda dentro de uma transação, e
 * o que já tinha sido tirado volta.
 */
export async function gastarItens(db: Db, userId: string, itens: { itemId: string; quantidade: number }[]): Promise<void> {
  for (const { itemId, quantidade } of itens) {
    if (quantidade <= 0) continue
    const tirou = await db.userItem.updateMany({
      where: { userId, itemId, quantidade: { gte: quantidade } },
      data: { quantidade: { decrement: quantidade } },
    })
    if (tirou.count === 0) throw new Error('FALTA_ITEM')
  }
}
