import { prisma } from '@/app/lib/prisma'
import { inicioDoDiaUtc } from '@/app/lib/battle/recompensa'
import { missoesDoDia, resumirLutas, type LutaParaMissao, type MissaoDoDia, type TurnoParaMissao } from './catalogo'

/**
 * As lutas de hoje da conta, na perspectiva dela: as que ela começou (IA,
 * história, raid, PvP como host) e as de PvP em que entrou como convidada.
 * "Hoje" é pela última atualização da luta, o mesmo critério do teto de
 * vitórias da IA.
 */
async function lutasDeHoje(userId: string, agora: Date): Promise<LutaParaMissao[]> {
  const lutas = await prisma.battle.findMany({
    where: { updatedAt: { gte: inicioDoDiaUtc(agora) }, OR: [{ userId }, { opponentUserId: userId }] },
    select: {
      userId: true,
      status: true,
      outcome: true,
      raidRunId: true,
      storyStageId: true,
      opponentUserId: true,
      playerCharacter: { select: { character: { select: { anime: { select: { slug: true } } } } } },
      opponentCharacter: { select: { character: { select: { anime: { select: { slug: true } } } } } },
      turns: { select: { result: true } },
    },
  })

  return lutas.map((b) => {
    const souHost = b.userId === userId
    const meuLado = souHost ? 'PLAYER' : 'ENEMY'
    const personagem = souHost ? b.playerCharacter : b.opponentCharacter
    return {
      meuLado,
      venceu: b.status === 'FINISHED' && b.outcome === (souHost ? 'PLAYER_WIN' : 'ENEMY_WIN'),
      modo: b.opponentUserId ? 'pvp' : b.raidRunId ? 'raid' : b.storyStageId ? 'historia' : 'treino',
      universo: personagem?.character.anime.slug ?? '',
      turnos: b.turns.map((t) => t.result as unknown as TurnoParaMissao),
    }
  })
}

export type MissoesDeHoje = {
  missoes: (MissaoDoDia & { resgatada: boolean })[]
  /** As três resgatadas: o bônus já foi pago. */
  todasResgatadas: boolean
}

/** As missões de hoje da conta, com progresso e o que já foi resgatado. */
export async function missoesDeHoje(userId: string, agora: Date = new Date()): Promise<MissoesDeHoje> {
  const dia = inicioDoDiaUtc(agora)
  const [lutas, resgates] = await Promise.all([
    lutasDeHoje(userId, agora),
    prisma.missaoResgatada.findMany({ where: { userId, dia }, select: { missaoId: true } }),
  ])
  const resgatadas = new Set(resgates.map((r) => r.missaoId))
  const missoes = missoesDoDia(userId, dia, resumirLutas(lutas)).map((m) => ({ ...m, resgatada: resgatadas.has(m.id) }))
  return { missoes, todasResgatadas: missoes.every((m) => m.resgatada) }
}
