'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { Crosshair } from 'lucide-react'

/**
 * Em quem o golpe vai, quando há mais de um inimigo de pé.
 *
 * A escolha mora aqui e chega a cada formulário de golpe num campo escondido
 * (CampoDeAlvo), então clicar no golpe envia golpe, postura e alvo juntos.
 *
 * QUEM ESCOLHE É O HUD: clicar num inimigo do HUD de batalha mira nele (ver
 * HudDeBatalha). A linha de botões de "Alvo" que existia nas ações saiu no
 * desenho do HUD — o alvo é escolhido onde a vida dele aparece.
 *
 * Com um inimigo só, nada é enviado: o motor manda o golpe para o primeiro de
 * pé, que é o único.
 */

export type OpcaoDeAlvo = { posicao: number; nome: string; vida: number; vidaMaxima: number }

type Mira = { alvo: number | null; opcoes: OpcaoDeAlvo[]; mirar: (posicao: number) => void }

const Contexto = createContext<Mira>({ alvo: null, opcoes: [], mirar: () => {} })

export function ComAlvo({ opcoes, children }: { opcoes: OpcaoDeAlvo[]; children: ReactNode }) {
  const vivos = opcoes.filter((o) => o.vida > 0)
  const [escolhido, setEscolhido] = useState<number | null>(vivos[0]?.posicao ?? null)
  // O alvo escolhido pode ter caído na rodada: passa para o próximo de pé.
  const valido = vivos.some((o) => o.posicao === escolhido) ? escolhido : (vivos[0]?.posicao ?? null)

  return (
    <Contexto.Provider value={{ alvo: vivos.length > 1 ? valido : null, opcoes: vivos, mirar: setEscolhido }}>
      {children}
    </Contexto.Provider>
  )
}

/** O alvo da rodada e o jeito de mudá-lo — para o HUD. */
export function useMira(): Mira {
  return useContext(Contexto)
}

/** O campo escondido que leva o alvo escolhido em cada formulário de golpe. */
export function CampoDeAlvo() {
  const { alvo } = useContext(Contexto)
  if (alvo === null) return null
  return <input type="hidden" name="alvo" value={alvo} />
}

/** "Alvo: Menos Grande" no cabeçalho das ações, quando há o que escolher. */
export function AlvoAtual({ cor }: { cor: string }) {
  const { alvo, opcoes } = useContext(Contexto)
  if (alvo === null) return null
  const nome = opcoes.find((o) => o.posicao === alvo)?.nome
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <Crosshair className="h-3.5 w-3.5" style={{ color: cor }} />
      Alvo: <b className="font-semibold" style={{ color: cor }}>{nome}</b>
      <span className="hidden sm:inline">· clique no inimigo do HUD para trocar</span>
    </span>
  )
}
