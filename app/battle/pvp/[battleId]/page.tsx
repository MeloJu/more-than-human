import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { getPvpBattleView } from '@/app/lib/pvp/queries'
import {
  bloquearPvp,
  darOrdemPvp,
  forfeitPvpBattle,
  liberarFormaPvp,
  submitPvpAction,
  trocarPokemonPvp,
  usarItemPvp,
} from '@/app/lib/pvp/actions'
import { getEquippedSkills, getPlayerTransformations } from '@/app/lib/battle/queries'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { FighterCard } from '@/app/components/battle/FighterCard'
import { CabecalhoDeBatalha } from '@/app/components/battle/CabecalhoDeBatalha'
import { PainelChanfrado } from '@/app/components/battle/Moldura'
import { FundoDoConfronto } from '@/app/components/battle/FundoDoConfronto'
import { coresDoConfronto } from '@/app/lib/battle/cores'
import { HistoricoDeBatalha } from '@/app/components/battle/HistoricoDeBatalha'
import { CartaAnimada } from '@/app/components/battle/CartaAnimada'
import { LiveBattleSync } from '@/app/components/pvp/LiveBattleSync'
import { impactoDaRodada } from '@/app/lib/battle/rodada'
import { OrbesDeInvocacao, gruposDoDono } from '@/app/components/battle/Invocacoes'
import { ComAlvo } from '@/app/components/battle/SeletorDeAlvo'
import { HudDeBatalha, type MembroDoHud } from '@/app/components/battle/HudDeBatalha'
import { PainelDeAcoes } from '@/app/components/battle/PainelDeAcoes'
import { defDeInvocacao } from '@/app/lib/battle/invocacoes'
import type { CombatantState, SkillDef, TurnResult } from '@/app/lib/battle/types'

