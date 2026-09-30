'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { getEligiblePlayerSkills } from '@/app/lib/battle/queries'
import { TAMANHO_DO_TIME, pokemonDoKit } from '@/app/lib/battle/invocacoes'
import { getLoadoutSlotCount } from './constants'
import { ATRIBUTO_POR_PONTO, colunaDe, ehAtributo } from './atributos'
import { custoDoTreino } from './treino'
import { alocacoesZeradas, custoDaRedistribuicao, pontosAlocados } from './redistribuicao'
import { getSelectedCharacter } from './queries'
import { autoFillLoadout } from './loadout'

export async function selectCharacter(formData: FormData): Promise<void> {
  const user = await requireUser()
  const userCharacterId = String(formData.get('userCharacterId'))
  // O personagem tem que ser DESTE usuário. Sem a conferência, um POST com o
  // id de outro jogador selecionava o personagem dele: a Central e o Status
  // passavam a mostrar a ficha de outra conta.
  const meu = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId: user.id }, select: { id: true } })
  if (!meu) redirect('/select')
  await prisma.user.update({ where: { id: user.id }, data: { selectedCharacterId: meu.id } })
  redirect('/dashboard')
}

export async function createCharacter(formData: FormData): Promise<void> {
  const user = await requireUser()
  const characterId = String(formData.get('characterId'))
  const nickname = String(formData.get('nickname') || '').trim() || 'Hero'

  // Atomic: a UserCharacter that got created but never became selected (or
  // never got its starter loadout) would leave the player stuck. redirect()
  // throws, so it happens strictly after the transaction resolves — inside
  // it, that throw would trigger a rollback instead of a clean redirect.
  await prisma.$transaction(async (tx) => {
    const uc = await tx.userCharacter.create({ data: { userId: user.id, characterId, nickname }, select: { id: true } })
    await tx.user.update({ where: { id: user.id }, data: { selectedCharacterId: uc.id } })
    await autoFillLoadout(uc.id, characterId, 1, tx)
  })

  redirect('/dashboard')
}

export async function unlockSkillNode(userCharacterId: string, nodeId: string): Promise<void> {
  const user = await requireUser()

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId: user.id } })
  if (!userCharacter) redirect('/status?error=not_found')

  const node = await prisma.skillTreeNode.findUnique({ where: { id: nodeId }, include: { prerequisites: true } })
  if (!node || node.characterId !== userCharacter.characterId) redirect('/status?error=invalid_node')

  const existingUnlock = await prisma.userSkillUnlock.findUnique({
    where: { userCharacterId_nodeId: { userCharacterId, nodeId } },
  })
  if (existingUnlock) redirect('/status')

  if (userCharacter.pointsAvailable < node.pointCost) redirect('/status?error=insufficient_points')

  if (node.prerequisites.length > 0) {
    const unlockedPrereqs = await prisma.userSkillUnlock.findMany({
      where: { userCharacterId, nodeId: { in: node.prerequisites.map((p) => p.id) } },
      select: { nodeId: true },
    })
    const unlockedIds = new Set(unlockedPrereqs.map((u) => u.nodeId))
    const allMet = node.prerequisites.every((p) => unlockedIds.has(p.id))
    if (!allMet) redirect('/status?error=missing_prerequisite')
  }

  await prisma.$transaction([
    prisma.userSkillUnlock.create({ data: { userCharacterId, nodeId } }),
    prisma.userCharacter.update({ where: { id: userCharacterId }, data: { pointsAvailable: { decrement: node.pointCost } } }),
  ])

  // If this node grants a skill and a loadout slot is free, equip it automatically.
  await autoFillLoadout(userCharacterId, userCharacter.characterId, userCharacter.level)

  revalidatePath('/status')
}

// Bound as equipSkill.bind(null, userCharacterId, slot) on a <form> whose
// <select name="skillId"> supplies the one remaining piece of data - Next
// server actions fold any params past the bound ones into a single FormData.
export async function equipSkill(userCharacterId: string, slot: number, formData: FormData): Promise<void> {
  const user = await requireUser()

  const skillId = String(formData.get('skillId') || '')
  if (!skillId) redirect('/status?error=invalid_skill')

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId: user.id } })
  if (!userCharacter) redirect('/status?error=not_found')

  if (!Number.isInteger(slot) || slot < 0 || slot >= getLoadoutSlotCount(userCharacter.level)) redirect('/status?error=invalid_slot')

  const eligible = await getEligiblePlayerSkills(userCharacterId, userCharacter.characterId, userCharacter.level)
  if (!eligible[skillId]) redirect('/status?error=invalid_skill')

  await prisma.$transaction([
    // Clear whatever currently occupies this slot, and clear this skill from
    // any other slot it might already be equipped in, before placing it here.
    prisma.userCharacterEquippedSkill.deleteMany({ where: { userCharacterId, OR: [{ slot }, { skillId }] } }),
    prisma.userCharacterEquippedSkill.create({ data: { userCharacterId, skillId, slot } }),
  ])

  revalidatePath('/status')
}

/**
 * Grava o time de um treinador (o Red): até TAMANHO_DO_TIME Pokémon, só os
 * que o nível já libera. A ordem é a da tela — o primeiro abre a luta.
 */
export async function salvarTime(userCharacterId: string, formData: FormData): Promise<void> {
  const user = await requireUser()

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId: user.id } })
  if (!userCharacter) redirect('/status?error=not_found')

  const eligible = await getEligiblePlayerSkills(userCharacterId, userCharacter.characterId, userCharacter.level)
  const disponiveis = pokemonDoKit(Object.values(eligible))
  const pedidos = formData.getAll('pokemon').map(String)
  const time = [...new Set(pedidos)]
  if (time.length === 0 || time.length > TAMANHO_DO_TIME || time.some((id) => !disponiveis.includes(id))) {
    redirect('/status?error=time_invalido')
  }

  await prisma.userCharacter.update({ where: { id: userCharacter.id }, data: { timeDeInvocacao: time } })

  revalidatePath('/status')
}

