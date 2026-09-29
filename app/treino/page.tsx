import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { treinarAtributo } from '@/app/lib/progression/actions'
import {
  ATRIBUTOS,
  ATRIBUTO_AJUDA,
  ATRIBUTO_LABEL,
  ATRIBUTO_POR_PONTO,
  bonusDeAtributos,
} from '@/app/lib/progression/atributos'
import { custoDoTreino, treinosQueCabem } from '@/app/lib/progression/treino'
import { computeFighterStats, sumStatBonuses } from '@/app/lib/battle/engine'
import { getTreeBonus } from '@/app/lib/battle/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DO_PERSONAGEM } from '@/app/lib/navegacao'

const TREINO_ERRORS: Record<string, string> = {
  invalid_attribute: 'Atributo inválido.',
  insufficient_coins: 'Moedas insuficientes para este treino.',
  not_found: 'Personagem não encontrado.',
}

/**
 * Área de treino: comprar atributo com moeda.
 *
 * É o segundo destino da moeda. Até aqui ela só comprava equipamento — 20
 * itens, e depois de comprados o dinheiro não tinha mais uso — enquanto a
 * batalha contra IA passou a pagar moeda todo dia.
 *
 * O preço sobe a cada treino e é mostrado ANTES da compra, junto com quantos
 * ainda cabem no saldo: encarecer só funciona como limite se o jogador
 * enxergar a curva.
 */
export default async function TreinoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await requireUser()
  const { error } = await searchParams
  const errorMessage = resolveErrorMessage(TREINO_ERRORS, error, 'Ocorreu um erro.')

  const selected = await getSelectedCharacter(user.id)
  if (!selected) redirect('/select')

  const [conta, treeBonus, equipmentBonus] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    getTreeBonus(selected.id),
    getEquipmentBonus(selected.id),
  ])

  const moedas = conta?.coins ?? 0

  const stats = computeFighterStats(
    selected.character,
    selected.level,
    sumStatBonuses(treeBonus, equipmentBonus, bonusDeAtributos(selected))
  )
  // Depende de stats, então vem depois dele: a inteligência do personagem
  // desconta o preço, e é ela que decide quantos treinos cabem no saldo.
  const custo = custoDoTreino(selected.treinos, stats.intelligence)
  const cabem = treinosQueCabem(moedas, selected.treinos, stats.intelligence)
  const podeTreinar = moedas >= custo

  const valorAtual: Record<string, number> = {
    hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    energy: stats.energy,
    stamina: stats.stamina,
    accuracy: stats.accuracy ?? 0,
    agility: stats.agility ?? 0,
    intelligence: stats.intelligence ?? 0,
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <AbasDaSecao abas={ABAS_DO_PERSONAGEM} className="mb-6" />
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h1 className="text-2xl font-semibold">Treino</h1>
        <span className="text-sm opacity-70 shrink-0 tabular-nums">{moedas} moedas</span>
      </div>
      <p className="text-sm opacity-70 mb-4">
        Treinar compra um ponto de atributo com dinheiro, e vale o mesmo que um ponto de nível. O preço
        sobe a cada treino — {selected.character.name} já fez{' '}
        <span className="tabular-nums font-medium">{selected.treinos}</span>.
      </p>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="card p-4 mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <span className="opacity-60 text-sm">Próximo treino </span>
          <span className="font-semibold tabular-nums">{custo}</span>
          <span className="opacity-60 text-sm"> moedas</span>
        </div>
        <div className="text-sm opacity-60 tabular-nums">
          {cabem > 0 ? `cabem ${cabem} no saldo atual` : 'saldo insuficiente'}
        </div>
      </div>

      {!podeTreinar && (
        <p className="text-sm opacity-70 mb-4">
          Ganhe moedas vencendo estágios da{' '}
          <Link href="/story" className="underline">
            história
          </Link>{' '}
          ou lutando{' '}
          <Link href="/battle/ai" className="underline">
            contra a IA
          </Link>{' '}
          — até cinco vitórias por dia rendem moeda.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ATRIBUTOS.map((attr) => (
          <div
            key={attr}
            className="rounded-md border border-border p-3 flex items-center justify-between gap-3"
            title={ATRIBUTO_AJUDA[attr]}
          >
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm opacity-70">{ATRIBUTO_LABEL[attr]}</span>
                <span className="font-semibold tabular-nums">{valorAtual[attr]}</span>
              </div>
              <div className="text-xs opacity-50 mt-0.5">+{ATRIBUTO_POR_PONTO[attr]} por treino</div>
            </div>

            <form action={treinarAtributo.bind(null, attr)}>
              <button
                type="submit"
                disabled={!podeTreinar}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-30 enabled:hover:border-accent enabled:hover:text-accent transition-colors whitespace-nowrap"
              >
                Treinar
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  )
}
