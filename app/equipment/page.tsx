import Link from 'next/link'
import { requireUser } from '@/app/lib/session'
import { getInventory, getEquippedBySlot, getEquipmentBonus, getCoins, SLOT_ORDER, SLOT_LABEL } from '@/app/lib/equipment/queries'
import { equipItem, unequipItem } from '@/app/lib/equipment/actions'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { EquipmentCard } from '@/app/components/equipment/EquipmentCard'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DO_PERSONAGEM } from '@/app/lib/navegacao'

const EQUIP_ERRORS: Record<string, string> = {
  not_owned: 'Você não possui este item.',
  no_character: 'Selecione um personagem antes de equipar.',
  level_too_low: 'Seu personagem ainda não tem nível para usar este item.',
}

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const errorMessage = resolveErrorMessage(EQUIP_ERRORS, error, 'Não foi possível concluir a ação.')

  const user = await requireUser()
  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6 space-y-4">
        <h1 className="heading text-3xl">Equipamento</h1>
        <div className="card p-6 space-y-3">
          <p className="text-muted">Selecione um personagem para gerenciar o equipamento dele.</p>
          <Link href="/select" className="btn-primary inline-block px-4 py-2 text-sm">Selecionar personagem</Link>
        </div>
      </main>
    )
  }

  const [inventory, equippedBySlot, bonus, coins] = await Promise.all([
    getInventory(user.id),
    getEquippedBySlot(selected.id),
    getEquipmentBonus(selected.id),
    getCoins(user.id),
  ])

  const totalBonus = [
    { label: 'HP', value: bonus.hp },
    { label: 'ATQ', value: bonus.attack },
    { label: 'DEF', value: bonus.defense },
    { label: 'VEL', value: bonus.speed },
  ].filter((b) => b.value !== 0)

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <AbasDaSecao abas={ABAS_DO_PERSONAGEM} className="mb-6" />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="kicker">Equipando · {selected.nickname}</div>
          <h1 className="heading text-3xl mt-1">Equipamento</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="coin-badge">◆ {coins}</span>
          <Link href="/shop" className="btn-primary px-4 py-2 text-sm">Ir à loja</Link>
        </div>
      </div>

      {errorMessage && <div className="card p-3 text-sm border-danger/40 text-danger">{errorMessage}</div>}

      {/* Os 3 slots do personagem */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SLOT_ORDER.map((slot) => {
          const worn = equippedBySlot.get(slot)
          return (
            <div key={slot} className="space-y-2">
              <div className="kicker">{SLOT_LABEL[slot]}</div>
              {worn ? (
                <EquipmentCard
                  item={worn.equipment}
                  footer={
                    <form action={unequipItem.bind(null, worn.id)}>
                      <button type="submit" className="btn-ghost w-full px-3 py-1.5 text-xs">Desequipar</button>
                    </form>
                  }
                />
              ) : (
                <div className="card p-6 text-center text-sm text-muted border-dashed">
                  Espaço vazio
                </div>
              )}
            </div>
          )
        })}
      </section>

      {totalBonus.length > 0 && (
        <div className="card card-accent p-4 pl-5">
          <div className="kicker">Bônus total do equipamento</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {totalBonus.map((b) => (
              <span
                key={b.label}
                className={`text-sm font-bold px-2.5 py-1 border ${
                  b.value > 0 ? 'text-spirit border-spirit/30 bg-spirit/5' : 'text-danger border-danger/30 bg-danger/5'
                }`}
                style={{ borderRadius: 2 }}
              >
                {b.label} {b.value > 0 ? '+' : ''}{b.value}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="heading text-lg border-b border-border pb-2">
          Inventário <span className="text-muted font-normal text-sm">({inventory.length})</span>
        </h2>

        {inventory.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <p className="text-muted">Seu inventário está vazio.</p>
            <Link href="/shop" className="btn-primary inline-block px-4 py-2 text-sm">Ver a loja</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((row) => {
              const equippedHere = row.equippedOnId === selected.id
              const equippedElsewhere = row.equippedOnId !== null && !equippedHere
              const levelLocked = selected.level < row.equipment.requiredLevel
              return (
                <EquipmentCard
                  key={row.id}
                  item={row.equipment}
                  dimmed={equippedHere}
                  footer={
                    equippedHere ? (
                      <div className="text-xs font-bold text-spirit">✔ Equipado</div>
                    ) : (
                      <form action={equipItem.bind(null, row.id)} className="space-y-1.5">
                        {equippedElsewhere && (
                          <div className="text-xs text-muted">Em uso por {row.equippedOn?.nickname}</div>
                        )}
                        <button type="submit" disabled={levelLocked} className="btn-ghost w-full px-3 py-1.5 text-xs">
                          {levelLocked ? `Requer nível ${row.equipment.requiredLevel}` : equippedElsewhere ? 'Trazer para cá' : 'Equipar'}
                        </button>
                      </form>
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
