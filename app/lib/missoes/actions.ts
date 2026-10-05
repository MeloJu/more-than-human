'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { inicioDoDiaUtc } from '@/app/lib/battle/recompensa'
import { darItens } from '@/app/lib/itens/queries'
import { BONUS_DAS_TRES } from './catalogo'
import { missoesDeHoje } from './queries'

/**
 * Resgata uma missão do dia. Conferido aqui (POST direto): a missão precisa
 * ser uma das três de hoje da conta e estar completa.
 *
 * A TRAVA é o unique de MissaoResgatada (conta, dia, missão): dois cliques
 * tentam a mesma linha, e o segundo falha em vez de pagar de novo. A terceira
 * resgatada paga também o bônus, na mesma transação.
 */
export async function resgatarMissao(missaoId: string): Promise<void> {
  const user = await requireUser()
  const agora = new Date()
  const dia = inicioDoDiaUtc(agora)

  const { missoes } = await missoesDeHoje(user.id, agora)
  const missao = missoes.find((m) => m.id === missaoId)
  if (!missao) redirect('/dashboard?error=missao_invalida')
  if (missao.resgatada) redirect('/dashboard?error=missao_resgatada')
  if (!missao.completa) redirect('/dashboard?error=missao_incompleta')

  const resultado = await prisma
    .$transaction(async (tx) => {
      await tx.missaoResgatada.create({ data: { userId: user.id, dia, missaoId } })
      await tx.user.update({ where: { id: user.id }, data: { coins: { increment: missao.moedas } } })
      const feitas = await tx.missaoResgatada.count({ where: { userId: user.id, dia } })
      if (feitas === missoes.length) await darItens(tx, user.id, [BONUS_DAS_TRES])
      return feitas === missoes.length ? ('bonus' as const) : ('ok' as const)
    })
    .catch((e: unknown) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 'repetida' as const
      throw e
    })
  if (resultado === 'repetida') redirect('/dashboard?error=missao_resgatada')

  revalidatePath('/dashboard')
  redirect(`/dashboard?missao=${missaoId}${resultado === 'bonus' ? '&bonus=1' : ''}`)
}