export async function unequipSkill(userCharacterId: string, slot: number): Promise<void> {
  const user = await requireUser()

  const userCharacter = await prisma.userCharacter.findFirst({ where: { id: userCharacterId, userId: user.id } })
  if (!userCharacter) redirect('/status?error=not_found')

  await prisma.userCharacterEquippedSkill.deleteMany({ where: { userCharacterId, slot } })

  revalidatePath('/status')
}

/**
 * Gasta um ponto de nível num atributo.
 *
 * Existe porque o ponto não tinha para onde ir: ele só comprava nó de árvore
 * de habilidade, e 39 dos 52 personagens não têm nó nenhum. Quem jogasse com
 * qualquer um deles acumulava pontos que nunca viravam nada.
 *
 * Um ponto por chamada, de propósito. Alocar em lote precisaria de um formulário
 * com estado e de validar o total no servidor; um de cada vez é atômico por
 * construção e não tem como divergir do que a tela mostra.
 */
export async function alocarAtributo(atributo: string): Promise<void> {
  const user = await requireUser()
  if (!ehAtributo(atributo)) redirect('/status?error=invalid_attribute')

  const userCharacter = await getSelectedCharacter(user.id)
  if (!userCharacter) redirect('/select')

  // A checagem do saldo é refeita aqui e não confiada à tela: a action é
  // alcançável por POST direto.
  if (userCharacter.pointsAvailable < 1) redirect('/status?error=insufficient_points')

  await prisma.userCharacter.update({
    where: { id: userCharacter.id },
    data: {
      pointsAvailable: { decrement: 1 },
      [colunaDe(atributo)]: { increment: 1 },
    },
  })

  revalidatePath('/status')
}

/**
 * Compra um ponto de atributo com moeda.
 *
 * Diferente de alocarAtributo, que gasta ponto de nível: aqui o recurso é
 * dinheiro, e o preço sobe a cada treino. Ver app/lib/progression/treino.ts
 * para por que o preço crescente substitui um teto diário.
 *
 * A cobrança e o ganho vão na MESMA transação. Sem isso, uma falha no meio
 * deixaria o jogador pagando sem receber, ou recebendo sem pagar.
 */
export async function treinarAtributo(atributo: string): Promise<void> {
  const user = await requireUser()
  if (!ehAtributo(atributo)) redirect('/treino?error=invalid_attribute')

  const userCharacter = await getSelectedCharacter(user.id)
  if (!userCharacter) redirect('/select')

  // Saldo e preço são relidos aqui, e não confiados à tela: a action é
  // alcançável por POST direto, e o preço muda a cada compra.
  const [conta, personagem] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    prisma.userCharacter.findUnique({
      where: { id: userCharacter.id },
      // A inteligência entra no preço, então precisa vir do banco junto: o
      // valor que a tela mostrou não serve, pela mesma razão que o saldo não
      // serve — esta action é alcançável por POST direto.
      select: { treinos: true, allocIntelligence: true, character: { select: { intelligence: true } } },
    }),
  ])
  if (!conta || !personagem) redirect('/treino?error=not_found')

  const inteligencia =
    personagem.character.intelligence + personagem.allocIntelligence * ATRIBUTO_POR_PONTO.intelligence
  const custo = custoDoTreino(personagem.treinos, inteligencia)
  if (conta.coins < custo) redirect('/treino?error=insufficient_coins')

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { coins: { decrement: custo } } }),
    prisma.userCharacter.update({
      where: { id: userCharacter.id },
      data: {
        treinos: { increment: 1 },
        [colunaDe(atributo)]: { increment: 1 },
      },
    }),
  ])

  revalidatePath('/treino')
  revalidatePath('/status')
}

/**
 * Devolve todos os pontos de atributo para serem gastos de novo. Ver
 * app/lib/progression/redistribuicao.ts para por que existe e por que a
 * primeira é de graça.
 *
 * TRAVA PELA CONTAGEM. Dois cliques seguidos leriam as mesmas alocações e
 * devolveriam os pontos duas vezes. O update só passa se `redistribuicoes`
 * ainda for o número lido; o segundo clique encontra a contagem já avançada
 * e não faz nada.
 */
export async function redistribuirAtributos(): Promise<void> {
  const user = await requireUser()

  const personagem = await getSelectedCharacter(user.id)
  if (!personagem) redirect('/select')

  const pontos = pontosAlocados(personagem)
  if (pontos === 0) redirect('/status?error=nothing_to_redistribute')
  const custo = custoDaRedistribuicao(personagem.redistribuicoes)

  try {
    await prisma.$transaction(async (tx) => {
      const travou = await tx.userCharacter.updateMany({
        where: { id: personagem.id, redistribuicoes: personagem.redistribuicoes },
        data: {
          ...alocacoesZeradas(),
          pointsAvailable: { increment: pontos },
          redistribuicoes: { increment: 1 },
        },
      })
      if (travou.count === 0) throw new Error('CONFLICT')

      if (custo > 0) {
        const pagou = await tx.user.updateMany({
          where: { id: user.id, coins: { gte: custo } },
          data: { coins: { decrement: custo } },
        })
        if (pagou.count === 0) throw new Error('INSUFFICIENT_COINS')
      }
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_COINS') redirect('/status?error=insufficient_coins')
    if (e instanceof Error && e.message === 'CONFLICT') redirect('/status')
    throw e
  }

  revalidatePath('/status')
  revalidatePath('/treino')
  redirect('/status?redistribuido=1')
}
