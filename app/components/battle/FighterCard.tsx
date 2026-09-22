import Image from 'next/image'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import { StatBar } from './StatBar'
import { StatusBadges } from './StatusBadges'
import type { CombatantState } from '@/app/lib/battle/types'

/**
 * A COR DE DESTAQUE VEM DO PERSONAGEM, não do tema global.
 *
 * Ichigo e Hitsugaya são os dois de Bleach e têm identidade cromática oposta
 * — laranja de fogo contra azul de gelo. Um tema por universo pintaria os
 * dois iguais, que é o contrário do que a tela de batalha precisa: com um
 * card de cada lado, a cor é o jeito mais rápido de saber de quem é a vez e
 * de quem é a barra que caiu.
 *
 * Entra como variável CSS e não como classe do Tailwind porque são 62 cores
 * vindas do banco — não dá para haver uma classe por personagem. `--ac` é
 * local ao card, então dois cards com cores diferentes convivem na mesma
 * tela sem um vazar no outro.
 *
 * Sem cor, cai no --accent do tema, que é o comportamento de antes.
 */
export function FighterCard({
  name,
  imageUrl,
  levelBadge,
  transformationName,
  combatant,
  cor,
}: {
  name: string
  imageUrl: string | null
  levelBadge?: number
  transformationName?: string
  combatant: CombatantState
  cor?: string | null
}) {
  const estilo = cor
    ? ({ ['--ac' as string]: cor, borderLeft: `3px solid ${cor}`, boxShadow: `0 0 38px color-mix(in srgb, ${cor} 14%, transparent)` } as React.CSSProperties)
    : undefined

  return (
    // Quem está transformado tem a carta INTEIRA marcada, não só uma etiqueta:
    // a forma muda como a luta se joga, então precisa ser legível de relance.
    // A animação toca uma vez, na chegada da página — que é exatamente o
    // momento em que a forma acabou de ser liberada.
    <div className={`card p-4 space-y-3 ${transformationName ? 'forma-ativa' : ''}`} style={estilo}>
      <div className="relative h-40 w-full rounded-lg overflow-hidden bg-background-alt">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 320px" />
        ) : (
          <CharacterMonogram name={name} />
        )}
        {/* Véu na cor do personagem, só na base: dá identidade sem lavar a
            arte, e é o que costura o retrato ao card em vez de deixar a foto
            parecer colada por cima. */}
        {cor && (
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
            style={{ background: `linear-gradient(to top, color-mix(in srgb, ${cor} 42%, transparent), transparent)` }}
          />
        )}
        {levelBadge !== undefined && (
          <span
            className="absolute top-2 right-2 rounded-full text-background text-xs font-semibold px-2 py-1"
            style={{ background: cor ?? 'var(--accent)' }}
          >
            Lv.{levelBadge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="font-semibold">{name}</div>
        {transformationName && (
          <span
            className="text-xs rounded-full px-2 py-0.5 font-medium"
            style={{
              background: `color-mix(in srgb, ${cor ?? 'var(--accent)'} 20%, transparent)`,
              color: cor ?? 'var(--accent)',
            }}
          >
            {transformationName}
          </span>
        )}
      </div>
      <StatBar label="HP" current={combatant.currentHp} max={combatant.maxHp} colorClass="bg-green-500" />
      <StatBar label="Energia" current={combatant.currentEnergy} max={combatant.maxEnergy} colorClass="bg-spirit" />
      {/* Só aparece para quem tem reserva: batalha antiga foi gravada antes da
          stamina existir, e uma barra zerada ali seria informação falsa. */}
      {(combatant.maxStamina ?? 0) > 0 && (
        <StatBar
          label="Stamina"
          current={combatant.currentStamina ?? 0}
          max={combatant.maxStamina ?? 0}
          colorClass="bg-amber-500"
        />
      )}
      <StatusBadges effects={combatant.statusEffects} />
    </div>
  )
}
