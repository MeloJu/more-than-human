'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { secaoAtiva, type Secao } from '@/app/lib/navegacao'

/**
 * Link de uma seção, que sabe se ela está aberta.
 *
 * Existe à parte porque AppNav é componente de servidor — ele lê sessão e
 * moedas — e só o cliente sabe o caminho aberto. Separar só o link mantém o
 * resto da barra no servidor.
 *
 * A seção acende em qualquer página dela, não só na própria: quem está em
 * Equipamento ainda está em Personagem, e quem está no meio de uma luta
 * ainda está em Batalha. Ver app/lib/navegacao.ts.
 */
export function NavLink({ secao }: { secao: Secao }) {
  const ativo = secaoAtiva(secao, usePathname() ?? '/')

  return (
    <Link href={secao.href} className="nav-link whitespace-nowrap" data-ativo={ativo} aria-current={ativo ? 'page' : undefined}>
      {secao.rotulo}
    </Link>
  )
}

/**
 * A barra de baixo do celular: as cinco seções principais ao alcance do
 * polegar. Em cima, a lista de doze links nem cabia a 390px.
 */
export function BarraDoCelular({ secoes, icones }: { secoes: Secao[]; icones: Record<string, ReactNode> }) {
  const caminho = usePathname() ?? '/'
  const doCelular = secoes.filter((s) => s.noCelular)

  return (
    <nav
      aria-label="Seções"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${doCelular.length}, minmax(0, 1fr))` }}>
        {doCelular.map((s) => {
          const ativo = secaoAtiva(s, caminho)
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={ativo ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${ativo ? 'text-accent' : 'text-muted'}`}
            >
              {icones[s.href]}
              {s.rotulo}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
