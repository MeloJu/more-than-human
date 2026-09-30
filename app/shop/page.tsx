import { requireUser } from '@/app/lib/session'
import { getShopCatalog, getCoins, SLOT_ORDER, SLOT_LABEL } from '@/app/lib/equipment/queries'
import { buyEquipment } from '@/app/lib/equipment/actions'
import { EquipmentCard } from '@/app/components/equipment/EquipmentCard'
import { CartaDeItem } from '@/app/components/itens/CartaDeItem'
import { getItensDaLoja } from '@/app/lib/itens/queries'
import { comprarItem } from '@/app/lib/itens/actions'
import { resolveErrorMessage } from '@/app/lib/error-messages'

const SHOP_ERRORS: Record<string, string> = {
  insufficient_coins: 'Moedas insuficientes. Complete estágios do modo história para ganhar mais.',
  already_owned: 'Você já possui este item.',
  not_found: 'Item não encontrado.',
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ error?: string; bought?: string; item?: string }> }) {
  const { error, bought, item: comprouItem } = await searchParams
  const errorMessage = resolveErrorMessage(SHOP_ERRORS, error, 'Não foi possível concluir a compra.')

  const user = await requireUser()
  const [catalog, coins, pocoes] = await Promise.all([getShopCatalog(user.id), getCoins(user.id), getItensDaLoja(user.id)])

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="kicker">Distrito Comercial · Seireitei</div>
          <h1 className="heading text-3xl mt-1">Loja</h1>
        </div>
        <span className="coin-badge">◆ {coins} moedas</span>
      </div>

      {errorMessage && (
        <div className="card p-3 text-sm border-danger/40 text-danger">{errorMessage}</div>
      )}
      {bought && !errorMessage && (
        <div className="card p-3 text-sm border-spirit/40 text-spirit">
          Compra concluída. Equipe em <span className="font-bold">Equipamento</span>.
        </div>
      )}
      {comprouItem && !errorMessage && (
        <div className="card p-3 text-sm border-spirit/40 text-spirit">Guardado na mochila. Use em batalha: beber gasta a rodada.</div>
      )}

      {/* CONSUMÍVEIS primeiro: é o que se compra toda hora, antes de uma raid. */}
      {pocoes.length > 0 && (
        <section className="space-y-3">
          <h2 className="heading text-lg border-b border-border pb-2">Consumíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pocoes.map((pocao) => {
              const preco = pocao.preco ?? 0
              const canAfford = coins >= preco
              return (
                <CartaDeItem
                  key={pocao.id}
                  item={pocao}
                  quantidade={pocao.quantidade}
                  rodape={
                    <form action={comprarItem.bind(null, pocao.id)} className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${canAfford ? 'text-foreground' : 'text-danger'}`}>◆ {preco}</span>
                      <button type="submit" disabled={!canAfford} className="btn-primary px-3 py-1.5 text-xs">
                        {canAfford ? 'Comprar' : 'Sem moedas'}
                      </button>
                    </form>
                  }
                />
              )
            })}
          </div>
        </section>
      )}

      <p className="text-sm text-muted">
        Peças épicas e lendárias não se compram: caem da raid ou saem da forja, com os materiais que ela deixa.
      </p>

      {SLOT_ORDER.map((slot) => {
        const items = catalog.filter((i) => i.slot === slot)
        if (items.length === 0) return null
        return (
          <section key={slot} className="space-y-3">
            <h2 className="heading text-lg border-b border-border pb-2">{SLOT_LABEL[slot]}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const canAfford = coins >= item.price
                return (
                  <EquipmentCard
                    key={item.id}
                    item={item}
                    dimmed={item.owned}
                    footer={
                      item.owned ? (
                        <div className="text-xs font-bold text-spirit">✔ No seu inventário</div>
                      ) : (
                        <form action={buyEquipment.bind(null, item.id)} className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold ${canAfford ? 'text-foreground' : 'text-danger'}`}>
                            ◆ {item.price}
                          </span>
                          <button type="submit" disabled={!canAfford} className="btn-primary px-3 py-1.5 text-xs">
                            {canAfford ? 'Comprar' : 'Sem moedas'}
                          </button>
                        </form>
                      )
                    }
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
