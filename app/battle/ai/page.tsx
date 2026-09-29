import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { startAiBattle } from '@/app/lib/battle/actions'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { getSelectedCharacter } from '@/app/lib/progression/queries'

export default async function BattleAiPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const errorMessage = battleErrorMessage(error)

  const user = await requireUser()

  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Battle VS AI</h1>
        <div className="card p-6 space-y-3">
          <p className="opacity-70">Você precisa selecionar um personagem antes de batalhar.</p>
          <Link href="/select" className="btn-primary inline-block rounded-md px-4 py-2 text-sm">Selecionar Personagem</Link>
        </div>
      </main>
    )
  }

  const activeBattle = await prisma.battle.findFirst({
    where: { userId: user.id, playerCharacterId: selected.id, status: 'ACTIVE' },
    select: { id: true },
  })

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Battle VS AI</h1>
      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}
      <div className="card p-6 space-y-4">
        <div>
          <div className="font-semibold">{selected.nickname}</div>
          <div className="text-sm opacity-70">{selected.character.name} · Lv {selected.level}</div>
        </div>
        {activeBattle ? (
          <Link href={`/battle/ai/${activeBattle.id}`} className="btn-primary inline-block rounded-md px-4 py-2 text-sm">
            Retomar Batalha
          </Link>
        ) : (
          <form action={startAiBattle.bind(null, selected.id)}>
            <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm">Começar Batalha</button>
          </form>
        )}
      </div>
    </main>
  )
}
