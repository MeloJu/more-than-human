import { prisma } from '@/app/lib/prisma'
import { inicioDoDiaUtc } from '@/app/lib/battle/recompensa'

/** O modo de uma luta, pelo que ela tem preenchido (a mesma leitura do resto do jogo). */
export function modoDaLuta(b: { opponentUserId: string | null; raidRunId: string | null; storyStageId: string | null }): string {
  return b.opponentUserId ? 'PvP' : b.raidRunId ? 'Raid' : b.storyStageId ? 'História' : 'Treino'
}

/** Os números da visão geral: o estado do jogo agora. */
export async function visaoGeral(agora: Date = new Date()) {
  const hoje = inicioDoDiaUtc(agora)
  const semana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [contas, contasNaSemana, personagens, lutasDeHoje, lutasAbertas, raidsAtivas, filaPvp, resgatesDiarios, missoesHoje, maisEscolhidos] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: semana } } }),
      prisma.userCharacter.count(),
      prisma.battle.findMany({
        where: { updatedAt: { gte: hoje } },
        select: { opponentUserId: true, raidRunId: true, storyStageId: true },
      }),
      prisma.battle.count({ where: { status: 'ACTIVE' } }),
      prisma.raidRun.count({ where: { status: 'ATIVA' } }),
      prisma.pvpQueue.count(),
      prisma.user.count({ where: { ultimoResgate: { gte: hoje } } }),
      prisma.missaoResgatada.count({ where: { dia: hoje } }),
      prisma.userCharacter.groupBy({ by: ['characterId'], _count: { _all: true }, orderBy: { _count: { characterId: 'desc' } }, take: 8 }),
    ])

  const nomes = await prisma.character.findMany({
    where: { id: { in: maisEscolhidos.map((m) => m.characterId) } },
    select: { id: true, name: true, anime: { select: { name: true } } },
  })
  const porModo: Record<string, number> = {}
  for (const b of lutasDeHoje) porModo[modoDaLuta(b)] = (porModo[modoDaLuta(b)] ?? 0) + 1

  return {
    contas,
    contasNaSemana,
    personagens,
    lutasHoje: lutasDeHoje.length,
    porModo,
    lutasAbertas,
    raidsAtivas,
    filaPvp,
    resgatesDiarios,
    missoesHoje,
    maisEscolhidos: maisEscolhidos.map((m) => {
      const c = nomes.find((n) => n.id === m.characterId)
      return { nome: c?.name ?? '?', universo: c?.anime.name ?? '', quantidade: m._count._all }
    }),
  }
}

/** As contas mais novas, com o personagem em uso. */
export function contasRecentes(quantas = 25) {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: quantas,
    select: {
      id: true,
      username: true,
      role: true,
      coins: true,
      createdAt: true,
      _count: { select: { characters: true } },
      selectedCharacter: { select: { nickname: true, level: true, character: { select: { name: true } } } },
    },
  })
}

/** As lutas em aberto, da mais parada para a mais recente: as travadas aparecem primeiro. */
export function lutasEmAberto(quantas = 20) {
  return prisma.battle.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { updatedAt: 'asc' },
    take: quantas,
    select: {
      id: true,
      updatedAt: true,
      turnNumber: true,
      opponentUserId: true,
      raidRunId: true,
      storyStageId: true,
      user: { select: { id: true, username: true } },
      opponentUser: { select: { username: true } },
      playerCharacter: { select: { nickname: true, character: { select: { name: true } } } },
    },
  })
}

/** As últimas ações de admin, com quem fez. */
export function registroDeAdmin(quantas = 20) {
  return prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: quantas,
    select: { id: true, acao: true, alvo: true, detalhe: true, createdAt: true, admin: { select: { username: true } } },
  })
}

/** Tudo de uma conta, para a página dela. */
export async function contaParaAdmin(userId: string) {
  const [conta, lutas, itens] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        coins: true,
        createdAt: true,
        ultimoResgate: true,
        sequenciaDiaria: true,
        selectedCharacterId: true,
        characters: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            nickname: true,
            level: true,
            experience: true,
            pointsAvailable: true,
            pvpWins: true,
            createdAt: true,
            character: { select: { name: true } },
          },
        },
        itens: { where: { quantidade: { gt: 0 } }, select: { quantidade: true, item: { select: { nome: true, marca: true } } } },
      },
    }),
    prisma.battle.findMany({
      where: { OR: [{ userId }, { opponentUserId: userId }] },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        status: true,
        outcome: true,
        updatedAt: true,
        turnNumber: true,
        userId: true,
        opponentUserId: true,
        raidRunId: true,
        storyStageId: true,
        playerCharacter: { select: { nickname: true } },
        enemyCharacter: { select: { name: true } },
        enemyMonster: { select: { name: true } },
        opponentUser: { select: { username: true } },
      },
    }),
    prisma.item.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ])
  return conta ? { conta, lutas, itens } : null
}
