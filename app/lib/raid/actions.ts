'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { precoDoContrato, validarContratos } from '@/app/lib/battle/party'
import { raidPorSlug } from './catalogo'
import { montarAndar, type Contrato } from './montagem'
import type { Reserva } from './andares'

/**
 * Cria a batalha do andar atual da incursão, dentro da transação recebida.
 *
 * Uma função só para a entrada (andar 0) e para cada andar seguinte: o que
 * muda entre eles é só com que vida a party chega, e isso já está na
 * incursão.
 */
async function criarBatalhaDoAndar(
  tx: Prisma.TransactionClient,
  run: { id: string; userId: string; raid: string; andar: number; contratados: Prisma.JsonValue; reservas: Prisma.JsonValue },
  userCharacter: Parameters<typeof montarAndar>[0]['userCharacter']
) {
  const raid = raidPorSlug(run.raid)
  const andar = raid?.andares[run.andar]
  if (!raid || !andar) throw new Error(`Andar inexistente: ${run.raid} #${run.andar}`)

  const montado = await montarAndar({
    userCharacter,
    andar,
    contratos: run.contratados as unknown as Contrato[],
    reservas: run.reservas as unknown as Reserva[] | null,
  })

  return tx.battle.create({
    data: {
      userId: run.userId,
      playerCharacterId: userCharacter.id,
      ...montado.principal,
      raidRunId: run.id,
      andar: run.andar,
      status: 'ACTIVE',
      turnNumber: 1,
      state: montado.state as unknown as Prisma.InputJsonValue,
      participantes: { create: montado.participantes },
    },
  })
}

/**
 * Entra na raid: confere nível e contratos, cobra os contratos e já cria a
 * batalha do primeiro andar — tudo numa transação. Sem moedas, não há
 * incursão; não existe o caso "paguei e fiquei do lado de fora".
 */
export async function entrarNaRaid(userCharacterId: string, slug: string, dados?: FormData): Promise<never> {
  const user = await requireUser()

  const userCharacter = await prisma.userCharacter.findFirst({
    where: { id: userCharacterId, userId: user.id },
    include: { character: true },
  })
  if (!userCharacter) redirect('/select')

  const raid = raidPorSlug(slug)
  if (!raid) redirect('/battle/raid?error=not_found')
  // Revalidado aqui, e não só na tela: server action é fronteira de confiança.
  if (userCharacter.level < raid.nivelMinimo) redirect('/battle/raid?error=tier_locked')

  const emAndamento = await prisma.raidRun.findFirst({
    where: { userCharacterId, status: 'ATIVA' },
    select: { id: true },
  })
  if (emAndamento) redirect('/battle/raid')

  const pedidos = (dados?.getAll('aliado') ?? []).filter((v): v is string => typeof v === 'string')
  const mercado = await prisma.character.findMany({ select: { id: true } })
  const conferido = validarContratos(pedidos, {
    disponiveis: new Set(mercado.map((c) => c.id)),
    proprioCharacterId: userCharacter.characterId,
  })
  if (!conferido.ok) redirect(`/battle/raid?error=${conferido.erro}`)

  // No nível do jogador — ver app/lib/battle/party.ts.
  const contratos: Contrato[] = conferido.ids.map((characterId) => ({
    characterId,
    nivel: userCharacter.level,
    custo: precoDoContrato(userCharacter.level),
  }))
  const custoTotal = contratos.reduce((s, c) => s + c.custo, 0)

  const batalha = await prisma
    .$transaction(async (tx) => {
      if (custoTotal > 0) {
        // Débito condicional: dois cliques ao mesmo tempo não pagam com o
        // mesmo saldo, porque a condição é conferida na própria escrita.
        const pago = await tx.user.updateMany({
          where: { id: user.id, coins: { gte: custoTotal } },
          data: { coins: { decrement: custoTotal } },
        })
        if (pago.count === 0) throw new Error('SEM_MOEDAS')
      }
      const run = await tx.raidRun.create({
        data: {
          userId: user.id,
          userCharacterId,
          raid: raid.slug,
          contratados: contratos as unknown as Prisma.InputJsonValue,
        },
      })
      return criarBatalhaDoAndar(tx, run, userCharacter)
    })
    .catch((e: unknown) => {
      if (e instanceof Error && e.message === 'SEM_MOEDAS') return null
      throw e
    })
  // O redirect fica FORA da transação: ele lança para interromper a action,
  // e dentro dela seria lido como falha e desfaria a gravação.
  if (!batalha) redirect('/battle/raid?error=sem_moedas')

  revalidatePath('/battle/raid')
  redirect(`/battle/ai/${batalha.id}`)
}

/**
 * Sobe para o andar seguinte, com a party como saiu do anterior.
 *
 * O avanço em si (andar e reservas) já foi gravado quando a luta do andar
 * terminou; aqui só nasce a batalha nova. Se ela já existir — duplo clique,
 * outra aba —, o jogador é levado para ela em vez de ganhar uma segunda.
 */
export async function seguirNaRaid(runId: string): Promise<never> {
  const user = await requireUser()

  const run = await prisma.raidRun.findFirst({
    where: { id: runId, userId: user.id, status: 'ATIVA' },
    include: { userCharacter: { include: { character: true } } },
  })
  if (!run) redirect('/battle/raid')

  const jaExiste = await prisma.battle.findFirst({
    where: { raidRunId: run.id, andar: run.andar },
    select: { id: true, status: true },
  })
  if (jaExiste) redirect(`/battle/ai/${jaExiste.id}`)

  const batalha = await prisma.$transaction((tx) => criarBatalhaDoAndar(tx, run, run.userCharacter))
  revalidatePath('/battle/raid')
  redirect(`/battle/ai/${batalha.id}`)
}

/**
 * Desiste da incursão. Os contratos não voltam: foram pagos pela raid, e a
 * party lutou até aqui.
 */
export async function desistirDaRaid(runId: string): Promise<never> {
  const user = await requireUser()
  await prisma.$transaction([
    prisma.raidRun.updateMany({ where: { id: runId, userId: user.id, status: 'ATIVA' }, data: { status: 'PERDIDA' } }),
    // A luta do andar em curso, se houver, termina junto — senão ficaria uma
    // batalha ativa apontando para uma raid que já acabou.
    prisma.battle.updateMany({
      where: { raidRunId: runId, userId: user.id, status: 'ACTIVE' },
      data: { status: 'FINISHED', outcome: 'ENEMY_WIN' },
    }),
  ])
  revalidatePath('/battle/raid')
  redirect('/battle/raid')
}
