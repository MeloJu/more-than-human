'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Link da barra de navegação que sabe se é a página atual.
 *
 * Existe à parte porque AppNav é componente de servidor — ele lê sessão e
 * moedas — e só o cliente sabe o caminho aberto. Separar só o link mantém o
 * resto da barra no servidor.
 *
 * "Batalha" continua marcado dentro de /battle/ai/... e /battle/raid: quem
 * está no meio de uma luta ainda está na seção Batalha. A exceção é o PvP,
 * que tem link próprio e não deve acender os dois.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const caminho = usePathname() ?? '/'
  const ativo =
    href === '/'
      ? caminho === '/'
      : href === '/battle'
        ? caminho.startsWith('/battle') && !caminho.startsWith('/battle/pvp')
        : caminho === href || caminho.startsWith(href + '/')

  return (
    <Link href={href} className="nav-link whitespace-nowrap" data-ativo={ativo} aria-current={ativo ? 'page' : undefined}>
      {children}
    </Link>
  )
}
