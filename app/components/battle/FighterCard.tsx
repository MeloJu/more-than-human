import Image from 'next/image'
import { Droplet, Heart, Zap } from 'lucide-react'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import { PainelChanfrado } from './Moldura'
import { StatBar } from './StatBar'
import { StatusBadges } from './StatusBadges'
import type { CombatantState } from '@/app/lib/battle/types'

/**
 * A carta de um lutador, no estilo do mockup de referência: painel de canto
 * chanfrado com borda luminosa na cor do personagem, retrato em cima com a
 * etiqueta de nível recortada no canto, e as três barras com ícone.
 *
 * A COR VEM DO PERSONAGEM, não do tema global. Ichigo e Hitsugaya são os dois
 * de Bleach e têm identidade cromática oposta — laranja de fogo contra azul
 * de gelo. Com um card de cada lado, a cor é o jeito mais rápido de saber de
 * quem é a barra que caiu. Sem cor própria, cai no --accent do tema.
 *
 * Entra como estilo inline e não como classe do Tailwind porque são 62 cores
 * vindas do banco: não dá para haver uma classe por personagem.
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
  const c = cor ?? 'var(--accent)'

  return (
    // Quem está transformado tem a carta INTEIRA marcada, não só uma etiqueta:
    // a forma muda como a luta se joga, então precisa ser legível de relance.
    <PainelChanfrado cor={c} brilho className={`h-full ${transformationName ? 'forma-ativa' : ''}`}>
      {/* 1,5px de recuo nas bordas de cima: sem isso a arte pinta por cima
          do contorno luminoso e o card perde a moldura justo onde ela mais
          aparece. O recorte do canto acompanha o chanfro do painel. */}
      <div
        className="relative h-40 overflow-hidden bg-background-alt"
        style={{ margin: '1.5px 1.5px 0', clipPath: 'polygon(12.5px 0, 100% 0, 100% 100%, 0 100%, 0 12.5px)' }}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 380px" />
        ) : (
          <CharacterMonogram name={name} />
        )}
        {/* Véu na cor do personagem, só na base: costura o retrato ao card
            em vez de a foto parecer colada por cima, e dá contraste para o
            nome que vem logo abaixo. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: `linear-gradient(to top, var(--surface) 4%, color-mix(in srgb, ${c} 22%, transparent) 45%, transparent)` }}
        />
        {levelBadge !== undefined && (
          <span
            className="absolute top-2.5 right-2.5 px-3 py-0.5 text-sm font-titulo italic font-bold text-background"
            style={{ background: c, clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
          >
            Lv{levelBadge}
          </span>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xl font-bold tracking-tight">{name}</div>
          {transformationName && (
            <span
              className="text-xs px-2 py-0.5 font-semibold"
              style={{
                background: `color-mix(in srgb, ${c} 18%, transparent)`,
                color: c,
                border: `1px solid color-mix(in srgb, ${c} 45%, transparent)`,
                borderRadius: '2px 6px 2px 6px',
              }}
            >
              {transformationName}
            </span>
          )}
        </div>

        <StatBar
          label="HP"
          icone={<Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
          current={combatant.currentHp}
          max={combatant.maxHp}
          colorClass="bg-green-500"
        />
        <StatBar
          label="Energia"
          icone={<Droplet className="h-3.5 w-3.5 fill-sky-400 text-sky-400" />}
          current={combatant.currentEnergy}
          max={combatant.maxEnergy}
          colorClass="bg-sky-400"
        />
        {/* Só aparece para quem tem reserva: batalha antiga foi gravada antes
            da stamina existir, e uma barra zerada ali seria informação falsa. */}
        {(combatant.maxStamina ?? 0) > 0 && (
          <StatBar
            label="Stamina"
            icone={<Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            current={combatant.currentStamina ?? 0}
            max={combatant.maxStamina ?? 0}
            colorClass="bg-amber-500"
          />
        )}
        <StatusBadges effects={combatant.statusEffects} />
      </div>
    </PainelChanfrado>
  )
}
