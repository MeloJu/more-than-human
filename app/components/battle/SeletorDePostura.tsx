'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Postura } from '@/app/lib/battle/types'

/**
 * Escolha da postura da rodada, que vai JUNTO com o golpe.
 *
 * As ações são formulários do servidor, um por golpe. A postura escolhida aqui
 * chega em cada um deles por um campo escondido (CampoDePostura), então
 * clicar em qualquer golpe envia golpe e postura juntos, sem um segundo passo.
 *
 * Volta para a Neutra a cada rodada: o componente é remontado pela página com
 * a rodada como chave. Postura custa stamina, e herdar a da rodada anterior
 * sem perceber seria gastar a reserva por esquecimento.
 *
 * A linha das posturas é a de cima das ações; Formas e Mochila entram no fim
 * dela (`extra`), e embaixo ficam só os golpes — desenho aprovado no
 * protótipo do HUD de batalha (design/batalha/hud-de-batalha.html).
 */

const Contexto = createContext<Postura>('NEUTRA')

export type OpcaoDePostura = {
  postura: Postura
  nome: string
  resumo: string
  custo: number
}

export function ComPostura({
  opcoes,
  stamina,
  cor,
  extra,
  children,
}: {
  opcoes: OpcaoDePostura[]
  stamina: number
  cor: string
  /**
   * O que fica no fim da linha das posturas: os menus compactos de Formas e
   * Mochila (ver MenuCompacto). A linha é a de cima das ações, e juntar os
   * três nela deixa embaixo só os golpes.
   */
  extra?: ReactNode
  children: ReactNode
}) {
  const [escolhida, setEscolhida] = useState<Postura>('NEUTRA')

  return (
    <Contexto.Provider value={escolhida}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Postura da rodada">
          {opcoes.map((o) => {
            const semStamina = o.custo > stamina
            const ativa = escolhida === o.postura
            return (
              <button
                key={o.postura}
                type="button"
                role="radio"
                aria-checked={ativa}
                disabled={semStamina}
                title={semStamina ? `Falta stamina: custa ${o.custo}.` : o.resumo}
                onClick={() => setEscolhida(o.postura)}
                className={`px-3 py-1.5 text-sm border text-left transition-all ${
                  semStamina ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-125'
                }`}
                style={{
                  borderRadius: '2px 8px 2px 8px',
                  borderColor: ativa ? cor : 'var(--border)',
                  background: ativa ? `color-mix(in srgb, ${cor} 18%, var(--background))` : 'var(--background)',
                }}
              >
                <span className="font-medium">{o.nome}</span>
                <span className="ml-2 text-xs tabular-nums text-amber-400">{o.custo > 0 ? `${o.custo} ST` : 'grátis'}</span>
              </button>
            )
          })}
        </div>
        {extra && <div className="ml-auto flex flex-wrap gap-2">{extra}</div>}
        </div>
        <p className="text-xs text-muted min-h-[1rem]">{opcoes.find((o) => o.postura === escolhida)?.resumo}</p>
      </div>
      {children}
    </Contexto.Provider>
  )
}

/** O campo escondido que leva a postura escolhida em cada formulário de golpe. */
export function CampoDePostura() {
  return <input type="hidden" name="postura" value={useContext(Contexto)} />
}
