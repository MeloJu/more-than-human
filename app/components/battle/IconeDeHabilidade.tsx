import {
  ArrowBigDown,
  ArrowBigUp,
  Biohazard,
  Droplet,
  Eye,
  Flame,
  Hand,
  Heart,
  Hourglass,
  Orbit,
  RotateCcw,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Sword,
  Swords,
  Zap,
} from 'lucide-react'
import { saborDoDot } from '@/app/lib/battle/engine'
import ARTE_DE_HABILIDADE from '@/app/lib/battle/arte-de-habilidade.json'
import type { DotFlavor, EffectType } from '@/app/lib/battle/types'

/**
 * O ícone de uma habilidade, deduzido do que ela FAZ.
 *
 * POR QUE EXISTE UM ÍCONE DESENHADO, e não só arte de anime. A arte cobre a
 * minoria canônica (ver DUAS CAMADAS abaixo), mas não pode cobrir tudo: 29%
 * dos nomes deste catálogo são invenção do jogo — "Aura Ardente", "Armadilha
 * de Arame" —, e nenhuma wiki vai ter, porque não existem em obra nenhuma.
 * Sem uma camada que não dependa de fonte externa, um terço da grade de ações
 * ficaria com buraco.
 *
 * O ÍCONE DERIVADO DO EFEITO fecha isso, e tem vantagens próprias:
 *
 *   - cobre 100% do catálogo por construção, inclusive nome inventado
 *   - é consistente de graça — mesma espessura de traço, mesma grade
 *   - usa `currentColor`, então pega a cor de destaque do personagem sozinho
 *   - ~500 bytes por ícone em vez de ~8KB, e escala de 16px a 128px
 *   - é obra original: nada a creditar, nada a pedir licença
 *
 * E ensina o jogo: dois golpes com o mesmo ícone se comportam parecido, o que
 * um frame bonito de anime não comunicaria. Por isso ele não é só o piso para
 * quando falta arte — para habilidade inventada, é a leitura certa.
 *
 * A ORDEM DA ESCOLHA É DELIBERADA — do mais específico ao mais genérico:
 * sabor do dano contínuo, depois tipo de efeito, depois categoria. Queimadura
 * é mais informativa que "dano contínuo", que é mais informativo que "Hadō".
 *
 * DUAS CAMADAS, E A ARTE VEM PRIMEIRO. Para a minoria canônica — Getsuga
 * Tenshō, Kamehameha, Amaterasu — existe arte de verdade, achada e
 * VERIFICADA por scripts/buscar-icones.js (o nome do arquivo na wiki precisa
 * conter o nome da técnica; sem isso, não entra). Essa camada cobre ~25% do
 * catálogo. O ícone desenhado cobre o resto, e cobre 100% se a arte sumir —
 * é piso, não remendo.
 *
 * O SABOR VEM DAS TAGS, NÃO DO EFEITO, pela mesma razão que
 * descreverEfeitosDaHabilidade existe: SkillEffect não guarda o sabor, ele só
 * é decidido quando o efeito é APLICADO, a partir das tags de quem lança.
 * Medido no catálogo: ler `effect.flavor` aqui deixava 132 habilidades com
 * ampulheta genérica, enquanto a mesma habilidade em batalha mostrava fogo ou
 * gelo — as duas telas discordando sobre o mesmo golpe.
 */

const POR_SABOR: Record<DotFlavor, typeof Flame> = {
  queimadura: Flame,
  veneno: Biohazard,
  sangramento: Droplet,
  maldicao: Eye,
  congelamento: Snowflake,
  espiritual: Sparkles,
}

/**
 * Quatro destes não existem no Lucide porque são conceito deste jogo:
 * EXECUTE, PIERCE, COMBO_STUN e COMBO_FOLLOWUP. Ver os desenhos abaixo.
 */
