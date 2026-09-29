'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * As abas que ligam as páginas de uma mesma seção (Personagem: Status,
 * Equipamento, Treino; Catálogo: Personagens, Habilidades).
 *
 * Cada aba é uma página de verdade, com endereço próprio: dá para abrir o
 * Treino direto, e voltar no navegador volta de aba. As listas moram em
 * app/lib/navegacao.ts.
 */
export function AbasDaSecao({ abas, className = '' }: { abas: { href: string; rotulo: string }[]; className?: string }) {
  const caminho = usePathname() ?? '/'

  return (
    <nav aria-label="Páginas desta seção" className={`flex gap-1 overflow-x-auto border-b border-border ${className}`}>
      {abas.map((a) => {
        const ativa = caminho === a.href || caminho.startsWith(a.href + '/')
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa ? 'page' : undefined}
            className={`relative whitespace-nowrap px-4 py-2.5 font-titulo italic font-bold uppercase tracking-wider text-sm transition-colors ${
              ativa ? 'text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            {a.rotulo}
            {ativa && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />}
          </Link>
        )
      })}
    </nav>
  )
}
