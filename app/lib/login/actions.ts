'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { recompensaDoDia, situacaoDoResgate, venceuHoje } from './diario'

/**
 * Resgata a recompensa do dia (ver diario.ts). Conferido aqui e não só na
 * tela: a rota é alcançável por POST direto.
 *
 * A TRAVA é o próprio último resgate: a gravação só passa se ele ainda for o
 * que foi lido. Dois cliques (ou duas abas) ao mesmo tempo leem o mesmo valor,
 * e só a primeira gravação o encontra — a outra não paga duas vezes.
 */
export async function resgatarRecompensaDiaria(): Promise<void> {
  const user = await requireUser()
  const agora = new Date()

  const conta = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { ultimoResgate: true, sequenciaDiaria: true, selectedCharacterId: true },
  })
  const situacao = situacaoDoResgate(conta.ultimoResgate, conta.sequenciaDiaria, agora)
  if (situacao.resgatadoHoje) redirect('/dashboard?error=ja_resgatado')
  if (!(await venceuHoje(user.id, agora))) redirect('/dashboard?error=sem_vitoria_hoje')

  const premio = recompensaDoDia(situacao.dia)
  const pagou = await prisma.$transaction(async (tx) => {
    const gravou = await tx.user.updateMany({
      where: { id: user.id, ultimoResgate: conta.ultimoResgate },
      data: { ultimoResgate: agora, sequenciaDiaria: situacao.dia, coins: { increment: premio.moedas } },
    })
    if (gravou.count === 0) return false
    // O ponto do dia 7 vai para o personagem em uso: é ele que joga.
    if (premio.pontos > 0 && conta.selectedCharacterId) {
      await tx.userCharacter.update({
        where: { id: conta.selectedCharacterId },
        data: { pointsAvailable: { increment: premio.pontos } },
      })
    }
    return true
  })
  if (!pagou) redirect('/dashboard?error=ja_resgatado')

  revalidatePath('/dashboard')
  revalidatePath('/status')
  redirect(`/dashboard?resgatado=${situacao.dia}`)
}