const POR_EFEITO: Partial<Record<EffectType, typeof Flame>> = {
  BUFF: ArrowBigUp,
  DEBUFF: ArrowBigDown,
  DOT: Hourglass,
  STUN: Zap,
  COUNTER: RotateCcw,
  SHIELD: Shield,
  HEAL: Heart,
  LIFESTEAL: Droplet,
  DOMAIN: Orbit,
  REVIVE: Sparkles,
  EXECUTE: Skull,
}

const POR_CATEGORIA: Record<string, typeof Flame> = {
  NINJUTSU: Sparkles,
  GENJUTSU: Eye,
  TAIJUTSU: Hand,
  HADO: Flame,
  BAKUDO: Shield,
  KIDO: Sparkles,
  KI: Orbit,
  OTHER: Sword,
}

type Props = { size?: number; className?: string }

/** Lâmina atravessando a guarda: o golpe que ignora parte da defesa. */
function IconePierce({ size = 20, className }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d="M4 20 L20 4" />
      <path d="M15 4h5v5" />
      <path d="M7 10a5 5 0 0 0 0 7l2 2" opacity="0.5" />
    </svg>
  )
}

/** Dois elos encadeados: a sequência que carrega numa rodada e fecha na outra. */
function IconeCombo({ size = 20, className }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d="M9 7H6a4 4 0 0 0 0 8h3" />
      <path d="M15 17h3a4 4 0 0 0 0-8h-3" />
      <path d="M9 12h6" />
    </svg>
  )
}

/** Elo com faísca: a finalização contra quem está preso. */
function IconeComboStun({ size = 20, className }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d="M9 9H6.5a3.5 3.5 0 0 0 0 7H9" />
      <path d="M15 16h2.5a3.5 3.5 0 0 0 0-7H15" />
      <path d="M13 3l-3 5h4l-3 5" />
    </svg>
  )
}

const CUSTOMIZADOS: Partial<Record<EffectType, (p: Props) => React.ReactElement>> = {
  PIERCE: IconePierce,
  COMBO_FOLLOWUP: IconeCombo,
  COMBO_STUN: IconeComboStun,
}

/**
 * Escolhe o ícone que melhor descreve a habilidade.
 *
 * `Swords` é o padrão — não um "sem ícone", mas "isto é um golpe e nada mais
 * específico se aplica", que é a leitura certa para o ataque básico.
 */
export function IconeDeHabilidade({
  nome,
  efeitos,
  tags = [],
  categoria,
  size = 20,
  className,
}: {
  nome?: string
  efeitos: { type: EffectType; flavor?: DotFlavor }[]
  tags?: string[]
  categoria?: string
  size?: number
  className?: string
}) {
  const arte = nome ? (ARTE_DE_HABILIDADE as Record<string, string>)[nome] : undefined
  if (arte) {
    return (
      // Recorte quadrado por CSS: a arte da wiki vem em proporção qualquer, e
      // object-cover é o que faz 100 fontes diferentes lerem como um conjunto.
      // Sem <Image>: são estáticas, já reduzidas pela CDN, e o container é
      // pequeno demais para o otimizador render algo.
      <span
        className={`inline-block overflow-hidden rounded ring-1 ring-border/60 shrink-0 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={arte} alt="" aria-hidden="true" className="w-full h-full object-cover" loading="lazy" />
      </span>
    )
  }

  const sabor = efeitos.some((e) => e.type === 'DOT') ? saborDoDot(tags) : undefined
  if (sabor) {
    const Icone = POR_SABOR[sabor]
    return <Icone size={size} className={className} aria-hidden="true" />
  }

  for (const efeito of efeitos) {
    const Custom = CUSTOMIZADOS[efeito.type]
    if (Custom) return <Custom size={size} className={className} />
    const Icone = POR_EFEITO[efeito.type]
    if (Icone) return <Icone size={size} className={className} aria-hidden="true" />
  }

  const DaCategoria = categoria ? POR_CATEGORIA[categoria] : undefined
  const Escolhido = DaCategoria ?? Swords
  return <Escolhido size={size} className={className} aria-hidden="true" />
}
