import type { ReactNode } from 'react'
import { chanfro } from '@/app/components/battle/Moldura'

/** A cor de cada raridade — a mesma escala do resto do jogo, do cinza ao dourado. */
export const COR_DA_RARIDADE: Record<string, string> = {
  COMUM: '#a1a1aa',
  RARO: '#4dd0e1',
  EPICO: '#a78bfa',
  LENDARIO: '#f59e0b',
}

export const NOME_DA_RARIDADE: Record<string, string> = {
  COMUM: 'Comum',
  RARO: 'Raro',
  EPICO: 'Épico',
  LENDARIO: 'Lendário',
}

/**
 * Um item empilhável (material ou poção): o kanji na cor da raridade, o nome,
 * quantos você tem e o que ele é. Menor que o cartão de equipamento — não tem
 * atributo nem espaço, só quantidade.
 */
export function CartaDeItem({
  item,
  quantidade,
  rodape,
}: {
  item: { nome: string; descricao: string; raridade: string; marca: string }
  quantidade?: number
  rodape?: ReactNode
}) {
  const cor = COR_DA_RARIDADE[item.raridade] ?? COR_DA_RARIDADE.COMUM
  return (
    <div className="card flex flex-col gap-3 p-3" style={{ borderColor: `color-mix(in srgb, ${cor} 45%, var(--border))` }}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center font-kanji text-xl text-white"
          style={{ clipPath: chanfro(6), background: `color-mix(in srgb, ${cor} 45%, #0a0a0f)`, textShadow: `0 0 10px ${cor}` }}
        >
          {item.marca}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{item.nome}</span>
            {quantidade !== undefined && <span className="shrink-0 text-sm tabular-nums text-muted">×{quantidade}</span>}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cor }}>
            {NOME_DA_RARIDADE[item.raridade] ?? item.raridade}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{item.descricao}</p>
        </div>
      </div>
      {rodape}
    </div>
  )
}
