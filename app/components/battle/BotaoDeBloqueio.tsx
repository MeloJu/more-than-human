'use client'

import { useFormStatus } from 'react-dom'
import { Shield } from 'lucide-react'
import { BLOQUEIO_REDUCAO } from '@/app/lib/battle/constants'
import { TagDeCusto } from './Moldura'
import type { CombatantState } from '@/app/lib/battle/types'

/**
 * Botão de erguer a guarda.
 *
 * O QUE ELE PRECISA DIZER, e que nenhum outro botão da tela dizia: bloquear
 * gasta a rodada. É a única ação que não faz nada ao adversário, e sem isso
 * escrito o jogador só descobre a troca depois de fazê-la.
 *
 * O segundo é o RISCO. Se a stamina não cobrir o que o golpe traria, a guarda
 * quebra, o dano entra inteiro e ainda se perde a rodada seguinte — a jogada
 * mais punitiva do combate. O botão mostra a reserva justamente para a
 * decisão ser tomada com o número à vista, e avisa quando ela está baixa.
 */
export function BotaoDeBloqueio({ combatente, custo }: { combatente: CombatantState; custo: number }) {
  const reserva = combatente.currentStamina ?? 0
  const maximo = combatente.maxStamina ?? 0
  const fracao = maximo > 0 ? reserva / maximo : 0

  return <Interior reserva={reserva} maximo={maximo} custo={custo} arriscado={fracao < 0.3} />
}

function Interior({
  reserva,
  maximo,
  custo,
  arriscado,
}: {
  reserva: number
  maximo: number
  custo: number
  arriscado: boolean
}) {
  // useFormStatus só enxerga o <form> ancestral, então precisa viver num filho.
  const { pending } = useFormStatus()
  const semGuarda = reserva < custo

  return (
    <button
      type="submit"
      disabled={semGuarda || pending}
      className={`w-full h-full min-h-[68px] px-3 py-2.5 text-sm border text-left bg-background/60 transition-all ${
        semGuarda ? 'opacity-45 cursor-not-allowed' : 'hover:bg-amber-500/10'
      } ${pending ? 'scale-[0.97] bg-amber-500/10' : ''}`}
      style={{
        borderRadius: '2px 10px 2px 10px',
        borderColor: semGuarda ? 'var(--border)' : 'color-mix(in srgb, #fbbf24 70%, transparent)',
        boxShadow: semGuarda ? undefined : '0 0 16px color-mix(in srgb, #fbbf24 12%, transparent)',
      }}
    >
      <div className="flex gap-3 items-center">
        <span
          className="shrink-0 grid place-items-center w-11 h-11 bg-background text-amber-400"
          style={{ border: '1px solid color-mix(in srgb, #fbbf24 40%, transparent)', borderRadius: 3 }}
        >
          <Shield className="h-6 w-6" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold leading-snug">Bloquear</span>
            <TagDeCusto tipo="st">{custo} ST</TagDeCusto>
          </span>

          <span className="block text-xs text-muted mt-0.5">
            Gasta a rodada · −{Math.round(BLOQUEIO_REDUCAO * 100)}% de dano
          </span>

          {semGuarda ? (
            <span className="block text-xs text-red-400/90 mt-0.5">sem stamina para erguer a guarda</span>
          ) : (
            <span className={`block text-xs mt-0.5 tabular-nums ${arriscado ? 'text-amber-400' : 'text-muted'}`}>
              {reserva}/{maximo} de guarda{arriscado && ' — arrisca quebrar'}
            </span>
          )}

          {pending && <span className="block text-xs text-accent mt-0.5">resolvendo…</span>}
        </span>
      </div>
    </button>
  )
}
