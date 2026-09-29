import { AlertTriangle, Crosshair, Flame, ShieldOff } from 'lucide-react'
import type { Alcance } from '@/app/lib/battle/types'

/**
 * O que o chefe está prestes a fazer, dito ANTES de o jogador escolher.
 *
 * É a metade do desenho de chefe que acontece na tela: a carga anunciada só
 * é justa se o aviso diz o que ela é e o que defende dela. Sem isso, o golpe
 * carregado seria só um golpe maior que chega sem aviso.
 *
 * Cada linha aparece sozinha, conforme o estado: carregando, de olho em
 * alguém, exposto, ou acabou de virar de fase.
 */

const COMO_DEFENDER: Record<Alcance, string> = {
  DISTANCIA: 'É um disparo: Esquivar desvia, e Aparar não alcança.',
  CORPO: 'Vem de perto: Aparar anula e revida, e Esquivar também serve.',
  AREA: 'É em área: ninguém esquiva. Guarda ou Bloquear reduzem o estrago.',
}

export function AvisoDoChefe({
  nome,
  carga,
  presa,
  exposto,
  faseDois,
}: {
  nome: string
  /** O golpe carregado, de onde ele vem, e em quem vai cair. */
  carga?: { golpe: string; alcance: Alcance; alvo?: string }
  /** Quem ele está perseguindo (o que mais bateu nele na rodada passada). */
  presa?: string
  exposto?: boolean
  /** A virada de fase, se aconteceu na rodada que acabou de passar. */
  faseDois?: { forma: string; fala?: string }
}) {
  if (!carga && !presa && !exposto && !faseDois) return null

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {faseDois && (
        <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4 text-amber-400" /> Fase 2: {nome} liberou {faseDois.forma}
          </div>
          {faseDois.fala && <p className="mt-1 text-sm italic opacity-80">&ldquo;{faseDois.fala}&rdquo;</p>}
        </div>
      )}

      {carga && (
        <div className="rounded-md border border-red-500/70 bg-red-500/10 px-4 py-3 shadow-[0_0_24px_rgba(239,68,68,0.25)]">
          <div className="flex items-center gap-2 font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {nome} está carregando {carga.golpe}
            {carga.alvo && <> em {carga.alvo}</>}
          </div>
          <p className="mt-1 text-sm">
            Sai na próxima rodada, mais forte. {COMO_DEFENDER[carga.alcance]}
          </p>
          <p className="mt-0.5 text-xs opacity-70">Atordoar quem carrega desfaz a carga.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {presa && !carga && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-sm">
            <Crosshair className="h-3.5 w-3.5 text-red-400" /> {nome} está de olho em{' '}
            <span className="font-medium">{presa}</span>
          </span>
        )}
        {exposto && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-sm">
            <ShieldOff className="h-3.5 w-3.5 text-emerald-400" /> {nome} está exposto: leva mais dano nesta rodada
          </span>
        )}
      </div>
    </div>
  )
}
