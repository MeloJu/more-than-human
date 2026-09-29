import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { startRaidBattle } from '@/app/lib/battle/actions'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { nivelMinimoDoTier, tierLiberado } from '@/app/lib/battle/raid'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { VAGAS_DE_CONTRATO, precoDoContrato } from '@/app/lib/battle/party'
import { MercadoDeContratos } from '@/app/components/raid/MercadoDeContratos'

export default async function BattleRaidPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const errorMessage = battleErrorMessage(error)

  const user = await requireUser()

  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Raid</h1>
        <div className="card p-6 space-y-3">
          <p className="opacity-70">Você precisa selecionar um personagem antes de entrar na raid.</p>
          <Link href="/select" className="btn-primary inline-block rounded-md px-4 py-2 text-sm">Selecionar Personagem</Link>
        </div>
      </main>
    )
  }

  const [activeBattle, monstros, conta, elenco] = await Promise.all([
    prisma.battle.findFirst({
      where: { userId: user.id, playerCharacterId: selected.id, status: 'ACTIVE', enemyMonsterId: { not: null } },
      select: { id: true },
    }),
    // Todos, inclusive os trancados: ver o que vem adiante é metade do motivo
    // de subir de nível. Escondê-los deixaria a tela igual à de antes, com um
    // alvo só e nenhum horizonte.
    prisma.monster.findMany({ orderBy: { tier: 'asc' } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    // O mercado: o elenco inteiro menos o próprio personagem.
    prisma.character.findMany({
      where: { id: { not: selected.characterId } },
      select: { id: true, name: true, imageUrl: true, class: true, corDestaque: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const contrataveis = elenco.map((c) => ({
    id: c.id,
    nome: c.name,
    imageUrl: c.imageUrl,
    classe: c.class ? c.class.charAt(0) + c.class.slice(1).toLowerCase() : 'Lutador',
    cor: c.corDestaque,
  }))

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Raid</h1>
        <p className="text-sm text-muted mt-1">
          Inimigos de força fixa. Diferente da batalha contra IA, eles não acompanham o seu nível — o tier
          é uma escada que se sobe.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="card p-4">
        <div className="font-semibold">{selected.nickname}</div>
        <div className="text-sm opacity-70">{selected.character.name} · Nível {selected.level}</div>
      </div>

      {activeBattle ? (
        <div className="card p-6 space-y-3">
          <p className="text-sm">Você tem uma raid em andamento. Termine essa antes de começar outra.</p>
          <Link href={`/battle/ai/${activeBattle.id}`} className="btn-primary inline-block rounded-md px-4 py-2 text-sm">
            Retomar Raid
          </Link>
        </div>
      ) : (
        // UM FORMULÁRIO SÓ: a party escolhida no mercado e o monstro escolhido
        // no card são a mesma decisão, e cada "Enfrentar" envia as duas.
        <form className="space-y-4">
          <MercadoDeContratos
            contrataveis={contrataveis}
            vagas={VAGAS_DE_CONTRATO}
            precoPorContrato={precoDoContrato(selected.level)}
            moedas={conta?.coins ?? 0}
            nivel={selected.level}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {monstros.map((monstro) => {
              const liberado = tierLiberado(monstro.tier, selected.level)
              const exigido = nivelMinimoDoTier(monstro.tier)

              return (
                <div
                  key={monstro.id}
                  className={`card p-4 space-y-3 ${liberado ? '' : 'opacity-60'}`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{monstro.name}</span>
                      <span className="text-xs opacity-60 shrink-0">Tier {monstro.tier}</span>
                    </div>
                    {monstro.description && (
                      <p className="text-sm opacity-70 mt-1">{monstro.description}</p>
                    )}
                  </div>

                  {/* Os números ficam à vista mesmo no card trancado: é com eles
                      que o jogador decide se vale subir de nível agora ou ir
                      montar um loadout melhor antes. */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums opacity-70">
                    <span>{monstro.hp} HP</span>
                    <span>{monstro.attack} ATK</span>
                    <span>{monstro.defense} DEF</span>
                    <span>{monstro.speed} VEL</span>
                  </div>

                  {liberado ? (
                    <button
                      type="submit"
                      formAction={startRaidBattle.bind(null, selected.id, monstro.id)}
                      className="btn-primary w-full rounded-md px-4 py-2 text-sm"
                    >
                      Enfrentar
                    </button>
                  ) : (
                    <div className="rounded-md border border-border px-3 py-2 text-xs opacity-70 text-center">
                      Liberado no nível {exigido}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </form>
      )}
    </main>
  )
}
