import type { ReactNode } from 'react'
import { Swords } from 'lucide-react'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { BotaoDeAtaqueBasico, BotaoDeHabilidade } from '@/app/components/battle/BotaoDeHabilidade'
import { BotaoDeBloqueio } from '@/app/components/battle/BotaoDeBloqueio'
import { BotaoDeForma } from '@/app/components/battle/BotaoDeForma'
import { CampoDePostura, ComPostura, type OpcaoDePostura } from '@/app/components/battle/SeletorDePostura'
import { AlvoAtual, CampoDeAlvo } from '@/app/components/battle/SeletorDeAlvo'
import { MenuCompacto } from '@/app/components/battle/MenuCompacto'
import { FaixaDeTroca } from '@/app/components/battle/Invocacoes'
import { COR_DA_RARIDADE } from '@/app/components/itens/CartaDeItem'
import { custoDaPostura, custoDeErguerGuarda } from '@/app/lib/battle/engine'
import { comandoDoGolpe, evolucaoDoGolpe, golpeDeOrdem, ordensDisponiveis, pokemonEmCampo } from '@/app/lib/battle/invocacoes'
import type { CombatantState, SkillDef, TransformationDef } from '@/app/lib/battle/types'

type Acao = (formData: FormData) => void | Promise<void>

/** Uma linha da mochila: a poção e quantas a conta tem. */
export type PocaoNaMochila = {
  id: string
  itemId: string
  quantidade: number
  item: { nome: string; marca: string; descricao: string; raridade: string }
}

/**
 * O painel de ações da luta: postura, golpes, ordens, bloqueio, e os menus de
 * Formas e Mochila no fim da linha das posturas (ver HudDeBatalha para o
 * desenho).
 *
 * É o mesmo na luta contra a IA e no PvP — o que muda é só para onde cada
 * botão envia, e por isso as actions chegam prontas em `acoes`. A página
 * decide o que é legal mostrar (golpes, formas, poções); o servidor confere
 * tudo de novo na action, porque todas são alcançáveis por POST direto.
 *
 * O ALVO não mora aqui: o ComAlvo envolve a página inteira, porque quem
 * escolhe o alvo é o HUD.
 */
