import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { custaStamina, hasBattleValue } from '@/app/lib/battle/engine'
import { toSkillDef } from '@/app/lib/battle/queries'
import { CartaoDeHabilidade, CATEGORIA_LABEL } from '@/app/components/skills/CartaoDeHabilidade'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DO_CATALOGO } from '@/app/lib/navegacao'

/**
 * Catálogo de habilidades.
 *
 * Existia o dado e não existia a tela: 581 habilidades no banco e nenhum
 * lugar para olhar antes da batalha. Planejar loadout era abrir a luta e ver
 * o que aparecia.
 *
 * O filtro é por querystring e não por estado no cliente porque a página é um
 * Server Component: cada categoria vira uma URL que dá para guardar e
 * compartilhar, sem carregar as 581 de uma vez para filtrar no navegador.
 */
export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria } = await searchParams

  const linhas = await prisma.skill.findMany({
    where: categoria && categoria !== 'todas' ? { category: categoria as never } : undefined,
    orderBy: [{ category: 'asc' }, { power: 'desc' }, { name: 'asc' }],
    include: {
      characterLinks: {
        select: { requiredLevel: true, character: { select: { name: true } } },
        orderBy: { requiredLevel: 'asc' },
      },
    },
  })

  const porCategoria = await prisma.skill.groupBy({ by: ['category'], _count: true })
  const total = porCategoria.reduce((a, c) => a + c._count, 0)

  const uteis = linhas.filter(hasBattleValue)
  const abas = [{ valor: 'todas', rotulo: 'Todas', n: total }].concat(
    porCategoria
      .sort((a, b) => b._count - a._count)
      .map((c) => ({ valor: c.category, rotulo: CATEGORIA_LABEL[c.category] ?? c.category, n: c._count }))
  )

  return (
    <main className="mx-auto max-w-5xl p-6">
      <AbasDaSecao abas={ABAS_DO_CATALOGO} className="mb-6" />
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h1 className="text-2xl font-semibold">Habilidades</h1>
        <span className="text-sm opacity-60 shrink-0 tabular-nums">{uteis.length} exibidas</span>
      </div>
      <p className="text-sm opacity-70 mb-4">
        Custo em <span className="text-spirit">energia</span> é ofensivo; em{' '}
        <span className="text-amber-600 dark:text-amber-400">stamina</span> é defensivo — escudo, cura e
        contra-ataque saem de uma reserva separada.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {abas.map((aba) => {
          const ativa = (categoria ?? 'todas') === aba.valor
          return (
            <Link
              key={aba.valor}
              href={aba.valor === 'todas' ? '/skills' : `/skills?categoria=${aba.valor}`}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                ativa ? 'border-accent text-accent' : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              {aba.rotulo} <span className="opacity-50 tabular-nums">{aba.n}</span>
            </Link>
          )
        })}
      </div>

      {uteis.length === 0 ? (
        <div className="card p-6 opacity-70">Nenhuma habilidade nesta categoria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {uteis.map((linha) => {
            const def = toSkillDef(linha)
            const dono = linha.characterLinks[0]
            // Quem tem um dono só é assinatura; o resto é técnica compartilhada,
            // e dizer "de N personagens" é mais útil que listar todos.
            const donos = linha.characterLinks.length
            return (
              <div key={linha.id} className="space-y-1">
                <CartaoDeHabilidade
                  skill={def}
                  categoria={linha.category}
                  icone={linha.icon}
                  requiredLevel={dono?.requiredLevel}
                />
                <div className="text-xs opacity-45 px-1">
                  {donos === 0
                    ? 'sem dono'
                    : donos === 1
                      ? dono.character.name
                      : `${donos} personagens`}
                  {custaStamina(def) && ' · defensiva'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
