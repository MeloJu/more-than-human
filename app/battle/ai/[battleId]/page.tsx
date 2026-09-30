import { prisma } from '@/app/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/app/lib/session'
import { activateTransformation, takeTurn, blockTurn, darOrdem, trocarPokemon } from '@/app/lib/battle/actions'
import { getBattleView, getEquippedSkills, getPlayerTransformations } from '@/app/lib/battle/queries'
import { getRetratosDosFalantes, getStageOutro, parseDialogo } from '@/app/lib/story/queries'
import { CenaDeDialogo } from '@/app/components/story/CenaDeDialogo'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { FighterCard } from '@/app/components/battle/FighterCard'
import { FaixaDeAliado } from '@/app/components/battle/FaixaDeAliado'
import { BotaoDeForma } from '@/app/components/battle/BotaoDeForma'
import { BotaoDeHabilidade } from '@/app/components/battle/BotaoDeHabilidade'
import { HistoricoDeBatalha } from '@/app/components/battle/HistoricoDeBatalha'
import { CartaAnimada } from '@/app/components/battle/CartaAnimada'
import { BotaoDeBloqueio } from '@/app/components/battle/BotaoDeBloqueio'
import { BotaoDeAtaqueBasico } from '@/app/components/battle/BotaoDeHabilidade'
import { CabecalhoDeBatalha } from '@/app/components/battle/CabecalhoDeBatalha'
import { FaixaDeFormas } from '@/app/components/battle/FaixaDeFormas'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { FundoDoConfronto } from '@/app/components/battle/FundoDoConfronto'
import { coresDoConfronto } from '@/app/lib/battle/cores'
import { Swords } from 'lucide-react'
import { custoDaPostura, custoDeErguerGuarda, heroi, migrarEstado, vilao } from '@/app/lib/battle/engine'
import { CampoDePostura, ComPostura, type OpcaoDePostura } from '@/app/components/battle/SeletorDePostura'
import { CampoDeAlvo, ComAlvo } from '@/app/components/battle/SeletorDeAlvo'
import { AvisoDoChefe } from '@/app/components/battle/AvisoDoChefe'
import { FaixaDeInvocacao, FaixaDeTroca, OrbesDeInvocacao, gruposDoDono } from '@/app/components/battle/Invocacoes'
import { COR_DA_RARIDADE } from '@/app/components/itens/CartaDeItem'
import type { Recompensa } from '@/app/lib/raid/loot'
import {
  comandoDoGolpe,
  emCampo,
  evolucaoDoGolpe,
  golpeDeOrdem,
  ordensDisponiveis,
  pokemonEmCampo,
} from '@/app/lib/battle/invocacoes'
import { TelaDeVersus } from '@/app/components/battle/TelaDeVersus'
import { alcanceDe } from '@/app/lib/battle/alcance'
import { toSkillDef } from '@/app/lib/battle/queries'
import { raidPorSlug } from '@/app/lib/raid/catalogo'
import { recompensaDaRaid } from '@/app/lib/raid/andares'
import { seguirNaRaid } from '@/app/lib/raid/actions'
import { impactoDe, impactoPorLutador } from '@/app/lib/battle/rodada'
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
  const isRaid = !isStory && (battle.raidRunId !== null || battle.enemyMonsterId !== null)

  // O andar de raid que esta luta é: nome do lugar, posição na torre, e como
  // a incursão ficou depois dela.
  const raidRun = battle.raidRunId
    ? await prisma.raidRun.findUnique({ where: { id: battle.raidRunId }, select: { id: true, raid: true, andar: true, status: true } })
    : null
  const raid = raidRun ? raidPorSlug(raidRun.raid) : undefined
  const andarDaLuta = raid && battle.andar !== null ? raid.andares[battle.andar] : undefined
  const proximoAndar = raid && raidRun?.status === 'ATIVA' ? raid.andares[raidRun.andar] : undefined

  const modeLabel = isStory
    ? 'Modo: História'
    : raid && andarDaLuta
      ? `Raid · ${raid.nome} · Andar ${(battle.andar ?? 0) + 1}/${raid.andares.length}: ${andarDaLuta.nome}`
      : isRaid
        ? 'Modo: Raid'
        : 'Modo: IA'
  const backHref = isStory ? '/story' : isRaid ? '/battle/raid' : '/battle/ai'
  const backLabel = isStory ? 'Voltar à História' : isRaid ? 'Voltar à Raid' : 'Nova Batalha'

  const [playerSkills, playerTransformations] = await Promise.all([
    getEquippedSkills(userCharacter.id),
    getPlayerTransformations(userCharacter.characterId, userCharacter.level),
  ])

  // Só do lado do jogador por agora — o inimigo de IA não carrega skill pra
  // esta tela (só nome/retrato), então a fala dele ficaria maior escopo do
  // que vale hoje. Ver TurnLogEntry para onde isto é lido.
  const falas = Object.fromEntries(
    Object.values(playerSkills)
      .filter((s): s is typeof s & { fala: string } => Boolean(s.fala))
      .map((s) => [s.name, s.fala])
  )

  // O que cada lutador SOFREU na rodada mais recente, para a tela poder
  // encenar o golpe em vez de só mostrar o número novo. Os turnos chegam em
  // ordem decrescente, então a primeira rodada que aparece é a última que
  // aconteceu. Ver app/lib/battle/rodada.ts.
  const ultimaRodada = turns[0]?.round ?? 0
  const impacto = impactoPorLutador(
    turns.filter((t) => t.round === ultimaRodada).map((t) => t.result as unknown as TurnResult)
  )

  // Quem luta além do principal de cada lado: a party (os contratados) e os
  // demais inimigos de um andar. A posição é o índice no estado; o 0 de cada
  // lado é o principal e não está nesta tabela.
  const participantes = await prisma.battleParticipant.findMany({
    where: { battleId: battle.id },
    orderBy: { posicao: 'asc' },
    include: {
      character: { select: { name: true, imageUrl: true, corDestaque: true } },
      monster: { select: { name: true, imageUrl: true } },
    },
  })
  const party = participantes.filter((p) => p.lado === 'PLAYER')
  const inimigosExtras = participantes.filter((p) => p.lado === 'ENEMY')
  // O nome gravado no estado vence o do catálogo: é ele que numera os
  // repetidos ("Hollow 2").
  const nomeDe = (p: (typeof participantes)[number], lado: 'aliados' | 'inimigos') =>
    state[lado][p.posicao]?.nome ?? p.character?.name ?? p.monster?.name ?? 'Lutador'
  const nomesAliados: string[] = [userCharacter.nickname]
  for (const p of party) nomesAliados[p.posicao] = nomeDe(p, 'aliados')
  const nomesInimigos: string[] = [state.inimigos[0]?.nome ?? enemy.name]
  for (const p of inimigosExtras) nomesInimigos[p.posicao] = nomeDe(p, 'inimigos')
  // As invocações moram no mesmo array, depois dos lutadores, e não estão na
  // tabela de participantes: o nome delas vem do estado ("Maldição 2").
  state.aliados.forEach((c, i) => {
    if (c.invocacao) nomesAliados[i] = c.nome ?? 'Invocação'
  })
  state.inimigos.forEach((c, i) => {
    if (c.invocacao) nomesInimigos[i] = c.nome ?? 'Invocação'
  })
  const invocacoesAliadas = state.aliados.map((c, posicao) => ({ c, posicao })).filter(({ c }) => emCampo(c))
  const invocacoesInimigas = state.inimigos.map((c, posicao) => ({ c, posicao })).filter(({ c }) => emCampo(c))
  // TREINADOR (o Red): não luta, então os botões são só os golpes do Pokémon
  // em campo (e a Mega Evolução, com o Charizard), sem ataque básico nem
  // bloqueio; a troca fica numa faixa própria.
  const souTreinador = Boolean(heroi(state).treinador)
  const pokemonNoCampo = pokemonEmCampo(state.aliados, 0)?.def.id
  const golpesVisiveis = Object.values(playerSkills).filter(
    (s) => !souTreinador || (comandoDoGolpe(s) ?? evolucaoDoGolpe(s)?.de) === pokemonNoCampo
  )
  const orbesDe = (lado: 'aliados' | 'inimigos', dono: number, skills: Parameters<typeof gruposDoDono>[2] = []) => {
    const grupos = gruposDoDono(state[lado], dono, skills)
    return grupos.length > 0 ? <OrbesDeInvocacao grupos={grupos} time={state[lado]} dono={dono} /> : undefined
  }
  const idsDeFormaDaParty = participantes
    .map((p) => state[p.lado === 'PLAYER' ? 'aliados' : 'inimigos'][p.posicao]?.activeTransformationId)
    .filter((id): id is string => Boolean(id))
  // O chefe do andar: o que ele carrega, quem ele persegue, se está exposto,
  // e se acabou de virar de fase. Tudo lido do estado — o aviso diz o que o
  // motor VAI fazer, não um palpite da tela.
  const inimigoDoAndar = andarDaLuta?.inimigos[0]
  const chefe = inimigoDoAndar && 'personagem' in inimigoDoAndar && inimigoDoAndar.perfil ? inimigoDoAndar : undefined
  const carga = chefe ? vilao(state).carregando : undefined
  const golpeCarregado = carga ? await prisma.skill.findUnique({ where: { id: carga.skillId } }) : null
  const agressorDoChefe = vilao(state).maiorAgressor
  const virouDeFase =
    chefe?.perfil?.faseDois &&
    turns.some(
      (t) =>
        t.round === ultimaRodada &&
        (t.result as unknown as TurnResult).kind === 'TRANSFORM' &&
        (t.result as unknown as TurnResult).side === 'ENEMY' &&
        ((t.result as unknown as TurnResult).posicao ?? 0) === 0
    )

  // O ESPÓLIO do andar vencido (ver sortearLoot), com o kanji e a raridade de
  // cada material para o painel de fim de andar.
  const espolio = battle.recompensas as unknown as Recompensa | null
  const itensDoEspolio = espolio?.itens.length
    ? await prisma.item.findMany({ where: { nome: { in: espolio.itens.map((i) => i.nome) } }, select: { nome: true, marca: true, raridade: true } })
    : []

  const formasDaParty = idsDeFormaDaParty.length
    ? await prisma.transformation.findMany({ where: { id: { in: idsDeFormaDaParty } }, select: { id: true, name: true } })
    : []

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

  // A IA também se transforma (ver acaoDaIa). Só o nome é preciso aqui, então
  // uma leitura pontual em vez de carregar todas as formas do inimigo.
  const idDaFormaDoInimigo = vilao(state).activeTransformationId
  const formaAtivaDoInimigo = idDaFormaDoInimigo
    ? await prisma.transformation.findUnique({ where: { id: idDaFormaDoInimigo }, select: { name: true } })
    : null


  // As posturas, com o custo JÁ para este combatente (ver custoDaPostura).
  const posturas: OpcaoDePostura[] = (
    [
      ['NEUTRA', 'Neutra', 'Sem postura. Recupera stamina a mais nesta rodada.'],
      ['ESQUIVA', 'Esquivar', 'Chance de desviar do golpe inteiro. Não funciona contra golpe em área.'],
      ['APARAR', 'Aparar', 'Anula golpe corpo a corpo e contra-ataca. Contra golpe à distância, não adianta.'],
      ['GUARDA', 'Guarda', 'Reduz o dano de qualquer golpe, pagando o que absorve em stamina.'],
      ['IMPETO', 'Ímpeto', 'Seu golpe bate mais forte, mas você também apanha mais.'],
    ] as const
  ).map(([postura, nome, resumo]) => ({ postura, nome, resumo, custo: custoDaPostura(heroi(state), postura) }))

  // A cor de cada lado vem da arte do personagem, e a guarda de contraste
  // garante que os dois lados nunca saiam iguais: se colidirem (Ichigo e Jean
  // Grey, laranja e amarelo), o adversário troca para a cor secundária dele.
  // Ver app/lib/battle/cores.ts.
  const { jogador: corJogador, inimigo: corInimigo } = coresDoConfronto(
    { primaria: userCharacter.character.corDestaque, secundaria: userCharacter.character.corSecundaria },
    { primaria: enemy.corDestaque, secundaria: enemy.corSecundaria }
  )

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <FundoDoConfronto corJogador={corJogador} corInimigo={corInimigo} />
      {/* A entrada, só na luta recém-criada (e uma vez por navegador). */}
      {isActive && battle.turnNumber === 1 && turns.length === 0 && (
        <TelaDeVersus
          chave={battle.id}
          local={modeLabel.replace(/^Modo: /, '')}
          esquerda={[
            {
              nome: userCharacter.nickname,
              imagem: userCharacter.character.imageUrl,
              cor: corJogador ?? '#ff6b1a',
              linha: `Nível ${userCharacter.level} · ${userCharacter.character.name}`,
            },
            ...party.map((p) => ({
              nome: nomesAliados[p.posicao] ?? 'Aliado',
              imagem: p.character?.imageUrl ?? null,
              cor: p.character?.corDestaque ?? '#a1a1aa',
              linha: `Nível ${p.nivel} · aliado`,
            })),
          ]}
          direita={{
            nome: nomesInimigos[0],
            imagem: enemy.imageUrl,
            cor: corInimigo ?? '#4dd0e1',
            linha: `Nível ${vilao(state).nivel ?? 1}${inimigosExtras.length ? ` · e mais ${inimigosExtras.length}` : ''}`,
          }}
          rotuloDaDireita={chefe ? 'Chefe do andar' : undefined}
          fala={chefe?.falaDeEntrada}
        />
      )}
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
            {raid ? (
              // FIM DE ANDAR: o que vem agora depende de como a incursão ficou.
              <div className="space-y-3">
                {espolio && (espolio.itens.length > 0 || espolio.equipamento) && (
                  <div className="space-y-2">
                    <div className="kicker">Espólio</div>
                    <div className="flex flex-wrap gap-2">
                      {espolio.equipamento && (
                        <span
                          className="inline-flex items-center gap-2 border px-2.5 py-1 text-sm font-semibold"
                          style={{ borderColor: COR_DA_RARIDADE.EPICO, borderRadius: '2px 8px 2px 8px', boxShadow: `0 0 14px ${COR_DA_RARIDADE.EPICO}` }}
                        >
                          ★ {espolio.equipamento}
                        </span>
                      )}
                      {espolio.itens.map((i) => {
                        const def = itensDoEspolio.find((d) => d.nome === i.nome)
                        const cor = COR_DA_RARIDADE[def?.raridade ?? 'COMUM']
                        return (
                          <span
                            key={i.nome}
                            className="inline-flex items-center gap-2 border px-2.5 py-1 text-sm"
                            style={{ borderColor: `color-mix(in srgb, ${cor} 60%, var(--border))`, borderRadius: '2px 8px 2px 8px' }}
                          >
                            <span aria-hidden className="font-kanji" style={{ color: cor }}>
                              {def?.marca}
                            </span>
                            {i.nome} <span className="tabular-nums text-muted">×{i.quantidade}</span>
                          </span>
                        )
                      })}
                    </div>
                    {espolio.equipamento && (
                      <p className="text-sm opacity-80">{espolio.equipamento} foi para o seu inventário. Equipe em Equipamento.</p>
                    )}
                  </div>
                )}
                {raidRun?.status === 'ATIVA' && proximoAndar && (
                  <>
                    <p className="text-sm opacity-80">
                      Andar limpo. A party segue como está: nada de vida ou energia volta entre os andares.
                    </p>
                    <form action={seguirNaRaid.bind(null, raidRun.id)}>
                      <button type="submit" className="btn-primary px-4 py-2 text-sm">
                        Subir para o andar {raidRun.andar + 1}: {proximoAndar.nome}
                      </button>
                    </form>
                  </>
                )}
                {raidRun?.status === 'VENCIDA' && (
                  <p className="text-sm">
                    {raid.nome} vencida. +{recompensaDaRaid(userCharacter.level)} moedas pela raid.
                  </p>
                )}
                {raidRun?.status === 'PERDIDA' && (
                  <p className="text-sm opacity-80">A incursão em {raid.nome} acabou aqui.</p>
                )}
                <Link href={backHref} className="btn-ghost inline-block px-4 py-2 text-sm">
                  {backLabel}
                </Link>
              </div>
            ) : desfecho.length > 0 ? (
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
        <CartaAnimada impacto={impactoDe(impacto, 'PLAYER')} rodada={ultimaRodada}>
          <FighterCard
            name={userCharacter.nickname}
            imageUrl={userCharacter.character.imageUrl}
            cor={corJogador}
            levelBadge={userCharacter.level}
            transformationName={formaAtivaDoJogador?.name}
            combatant={heroi(state)}
            orbes={orbesDe('aliados', 0, Object.values(playerSkills))}
          />
        </CartaAnimada>

        <HistoricoDeBatalha
          turns={turns.map((t) => ({ id: t.id, round: t.round, result: t.result as unknown as TurnResult }))}
          playerName={userCharacter.nickname}
          enemyName={enemy.name}
          nomesAliados={nomesAliados}
          nomesInimigos={nomesInimigos}
          falas={falas}
          corJogador={corJogador}
          corInimigo={corInimigo}
        />

        <CartaAnimada impacto={impactoDe(impacto, 'ENEMY')} rodada={ultimaRodada}>
          <FighterCard
            name={nomesInimigos[0]}
            imageUrl={enemy.imageUrl}
            cor={corInimigo}
            levelBadge={vilao(state).nivel}
            transformationName={formaAtivaDoInimigo?.name}
            combatant={vilao(state)}
            orbes={orbesDe('inimigos', 0)}
          />
        </CartaAnimada>
      </div>

      {/* A PARTY, em faixas logo abaixo das cartas: os aliados jogam sozinhos,
          então o que importa deles é quem está de pé e quanto aguenta. */}
      {(participantes.length > 0 || invocacoesAliadas.length > 0 || invocacoesInimigas.length > 0) && (
        // Aliados à esquerda, inimigos à direita: o mesmo lado da carta grande
        // de cada um. As invocações vêm antes da party: são do principal, e
        // ficam logo abaixo da carta dele.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            {invocacoesAliadas.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {invocacoesAliadas.map(({ c, posicao }) => (
                  <CartaAnimada key={posicao} impacto={impactoDe(impacto, 'PLAYER', posicao)} rodada={ultimaRodada}>
                    <FaixaDeInvocacao combatente={c} dono={nomesAliados[c.invocacao?.dono ?? 0] ?? userCharacter.nickname} />
                  </CartaAnimada>
                ))}
              </div>
            )}
            {party.map((p) => {
              const combatente = state.aliados[p.posicao]
              if (!combatente) return null
              return (
                <CartaAnimada key={p.id} impacto={impactoDe(impacto, 'PLAYER', p.posicao)} rodada={ultimaRodada}>
                  <FaixaDeAliado
                    nome={nomesAliados[p.posicao]}
                    imageUrl={p.character?.imageUrl ?? null}
                    nivel={p.nivel}
                    cor={p.character?.corDestaque}
                    formaAtiva={formasDaParty.find((f) => f.id === combatente.activeTransformationId)?.name}
                    combatente={combatente}
                    orbes={orbesDe('aliados', p.posicao)}
                  />
                </CartaAnimada>
              )
            })}
          </div>
          <div className="space-y-4">
            {invocacoesInimigas.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {invocacoesInimigas.map(({ c, posicao }) => (
                  <CartaAnimada key={posicao} impacto={impactoDe(impacto, 'ENEMY', posicao)} rodada={ultimaRodada}>
                    <FaixaDeInvocacao combatente={c} dono={nomesInimigos[c.invocacao?.dono ?? 0] ?? enemy.name} />
                  </CartaAnimada>
                ))}
              </div>
            )}
            {inimigosExtras.map((p) => {
              const combatente = state.inimigos[p.posicao]
              if (!combatente) return null
              return (
                <CartaAnimada key={p.id} impacto={impactoDe(impacto, 'ENEMY', p.posicao)} rodada={ultimaRodada}>
                  <FaixaDeAliado
                    nome={nomesInimigos[p.posicao]}
                    imageUrl={p.character?.imageUrl ?? p.monster?.imageUrl ?? null}
                    nivel={p.nivel}
                    cor={p.character?.corDestaque ?? corInimigo}
                    formaAtiva={formasDaParty.find((f) => f.id === combatente.activeTransformationId)?.name}
                    combatente={combatente}
                    rotulo="Inimigo"
                    orbes={orbesDe('inimigos', p.posicao)}
                  />
                </CartaAnimada>
              )
            })}
          </div>
        </div>
      )}

      {isActive && chefe && (
        <AvisoDoChefe
          nome={nomesInimigos[0]}
          carga={
            carga && golpeCarregado
              ? {
                  golpe: golpeCarregado.name,
                  alcance: alcanceDe(toSkillDef(golpeCarregado)),
                  alvo: carga.alvo !== undefined ? nomesAliados[carga.alvo] : undefined,
                }
              : undefined
          }
          presa={
            chefe.perfil?.predador && agressorDoChefe !== undefined && (state.aliados[agressorDoChefe]?.currentHp ?? 0) > 0
              ? nomesAliados[agressorDoChefe]
              : undefined
          }
          exposto={(vilao(state).exposto ?? 0) > 0}
          faseDois={
            virouDeFase && chefe.perfil?.faseDois
              ? { forma: chefe.perfil.faseDois.forma, fala: chefe.falaDaFaseDois }
              : undefined
          }
        />
      )}

      {/* FORMAS EM FAIXA PRÓPRIA, abaixo dos cards. Antes moravam na coluna
          do jogador; com a tira que rola para o lado elas cabem para qualquer
          personagem — de nenhuma forma (a faixa nem aparece) até as seis do
          Goku. */}
      {isActive && availableTransformations.length > 0 && (
        <FaixaDeFormas quantidade={availableTransformations.length} cor={corJogador}>
          {availableTransformations.map((t) => (
            <form key={t.id} action={activateTransformation.bind(null, battleId, t.id)} className="snap-start shrink-0">
              <BotaoDeForma
                forma={t}
                energiaAtual={heroi(state).currentEnergy}
                staminaAtual={heroi(state).currentStamina ?? 0}
                cor={corJogador}
              />
            </form>
          ))}
        </FaixaDeFormas>
      )}

      {/* AS AÇÕES OCUPAM A LARGURA INTEIRA. Numa coluna de um terço, oito
          habilidades com nome, custo, efeitos e precisão viravam uma torre que
          só cabia rolando — e rolar para escolher a jogada é rolar TODA rodada.
          Em largura total a mesma lista vira três fileiras curtas. */}
      {/* Tingido na cor do jogador: são as jogadas DELE, e o painel pertence
          ao lado esquerdo da cena. */}
      {isActive && (
        <PainelChanfrado corte={18} cor={`color-mix(in srgb, ${corJogador} 45%, var(--border))`} tinta>
          <div className="p-4 sm:p-5 space-y-4">
            <TituloDeSecao icone={<Swords className="h-5 w-5" style={{ color: corJogador }} />}>Ações</TituloDeSecao>
            {/* A chave é a rodada: o seletor volta para a Neutra a cada uma —
                ver SeletorDePostura. */}
            {/* Sem chave de rodada, ao contrário da postura: o alvo escolhido
                continua o mesmo de uma rodada para a outra (focar um inimigo é
                o normal), e se ele cair o seletor passa para o próximo de pé. */}
            {souTreinador && (
              <FaixaDeTroca time={state.aliados} dono={0} acao={(posicao) => trocarPokemon.bind(null, battleId, posicao)} />
            )}
            {/* Treinador inimigo e Pokémon na pokébola não são alvo. */}
            <ComAlvo
              cor={corInimigo}
              opcoes={state.inimigos
                .map((c, posicao) => ({ c, posicao }))
                .filter(({ c }) => !c.treinador && !c.invocacao?.fora)
                .map(({ c, posicao }) => ({
                  posicao,
                  nome: nomesInimigos[posicao] ?? enemy.name,
                  vida: c.currentHp,
                  vidaMaxima: c.maxHp,
                }))}
            >
              <ComPostura key={ultimaRodada} opcoes={posturas} stamina={heroi(state).currentStamina ?? 0} cor={corJogador}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch mt-4">
                  {/* No treinador, o ataque básico é a Investida do Pokémon em campo. */}
                  {(!souTreinador || pokemonNoCampo) && (
                    <form action={takeTurn.bind(null, battleId, null)} className="h-full">
                      <CampoDePostura />
                      <CampoDeAlvo />
                      <BotaoDeAtaqueBasico />
                    </form>
                  )}
                  {golpesVisiveis.map((skill) => (
                    <form key={skill.id} action={takeTurn.bind(null, battleId, skill.id)} className="h-full">
                      <CampoDePostura />
                      <CampoDeAlvo />
                      <BotaoDeHabilidade skill={skill} combatente={heroi(state)} />
                    </form>
                  ))}
                  {/* A ORDEM para a invocação em campo: o especial dela no
                      lugar do ataque sozinho. Só aparece quando há quem obedeça. */}
                  {ordensDisponiveis(state.aliados, 0).map(({ posicao, def }) => {
                    const golpe = golpeDeOrdem(def, posicao)
                    if (!golpe) return null
                    return (
                      <form key={golpe.id} action={darOrdem.bind(null, battleId, posicao)} className="h-full">
                        <CampoDePostura />
                        <CampoDeAlvo />
                        <BotaoDeHabilidade skill={golpe} combatente={heroi(state)} />
                      </form>
                    )
                  })}
                  {!souTreinador && (
                    <form action={blockTurn.bind(null, battleId)} className="h-full">
                      <BotaoDeBloqueio combatente={heroi(state)} custo={custoDeErguerGuarda(heroi(state))} />
                    </form>
                  )}
                </div>
              </ComPostura>
            </ComAlvo>
          </div>
        </PainelChanfrado>
      )}
    </main>
  )
}