export function PainelDeAcoes({
  cor,
  corInimigo,
  combatente,
  time,
  golpes,
  formas,
  pocoes,
  rodada,
  acoes,
  status,
  travado,
}: {
  cor: string
  corInimigo: string
  /** Quem joga: o índice 0 do próprio lado. */
  combatente: CombatantState
  /** O lado de quem joga, para as ordens às invocações e a troca do treinador. */
  time: CombatantState[]
  /** Todos os golpes equipados; o filtro do treinador é feito aqui. */
  golpes: SkillDef[]
  /** As formas que podem ser liberadas agora. */
  formas: TransformationDef[]
  pocoes: PocaoNaMochila[]
  /** A rodada atual: o seletor de postura volta para a Neutra a cada uma. */
  rodada: number
  acoes: {
    golpe: (skillId: string | null) => Acao
    ordem: (posicao: number) => Acao
    trocar: (posicao: number) => Acao
    bloquear: Acao
    forma: (transformationId: string) => Acao
    item: (itemId: string) => Acao
  }
  /** Uma linha de situação abaixo do título (no PvP: quem já escolheu). */
  status?: ReactNode
  /** Jogada já enviada (PvP): mostra isto no lugar dos botões. */
  travado?: ReactNode
}) {
  // TREINADOR (o Red): não luta, então os botões são só os golpes do Pokémon
  // em campo (e a Mega Evolução, com o Charizard), sem bloqueio; a troca fica
  // numa faixa própria.
  const souTreinador = Boolean(combatente.treinador)
  const pokemonNoCampo = pokemonEmCampo(time, 0)?.def.id
  const golpesVisiveis = golpes.filter(
    (s) => !souTreinador || (comandoDoGolpe(s) ?? evolucaoDoGolpe(s)?.de) === pokemonNoCampo
  )

  // As posturas, com o custo JÁ para este combatente (ver custoDaPostura).
  const posturas: OpcaoDePostura[] = (
    [
      ['NEUTRA', 'Neutra', 'Sem postura. Recupera stamina a mais nesta rodada.'],
      ['ESQUIVA', 'Esquivar', 'Chance de desviar do golpe inteiro. Não funciona contra golpe em área.'],
      ['APARAR', 'Aparar', 'Anula golpe corpo a corpo e contra-ataca. Contra golpe à distância, não adianta.'],
      ['GUARDA', 'Guarda', 'Reduz o dano de qualquer golpe, pagando o que absorve em stamina.'],
      ['IMPETO', 'Ímpeto', 'Seu golpe bate mais forte, mas você também apanha mais.'],
    ] as const
  ).map(([postura, nome, resumo]) => ({ postura, nome, resumo, custo: custoDaPostura(combatente, postura) }))

  return (
    // Tingido na cor do jogador: são as jogadas DELE, e o painel pertence ao
    // lado esquerdo da cena.
    <PainelChanfrado corte={18} cor={`color-mix(in srgb, ${cor} 45%, var(--border))`} tinta>
      <div className="p-4 sm:p-5 space-y-4">
        <TituloDeSecao icone={<Swords className="h-5 w-5" style={{ color: cor }} />} direita={<AlvoAtual cor={corInimigo} />}>
          Ações
        </TituloDeSecao>
        {status && <p className="text-xs text-muted">{status}</p>}

        {travado ?? (
          <>
            {souTreinador && <FaixaDeTroca time={time} dono={0} acao={acoes.trocar} />}
            {/* A chave é a rodada: o seletor volta para a Neutra a cada uma —
                ver SeletorDePostura. Formas e Mochila ficam no fim da linha. */}
            <ComPostura
              key={rodada}
              opcoes={posturas}
              stamina={combatente.currentStamina ?? 0}
              cor={cor}
              extra={
                <>
                  {formas.length > 0 && (
                    <MenuCompacto
                      rotulo="Formas"
                      marca="変"
                      cor={cor}
                      contagem={formas.length}
                      aviso="Liberar uma forma muda seus atributos enquanto ela durar."
                    >
                      {formas.map((t) => (
                        <form key={t.id} action={acoes.forma(t.id)}>
                          <BotaoDeForma
                            forma={t}
                            energiaAtual={combatente.currentEnergy}
                            staminaAtual={combatente.currentStamina ?? 0}
                            cor={cor}
                          />
                        </form>
                      ))}
                    </MenuCompacto>
                  )}
                  {pocoes.length > 0 && (
                    <MenuCompacto
                      rotulo="Mochila"
                      marca="薬"
                      cor="#86efac"
                      contagem={pocoes.reduce((soma, p) => soma + p.quantidade, 0)}
                      aviso="Beber gasta a rodada."
                    >
                      {pocoes.map((linha) => {
                        const corDoItem = COR_DA_RARIDADE[linha.item.raridade] ?? COR_DA_RARIDADE.COMUM
                        return (
                          <form key={linha.id} action={acoes.item(linha.itemId)}>
                            <button
                              type="submit"
                              role="menuitem"
                              className="grid w-[16rem] max-w-full grid-cols-[1.75rem_1fr_auto] items-center gap-2 px-1.5 py-1.5 text-left transition-colors hover:bg-white/5"
                              style={{ borderRadius: '2px 8px 2px 8px' }}
                            >
                              <span aria-hidden className="font-kanji text-lg text-center" style={{ color: corDoItem }}>
                                {linha.item.marca}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">{linha.item.nome}</span>
                                <span className="block truncate text-xs text-muted">{linha.item.descricao}</span>
                              </span>
                              <span className="text-xs tabular-nums text-muted">×{linha.quantidade}</span>
                            </button>
                          </form>
                        )
                      })}
                    </MenuCompacto>
                  )}
                </>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch mt-4">
                {/* No treinador, o ataque básico é a Investida do Pokémon em campo. */}
                {(!souTreinador || pokemonNoCampo) && (
                  <form action={acoes.golpe(null)} className="h-full">
                    <CampoDePostura />
                    <CampoDeAlvo />
                    <BotaoDeAtaqueBasico />
                  </form>
                )}
                {golpesVisiveis.map((skill) => (
                  <form key={skill.id} action={acoes.golpe(skill.id)} className="h-full">
                    <CampoDePostura />
                    <CampoDeAlvo />
                    <BotaoDeHabilidade skill={skill} combatente={combatente} />
                  </form>
                ))}
                {/* A ORDEM para a invocação em campo: o especial dela no lugar
                    do ataque sozinho. Só aparece quando há quem obedeça. */}
                {ordensDisponiveis(time, 0).map(({ posicao, def }) => {
                  const golpe = golpeDeOrdem(def, posicao)
                  if (!golpe) return null
                  return (
                    <form key={golpe.id} action={acoes.ordem(posicao)} className="h-full">
                      <CampoDePostura />
                      <CampoDeAlvo />
                      <BotaoDeHabilidade skill={golpe} combatente={combatente} />
                    </form>
                  )
                })}
                {!souTreinador && (
                  <form action={acoes.bloquear} className="h-full">
                    <BotaoDeBloqueio combatente={combatente} custo={custoDeErguerGuarda(combatente)} />
                  </form>
                )}
              </div>
            </ComPostura>
          </>
        )}
      </div>
    </PainelChanfrado>
  )
}