export default async function PvpArenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ battleId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { battleId } = await params
  const { error } = await searchParams
  const errorMessage = battleErrorMessage(error)

  const user = await requireUser()
  const view = await getPvpBattleView(battleId, user.id)
  if (!view) notFound()

  const { battle, me, foe, state } = view
  // A consulta traz os turnos em ordem crescente; o histórico e a "última
  // rodada" esperam a mais nova primeiro, como na luta contra a IA.
  const turns = [...view.turns].reverse()
  const isActive = battle.status === 'ACTIVE'
  const [mySkills, foeSkills, minhasFormas] = await Promise.all([
    getEquippedSkills(me.userCharacter.id),
    getEquippedSkills(foe.userCharacter.id),
    getPlayerTransformations(me.userCharacter.characterId, me.userCharacter.level),
  ])
  // Os dois lados são jogador de verdade em PvP — diferente da IA, dá pra
  // mostrar a fala dos dois. Ver TurnLogEntry para onde isto é lido.
  const falas = Object.fromEntries(
    [...Object.values(mySkills), ...Object.values(foeSkills)]
      .filter((s): s is typeof s & { fala: string } => Boolean(s.fala))
      .map((s) => [s.name, s.fala])
  )

  // O log é gravado na perspectiva do MOTOR (host = PLAYER), então o lado de
  // cada impacto depende de quem está olhando — mesma inversão que os nomes
  // do histórico logo abaixo já fazem. Ver app/lib/battle/rodada.ts.
  const ultimaRodada = turns[0]?.round ?? 0
  const impacto = impactoDaRodada(
    turns.filter((t) => t.round === ultimaRodada).map((t) => t.result as unknown as TurnResult)
  )
  const meuImpacto = view.isHost ? impacto.PLAYER : impacto.ENEMY
  const impactoDoOutro = view.isHost ? impacto.ENEMY : impacto.PLAYER

  // Cada lado na perspectiva de quem olha: o host é o lado PLAYER do motor.
  const meuTime = view.isHost ? state.aliados : state.inimigos
  const timeDoOutro = view.isHost ? state.inimigos : state.aliados
  const orbes = (time: CombatantState[], skills: SkillDef[]) => {
    const grupos = gruposDoDono(time, 0, skills)
    return grupos.length > 0 ? <OrbesDeInvocacao grupos={grupos} time={time} dono={0} /> : undefined
  }

  // As formas: as que dá para liberar agora, e o nome da que cada um está
  // usando (a do outro, numa leitura pontual).
  const formasLiberaveis = Object.values(minhasFormas).filter(
    (t) => t.triggerType === 'MANUAL' && !me.combatant.activeTransformationId
  )
  const minhaForma = me.combatant.activeTransformationId ? minhasFormas[me.combatant.activeTransformationId]?.name : undefined
  const formaDoOutro = foe.combatant.activeTransformationId
    ? (await prisma.transformation.findUnique({ where: { id: foe.combatant.activeTransformationId }, select: { name: true } }))?.name
    : undefined

  // A MOCHILA: as poções da conta. Beber gasta a rodada, como na IA.
  const pocoes = isActive
    ? await prisma.userItem.findMany({
        where: { userId: user.id, quantidade: { gt: 0 }, item: { tipo: 'CONSUMIVEL' } },
        include: { item: true },
        orderBy: { item: { nome: 'asc' } },
      })
    : []

  // O HUD: o lutador de cada lado e as invocações em campo (Pokémon na
  // pokébola e invocação que saiu ficam de fora). O PvP não tem party.
  const membrosDe = (time: CombatantState[], meu: boolean): MembroDoHud[] =>
    time
      .map((c, posicao) => ({ c, posicao }))
      .filter(({ c }) => !c.invocacao?.fora)
      .map(({ c, posicao }) => {
        const dono = meu ? me : foe
        return {
          posicao,
          nome: posicao === 0 ? dono.userCharacter.nickname : c.nome ?? 'Invocação',
          nivel: posicao === 0 ? dono.userCharacter.level : c.nivel,
          marca: c.invocacao ? defDeInvocacao(c.invocacao.def)?.marca : undefined,
          hp: c.currentHp,
          max: c.maxHp,
          en: c.currentEnergy,
          enMax: c.maxEnergy,
          st: c.currentStamina,
          stMax: c.maxStamina,
          forma: posicao === 0 ? (meu ? minhaForma : formaDoOutro) : undefined,
          efeitos: c.statusEffects,
          voce: meu && posicao === 0,
          miravel: !meu && c.currentHp > 0 && !c.treinador,
        }
      })

  // O motor nomeia os lados como player/enemy; o desfecho precisa ser lido na
  // perspectiva de quem está olhando, senão o convidado veria "Vitória!" ao
  // perder.
  const myOutcome = view.isHost
    ? state.outcome
    : state.outcome === 'PLAYER_WIN'
      ? 'ENEMY_WIN'
      : state.outcome === 'ENEMY_WIN'
        ? 'PLAYER_WIN'
        : state.outcome

  // Os dois lados são jogadores. Cada um vê a SI MESMO como o jogador da
  // guarda de contraste: quem está olhando fica com a própria cor, e é o
  // outro que troca se colidir. Ver app/lib/battle/cores.ts.
  const { jogador: minhaCor, inimigo: corDoOutro } = coresDoConfronto(
    { primaria: me.userCharacter.character.corDestaque, secundaria: me.userCharacter.character.corSecundaria },
    { primaria: foe.userCharacter.character.corDestaque, secundaria: foe.userCharacter.character.corSecundaria }
  )

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <FundoDoConfronto corJogador={minhaCor} corInimigo={corDoOutro} />
      {/* O ALVO envolve a página: quem escolhe é o HUD (clique no inimigo), e
          quem envia é cada golpe. Ver a mesma montagem na luta contra a IA. */}
      <ComAlvo
        opcoes={timeDoOutro
          .map((c, posicao) => ({ c, posicao }))
          .filter(({ c }) => !c.treinador && !c.invocacao?.fora)
          .map(({ c, posicao }) => ({
            posicao,
            nome: posicao === 0 ? foe.userCharacter.nickname : c.nome ?? 'Invocação',
            vida: c.currentHp,
            vidaMaxima: c.maxHp,
          }))}
      >
      <CabecalhoDeBatalha
        nomeJogador={me.userCharacter.nickname}
        nomeInimigo={foe.userCharacter.nickname}
        corJogador={minhaCor}
        corInimigo={corDoOutro}
        subtitulo={
          <span className="flex items-center gap-3 flex-wrap">
            <span>PvP · @{foe.username}</span>
            {isActive && <span>Rodada {battle.turnNumber}</span>}
            {isActive && <LiveBattleSync battleId={battleId} />}
          </span>
        }
        direita={
          isActive ? (
            <form action={forfeitPvpBattle.bind(null, battleId)}>
              <button type="submit" className="btn-ghost px-4 py-1.5 text-sm">Desistir</button>
            </form>
          ) : (
            <Link href="/battle/pvp" className="btn-ghost px-4 py-1.5 text-sm">Voltar ao lobby</Link>
          )
        }
      />

      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}

      {!isActive && (
        <PainelChanfrado cor={minhaCor} brilho>
          <div className="p-6 space-y-3">
            <div className="font-pincel text-3xl">
              {myOutcome === 'PLAYER_WIN' && 'Vitória!'}
              {myOutcome === 'ENEMY_WIN' && 'Derrota.'}
              {myOutcome === 'DRAW' && 'Empate.'}
            </div>
            <div className="flex gap-2">
              <Link href="/battle/pvp" className="btn-primary px-4 py-2 text-sm">Nova partida</Link>
              <Link href="/dashboard" className="btn-ghost px-4 py-2 text-sm">Dashboard</Link>
            </div>
          </div>
        </PainelChanfrado>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <CartaAnimada impacto={meuImpacto} rodada={ultimaRodada}>
          <FighterCard
            name={me.userCharacter.nickname}
            imageUrl={me.userCharacter.character.imageUrl}
            cor={minhaCor}
            levelBadge={me.userCharacter.level}
            combatant={me.combatant}
            orbes={orbes(meuTime, Object.values(mySkills))}
          />
        </CartaAnimada>

        {/* O log é gravado na perspectiva do motor (host = player); os nomes e
            as cores são passados na mesma ordem pra bater. */}
        <HistoricoDeBatalha
          turns={turns.map((t) => ({ id: t.id, round: t.round, result: t.result as unknown as TurnResult }))}
          playerName={view.isHost ? me.userCharacter.nickname : foe.userCharacter.nickname}
          enemyName={view.isHost ? foe.userCharacter.nickname : me.userCharacter.nickname}
          falas={falas}
          corJogador={view.isHost ? minhaCor : corDoOutro}
          corInimigo={view.isHost ? corDoOutro : minhaCor}
        />

        <CartaAnimada impacto={impactoDoOutro} rodada={ultimaRodada}>
          <FighterCard
            name={foe.userCharacter.nickname}
            imageUrl={foe.userCharacter.character.imageUrl}
            cor={corDoOutro}
            levelBadge={foe.userCharacter.level}
            combatant={foe.combatant}
            orbes={orbes(timeDoOutro, Object.values(foeSkills))}
          />
        </CartaAnimada>
      </div>

      {/* O HUD estilo SAO, como na luta contra a IA: a vida dos dois lados (e
          das invocações) fica na tela enquanto se rola até os golpes. */}
      {isActive && <HudDeBatalha esquerda={membrosDe(meuTime, true)} direita={membrosDe(timeDoOutro, false)} />}

      {isActive && (
        <PainelDeAcoes
          cor={minhaCor}
          corInimigo={corDoOutro}
          combatente={me.combatant}
          time={meuTime}
          golpes={Object.values(mySkills)}
          formas={formasLiberaveis}
          pocoes={pocoes}
          rodada={battle.turnNumber}
          acoes={{
            golpe: (skillId) => submitPvpAction.bind(null, battleId, skillId),
            ordem: (posicao) => darOrdemPvp.bind(null, battleId, posicao),
            trocar: (posicao) => trocarPokemonPvp.bind(null, battleId, posicao),
            bloquear: bloquearPvp.bind(null, battleId),
            forma: (id) => liberarFormaPvp.bind(null, battleId, id),
            item: (itemId) => usarItemPvp.bind(null, battleId, itemId),
          }}
          status={
            me.submitted
              ? undefined
              : foe.submitted
                ? `@${foe.username} já escolheu e não vê a sua jogada.`
                : 'Os dois escolhem ao mesmo tempo.'
          }
          // Depois de enviar, os botões somem: a jogada está trancada, e
          // botões clicáveis ali sugeririam que dá para trocar.
          travado={
            me.submitted ? (
              <p className="text-sm text-muted">
                {foe.submitted ? 'Resolvendo a rodada…' : `Jogada enviada ✓ — esperando @${foe.username}.`}
              </p>
            ) : undefined
          }
        />
      )}
      </ComAlvo>
    </main>
  )
}
