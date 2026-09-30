import { prisma } from '@/app/lib/prisma'
import { SEM_BONUS, comLutadores, computeFighterStats, createInitialState, prepararTreinador } from '@/app/lib/battle/engine'
import { fichaDoJogador } from '@/app/lib/battle/montagem'
import { timeDoJogador, timeDoPersonagem } from '@/app/lib/battle/queries'
import { comReservas, type Reserva } from './andares'
import type { Andar } from './catalogo'
import type { BaseStats, BattleState } from '@/app/lib/battle/types'

/** Um contratado da incursão, como fica gravado em RaidRun.contratados. */
export type Contrato = { characterId: string; nivel: number; custo: number }

type InimigoMontado = { characterId?: string; monsterId?: string; nome: string; nivel: number; base: BaseStats }

/**
 * Os inimigos de um andar, com a ficha de cada um.
 *
 * Nomes repetidos ganham número ("Hollow", "Hollow 2", "Hollow 3"): com três
 * Hollows iguais, o histórico e o seletor de alvo precisam dizer QUAL.
 */
async function inimigosDoAndar(andar: Andar): Promise<InimigoMontado[]> {
  const vistos = new Map<string, number>()
  const numerar = (nome: string) => {
    const n = (vistos.get(nome) ?? 0) + 1
    vistos.set(nome, n)
    return n === 1 ? nome : `${nome} ${n}`
  }

  const montados: InimigoMontado[] = []
  for (const inimigo of andar.inimigos) {
    if ('monstro' in inimigo) {
      const m = await prisma.monster.findUnique({ where: { name: inimigo.monstro } })
      if (!m) throw new Error(`Monstro da raid não está no catálogo: ${inimigo.monstro}`)
      montados.push({
        monsterId: m.id,
        nome: numerar(m.name),
        nivel: inimigo.nivel,
        base: computeFighterStats(m, inimigo.nivel, SEM_BONUS),
      })
    } else {
      const c = await prisma.character.findFirst({ where: { name: inimigo.personagem } })
      if (!c) throw new Error(`Personagem da raid não está no catálogo: ${inimigo.personagem}`)
      const base = computeFighterStats(c, inimigo.nivel, SEM_BONUS)
      montados.push({
        characterId: c.id,
        nome: numerar(c.name),
        nivel: inimigo.nivel,
        base: { ...base, hp: Math.round(base.hp * (inimigo.vidaDeChefe ?? 1)) },
      })
    }
  }
  return montados
}

/**
 * Tudo que é preciso para gravar a batalha de um andar: o estado inicial, o
 * inimigo principal (que vai no próprio Battle) e os demais lutadores (que
 * vão em BattleParticipant).
 *
 * A party entra como saiu do andar anterior (ver comReservas). Os contratados
 * são montados de novo a cada andar, do catálogo, no nível do contrato.
 */
export async function montarAndar(params: {
  userCharacter: {
    id: string
    level: number
    character: { hp: number; attack: number; defense: number; speed: number; energy: number; stamina: number }
  }
  andar: Andar
  contratos: Contrato[]
  reservas: Reserva[] | null
}): Promise<{
  state: BattleState
  principal: { enemyCharacterId?: string; enemyMonsterId?: string }
  participantes: { lado: 'PLAYER' | 'ENEMY'; posicao: number; characterId?: string; monsterId?: string; nivel: number; custo: number }[]
}> {
  const [jogador, inimigos, personagens] = await Promise.all([
    fichaDoJogador(params.userCharacter),
    inimigosDoAndar(params.andar),
    prisma.character.findMany({ where: { id: { in: params.contratos.map((c) => c.characterId) } } }),
  ])
  const [principal, ...extras] = inimigos

  const contratados = params.contratos.map((contrato) => {
    const c = personagens.find((p) => p.id === contrato.characterId)
    if (!c) throw new Error(`Contratado sumiu do catálogo: ${contrato.characterId}`)
    return { characterId: c.id, nome: c.name, nivel: contrato.nivel, base: computeFighterStats(c, contrato.nivel, SEM_BONUS) }
  })

  let state = createInitialState(
    jogador.base,
    principal.base,
    { player: jogador.energyCostModifier },
    { player: params.userCharacter.level, enemy: principal.nivel }
  )
  state = comLutadores(state, 'PLAYER', contratados)
  state = comLutadores(state, 'ENEMY', extras)
  // O chefe do andar é marcado no estado: o ABATE (Uzumaki) não o derruba de
  // uma vez.
  const chefe = Boolean(params.andar.chefe)
  state = {
    ...state,
    inimigos: state.inimigos.map((c, i) => (i === 0 ? { ...c, nome: principal.nome, ...(chefe ? { chefe } : {}) } : c)),
  }
  state = comReservas(state, params.reservas)

  // TREINADORES entram com o time — DEPOIS das reservas, para o time herdar
  // a vida com que o treinador saiu do andar anterior (ver prepararTreinador),
  // e depois de todos os lutadores, para as posições da party não mudarem.
  const [timeDoLider, timesDosContratados, timesDosInimigos] = await Promise.all([
    timeDoJogador(params.userCharacter.id),
    Promise.all(contratados.map((c) => timeDoPersonagem(c.characterId, c.nivel))),
    Promise.all(inimigos.map((i) => (i.characterId ? timeDoPersonagem(i.characterId, i.nivel) : Promise.resolve([])))),
  ])
  if (timeDoLider.length > 0) state = prepararTreinador(state, 'PLAYER', 0, timeDoLider)
  timesDosContratados.forEach((time, i) => {
    if (time.length > 0) state = prepararTreinador(state, 'PLAYER', i + 1, time)
  })
  timesDosInimigos.forEach((time, i) => {
    if (time.length > 0) state = prepararTreinador(state, 'ENEMY', i, time)
  })

  return {
    state,
    principal: principal.monsterId ? { enemyMonsterId: principal.monsterId } : { enemyCharacterId: principal.characterId },
    participantes: [
      // O contrato já foi pago na entrada da raid; aqui o custo fica zero.
      ...contratados.map((c, i) => ({ lado: 'PLAYER' as const, posicao: i + 1, characterId: c.characterId, nivel: c.nivel, custo: 0 })),
      ...extras.map((e, i) => ({
        lado: 'ENEMY' as const,
        posicao: i + 1,
        ...(e.monsterId ? { monsterId: e.monsterId } : { characterId: e.characterId }),
        nivel: e.nivel,
        custo: 0,
      })),
    ],
  }
}
