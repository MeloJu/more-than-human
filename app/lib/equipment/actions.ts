'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'

/**
 * Compra um item da loja.
 *
 * O débito usa updateMany com `coins: { gte: price }` na cláusula where em vez
 * de ler-e-depois-escrever: assim o banco decide, numa única operação atômica,
 * se havia saldo. Duas compras simultâneas não conseguem gastar a mesma moeda
 * duas vezes — é a mesma ideia do turnNumber otimista das batalhas.
 */
export async function buyEquipment(equipmentId: string): Promise<void> {
  const user = await requireUser()

  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { price: true, slot: true, naLoja: true } })
  // Fora da loja (épico, lendário, peça de forja) não se compra — nem por
  // POST direto, que não passa pela tela.
  if (!equipment || !equipment.naLoja) redirect('/shop?error=not_found')

  const alreadyOwned = await prisma.userEquipment.findUnique({
    where: { userId_equipmentId: { userId: user.id, equipmentId } },
    select: { id: true },
  })
  if (alreadyOwned) redirect('/shop?error=already_owned')

  try {
    await prisma.$transaction(async (tx) => {
      const paid = await tx.user.updateMany({
        where: { id: user.id, coins: { gte: equipment.price } },
        data: { coins: { decrement: equipment.price } },
      })
      if (paid.count === 0) throw new Error('INSUFFICIENT_COINS')

      await tx.userEquipment.create({
        data: { userId: user.id, equipmentId, slot: equipment.slot },
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_COINS') redirect('/shop?error=insufficient_coins')
    throw e
  }

  revalidatePath('/shop')
  revalidatePath('/equipment')
  redirect('/shop?bought=1')
}

/**
 * Equipa uma peça no personagem selecionado.
 *
 * Desequipar o que já ocupava o slot faz parte da mesma transação porque o
 * banco tem @@unique([equippedOnId, slot]): sem liberar antes, a troca
 * violaria a constraint no meio do caminho.
 */
export async function equipItem(userEquipmentId: string): Promise<void> {
  const user = await requireUser()

  const owned = await prisma.userEquipment.findFirst({
    where: { id: userEquipmentId, userId: user.id },
    include: { equipment: { select: { requiredLevel: true, name: true } } },
  })
  if (!owned) redirect('/equipment?error=not_owned')

  const selected = await prisma.user.findUnique({
    where: { id: user.id },
    select: { selectedCharacter: { select: { id: true, level: true } } },
  })
  const character = selected?.selectedCharacter
  if (!character) redirect('/equipment?error=no_character')

  if (character.level < owned.equipment.requiredLevel) redirect('/equipment?error=level_too_low')

  await prisma.$transaction(async (tx) => {
    await tx.userEquipment.updateMany({
      where: { equippedOnId: character.id, slot: owned.slot },
      data: { equippedOnId: null },
    })
    await tx.userEquipment.update({ where: { id: userEquipmentId }, data: { equippedOnId: character.id } })
  })

  revalidatePath('/equipment')
  revalidatePath('/dashboard')
  revalidatePath('/status')
  redirect('/equipment')
}

export async function unequipItem(userEquipmentId: string): Promise<void> {
  const user = await requireUser()

  const updated = await prisma.userEquipment.updateMany({
    where: { id: userEquipmentId, userId: user.id },
    data: { equippedOnId: null },
  })
  if (updated.count === 0) redirect('/equipment?error=not_owned')

  revalidatePath('/equipment')
  revalidatePath('/dashboard')
  revalidatePath('/status')
  redirect('/equipment')
}
