import { describeEffect, type EffectLike } from '@/app/lib/battle/presentation'
import type { EquipmentRarity, EquipmentSlot } from '@prisma/client'
import { SLOT_LABEL } from '@/app/lib/equipment/queries'
import { bonusRefinado } from '@/app/lib/forja/receitas'

type GrantedSkill = { name: string; power: number; energyCost: number; effects: unknown } | null

export type EquipmentView = {
  name: string
  description: string
  slot: EquipmentSlot
  rarity: EquipmentRarity
  requiredLevel: number
  flatHpBonus: number
  flatAttackBonus: number
  flatDefenseBonus: number
  flatSpeedBonus: number
  grantedSkill: GrantedSkill
}

/** Um bônus só aparece se existir — item com 0 de DEF não exibe "DEF +0". */
function bonusList(e: EquipmentView, refino = 0): { label: string; value: number }[] {
  return [
    { label: 'HP', value: bonusRefinado(e.flatHpBonus, refino) },
    { label: 'ATQ', value: bonusRefinado(e.flatAttackBonus, refino) },
    { label: 'DEF', value: bonusRefinado(e.flatDefenseBonus, refino) },
    { label: 'VEL', value: bonusRefinado(e.flatSpeedBonus, refino) },
  ].filter((b) => b.value !== 0)
}

function parseEffects(raw: unknown): EffectLike[] {
  return Array.isArray(raw) ? (raw as EffectLike[]) : []
}

/**
 * Card compartilhado por loja e inventário. `footer` é o que muda entre os
 * dois (comprar vs equipar), então entra como slot em vez de virar uma prop
 * booleana de modo.
 */
export function EquipmentCard({
  item,
  footer,
  dimmed = false,
  refino = 0,
}: {
  item: EquipmentView
  footer?: React.ReactNode
  dimmed?: boolean
  /** O refino da cópia do jogador (forja): os bônus já aparecem refinados. */
  refino?: number
}) {
  const bonuses = bonusList(item, refino)
  const effects = parseEffects(item.grantedSkill?.effects)

  return (
    <div
      className={`card rarity-${item.rarity} rarity-border p-4 flex flex-col gap-3 ${dimmed ? 'opacity-55' : 'rarity-glow'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker">{SLOT_LABEL[item.slot]}</div>
          <h3 className="heading text-base leading-tight mt-0.5">
            {item.name}
            {refino > 0 && <span className="ml-1.5 text-accent">+{refino}</span>}
          </h3>
        </div>
        <span className="rarity-chip shrink-0">{item.rarity}</span>
      </div>

      <p className="text-xs text-muted leading-relaxed italic">{item.description}</p>

      {bonuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bonuses.map((b) => (
            <span
              key={b.label}
              className={`text-xs font-bold px-2 py-0.5 border ${
                b.value > 0 ? 'text-spirit border-spirit/30 bg-spirit/5' : 'text-danger border-danger/30 bg-danger/5'
              }`}
              style={{ borderRadius: 2 }}
            >
              {b.label} {b.value > 0 ? '+' : ''}{b.value}
            </span>
          ))}
        </div>
      )}

      {item.grantedSkill && (
        <div className="card-raised card-accent p-2.5 pl-3">
          <div className="kicker">Concede habilidade</div>
          <div className="text-sm font-bold mt-0.5">{item.grantedSkill.name}</div>
          <div className="text-xs text-muted mt-0.5">
            {item.grantedSkill.power > 0 && `${item.grantedSkill.power} de poder · `}
            {item.grantedSkill.energyCost} EN
          </div>
          {effects.length > 0 && (
            <div className="text-xs text-muted mt-1">{effects.map(describeEffect).join(' · ')}</div>
          )}
        </div>
      )}

      {item.requiredLevel > 1 && (
        <div className="text-xs text-muted">Requer nível {item.requiredLevel}</div>
      )}

      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </div>
  )
}
