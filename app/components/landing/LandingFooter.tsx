import Link from 'next/link'
import { Swords } from 'lucide-react'

/**
 * Sem colunas de Discord/Fórum/Central de Ajuda: eram seis links "(soon)"
 * que não levavam a lugar nenhum. Um rodapé com só o que existe é mais
 * honesto — e, num portfólio, o link pro código vale mais que um Discord
 * inventado.
 */
export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center bg-accent text-background"
              style={{ borderRadius: '2px 10px 2px 10px' }}
            >
              <Swords className="h-5 w-5" />
            </span>
            <div>
              <div className="heading text-sm">More Than Human</div>
              <div className="text-xs text-muted">Projeto pessoal · Next.js, Prisma, Postgres</div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/characters" className="nav-link">Catálogo</Link>
            <Link href="/battle" className="nav-link">Batalha</Link>
            <a
              href="https://github.com/MeloJu/animebattler"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              Código no GitHub
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-5 text-xs text-muted">
          © {year} More Than Human. Personagens e universos pertencem aos seus respectivos autores;
          este é um projeto de estudo sem fins comerciais.
        </div>
      </div>
    </footer>
  )
}
