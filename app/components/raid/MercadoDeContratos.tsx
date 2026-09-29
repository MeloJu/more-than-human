'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Coins, Search, X } from 'lucide-react'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

export type Contratavel = {
  id: string
  nome: string
  imageUrl: string | null
  classe: string
  cor: string | null
}

/**
 * O mercado de contratação, dentro do formulário da raid.
 *
 * Os escolhidos viajam como `aliado` no mesmo formulário do botão "Enfrentar"
 * — é a mesma decisão (quem vai comigo, contra quem), então é um envio só. O
 * limite de vagas e o total aqui são CONFORTO: o servidor revalida tudo
 * (ver validarContratos) e só cobra se o saldo cobrir, na própria escrita.
 */
export function MercadoDeContratos({
  contrataveis,
  vagas,
  precoPorContrato,
  moedas,
  nivel,
  compacto = false,
}: {
  contrataveis: Contratavel[]
  vagas: number
  precoPorContrato: number
  moedas: number
  nivel: number
  /** Numa coluna estreita (ao lado da torre): duas colunas de personagens. */
  compacto?: boolean
}) {
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [busca, setBusca] = useState('')

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? contrataveis.filter((c) => c.nome.toLowerCase().includes(termo)) : contrataveis
  }, [busca, contrataveis])

  const total = escolhidos.length * precoPorContrato
  const falta = total - moedas
  const cheia = escolhidos.length >= vagas

  const alternar = (id: string) =>
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : atual.length >= vagas ? atual : [...atual, id]))

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">Mercado de contratos</h2>
          <p className="text-sm opacity-70">
            Sem guilda ou amigos? Contrate até {vagas} aliados para esta raid. Eles entram no nível {nivel} e lutam
            sozinhos.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm tabular-nums">
          <Coins className="h-4 w-4 text-amber-400" /> {moedas} moedas
        </div>
      </div>

      {/* A party escolhida, com o custo. Os inputs escondidos são o que o
          formulário envia. */}
      <div className="flex flex-wrap items-center gap-2 min-h-9">
        <span className="text-sm opacity-70">Party:</span>
        <span className="text-sm font-medium">Você</span>
        {escolhidos.map((id) => {
          const c = contrataveis.find((x) => x.id === id)
          if (!c) return null
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-sm">
              <input type="hidden" name="aliado" value={id} />
              {c.nome}
              <button type="button" onClick={() => alternar(id)} aria-label={`Dispensar ${c.nome}`} className="opacity-60 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )
        })}
        <span className="ml-auto text-sm tabular-nums">
          {total > 0 ? `${total} moedas` : 'Sem contratos: você vai sozinho'}
        </span>
      </div>
      {falta > 0 && <p className="text-sm text-red-400">Faltam {falta} moedas para esses contratos.</p>}

      <label className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
        <Search className="h-4 w-4 opacity-60" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar personagem"
          className="flex-1 bg-transparent outline-none"
        />
      </label>

      <div className={`grid gap-2 overflow-y-auto pr-1 ${compacto ? 'grid-cols-2 max-h-96' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-h-80'}`}>
        {visiveis.map((c) => {
          const marcado = escolhidos.includes(c.id)
          const bloqueado = !marcado && cheia
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => alternar(c.id)}
              disabled={bloqueado}
              aria-pressed={marcado}
              className={`flex items-center gap-2 rounded-md border p-1.5 text-left transition-colors ${
                marcado ? 'border-accent bg-accent/10' : 'border-border hover:bg-white/5'
              } ${bloqueado ? 'opacity-40' : ''}`}
              style={marcado && c.cor ? { borderColor: c.cor } : undefined}
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill className="object-cover" style={{ objectPosition: FOCO[c.imageUrl] ?? '50% 20%' }} sizes="40px" />
                ) : (
                  <CharacterMonogram name={c.nome} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.nome}</span>
                <span className="block text-xs opacity-60">
                  {c.classe} · {precoPorContrato} moedas
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
