'use client'

import { useFormStatus } from 'react-dom'
import { Flame } from 'lucide-react'
import { TagDeCusto } from './Moldura'
import type { TransformationDef } from '@/app/lib/battle/types'

function pct(v: number): string | null {
  if (!v) return null
  const n = Math.round(v * 100)
  return `${n > 0 ? '+' : ''}${n}%`
}

/**
 * Botão de liberar uma forma.
 *
 * Antes era um botão comum, com o mesmo peso visual de qualquer outro, escrito
 * "Transformar: Bankai: Tensa Zangetsu". Ele não dizia o CUSTO — que agora é
 * de 34 a 44 de energia — nem se GASTA A RODADA, que é a regra que separa
 * Bankai de Super Saiyan e a que mais muda como se joga o momento.
 *
 * Sem energia, o botão diz por quê em vez de só apagar: um controle
 * desabilitado sem motivo obriga o jogador a adivinhar.
 */
export function BotaoDeForma({
  forma,
  energiaAtual,
  cor,
}: {
  forma: TransformationDef
  energiaAtual: number
  /** Cor do personagem: a forma é dele, então herda a identidade do card. */
  cor?: string | null
}) {
  const custo = forma.activationCost ?? 0
  const gastaRodada = forma.consumesTurn !== false
  const falta = custo - energiaAtual
  const podeLiberar = falta <= 0

  const ganhos = [
    ['ATQ', pct(forma.attackModifier)],
    ['DEF', pct(forma.defenseModifier)],
    ['VEL', pct(forma.speedModifier)],
  ].filter((g): g is [string, string] => g[1] !== null)

  return (
    <Interior
      forma={forma}
      cor={cor ?? 'var(--accent)'}
      custo={custo}
      gastaRodada={gastaRodada}
      podeLiberar={podeLiberar}
      falta={falta}
      ganhos={ganhos}
    />
  )
}

function Interior({
  forma,
  cor,
  custo,
  gastaRodada,
  podeLiberar,
  falta,
  ganhos,
}: {
  forma: TransformationDef
  cor: string
  custo: number
  gastaRodada: boolean
  podeLiberar: boolean
  falta: number
  ganhos: [string, string][]
}) {
  // useFormStatus só enxerga o form ancestral, então precisa estar num
  // componente filho do <form> — daí a separação.
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={!podeLiberar || pending}
      className={`w-[20rem] max-w-[82vw] h-full text-left border px-3.5 py-3 transition-all ${
        podeLiberar ? 'hover:brightness-125' : 'opacity-50 cursor-not-allowed'
      } ${pending ? 'scale-[0.98] opacity-70' : ''}`}
      style={{
        borderColor: `color-mix(in srgb, ${cor} ${podeLiberar ? 70 : 30}%, var(--border))`,
        background: `linear-gradient(100deg, color-mix(in srgb, ${cor} 12%, var(--background)), var(--background) 70%)`,
        boxShadow: podeLiberar ? `0 0 18px color-mix(in srgb, ${cor} 18%, transparent)` : undefined,
        borderRadius: '2px 12px 2px 12px',
      }}
    >
      <div className="flex gap-3 items-center">
        <span
          className="shrink-0 grid place-items-center w-12 h-12"
          style={{
            color: cor,
            border: `1px solid color-mix(in srgb, ${cor} 55%, transparent)`,
            background: `color-mix(in srgb, ${cor} 10%, transparent)`,
            clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
          }}
        >
          <Flame className="h-6 w-6" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-bold leading-snug">{pending ? 'Liberando…' : forma.name}</span>
            <TagDeCusto>{custo} EN</TagDeCusto>
          </span>

          <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-1 tabular-nums">
            {ganhos.map(([rotulo, valor]) => (
              <span key={rotulo}>
                <span className="text-muted">{rotulo} </span>
                <span className={valor.startsWith('-') ? 'text-red-400' : 'text-green-400'}>{valor}</span>
              </span>
            ))}
            <span className={gastaRodada ? 'text-muted' : 'text-green-400'}>
              {gastaRodada ? 'gasta a rodada' : 'não gasta a rodada'}
            </span>
          </span>

          {!podeLiberar && <span className="block text-xs mt-1 text-red-400/90">Faltam {falta} de energia.</span>}
        </span>
      </div>
    </button>
  )
}
