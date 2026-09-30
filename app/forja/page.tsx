import { requireUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getCoins } from '@/app/lib/equipment/queries'
import { forjar, refinar } from '@/app/lib/forja/actions'
import { REFINO_MAXIMO, REFINO_POR_NIVEL, RECEITAS, custoDoRefino, type Custo } from '@/app/lib/forja/receitas'
import { EquipmentCard } from '@/app/components/equipment/EquipmentCard'
import { COR_DA_RARIDADE } from '@/app/components/itens/CartaDeItem'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DA_LOJA } from '@/app/lib/navegacao'
import { chanfro } from '@/app/components/battle/Moldura'
import { resolveErrorMessage } from '@/app/lib/error-messages'

const ERROS: Record<string, string> = {
  falta_material: 'Falta material para isso. A raid de Las Noches deixa o que a Lisbeth precisa.',
  insufficient_coins: 'Moedas insuficientes.',
  already_owned: 'Você já tem essa peça.',
  refino_maximo: 'Essa peça já está no refino máximo.',
  conflito: 'Essa peça acabou de ser refinada em outra aba — a tela foi atualizada.',
  not_found: 'Receita não encontrada.',
}

/**
 * A FORJA DA LISBETH: o que se faz com o que a raid deixa cair.
 *
 * A ferreira de SAO é a primeira NPC de craft (desenho aprovado em 30/09/2026);
 * por enquanto só com o kanji da forja no lugar do retrato. Receitas viram as
 * peças que a loja não vende; o refino melhora a peça que você já tem.
 */
