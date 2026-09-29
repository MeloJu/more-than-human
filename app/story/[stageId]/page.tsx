import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/app/lib/session'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { getRetratosDosFalantes, getStageForUser, parseDialogo } from '@/app/lib/story/queries'
import { CenaDeDialogo } from '@/app/components/story/CenaDeDialogo'
import { startStoryBattle } from '@/app/lib/story/actions'

export default async function StoryStagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params

  const user = await requireUser()

  // Progresso é por personagem, então a tela precisa saber QUAL personagem
  // está em campo antes de dizer se o estágio está concluído ou bloqueado.
  const userCharacter = await getSelectedCharacter(user.id)
  if (!userCharacter) redirect('/select')

  const found = await getStageForUser(stageId, userCharacter.id)
  if (!found) redirect('/story?error=not_found')
  if (found.locked) redirect('/story?error=locked')

  const { stage, completed } = found
  const enemy = stage.enemyCharacter ?? stage.enemyMonster
  const enemyName = enemy?.name ?? '???'

  const falas = parseDialogo(stage.introDialogue)
  const retratos = await getRetratosDosFalantes(
    falas.map((f) => f.speaker).filter((n): n is string => n !== null)
  )

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/story" className="text-sm opacity-60 hover:opacity-100">
        ← {stage.chapter.title}
      </Link>

      <h1 className="text-2xl font-semibold mt-2 mb-4">
        <span className="opacity-50 tabular-nums mr-2">{String(stage.order).padStart(2, '0')}</span>
        {stage.title}
      </h1>

      <div className="card p-6 space-y-5">
        {/* A narrativa de abertura permanece visível depois de concluído: é o
            texto que dá contexto à luta, não um aviso de uma vez só. */}
        <p className="whitespace-pre-line leading-relaxed">{stage.introText}</p>

        <div className="rounded-md border border-border p-3">
          <div className="text-xs uppercase tracking-wide opacity-50">Adversário</div>
          <div className="font-semibold mt-0.5">
            {enemyName} <span className="text-xs opacity-60">· Lv {stage.enemyLevel}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="opacity-60">XP: </span>
            <span className="font-medium">{stage.xpReward}</span>
          </div>
          <div>
            <span className="opacity-60">Moedas: </span>
            <span className="font-medium">{stage.coinReward}</span>
            {completed && <span className="opacity-50 text-xs ml-1">(já recebidas)</span>}
          </div>
        </div>

        {completed ? (
          <>
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-green-300 opacity-80">Concluído</div>
              <p className="whitespace-pre-line leading-relaxed mt-1 text-green-100">{stage.outroText}</p>
            </div>
            <CenaDeDialogo falas={falas} retratos={retratos} rotuloAbrir="Rejogar">
              <form action={startStoryBattle.bind(null, stage.id)}>
                <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm">
                  Lutar
                </button>
              </form>
            </CenaDeDialogo>
            <p className="text-xs opacity-50 mt-2">Rejogar rende metade do XP do estágio, e nenhuma moeda — as moedas saem só na primeira conclusão.</p>
          </>
        ) : (
          <CenaDeDialogo falas={falas} retratos={retratos} rotuloAbrir="Começar">
            <form action={startStoryBattle.bind(null, stage.id)}>
              <button type="submit" className="btn-primary rounded-md px-4 py-2 text-sm">
                Lutar
              </button>
            </form>
          </CenaDeDialogo>
        )}
      </div>
    </main>
  )
}
