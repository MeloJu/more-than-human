import Image from 'next/image'
import type { ReactNode } from 'react'
import { Droplet, Heart } from 'lucide-react'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'
import { PainelChanfrado, chanfro } from './Moldura'
import { StatBar } from './StatBar'
import { StatusBadges } from './StatusBadges'
import type { CombatantState } from '@/app/lib/battle/types'

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

/**
 * Um lutador que não é o principal do seu lado — aliado da party ou inimigo
 * extra de um andar —, em faixa: retrato pequeno, nome, vida e energia.
 *
 * FAIXA E NÃO CARTA. O foco da tela é o seu personagem e o adversário; os
 * aliados jogam sozinhos (IA), então o que o jogador precisa deles é saber se
 * estão de pé e quanto aguentam — não a arte inteira. Três cartas do mesmo
 * tamanho empurrariam as ações para fora da tela.
 *
 * Caído, a faixa apaga e diz isso: continua na tela porque uma cura de
 * ressurreição (Orihime, Unohana) pode trazê-lo de volta.
 */
export function FaixaDeAliado({
  nome,
  imageUrl,
  nivel,
  cor,
  formaAtiva,
  combatente,
  rotulo = 'Aliado · IA',
  orbes,
}: {
  nome: string
  imageUrl: string | null
  nivel?: number
  cor?: string | null
  formaAtiva?: string
  combatente: CombatantState
  /** O que a faixa é: aliado da party ou inimigo do andar. */
  rotulo?: string
  /** As orbes de invocação, para quem invoca (ver OrbesDeInvocacao). */
  orbes?: ReactNode
}) {
  const c = cor ?? 'var(--accent)'
  const foco = (imageUrl && FOCO[imageUrl]) || '50% 20%'
  const caido = combatente.currentHp <= 0

  return (
    <PainelChanfrado cor={c} tinta corte={10} className={`h-full ${caido ? 'opacity-50 grayscale' : ''}`}>
      <div className="flex gap-3 p-3 items-center">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-background-alt" style={{ clipPath: chanfro(8) }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={nome} fill className="object-cover" style={{ objectPosition: foco }} sizes="64px" />
          ) : (
            <CharacterMonogram name={nome} />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{nome}</span>
            {nivel !== undefined && <span className="text-xs opacity-60">Lv{nivel}</span>}
            {formaAtiva && (
              <span className="text-xs px-1.5 py-0.5 font-semibold" style={{ border: `1px solid ${c}`, borderRadius: '2px 6px 2px 6px' }}>
                {formaAtiva}
              </span>
            )}
            <span className="ml-auto text-xs uppercase tracking-wider opacity-60">{caido ? 'Caído' : rotulo}</span>
          </div>
          {orbes}
          <StatBar
            label="HP"
            icone={<Heart className="h-3 w-3 fill-red-500 text-red-500" />}
            current={combatente.currentHp}
            max={combatente.maxHp}
            colorClass="bg-green-500"
            vida
          />
          <StatBar
            label="Energia"
            icone={<Droplet className="h-3 w-3 fill-sky-400 text-sky-400" />}
            current={combatente.currentEnergy}
            max={combatente.maxEnergy}
            colorClass="bg-sky-400"
          />
          <StatusBadges effects={combatente.statusEffects} />
        </div>
      </div>
    </PainelChanfrado>
  )
}
