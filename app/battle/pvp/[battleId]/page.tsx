import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/app/lib/session'
import { getPvpBattleView } from '@/app/lib/pvp/queries'
import { submitPvpAction, forfeitPvpBattle } from '@/app/lib/pvp/actions'
import { getEquippedSkills } from '@/app/lib/battle/queries'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { FighterCard } from '@/app/components/battle/FighterCard'
import { BotaoDeAtaqueBasico, BotaoDeHabilidade } from '@/app/components/battle/BotaoDeHabilidade'
import { CabecalhoDeBatalha } from '@/app/components/battle/CabecalhoDeBatalha'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { FundoDoConfronto } from '@/app/components/battle/FundoDoConfronto'
import { coresDoConfronto } from '@/app/lib/battle/cores'
import { Swords } from 'lucide-react'
import { HistoricoDeBatalha } from '@/app/components/battle/HistoricoDeBatalha'
import { CartaAnimada } from '@/app/components/battle/CartaAnimada'
import { LiveBattleSync } from '@/app/components/pvp/LiveBattleSync'
import { impactoDaRodada } from '@/app/lib/battle/rodada'
import type { TurnResult } from '@/app/lib/battle/types'

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

  const { battle, me, foe, state, turns } = view
  const isActive = battle.status === 'ACTIVE'
  const [mySkills, foeSkills] = await Promise.all([
    getEquippedSkills(me.userCharacter.id),
    getEquippedSkills(foe.userCharacter.id),
  ])
  // Os dois lados são jogador de verdade em PvP — diferente da IA, dá pra
  // mostrar a fala dos dois. Ver TurnLogEntry para onde isto é lido.
  const skillDescriptions = Object.fromEntries(
    [...Object.values(mySkills), ...Object.values(foeSkills)]
      .filter((s): s is typeof s & { description: string } => Boolean(s.description))
      .map((s) => [s.name, s.description])
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
          />
        </CartaAnimada>

        {/* O log é gravado na perspectiva do motor (host = player); os nomes e
            as cores são passados na mesma ordem pra bater. */}
        <HistoricoDeBatalha
          turns={turns.map((t) => ({ id: t.id, round: t.round, result: t.result as unknown as TurnResult }))}
          playerName={view.isHost ? me.userCharacter.nickname : foe.userCharacter.nickname}
          enemyName={view.isHost ? foe.userCharacter.nickname : me.userCharacter.nickname}
          skillDescriptions={skillDescriptions}
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
          />
        </CartaAnimada>
      </div>

      {isActive && (
        <PainelChanfrado corte={18} cor={`color-mix(in srgb, ${minhaCor} 45%, var(--border))`} tinta>
          <div className="p-4 sm:p-5 space-y-4">
            <TituloDeSecao
              icone={<Swords className="h-5 w-5" style={{ color: minhaCor }} />}
              direita={
                <span className="text-xs text-muted">
                  {me.submitted
                    ? foe.submitted
                      ? 'Resolvendo a rodada…'
                      : `Ação enviada ✓ — esperando ${foe.username}`
                    : foe.submitted
                      ? `${foe.username} já escolheu — ele não vê a sua jogada`
                      : 'Os dois escolhem ao mesmo tempo'}
                </span>
              }
            >
              Ações
            </TituloDeSecao>

            {/* Depois de enviar, a grade some: a jogada está trancada, e
                botões clicáveis ali sugeririam que dá para trocar. */}
            {!me.submitted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                <form action={submitPvpAction.bind(null, battleId, null)} className="h-full">
                  <BotaoDeAtaqueBasico />
                </form>
                {Object.values(mySkills).map((skill) => (
                  <form key={skill.id} action={submitPvpAction.bind(null, battleId, skill.id)} className="h-full">
                    <BotaoDeHabilidade skill={skill} combatente={me.combatant} />
                  </form>
                ))}
              </div>
            )}
          </div>
        </PainelChanfrado>
      )}
    </main>
  )
}
