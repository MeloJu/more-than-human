'use client'

import { useRef, useState } from 'react'
import { ArrowLeftRight, Plus, X } from 'lucide-react'
import { CartaoDeHabilidade } from '@/app/components/skills/CartaoDeHabilidade'
import type { SkillDef } from '@/app/lib/battle/types'

type Acao = (dados: FormData) => void | Promise<void>

/**
 * Monta o loadout vendo o arsenal inteiro.
 *
 * ANTES: para trocar uma habilidade era preciso desequipar a atual, e só
 * então aparecia uma lista suspensa com os NOMES das outras — escolhia-se sem
 * saber o que cada uma fazia. Queixa do dono do projeto.
 *
 * AGORA: todas as habilidades do personagem aparecem com poder, custo,
 * recarga e efeitos. Clica-se na que se quer e depois no espaço onde ela
 * entra; espaço ocupado é trocado direto (equipSkill já substitui o que está
 * no espaço, numa transação só). Dois cliques, os dois sabendo o que fazem.
 *
 * As ações chegam prontas do servidor, uma por espaço (equipar e tirar), já
 * presas ao personagem e ao espaço — o navegador só escolhe qual habilidade.
 */
export function MontagemDoLoadout({
  espacos,
  equipadas,
  disponiveis,
  equipar,
  tirar,
}: {
  espacos: number
  /** O que está em cada espaço, por índice. */
  equipadas: (SkillDef | null)[]
  /** As habilidades que o personagem pode equipar e que não estão equipadas. */
  disponiveis: SkillDef[]
  equipar: Acao[]
  tirar: Acao[]
}) {
  const [escolhida, setEscolhida] = useState<SkillDef | null>(null)
  const espacosRef = useRef<HTMLDivElement>(null)

  // Escolhida a habilidade, a tela sobe até os espaços: a lista de disponíveis
  // fica embaixo, e sem isso o passo seguinte acontecia fora da vista.
  const escolher = (skill: SkillDef | null) => {
    setEscolhida(skill)
    if (!skill) return
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    espacosRef.current?.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' })
  }
  const ocupados = equipadas.filter(Boolean).length

  return (
    <div className="space-y-5">
      <div ref={espacosRef} className="space-y-3 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            Equipadas <span className="opacity-60 tabular-nums">({ocupados}/{espacos})</span>
          </h2>
          {escolhida ? (
            <div className="flex items-center gap-2 text-sm">
              <span>
                Escolha o espaço para <span className="font-semibold text-accent">{escolhida.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setEscolhida(null)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised"
              >
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
            </div>
          ) : (
            <span className="text-sm opacity-60">Clique numa habilidade abaixo para equipar ou trocar.</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: espacos }, (_, espaco) => {
            const skill = equipadas[espaco] ?? null
            return (
              <div
                key={espaco}
                className={`rounded-md p-2 flex flex-col gap-2 transition-colors ${
                  escolhida ? 'border-2 border-accent/70 bg-accent/5' : skill ? 'border border-accent/40 bg-accent/5' : 'border border-dashed border-border'
                }`}
              >
                {/* Embrulhado: o cartão tem h-full, e direto no espaço ele esticava
                    até o fim e empurrava os botões para fora. */}
                {skill ? (
                  <div>
                    <CartaoDeHabilidade skill={skill} />
                  </div>
                ) : (
                  <div className="grid place-content-center h-20 text-sm opacity-50">Espaço vazio</div>
                )}
                {skill?.requerFormaNome && (
                  <div className="text-xs text-amber-400 px-1">Só com {skill.requerFormaNome}</div>
                )}
                <div className="mt-auto flex gap-2 px-1 pb-1">
                  {escolhida && (
                    <form action={equipar[espaco]} onSubmit={() => setEscolhida(null)}>
                      <input type="hidden" name="skillId" value={escolhida.id} />
                      <button type="submit" className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
                        {skill ? <ArrowLeftRight className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {skill ? `Trocar por ${escolhida.name}` : 'Colocar aqui'}
                      </button>
                    </form>
                  )}
                  {skill && !escolhida && (
                    <form action={tirar[espaco]}>
                      <button type="submit" className="rounded-md px-3 py-1.5 text-xs border border-border hover:bg-surface-raised">
                        Tirar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">
          Disponíveis <span className="opacity-60 tabular-nums">({disponiveis.length})</span>
        </h2>
        {disponiveis.length === 0 ? (
          <p className="text-sm opacity-60">Todas as habilidades que o personagem sabe já estão equipadas.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {disponiveis.map((skill) => {
              const ativa = escolhida?.id === skill.id
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => escolher(ativa ? null : skill)}
                  className={`text-left rounded-md transition-all ${
                    ativa ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-accent/50'
                  }`}
                >
                  <CartaoDeHabilidade skill={skill} />
                  {skill.requerFormaNome && (
                    <span className="block text-xs text-amber-400 px-3 pb-2 -mt-1">Só com {skill.requerFormaNome}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
