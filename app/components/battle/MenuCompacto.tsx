'use client'

import { useState, type ReactNode } from 'react'

/**
 * Um botão pequeno que abre uma lista por cima dos golpes: Formas e Mochila.
 *
 * Desenho aprovado no protótipo do HUD de batalha: as ações ficam só com a
 * postura e os golpes, e o que se usa de vez em quando (liberar uma forma,
 * beber uma poção) mora num botão no fim da linha das posturas.
 *
 * ABRE NO HOVER, e também no clique — no celular não há hover, e o toque
 * precisa abrir e fechar. Esc fecha. A lista mora fora de qualquer recorte do
 * painel (ver PainelChanfrado), então não é cortada.
 */
export function MenuCompacto({
  rotulo,
  marca,
  cor,
  contagem,
  aviso,
  children,
}: {
  rotulo: string
  /** Kanji do botão (変 das formas, 薬 da mochila). */
  marca: string
  cor: string
  contagem: number
  /** Uma linha no topo da lista: o que a escolha custa. */
  aviso?: string
  children: ReactNode
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div
      className="group relative"
      onMouseLeave={() => setAberto(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setAberto(false)
      }}
    >
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-2 border px-3 py-1.5 text-sm font-semibold transition-all hover:brightness-125"
        style={{
          borderRadius: '2px 8px 2px 8px',
          borderColor: `color-mix(in srgb, ${cor} 45%, var(--border))`,
          background: 'var(--background)',
        }}
      >
        <span aria-hidden className="font-kanji" style={{ color: cor }}>
          {marca}
        </span>
        {rotulo}
        <span className="rounded-md px-1.5 text-[11px] font-bold tabular-nums text-background" style={{ background: cor }}>
          {contagem}
        </span>
      </button>

      {/* O pt-1.5 é a ponte do hover: sem ele, o mouse sai do botão e passa
          por um vão antes de chegar na lista, que fecha no caminho. */}
      <div role="menu" className={`absolute right-0 top-full z-30 pt-1.5 ${aberto ? 'block' : 'hidden'} group-hover:block group-focus-within:block`}>
        <div
          className="flex w-max max-w-[88vw] flex-col gap-1 border p-2 shadow-2xl"
          style={{
            borderRadius: '2px 10px 2px 10px',
            borderColor: `color-mix(in srgb, ${cor} 40%, var(--border))`,
            background: 'rgba(16,16,24,.97)',
          }}
        >
          {aviso && <p className="px-1 pb-1 text-xs text-muted">{aviso}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}
