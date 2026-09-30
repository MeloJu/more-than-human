import { requireUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getCoins } from '@/app/lib/equipment/queries'
import { forjar, refinar } from '@/app/lib/forja/actions'
import { REFINO_MAXIMO, REFINO_POR_NIVEL, RECEITAS, custoDoRefino, type Custo } from '@/app/lib/forja/receitas'
import { EquipmentCard } from '@/app/components/equipment/EquipmentCard'
import { COR_DA_RARIDADE } from '@/app/components/itens/CartaDeItem'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DA_LOJA } from '@/app/lib/navegacao'
import Image from 'next/image'
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
 * A ferreira de SAO é a primeira NPC de craft (desenho aprovado em 30/09/2026),
 * com a arte dela na forja no cabeçalho (crédito em /creditos). Receitas viram
 * as peças que a loja não vende; o refino melhora a peça que você já tem.
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

      {/* A LISBETH, na forja: a arte ocupa o cartão, com a ferreira e a lâmina
          em brasa à direita, e um véu escuro da esquerda deixa o texto legível.
          No celular o véu sobe e cobre mais, porque o texto fica por cima dela. */}
      <div
        className="card relative min-h-[300px] overflow-hidden p-0"
        style={{ borderColor: 'color-mix(in srgb, #f472b6 45%, var(--border))' }}
      >
        {/* No computador a arte ocupa a metade direita, para a ferreira e a
            lâmina em brasa ficarem fora do véu do texto. */}
        <div className="absolute inset-y-0 right-0 w-full sm:w-[64%]">
          <Image
            src="/images/npcs/lisbeth.webp"
            alt="Lisbeth martelando uma espada em brasa na forja, com o castelo de Aincrad ao fundo"
            fill
            priority
            className="object-cover"
            style={{ objectPosition: '35% 42%' }}
            sizes="(max-width: 640px) 100vw, 740px"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 sm:hidden"
          style={{ background: 'linear-gradient(to top, rgba(10,10,15,.96) 30%, rgba(10,10,15,.55) 65%, rgba(10,10,15,.15))' }}
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden sm:block"
          style={{ background: 'linear-gradient(90deg, rgba(10,10,15,.98) 0%, rgba(10,10,15,.95) 36%, rgba(10,10,15,.4) 46%, transparent 58%)' }}
        />
        <div className="relative flex min-h-[300px] flex-col justify-end gap-2 p-5 sm:max-w-[40%] sm:justify-center">
          <div className="kicker" style={{ color: '#f9a8d4' }}>
            Forja · Lisbeth
          </div>
          <h1 className="heading text-3xl">Forja da Lisbeth</h1>
          <p className="text-sm text-zinc-300">
            &ldquo;Traz o material que eu faço a lâmina. E se quebrar, a culpa é de quem empunhou.&rdquo;
          </p>
          <p className="text-xs text-muted">
            Receitas viram as peças que a loja não vende; o refino soma {Math.round(REFINO_POR_NIVEL * 100)}% dos bônus da peça por
            nível, até +{REFINO_MAXIMO}.
          </p>
          <span className="coin-badge self-start">◆ {coins} moedas</span>
        </div>
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
