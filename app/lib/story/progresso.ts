import { prisma } from '@/app/lib/prisma'

/*
  FORA DO ARQUIVO DE ACTIONS de propósito: tudo que um arquivo 'use server'
  exporta vira endereço que o navegador pode chamar. Registrar progresso é
  consequência de uma vitória, não um pedido que o jogador faz.
*/

/**
 * Chamado quando uma batalha termina em vitória. Se ela veio de um estágio do
 * modo história, registra o progresso e paga a moeda.
 *
 * A moeda só é creditada na PRIMEIRA vez. Rejogar um estágio continua valendo
 * o XP normal da batalha, mas não a recompensa — senão o estágio mais rentável
 * viraria uma torneira infinita de dinheiro.
 */
export async function recordStoryProgress(battleId: string): Promise<void> {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    select: {
      userId: true,
      status: true,
      outcome: true,
      playerCharacterId: true,
      storyStageId: true,
      storyStage: { select: { coinReward: true } },
    },
  })
  if (!battle?.storyStageId) return
  // Só vitória TERMINADA conta. A função era uma server action exportada, que
  // o navegador podia chamar com o id de uma luta ainda em andamento (ou
  // perdida) para marcar o estágio como vencido, liberar o próximo e levar
  // as moedas sem lutar.
  if (battle.status !== 'FINISHED' || battle.outcome !== 'PLAYER_WIN') return

  await prisma.$transaction(async (tx) => {
    // createMany + skipDuplicates em vez de upsert para saber, pela contagem,
    // se esta foi mesmo a primeira conclusão — um upsert não distingue.
    const inserted = await tx.userStoryProgress.createMany({
      // O personagem que lutou é quem conclui. Antes gravava só o userId, o
      // que fazia o progresso valer para a conta inteira.
      data: [{ userId: battle.userId, userCharacterId: battle.playerCharacterId, stageId: battle.storyStageId! }],
      skipDuplicates: true,
    })
    if (inserted.count === 0) return

    const coins = battle.storyStage?.coinReward ?? 0
    if (coins > 0) {
      await tx.user.update({ where: { id: battle.userId }, data: { coins: { increment: coins } } })
    }
  })
}
