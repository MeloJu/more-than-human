'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { publishPvpEvent } from '@/app/lib/pvp/events'
import { requireAdmin } from './guard'

/**
 * Os COMANDOS da área de admin. Cada um é uma ação específica, conferida e
 * registrada em AdminLog na mesma transação — nada de rodar script ou SQL
 * solto pela web. O que é destrutivo de verdade (seed, apagar conta) fica de
 * fora de propósito: um botão que apaga o banco não pode existir no site.
 *
 * Os valores vêm de formulário, então cada um tem limite: um zero a mais
 * digitado sem querer não vira um milhão de moedas.
 */

const LIMITE_DE_MOEDAS = 100_000
const LIMITE_DE_ITENS = 99
const LIMITE_DE_PONTOS = 20

function inteiro(dados: FormData, campo: string): number {
  const n = Number(dados.get(campo))
  return Number.isInteger(n) ? n : NaN
}

function motivo(dados: FormData): string {
  return String(dados.get('motivo') ?? '').trim().slice(0, 200)
}

const voltarPara = (userId: string, codigo: string): never => redirect(`/admin/contas/${userId}?ok=${codigo}`)
const falhar = (userId: string, codigo: string): never => redirect(`/admin/contas/${userId}?error=${codigo}`)

/**
 * Dá (ou tira, com valor negativo) moedas de uma conta. Tirar nunca deixa o
 * saldo negativo: o débito só passa se o saldo cobre.
 */
export async function darMoedas(userId: string, dados: FormData): Promise<void> {
  const admin = await requireAdmin()
  const quantidade = inteiro(dados, 'quantidade')
  if (!quantidade || Math.abs(quantidade) > LIMITE_DE_MOEDAS) return falhar(userId, 'quantidade')

  const feito = await prisma.$transaction(async (tx) => {
    const conta = await tx.user.updateMany({
      where: { id: userId, ...(quantidade < 0 ? { coins: { gte: -quantidade } } : {}) },
      data: { coins: { increment: quantidade } },
    })
    if (conta.count === 0) return false
    await tx.adminLog.create({
      data: { adminId: admin.id, acao: 'dar_moedas', alvo: userId, detalhe: { quantidade, motivo: motivo(dados) } },
    })
    return true
  })
  if (!feito) return falhar(userId, 'saldo')

  revalidatePath(`/admin/contas/${userId}`)
  voltarPara(userId, 'moedas')
}

/** Põe itens do catálogo na mochila de uma conta. */
export async function darItem(userId: string, dados: FormData): Promise<void> {
  const admin = await requireAdmin()
  const itemId = String(dados.get('itemId') ?? '')
  const quantidade = inteiro(dados, 'quantidade')
  if (!quantidade || quantidade < 1 || quantidade > LIMITE_DE_ITENS) return falhar(userId, 'quantidade')
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, nome: true } })
  if (!item) return falhar(userId, 'item')

  await prisma.$transaction([
    prisma.userItem.upsert({
      where: { userId_itemId: { userId, itemId: item.id } },
      create: { userId, itemId: item.id, quantidade },
      update: { quantidade: { increment: quantidade } },
    }),
    prisma.adminLog.create({
      data: { adminId: admin.id, acao: 'dar_item', alvo: userId, detalhe: { item: item.nome, quantidade, motivo: motivo(dados) } },
    }),
  ])

  revalidatePath(`/admin/contas/${userId}`)
  voltarPara(userId, 'item')
}

/** Dá pontos de atributo a um personagem da conta. */
export async function darPontos(userId: string, userCharacterId: string, dados: FormData): Promise<void> {
  const admin = await requireAdmin()
  const quantidade = inteiro(dados, 'quantidade')
  if (!quantidade || quantidade < 1 || quantidade > LIMITE_DE_PONTOS) return falhar(userId, 'quantidade')

  const feito = await prisma.$transaction(async (tx) => {
    // O personagem tem que ser DESTA conta: o id vem do formulário.
    const uc = await tx.userCharacter.updateMany({
      where: { id: userCharacterId, userId },
      data: { pointsAvailable: { increment: quantidade } },
    })
    if (uc.count === 0) return false
    await tx.adminLog.create({
      data: { adminId: admin.id, acao: 'dar_pontos', alvo: userCharacterId, detalhe: { conta: userId, quantidade, motivo: motivo(dados) } },
    })
    return true
  })
  if (!feito) return falhar(userId, 'personagem')

  revalidatePath(`/admin/contas/${userId}`)
  voltarPara(userId, 'pontos')
}

/**
 * Encerra uma luta travada como EMPATE, sem pagar nada a ninguém. Serve para
 * a luta que ficou aberta (aba fechada, PvP abandonado) e prende o jogador:
 * enquanto ela existe, a fila do PvP e a raid mandam ele de volta para ela.
 */
export async function encerrarLuta(battleId: string, dados: FormData): Promise<void> {
  const admin = await requireAdmin()
  // Para onde voltar vem do formulário: só um caminho da própria área de admin.
  const destino = String(dados.get('voltar') ?? '')
  const voltar = destino.startsWith('/admin') ? destino : '/admin'

  const luta = await prisma.battle.findUnique({ where: { id: battleId }, select: { status: true, opponentUserId: true, userId: true } })
  if (!luta || luta.status !== 'ACTIVE') redirect(`${voltar}?error=luta`)

  await prisma.$transaction([
    prisma.battle.update({
      where: { id: battleId },
      data: { status: 'FINISHED', outcome: 'DRAW', pendingHostAction: Prisma.DbNull, pendingOpponentAction: Prisma.DbNull },
    }),
    prisma.adminLog.create({
      data: { adminId: admin.id, acao: 'encerrar_luta', alvo: battleId, detalhe: { conta: luta.userId, pvp: Boolean(luta.opponentUserId), motivo: motivo(dados) } },
    }),
  ])
  // No PvP, os dois jogadores com a luta aberta recarregam e veem o fim.
  if (luta.opponentUserId) publishPvpEvent(battleId, { type: 'BATTLE_FINISHED' })

  revalidatePath('/admin')
  redirect(`${voltar}?ok=luta`)
}

/** Esvazia a fila do PvP: quem estava esperando volta ao lobby. */
export async function limparFilaPvp(): Promise<void> {
  const admin = await requireAdmin()
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.pvpQueue.deleteMany({})
    await tx.adminLog.create({ data: { adminId: admin.id, acao: 'limpar_fila_pvp', detalhe: { removidos: count } } })
  })
  revalidatePath('/admin')
  revalidatePath('/battle/pvp')
  redirect('/admin?ok=fila')
}
