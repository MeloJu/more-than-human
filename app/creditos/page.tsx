import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { CREDITOS, AVISO_CURTO } from '@/app/lib/creditos'

export const metadata = { title: 'Créditos e direitos · More Than Human' }

/**
 * A lista completa de a quem pertence o quê.
 *
 * Agrupa por FRANQUIA e não por personagem: o direito é da obra, e uma lista
 * de 62 linhas repetindo o mesmo detentor nove vezes esconderia a informação
 * em vez de mostrá-la. Os personagens de cada obra aparecem juntos, para
 * ninguém precisar adivinhar de onde saiu quem.
 *
 * Lê do BANCO em vez de uma lista fixa: personagem novo entra no crédito
 * sozinho, sem depender de alguém lembrar de vir aqui.
 */
export default async function CreditosPage() {
  const animes = await prisma.anime.findMany({
    include: { characters: { select: { name: true }, orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Créditos e direitos</h1>
        <p className="text-sm leading-relaxed text-muted">{AVISO_CURTO}</p>
        <p className="text-sm leading-relaxed text-muted">
          Este é um projeto pessoal de estudo, feito para aprender desenvolvimento e infraestrutura.
          Não é oficial, não tem qualquer vínculo com os detentores listados abaixo e não é vendido
          nem monetizado. O que foi escrito aqui — regras de combate, balanceamento, código e
          interface — é original. Os personagens não: eles pertencem a quem está creditado.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          É de quem detém os direitos a palavra final sobre o uso da obra. Se você representa algum
          dos detentores abaixo e quer que um personagem ou uma arte saia do ar, é só pedir pelo{' '}
          <a href="https://github.com/MeloJu/animebattler/issues" className="underline hover:text-foreground">
            repositório do projeto
          </a>{' '}
          — é retirado.
        </p>
      </div>

      <div className="space-y-4">
        {animes.map((anime) => {
          const credito = CREDITOS[anime.slug]
          return (
            <section key={anime.id} className="card p-4 space-y-2">
              <h2 className="font-semibold">{credito?.obra ?? anime.name}</h2>
              {credito ? (
                <dl className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-muted shrink-0">Criação:</dt>
                    <dd>{credito.criador}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted shrink-0">Direitos:</dt>
                    <dd>{credito.detentor}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted">Detentor não catalogado — ver app/lib/creditos.ts.</p>
              )}
              {anime.characters.length > 0 && (
                <p className="text-xs text-muted leading-relaxed pt-1">
                  {anime.characters.map((c) => c.name).join(' · ')}
                </p>
              )}
            </section>
          )
        })}
      </div>

      <Link href="/dashboard" className="inline-block text-sm underline">
        Voltar
      </Link>
    </main>
  )
}
