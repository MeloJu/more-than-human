import { ScrollText } from 'lucide-react'
import { PainelChanfrado, TituloDeSecao } from './Moldura'
import { TurnLogEntry } from './TurnLogEntry'
import type { TurnResult } from '@/app/lib/battle/types'

/**
 * O histórico da batalha.
 *
 * DUAS COISAS QUE ELE PRECISA FAZER, e não fazia:
 *
 * 1. NÃO MEXER NO RESTO DA TELA. A altura era `max-h-80`: o log crescia a cada
 *    rodada até bater o teto, e enquanto crescia empurrava a barra de ações
 *    para baixo. Ou seja, o botão que você acabou de clicar mudava de lugar
 *    debaixo do cursor, rodada após rodada, justamente nas primeiras — que são
 *    as que a pessoa está aprendendo a jogar. Altura FIXA resolve: o espaço já
 *    está reservado desde o primeiro turno, e nada abaixo se move nunca.
 *
 * 2. MOSTRAR ONDE UMA RODADA ACABA. Uma rodada produz de duas a cinco linhas —
 *    regeneração, dano contínuo, os dois golpes, transformações. Numa lista
 *    corrida, não dava para saber quais dessas frases foram consequência do
 *    clique que você acabou de dar e quais sobraram da rodada anterior.
 *
 * Os turnos chegam do banco em ordem DECRESCENTE, então a rodada mais recente
 * fica no topo e é a que você lê sem rolar. Dentro de cada rodada a ordem é
 * restaurada para crescente: a leitura de uma rodada é uma narrativa curta, e
 * narrativa ao contrário não se lê.
 */
type TurnoGravado = { id: string; round: number; result: TurnResult }

export function HistoricoDeBatalha({
  turns,
  playerName,
  enemyName,
  skillDescriptions,
  corJogador,
  corInimigo,
}: {
  turns: TurnoGravado[]
  playerName: string
  enemyName: string
  /** Fala da skill ao usar — ver o comentário em TurnLogEntry. */
  skillDescriptions?: Record<string, string>
  /** A barra lateral de cada linha usa a cor de quem agiu, igual aos cards. */
  corJogador?: string | null
  corInimigo?: string | null
}) {
  const rodadas = agruparPorRodada(turns)
  const cJ = corJogador ?? 'var(--accent)'
  const cI = corInimigo ?? 'var(--spirit)'

  return (
    <PainelChanfrado className="h-full">
      <div className="p-4 space-y-3">
        <TituloDeSecao icone={<ScrollText className="h-5 w-5" />}>Histórico</TituloDeSecao>

        {/* h-80 e não max-h-80: ver o comentário do componente. O espaço fica
            reservado mesmo com o log vazio, para a barra de ações nascer no
            lugar definitivo dela. */}
        <div className="h-80 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma ação ainda.</p>
          ) : (
            <ol className="space-y-3">
              {rodadas.map((rodada) => (
                <li key={rodada.chave}>
                  {rodada.numero > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-titulo italic text-[0.75rem] uppercase tracking-widest text-muted shrink-0">
                        Rodada {rodada.numero}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <ul className="space-y-1 text-sm">
                    {rodada.acoes.map((t) => (
                      <li
                        key={t.id}
                        /* A barra colorida na lateral diz de quem foi a ação
                           sem gastar uma palavra — na MESMA cor do card de
                           quem agiu, então o log e os cards falam a mesma
                           língua. */
                        className={`border-l-2 pl-2 ${t.result.side === 'PLAYER' ? 'opacity-90' : 'opacity-75'}`}
                        style={{
                          borderColor: `color-mix(in srgb, ${t.result.side === 'PLAYER' ? cJ : cI} 60%, transparent)`,
                        }}
                      >
                        <TurnLogEntry turn={t.result} playerName={playerName} enemyName={enemyName} skillDescriptions={skillDescriptions} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </PainelChanfrado>
  )
}

/**
 * Agrupa as ações por rodada, preservando a ordem em que chegaram.
 *
 * Rodada 0 significa "gravado antes de a coluna existir" (ver Turn.round no
 * schema). Cada uma dessas vira o próprio grupo, sem cabeçalho: batalhas
 * antigas aparecem como a lista corrida que sempre foram, em vez de todas
 * amontoadas numa rodada falsa que nunca aconteceu.
 */
function agruparPorRodada(turns: TurnoGravado[]) {
  const grupos: { chave: string; numero: number; acoes: TurnoGravado[] }[] = []

  for (const t of turns) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && t.round > 0 && ultimo.numero === t.round) {
      ultimo.acoes.push(t)
      continue
    }
    grupos.push({ chave: t.id, numero: t.round, acoes: [t] })
  }

  // Os turnos vêm decrescentes para a rodada mais nova ficar no topo; dentro
  // dela a ordem original é a narrativa, então volta a ser crescente.
  for (const g of grupos) g.acoes.reverse()
  return grupos
}
