'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { gastarItens } from '@/app/lib/itens/queries'
import { REFINO_MAXIMO, custoDoRefino, receitaDe, type Custo } from './receitas'

/**
 * Paga um custo da forja dentro de uma transação: materiais pela mochila
 * (débito atômico, ver gastarItens) e moedas pelo saldo (updateMany com
 * `gte`). Faltando qualquer coisa, lança — e a transação inteira volta.
 */
async function pagar(tx: Prisma.TransactionClient, userId: string, custo: Custo): Promise<void> {
  const itens = await tx.item.findMany({
    where: { nome: { in: custo.materiais.map((m) => m.item) } },
    select: { id: true, nome: true },
  })
  await gastarItens(
    tx,
    userId,
    custo.materiais.map((m) => {
      const item = itens.find((i) => i.nome === m.item)
      if (!item) throw new Error('FALTA_ITEM')
      return { itemId: item.id, quantidade: m.quantidade }
    })
  )
  if (custo.moedas > 0) {
    const pagou = await tx.user.updateMany({
      where: { id: userId, coins: { gte: custo.moedas } },
      data: { coins: { decrement: custo.moedas } },
    })
    if (pagou.count === 0) throw new Error('INSUFFICIENT_COINS')
  }
}

function erroDaForja(e: unknown): never {
  if (e instanceof Error && e.message === 'FALTA_ITEM') redirect('/forja?error=falta_material')
  if (e instanceof Error && e.message === 'INSUFFICIENT_COINS') redirect('/forja?error=insufficient_coins')
  if (e instanceof Error && e.message === 'CONFLITO') redirect('/forja?error=conflito')
  throw e
}

/**
 * Forja uma peça pela receita. A receita vem do CÓDIGO (receitaDe), nunca do
 * formulário: o navegador só diz qual peça quer. Uma cópia por conta, como na
 * loja.
 */
export async function forjar(equipamento: string): Promise<void> {
  const user = await requireUser()

  const receita = receitaDe(equipamento)
  const peca = receita ? await prisma.equipment.findUnique({ where: { name: equipamento }, select: { id: true, slot: true } }) : null
  if (!receita || !peca) redirect('/forja?error=not_found')
  if ((await prisma.userEquipment.count({ where: { userId: user.id, equipmentId: peca.id } })) > 0) {
    redirect('/forja?error=already_owned')
  }

  try {
    await prisma.$transaction(async (tx) => {
      await pagar(tx, user.id, receita.custo)
      await tx.userEquipment.create({ data: { userId: user.id, equipmentId: peca.id, slot: peca.slot } })
    })
  } catch (e) {
    erroDaForja(e)
  }

  revalidatePath('/forja')
  revalidatePath('/equipment')
  redirect(`/forja?forjou=${encodeURIComponent(equipamento)}`)
}

/**
 * Refina uma peça da conta em um nível (até REFINO_MAXIMO). O nível sobe só se
 * ainda for o que era na leitura — a trava otimista impede duas abas de
 * refinarem a mesma peça duas vezes pelo preço de uma.
 */
export async function refinar(userEquipmentId: string): Promise<void> {
  const user = await requireUser()

  const minha = await prisma.userEquipment.findFirst({
    where: { id: userEquipmentId, userId: user.id },
    include: { equipment: { select: { name: true, rarity: true } } },
  })
  if (!minha) redirect('/forja?error=not_found')
  if (minha.refino >= REFINO_MAXIMO) redirect('/forja?error=refino_maximo')

  try {
    await prisma.$transaction(async (tx) => {
      await pagar(tx, user.id, custoDoRefino(minha.equipment.rarity, minha.refino + 1))
      const subiu = await tx.userEquipment.updateMany({
        where: { id: minha.id, refino: minha.refino },
        data: { refino: minha.refino + 1 },
      })
      if (subiu.count === 0) throw new Error('CONFLITO')
    })
  } catch (e) {
    erroDaForja(e)
  }

  revalidatePath('/forja')
  revalidatePath('/equipment')
  redirect(`/forja?refinou=${encodeURIComponent(minha.equipment.name)}`)
}
