import { Gauge, Registry, collectDefaultMetrics } from 'prom-client'
import { prisma } from '@/app/lib/prisma'
import { inicioDoDiaUtc } from '@/app/lib/battle/recompensa'
import { modoDaLuta } from '@/app/lib/admin/queries'

/**
 * As MÉTRICAS DO APP para o Prometheus (ver app/api/metrics/route.ts).
 *
 * Duas famílias:
 * - as do processo Node, que o prom-client coleta sozinho (memória, heap,
 *   event loop, GC): é o que diz se o app está sofrendo;
 * - as do jogo, lidas do banco NA HORA DA COLETA (lutas em aberto, lutas do
 *   dia, fila do PvP, contas). Ler na coleta, e não contar em cada action,
 *   deixa o número certo mesmo depois de um restart — contador em memória
 *   zeraria a cada deploy.
 *
 * O registro mora no globalThis porque o `next dev` recarrega módulos: sem
 * isso, cada recarga registraria as métricas de novo e o prom-client lança
 * "already registered".
 */

type ComRegistro = typeof globalThis & { __registroDeMetricas?: Registry }

function criarRegistro(): Registry {
  const registro = new Registry()
  collectDefaultMetrics({ register: registro })

  new Gauge({
    name: 'mth_lutas_em_aberto',
    help: 'Lutas em andamento agora, por modo.',
    labelNames: ['modo'],
    registers: [registro],
    async collect() {
      const lutas = await prisma.battle.findMany({
        where: { status: 'ACTIVE' },
        select: { opponentUserId: true, raidRunId: true, storyStageId: true },
      })
      this.reset()
      for (const modo of ['Treino', 'História', 'Raid', 'PvP']) this.set({ modo }, 0)
      for (const b of lutas) this.inc({ modo: modoDaLuta(b) })
    },
  })

  new Gauge({
    name: 'mth_lutas_hoje',
    help: 'Lutas mexidas hoje (dia em UTC), por modo.',
    labelNames: ['modo'],
    registers: [registro],
    async collect() {
      const lutas = await prisma.battle.findMany({
        where: { updatedAt: { gte: inicioDoDiaUtc() } },
        select: { opponentUserId: true, raidRunId: true, storyStageId: true },
      })
      this.reset()
      for (const modo of ['Treino', 'História', 'Raid', 'PvP']) this.set({ modo }, 0)
      for (const b of lutas) this.inc({ modo: modoDaLuta(b) })
    },
  })

  new Gauge({
    name: 'mth_fila_pvp',
    help: 'Jogadores esperando partida na fila do PvP.',
    registers: [registro],
    async collect() {
      this.set(await prisma.pvpQueue.count())
    },
  })

  new Gauge({
    name: 'mth_contas',
    help: 'Contas criadas no total.',
    registers: [registro],
    async collect() {
      this.set(await prisma.user.count())
    },
  })

  new Gauge({
    name: 'mth_personagens',
    help: 'Personagens criados no total.',
    registers: [registro],
    async collect() {
      this.set(await prisma.userCharacter.count())
    },
  })

  return registro
}

export function registroDeMetricas(): Registry {
  const g = globalThis as ComRegistro
  g.__registroDeMetricas ??= criarRegistro()
  return g.__registroDeMetricas
}
