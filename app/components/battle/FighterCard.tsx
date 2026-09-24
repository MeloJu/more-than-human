import Image from 'next/image'
import { Droplet, Heart, Zap } from 'lucide-react'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'
import { PainelChanfrado, chanfro } from './Moldura'
import { StatBar } from './StatBar'
import { StatusBadges } from './StatusBadges'
import type { CombatantState } from '@/app/lib/battle/types'

/**
 * A carta de um lutador: a ARTE OCUPA O CARD INTEIRO, e nome e barras ficam
 * por cima, numa faixa translúcida na base.
 *
 * POR QUE A ARTE FOI PARA O FUNDO. Antes o retrato era uma tira de 160px no
 * topo, recortada sempre pelo alto — em arte de corpo inteiro o personagem
 * ficava pequeno e fora do centro. Ocupando o card todo, a arte tem quase três
 * vezes a altura, e o enquadramento de cada imagem vem de
 * foco-dos-retratos.json (ponto focal calculado por atenção, ver
 * scripts/foco-dos-retratos.js) em vez de um "topo" fixo para todas.
 *
 * AS BARRAS FICAM TRANSLÚCIDAS por pedido do dono do projeto, e legíveis por
 * duas coisas: um véu escuro que sobe da base e some no meio do card, e
 * sombra forte no texto (ver StatBar).
 *
 * A COR É DO PERSONAGEM: borda, brilho, tinta do painel, véu da base e o
 * halo do nome. Ichigo e Hitsugaya são os dois de Bleach e têm identidade
 * cromática oposta — laranja de fogo contra azul de gelo.
 */
const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

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
  const foco = (imageUrl && FOCO[imageUrl]) || '50% 20%'

  return (
    // Quem está transformado tem a carta INTEIRA marcada, não só uma etiqueta:
    // a forma muda como a luta se joga, então precisa ser legível de relance.
    <PainelChanfrado cor={c} brilho tinta espessura={2} className={`h-full ${transformationName ? 'forma-ativa' : ''}`}>
      <div className="relative h-full min-h-[440px]">
        {/* A arte fica 2px para dentro, no mesmo recorte do painel: assim a
            borda luminosa aparece em volta dela em vez de ser pintada por
            cima. */}
        <div className="absolute overflow-hidden bg-background-alt" style={{ inset: 2, clipPath: chanfro(13) }}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              style={{ objectPosition: foco }}
              sizes="(max-width: 1024px) 100vw, 420px"
            />
          ) : (
            <CharacterMonogram name={name} />
          )}

          {/* Dois véus. O escuro sobe da base e some antes do meio: é ele que
              deixa as barras legíveis sem esconder a arte. O colorido é mais
              curto e mais fraco, e costura a arte à cor do personagem. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, rgba(10,10,15,.94) 0%, rgba(10,10,15,.72) 30%, rgba(10,10,15,.25) 52%, transparent 66%), linear-gradient(to top, color-mix(in srgb, ${c} 38%, transparent) 0%, transparent 45%)`,
            }}
          />
          {/* Luz de borda do lado de dentro, na cor: dá volume ao card. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 40px color-mix(in srgb, ${c} 28%, transparent)` }}
          />
        </div>

        {levelBadge !== undefined && (
          <span
            className="absolute top-3 right-3 px-3 py-0.5 text-sm font-titulo italic font-bold text-background"
            style={{
              background: c,
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              boxShadow: `0 0 12px ${c}`,
            }}
          >
            Lv{levelBadge}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span aria-hidden className="h-6 w-1 shrink-0" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
            <div
              className="text-2xl font-bold tracking-tight leading-none"
              style={{ textShadow: `0 0 18px color-mix(in srgb, ${c} 75%, transparent), 0 2px 4px rgba(0,0,0,.9)` }}
            >
              {name}
            </div>
            {transformationName && (
              <span
                className="text-xs px-2 py-0.5 font-semibold backdrop-blur-sm"
                style={{
                  background: `color-mix(in srgb, ${c} 28%, rgba(10,10,15,.6))`,
                  color: '#fff',
                  border: `1px solid ${c}`,
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
      </div>
    </PainelChanfrado>
  )
}
