'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'

/**
 * Compra UM item da loja (uma poção). O débito de moedas é atômico como o do
 * equipamento (updateMany com `gte`), e a mochila soma na mesma transação.
 * Item sem preço (material) não se compra — nem por POST direto.
 */
export async function comprarItem(itemId: string): Promise<void> {
  const user = await requireUser()

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { preco: true } })
  if (!item || item.preco === null) redirect('/shop?error=not_found')
  const preco = item.preco

  try {
    await prisma.$transaction(async (tx) => {
      const pagou = await tx.user.updateMany({
        where: { id: user.id, coins: { gte: preco } },
        data: { coins: { decrement: preco } },
      })
      if (pagou.count === 0) throw new Error('INSUFFICIENT_COINS')
      await tx.userItem.upsert({
        where: { userId_itemId: { userId: user.id, itemId } },
        create: { userId: user.id, itemId, quantidade: 1 },
        update: { quantidade: { increment: 1 } },
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_COINS') redirect('/shop?error=insufficient_coins')
    throw e
  }

  revalidatePath('/shop')
  redirect('/shop?item=1')
}
