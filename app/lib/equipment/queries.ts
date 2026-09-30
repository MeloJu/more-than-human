import { prisma } from '@/app/lib/prisma'
import type { EquipmentSlot } from '@prisma/client'
import type { StatBonus } from '@/app/lib/battle/types'

/** Ordem em que os slots aparecem na UI — do mais definidor pro acessório. */
export const SLOT_ORDER: EquipmentSlot[] = ['ARMA', 'TRAJE', 'ACESSORIO']

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  ARMA: 'Arma',
  TRAJE: 'Traje',
  ACESSORIO: 'Acessório',
}

/**
 * Catálogo da loja anotado com o que o usuário já possui.
 *
 * `owned` é derivado aqui em vez de virar coluna: a mesma linha de Equipment
 * é vista de forma diferente por cada usuário, e guardar isso convidaria a
 * dessincronizar do que ele de fato comprou.
 */
export async function getShopCatalog(userId: string) {
  const [items, owned] = await Promise.all([
    // Só o que a loja vende: épico e lendário vêm de drop ou da forja.
    prisma.equipment.findMany({
      where: { naLoja: true },
      orderBy: [{ slot: 'asc' }, { price: 'asc' }],
      include: { grantedSkill: { select: { name: true, power: true, energyCost: true, effects: true } } },
    }),
    prisma.userEquipment.findMany({ where: { userId }, select: { equipmentId: true } }),
  ])

  const ownedIds = new Set(owned.map((o) => o.equipmentId))
  return items.map((item) => ({ ...item, owned: ownedIds.has(item.id) }))
}

/** Inventário da conta, com em quem cada peça está equipada (se estiver). */
export async function getInventory(userId: string) {
  return prisma.userEquipment.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
    include: {
      equipment: {
        include: { grantedSkill: { select: { name: true, power: true, energyCost: true, effects: true } } },
      },
      equippedOn: { select: { id: true, nickname: true } },
    },
  })
}

/** O que está equipado num personagem, indexado por slot. */
export async function getEquippedBySlot(userCharacterId: string) {
  const rows = await prisma.userEquipment.findMany({
    where: { equippedOnId: userCharacterId },
    include: {
      equipment: {
        include: { grantedSkill: { select: { id: true, name: true, power: true, energyCost: true, effects: true } } },
      },
    },
  })
  return new Map(rows.map((r) => [r.slot, r]))
}

/**
 * Bônus de stat somado do equipamento ativo.
 *
 * Devolve o mesmo formato de getTreeBonus de propósito: os dois são somados
 * antes de virar os stats de batalha, então formato idêntico evita conversão
 * no meio do caminho.
 */
export async function getEquipmentBonus(userCharacterId: string): Promise<StatBonus> {
  const rows = await prisma.userEquipment.findMany({
    where: { equippedOnId: userCharacterId },
    select: {
      equipment: {
        select: { flatHpBonus: true, flatAttackBonus: true, flatDefenseBonus: true, flatSpeedBonus: true },
      },
    },
  })
  return rows.reduce<StatBonus>(
    (acc, r) => ({
      ...acc,
      hp: acc.hp + r.equipment.flatHpBonus,
      attack: acc.attack + r.equipment.flatAttackBonus,
      defense: acc.defense + r.equipment.flatDefenseBonus,
      speed: acc.speed + r.equipment.flatSpeedBonus,
    }),
    { hp: 0, attack: 0, defense: 0, speed: 0, energy: 0, stamina: 0 }
  )
}

/** Saldo da carteira da conta. */
export async function getCoins(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } })
  return user?.coins ?? 0
}

/**
 * Skills concedidas pelo equipamento ativo, no formato do motor.
 *
 * Elas entram na batalha POR CIMA dos 4 slots do loadout, não ocupando um
 * deles — é o que faz equipar uma arma valer a pena. Como são derivadas
 * do que está equipado, desequipar remove a skill sem precisar sincronizar
 * nada.
 */
export async function getEquipmentGrantedSkills(userCharacterId: string) {
  const rows = await prisma.userEquipment.findMany({
    where: { equippedOnId: userCharacterId, equipment: { grantedSkillId: { not: null } } },
    select: { equipment: { select: { grantedSkill: true } } },
  })
  return rows.map((r) => r.equipment.grantedSkill).filter((s): s is NonNullable<typeof s> => s !== null)
}
