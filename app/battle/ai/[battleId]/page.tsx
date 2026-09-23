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
import { BotaoDeAtaqueBasico } from '@/app/components/battle/BotaoDeHabilidade'
import { CabecalhoDeBatalha } from '@/app/components/battle/CabecalhoDeBatalha'
import { FaixaDeFormas } from '@/app/components/battle/FaixaDeFormas'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { Swords } from 'lucide-react'
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


  // A cor de cada lado vem do personagem. Sem cor própria, o jogador cai no
  // laranja do tema e o inimigo no ciano — os dois lados nunca nascem iguais,
  // que era o problema de um tema único para a tela inteira.
  const corJogador = userCharacter.character.corDestaque
  const corInimigo = enemy.corDestaque ?? 'var(--spirit)'

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <CabecalhoDeBatalha
        nomeJogador={userCharacter.nickname}
        nomeInimigo={enemy.name}
        corJogador={corJogador}
        corInimigo={corInimigo}
        subtitulo={
          <>
            {modeLabel}
            {isActive && ` · Rodada ${battle.turnNumber}`}
          </>
        }
        direita={
          <Link href={backHref} className="btn-ghost px-4 py-1.5 text-sm">
            Sair
          </Link>
        }
      />

      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}

      {!isActive && (
        <PainelChanfrado cor={corJogador} brilho>
          <div className="p-6 space-y-3">
            <div className="font-pincel text-3xl">
              {state.outcome === 'PLAYER_WIN' && 'Vitória!'}
              {state.outcome === 'ENEMY_WIN' && 'Derrota.'}
              {state.outcome === 'DRAW' && 'Empate.'}
            </div>
            {desfecho.length > 0 ? (
              <CenaDeDialogo falas={desfecho} retratos={retratosDesfecho} autoAbrir>
                <Link href={backHref} className="btn-primary px-4 py-2 text-sm">
                  {backLabel}
                </Link>
              </CenaDeDialogo>
            ) : (
              <div className="flex gap-2">
                <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm">Dashboard</Link>
                <Link href={backHref} className="btn-ghost px-4 py-2 text-sm">
                  {backLabel}
                </Link>
              </div>
            )}
          </div>
        </PainelChanfrado>
      )}

      {/* Os três painéis na mesma linha e na mesma altura: jogador, o que
          aconteceu, adversário. A decisão da rodada se toma olhando as duas
          barras de vida, então elas ficam lado a lado e acima das ações. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <CartaAnimada impacto={impacto.PLAYER} rodada={ultimaRodada}>
          <FighterCard
            name={userCharacter.nickname}
            imageUrl={userCharacter.character.imageUrl}
            cor={corJogador}
            levelBadge={userCharacter.level}
            transformationName={formaAtivaDoJogador?.name}
            combatant={heroi(state)}
          />
        </CartaAnimada>

        <HistoricoDeBatalha
          turns={turns.map((t) => ({ id: t.id, round: t.round, result: t.result as unknown as TurnResult }))}
          playerName={userCharacter.nickname}
          enemyName={enemy.name}
          skillDescriptions={skillDescriptions}
          corJogador={corJogador}
          corInimigo={corInimigo}
        />

        <CartaAnimada impacto={impacto.ENEMY} rodada={ultimaRodada}>
          <FighterCard name={enemy.name} imageUrl={enemy.imageUrl} cor={corInimigo} combatant={vilao(state)} />
        </CartaAnimada>
      </div>

      {/* FORMAS EM FAIXA PRÓPRIA, abaixo dos cards. Antes moravam na coluna
          do jogador; com a tira que rola para o lado elas cabem para qualquer
          personagem — de nenhuma forma (a faixa nem aparece) até as seis do
          Goku. */}
      {isActive && availableTransformations.length > 0 && (
        <FaixaDeFormas quantidade={availableTransformations.length} cor={corJogador}>
          {availableTransformations.map((t) => (
            <form key={t.id} action={activateTransformation.bind(null, battleId, t.id)} className="snap-start shrink-0">
              <BotaoDeForma forma={t} energiaAtual={heroi(state).currentEnergy} cor={corJogador} />
            </form>
          ))}
        </FaixaDeFormas>
      )}

      {/* AS AÇÕES OCUPAM A LARGURA INTEIRA. Numa coluna de um terço, oito
          habilidades com nome, custo, efeitos e precisão viravam uma torre que
          só cabia rolando — e rolar para escolher a jogada é rolar TODA rodada.
          Em largura total a mesma lista vira três fileiras curtas. */}
      {isActive && (
        <PainelChanfrado corte={18}>
          <div className="p-4 sm:p-5 space-y-4">
            <TituloDeSecao icone={<Swords className="h-5 w-5" />}>Ações</TituloDeSecao>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              <form action={takeTurn.bind(null, battleId, null)} className="h-full">
                <BotaoDeAtaqueBasico />
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
        </PainelChanfrado>
      )}
    </main>
  )
}
