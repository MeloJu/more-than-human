import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/app/lib/session'
import { activateTransformation, takeTurn, blockTurn} from '@/app/lib/battle/actions'
import { getBattleView, getEquippedSkills, getPlayerTransformations } from '@/app/lib/battle/queries'
import { getRetratosDosFalantes, getStageOutro, parseDialogo } from '@/app/lib/story/queries'
import { CenaDeDialogo } from '@/app/components/story/CenaDeDialogo'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { FighterCard } from '@/app/components/battle/FighterCard'
import { BotaoDeForma } from '@/app/components/battle/BotaoDeForma'
import { BotaoDeHabilidade } from '@/app/components/battle/BotaoDeHabilidade'
import { HistoricoDeBatalha } from '@/app/components/battle/HistoricoDeBatalha'
import { CartaAnimada } from '@/app/components/battle/CartaAnimada'
import { BotaoDeBloqueio } from '@/app/components/battle/BotaoDeBloqueio'
import { custoDeErguerGuarda, heroi, migrarEstado, vilao } from '@/app/lib/battle/engine'
import { impactoDaRodada } from '@/app/lib/battle/rodada'
import type { BattleStateGravado, TurnResult } from '@/app/lib/battle/types'

export default async function BattleArenaPage({
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

  const view = await getBattleView(battleId, user.id)
  if (!view) notFound()
  const { battle, userCharacter, enemy, turns } = view

  // MIGRA NA FRONTEIRA — battle.state pode ter sido gravado antes do time
  // (versão 1, { player, enemy }); sem isto, heroi()/vilao() quebram lendo
  // state.aliados de um objeto que nunca teve esse campo. getPvpBattleView já
  // faz isto; esta página não fazia, e batalha antiga (nenhum turno desde a
  // migração) caía com 500 ao abrir.
  const state = migrarEstado(battle.state as unknown as BattleStateGravado)
  const isActive = battle.status === 'ACTIVE'
  // A origem manda no rótulo e no "voltar". Uma batalha de história contra um
  // Hollow é um Monster como a raid, mas mandar o jogador pra /battle/raid o
  // tiraria do arco no meio — por isso storyStageId é checado primeiro.
  const isStory = battle.storyStageId !== null
  const isRaid = !isStory && battle.enemyMonsterId !== null
  const modeLabel = isStory ? 'Modo: História' : isRaid ? 'Modo: Raid' : 'Modo: IA'
  const backHref = isStory ? '/story' : isRaid ? '/battle/raid' : '/battle/ai'
  const backLabel = isStory ? 'Voltar à História' : isRaid ? 'Nova Raid' : 'Nova Batalha'

  const [playerSkills, playerTransformations] = await Promise.all([
    getEquippedSkills(userCharacter.id),
    getPlayerTransformations(userCharacter.characterId, userCharacter.level),
  ])

  // Só do lado do jogador por agora — o inimigo de IA não carrega skill pra
  // esta tela (só nome/retrato), então a fala dele ficaria maior escopo do
  // que vale hoje. Ver TurnLogEntry para onde isto é lido.
  const skillDescriptions = Object.fromEntries(
    Object.values(playerSkills)
      .filter((s): s is typeof s & { description: string } => Boolean(s.description))
      .map((s) => [s.name, s.description])
  )

  // O que cada lutador SOFREU na rodada mais recente, para a tela poder
  // encenar o golpe em vez de só mostrar o número novo. Os turnos chegam em
  // ordem decrescente, então a primeira rodada que aparece é a última que
  // aconteceu. Ver app/lib/battle/rodada.ts.
  const ultimaRodada = turns[0]?.round ?? 0
  const impacto = impactoDaRodada(
    turns.filter((t) => t.round === ultimaRodada).map((t) => t.result as unknown as TurnResult)
  )

  // Desfecho do estágio, encenado no momento em que o inimigo cai. Só é
  // buscado numa VITÓRIA de história: perder não tem desfecho, e ler o
  // fechamento do arco depois de morrer seria o oposto de recompensa.
  const venceuEstagio = isStory && !isActive && state.outcome === 'PLAYER_WIN'
  const stage = venceuEstagio && battle.storyStageId ? await getStageOutro(battle.storyStageId) : null
  const desfecho = parseDialogo(stage?.outroDialogue)
  const retratosDesfecho = await getRetratosDosFalantes(
    desfecho.map((f) => f.speaker).filter((n): n is string => n !== null)
  )

  const availableTransformations = Object.values(playerTransformations).filter(
    (t) => t.triggerType === 'MANUAL' && !heroi(state).activeTransformationId
  )

  const idDaFormaAtiva = heroi(state).activeTransformationId

  const formaAtivaDoJogador = idDaFormaAtiva ? playerTransformations[idDaFormaAtiva] : undefined


  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{userCharacter.nickname} vs {enemy.name}</h1>
          <div className="text-sm opacity-60">
            {modeLabel}
            {isActive && ` · Rodada ${battle.turnNumber}`}
          </div>
        </div>
        <Link href={backHref} className="text-sm underline">Sair</Link>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
      )}

      {!isActive && (
        <div className="card p-6 space-y-3">
          <div className="text-lg font-semibold">
            {state.outcome === 'PLAYER_WIN' && 'Vitória!'}
            {state.outcome === 'ENEMY_WIN' && 'Derrota.'}
            {state.outcome === 'DRAW' && 'Empate.'}
          </div>
          {desfecho.length > 0 ? (
            <CenaDeDialogo falas={desfecho} retratos={retratosDesfecho} autoAbrir>
              <Link href={backHref} className="btn-primary rounded-md px-4 py-2 text-sm">
                {backLabel}
              </Link>
            </CenaDeDialogo>
          ) : (
            <div className="flex gap-2">
              <Link href="/dashboard" className="btn-primary rounded-md px-4 py-2 text-sm">Dashboard</Link>
              <Link href={backHref} className="rounded-md px-4 py-2 text-sm border border-border">
                {backLabel}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* A coluna do jogador: o card dele e as formas dele.
            
            As formas ficavam no fim do painel de Ações, depois do histórico e
            de todas as habilidades — ou seja, fora da tela, e quem não rolasse
            a página nunca saberia que existiam. O lugar delas é aqui por dois
            motivos: a coluna é curta e cabe sem rolagem, e transformação é um
            ESTADO DE QUEM VOCÊ É, não um golpe no adversário. Agrupada com o
            próprio retrato, ela se lê como parte do personagem. */}
        <div className="space-y-4">
          <CartaAnimada impacto={impacto.PLAYER} rodada={ultimaRodada}>
            <FighterCard
              name={userCharacter.nickname}
              imageUrl={userCharacter.character.imageUrl}
              cor={userCharacter.character.corDestaque}
              levelBadge={userCharacter.level}
              transformationName={formaAtivaDoJogador?.name}
              combatant={heroi(state)}
            />
          </CartaAnimada>

          {isActive && availableTransformations.length > 0 && (
            <div className="card p-4 space-y-2">
              <h2 className="text-xs uppercase tracking-wide opacity-45">Formas</h2>
              {availableTransformations.map((t) => (
                <form key={t.id} action={activateTransformation.bind(null, battleId, t.id)}>
                  <BotaoDeForma forma={t} energiaAtual={heroi(state).currentEnergy} />
                </form>
              ))}
            </div>
          )}
        </div>

        <HistoricoDeBatalha
          turns={turns.map((t) => ({ id: t.id, round: t.round, result: t.result as unknown as TurnResult }))}
          playerName={userCharacter.nickname}
          enemyName={enemy.name}
          skillDescriptions={skillDescriptions}
        />

        <CartaAnimada impacto={impacto.ENEMY} rodada={ultimaRodada}>
          <FighterCard name={enemy.name} imageUrl={enemy.imageUrl} cor={enemy.corDestaque} combatant={vilao(state)} />
        </CartaAnimada>
      </div>

      {/* AS AÇÕES OCUPAM A LARGURA INTEIRA, e não a coluna do meio.
          
          Na coluna elas tinham um terço da página: oito habilidades, cada uma
          com nome, custo, efeitos e precisão, empilhavam numa torre que só
          cabia rolando — e rolar para escolher a jogada é rolar TODA rodada.
          Em largura total a mesma lista vira duas ou três fileiras curtas.
          
          Ficam DEPOIS dos três cards de propósito: a decisão da rodada se toma
          olhando as duas barras de vida, então elas precisam estar acima e
          visíveis no momento do clique. */}
      {isActive && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold">Ações</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 items-stretch">
            <form action={takeTurn.bind(null, battleId, null)}>
              <button
                type="submit"
                className="w-full h-full rounded-md px-3 py-2 text-sm border border-border text-left hover:bg-surface-raised hover:border-accent/50 transition-all"
              >
                <span className="font-medium">Ataque Básico</span>
                <span className="block text-xs opacity-60 mt-0.5">sem custo</span>
              </button>
            </form>
            {Object.values(playerSkills).map((skill) => (
              <form key={skill.id} action={takeTurn.bind(null, battleId, skill.id)} className="h-full">
                <BotaoDeHabilidade skill={skill} combatente={heroi(state)} />
              </form>
            ))}
            <form action={blockTurn.bind(null, battleId)} className="h-full">
              <BotaoDeBloqueio combatente={heroi(state)} custo={custoDeErguerGuarda(heroi(state))} />
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