export default async function ForjaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; forjou?: string; refinou?: string }>
}) {
  const { error, forjou, refinou } = await searchParams
  const errorMessage = resolveErrorMessage(ERROS, error, 'A forja não conseguiu terminar essa peça.')

  const user = await requireUser()
  const [coins, mochila, pecas, minhas] = await Promise.all([
    getCoins(user.id),
    prisma.userItem.findMany({ where: { userId: user.id }, include: { item: true } }),
    prisma.equipment.findMany({
      where: { name: { in: RECEITAS.map((r) => r.equipamento) } },
      include: { grantedSkill: { select: { name: true, power: true, energyCost: true, effects: true } } },
    }),
    prisma.userEquipment.findMany({
      where: { userId: user.id },
      orderBy: { purchasedAt: 'desc' },
      include: { equipment: { include: { grantedSkill: { select: { name: true, power: true, energyCost: true, effects: true } } } } },
    }),
  ])

  const tenho = (nome: string) => mochila.find((m) => m.item.nome === nome)?.quantidade ?? 0
  const itemDe = (nome: string) => mochila.find((m) => m.item.nome === nome)?.item
  const jaTenho = new Set(minhas.map((m) => m.equipment.name))
  const cobre = (custo: Custo) => coins >= custo.moedas && custo.materiais.every((m) => tenho(m.item) >= m.quantidade)

  /** O custo em chips: cada material com quanto tem / quanto precisa. */
  const ListaDeCusto = ({ custo }: { custo: Custo }) => (
    <div className="flex flex-wrap gap-1.5">
      {custo.materiais.map((m) => {
        const falta = tenho(m.item) < m.quantidade
        const def = itemDe(m.item)
        const cor = COR_DA_RARIDADE[def?.raridade ?? 'COMUM']
        return (
          <span
            key={m.item}
            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs ${falta ? 'text-red-300' : ''}`}
            style={{ borderRadius: '2px 6px 2px 6px', borderColor: falta ? 'rgba(239,68,68,.5)' : `color-mix(in srgb, ${cor} 50%, var(--border))` }}
          >
            {def && (
              <span aria-hidden className="font-kanji" style={{ color: cor }}>
                {def.marca}
              </span>
            )}
            {m.item}
            <span className="tabular-nums opacity-80">
              {tenho(m.item)}/{m.quantidade}
            </span>
          </span>
        )
      })}
      <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-bold ${coins < custo.moedas ? 'text-red-300' : 'text-amber-400'}`} style={{ borderRadius: '2px 6px 2px 6px' }}>
        ◆ {custo.moedas}
      </span>
    </div>
  )

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <AbasDaSecao abas={ABAS_DA_LOJA} />

      {/* A Lisbeth. */}
      <div className="card flex flex-wrap items-center gap-5 p-5" style={{ borderColor: 'color-mix(in srgb, #f472b6 45%, var(--border))' }}>
        <span
          aria-hidden
          className="grid h-20 w-20 shrink-0 place-items-center font-kanji text-4xl text-white"
          style={{ clipPath: chanfro(10), background: 'radial-gradient(circle at 40% 35%, #f472b6, #7c2d5b 70%, #0a0a0f)', textShadow: '0 0 16px #f9a8d4' }}
        >
          鍛
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="kicker">Forja · Lisbeth</div>
          <h1 className="heading text-3xl">Forja da Lisbeth</h1>
          <p className="text-sm text-muted">
            &ldquo;Traz o material que eu faço a lâmina. E se quebrar, a culpa é de quem empunhou.&rdquo; Receitas viram as peças que a loja
            não vende; o refino soma {Math.round(REFINO_POR_NIVEL * 100)}% dos bônus da peça por nível, até +{REFINO_MAXIMO}.
          </p>
        </div>
        <span className="coin-badge">◆ {coins} moedas</span>
      </div>

      {errorMessage && <div className="card p-3 text-sm border-danger/40 text-danger">{errorMessage}</div>}
      {forjou && !errorMessage && <div className="card p-3 text-sm border-spirit/40 text-spirit">{forjou} saiu da forja. Equipe em Equipamento.</div>}
      {refinou && !errorMessage && <div className="card p-3 text-sm border-spirit/40 text-spirit">{refinou} ficou mais forte.</div>}

      <section className="space-y-3">
        <h2 className="heading text-lg border-b border-border pb-2">Receitas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RECEITAS.map((receita) => {
            const peca = pecas.find((p) => p.name === receita.equipamento)
            if (!peca) return null
            const possui = jaTenho.has(receita.equipamento)
            const pode = cobre(receita.custo)
            return (
              <EquipmentCard
                key={receita.equipamento}
                item={peca}
                dimmed={possui}
                footer={
                  <div className="space-y-2">
                    {receita.exclusiva && <div className="text-[11px] font-semibold uppercase tracking-wider text-pink-300">Exclusiva da forja</div>}
                    <ListaDeCusto custo={receita.custo} />
                    {possui ? (
                      <div className="text-xs font-bold text-spirit">✔ No seu inventário</div>
                    ) : (
                      <form action={forjar.bind(null, receita.equipamento)}>
                        <button type="submit" disabled={!pode} className="btn-primary w-full px-3 py-1.5 text-xs">
                          {pode ? 'Forjar' : 'Falta material'}
                        </button>
                      </form>
                    )}
                  </div>
                }
              />
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="heading text-lg border-b border-border pb-2">Refino</h2>
        {minhas.length === 0 ? (
          <p className="text-sm text-muted">Você ainda não tem peças. Compre na loja ou forje uma acima.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {minhas.map((minha) => {
              const noTeto = minha.refino >= REFINO_MAXIMO
              const custo = noTeto ? null : custoDoRefino(minha.equipment.rarity, minha.refino + 1)
              return (
                <EquipmentCard
                  key={minha.id}
                  item={minha.equipment}
                  refino={minha.refino}
                  footer={
                    noTeto || !custo ? (
                      <div className="text-xs font-bold text-accent">Refino máximo</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-muted">Refinar para +{minha.refino + 1}</div>
                        <ListaDeCusto custo={custo} />
                        <form action={refinar.bind(null, minha.id)}>
                          <button type="submit" disabled={!cobre(custo)} className="btn-ghost w-full px-3 py-1.5 text-xs">
                            {cobre(custo) ? `Refinar para +${minha.refino + 1}` : 'Falta material'}
                          </button>
                        </form>
                      </div>
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
