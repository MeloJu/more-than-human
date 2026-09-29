'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { Crosshair } from 'lucide-react'

/**
 * Em quem o golpe vai, quando há mais de um inimigo de pé.
 *
 * Mesmo desenho da postura (ver SeletorDePostura): a escolha fica aqui e
 * chega a cada formulário de golpe num campo escondido, então clicar no golpe
 * envia golpe, postura e alvo juntos.
 *
 * Com um inimigo só, nada aparece e o campo não é enviado: o motor manda o
 * golpe para o primeiro de pé, que é o único.
 */

const Contexto = createContext<number | null>(null)

export type OpcaoDeAlvo = { posicao: number; nome: string; vida: number; vidaMaxima: number }

export function ComAlvo({ opcoes, cor, children }: { opcoes: OpcaoDeAlvo[]; cor: string; children: ReactNode }) {
  const vivos = opcoes.filter((o) => o.vida > 0)
  const [escolhido, setEscolhido] = useState<number | null>(vivos[0]?.posicao ?? null)
  const valido = vivos.some((o) => o.posicao === escolhido) ? escolhido : (vivos[0]?.posicao ?? null)

  return (
    <Contexto.Provider value={vivos.length > 1 ? valido : null}>
      {vivos.length > 1 && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted">
            <Crosshair className="h-3.5 w-3.5" /> Alvo
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Alvo do golpe">
            {vivos.map((o) => {
              const ativo = valido === o.posicao
              return (
                <button
                  key={o.posicao}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setEscolhido(o.posicao)}
                  className="px-3 py-1.5 text-sm border text-left transition-all hover:brightness-125"
                  style={{
                    borderRadius: '2px 8px 2px 8px',
                    borderColor: ativo ? cor : 'var(--border)',
                    background: ativo ? `color-mix(in srgb, ${cor} 18%, var(--background))` : 'var(--background)',
                  }}
                >
                  <span className="font-medium">{o.nome}</span>
                  <span className="ml-2 text-xs tabular-nums text-muted">
                    {o.vida}/{o.vidaMaxima}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {children}
    </Contexto.Provider>
  )
}

/** O campo escondido que leva o alvo escolhido em cada formulário de golpe. */
export function CampoDeAlvo() {
  const alvo = useContext(Contexto)
  if (alvo === null) return null
  return <input type="hidden" name="alvo" value={alvo} />
}
