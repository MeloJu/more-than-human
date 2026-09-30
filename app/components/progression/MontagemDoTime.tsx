'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { chanfro } from '@/app/components/battle/Moldura'

export type PokemonDoTime = {
  id: string
  nome: string
  cor: string
  marca: string
  nivel: number
  liberado: boolean
  golpes: string[]
}

/**
 * A build do treinador: quais Pokémon ele leva para a luta, até `tamanho`.
 *
 * NO LUGAR DO LOADOUT DE GOLPES. O Red não tem slots de habilidade: cada
 * Pokémon leva os dois golpes dele, e o que se escolhe é o time. A escolha é
 * só o conforto da tela — o servidor revalida (ver salvarTime) e a luta
 * confere de novo contra o que o nível libera (ver timeDoTreinador).
 */
export function MontagemDoTime({
  pokemon,
  escolhidos,
  tamanho,
  salvar,
}: {
  pokemon: PokemonDoTime[]
  escolhidos: string[]
  tamanho: number
  salvar: (formData: FormData) => void | Promise<void>
}) {
  const [time, setTime] = useState<string[]>(escolhidos)
  const cheio = time.length >= tamanho
  const mudou = time.join(',') !== escolhidos.join(',')

  const alternar = (id: string) =>
    setTime((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : atual.length >= tamanho ? atual : [...atual, id]))

  return (
    <form action={salvar} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">Time</h2>
          <p className="text-sm opacity-70">
            Leve até {tamanho} Pokémon. Cada um entra com os dois golpes dele, e o primeiro da lista começa em campo.
          </p>
        </div>
        <span className="text-sm tabular-nums opacity-80">
          {time.length}/{tamanho}
        </span>
      </div>

      {time.map((id) => (
        <input key={id} type="hidden" name="pokemon" value={id} />
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {pokemon.map((p) => {
          const marcado = time.includes(p.id)
          const ordem = time.indexOf(p.id)
          const bloqueado = !p.liberado || (!marcado && cheio)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => p.liberado && alternar(p.id)}
              disabled={bloqueado}
              aria-pressed={marcado}
              className={`flex items-center gap-3 border p-2 text-left transition-all ${bloqueado && !marcado ? 'opacity-45' : 'hover:brightness-125'}`}
              style={{
                borderRadius: '2px 10px 2px 10px',
                borderColor: marcado ? p.cor : 'var(--border)',
                background: marcado ? `color-mix(in srgb, ${p.cor} 14%, var(--background))` : 'var(--background)',
              }}
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center font-kanji text-lg text-white"
                style={{ clipPath: chanfro(6), background: `color-mix(in srgb, ${p.cor} 55%, #0a0a0f)` }}
              >
                {p.marca}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {p.nome}
                  {marcado && ordem === 0 && <span className="text-[11px] uppercase tracking-wider text-accent">abre a luta</span>}
                </span>
                <span className="block truncate text-xs opacity-60">
                  {p.liberado ? p.golpes.join(' · ') : `libera no nível ${p.nivel}`}
                </span>
              </span>
              {!p.liberado && <Lock className="h-4 w-4 shrink-0 opacity-60" />}
            </button>
          )
        })}
      </div>

      <button type="submit" disabled={!mudou || time.length === 0} className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-50">
        Salvar time
      </button>
    </form>
  )
}
