import Link from 'next/link'
import { bonusDeAtributos } from '@/app/lib/progression/atributos'
import { requireUser } from '@/app/lib/session'
import { getDashboardUser } from '@/app/lib/progression/queries'
import { getTreeBonus } from '@/app/lib/battle/queries'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { computeFighterStats, sumStatBonuses } from '@/app/lib/battle/engine'
import { CharacterImage } from '@/app/components/CharacterImage'
import { StatGrid } from '@/app/components/StatGrid'

export default async function DashboardPage() {
  const user = await requireUser()

  const data = await getDashboardUser(user.id)

  if (!data?.selectedCharacter) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="card p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Nenhum personagem selecionado</h1>
            <p className="opacity-70">Pick one of your created characters to continue.</p>
          </div>
          <Link className="btn-primary rounded-md px-4 py-2 text-sm" href="/select">Escolher personagem</Link>
        </div>
      </main>
    )
  }

  const uc = data.selectedCharacter
  // Antes era `uc.character` cru: não refletia nem a escala de nível nem os
  // bônus de árvore/equipamento, então o número da tela não batia com o da
  // batalha. Mesma composição usada em /status e no combate.
  const [treeBonus, equipmentBonus] = await Promise.all([
    getTreeBonus(uc.id),
    getEquipmentBonus(uc.id),
  ])
  const base = computeFighterStats(uc.character, uc.level, sumStatBonuses(treeBonus, equipmentBonus, bonusDeAtributos(uc)))

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar Card */}
        <div className="card p-6 flex items-center gap-4 md:w-1/2">
          <CharacterImage
            src={uc.character.imageUrl}
            alt={uc.nickname}
            containerClassName="h-28 w-28 rounded-lg overflow-hidden bg-background-alt relative flex-shrink-0"
            sizes="112px"
          />
          <div>
            <div className="text-xl font-semibold">{uc.nickname}</div>
            <div className="text-sm opacity-70">{uc.character.name}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm opacity-80">
              <span>Nível {uc.level}</span>
              <span>EXP {uc.experience}</span>
              <span>Pontos {uc.pointsAvailable}</span>
            </div>
          </div>
        </div>

        {/* Wins & Links */}
        <div className="card p-6 md:flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-[color:var(--ring)]/20 p-4">
              <div className="text-sm opacity-70">Vitórias no PvP</div>
              <div className="text-2xl font-semibold">{uc.pvpWins}</div>
            </div>
            <div className="rounded-md bg-[color:var(--ring)]/20 p-4">
              <div className="text-sm opacity-70">Vitórias contra a IA</div>
              <div className="text-2xl font-semibold">{uc.npcWins}</div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/battle/ai" className="btn-primary rounded-md px-4 py-2 text-sm">Treino contra a IA</Link>
            <Link href="/battle/pvp" className="rounded-md px-4 py-2 text-sm border border-border bg-surface hover:bg-surface-raised">PvP</Link>
            <Link href="/equipment" className="rounded-md px-4 py-2 text-sm border border-border bg-surface hover:bg-surface-raised">Equipamento</Link>
            <Link href="/status" className="rounded-md px-4 py-2 text-sm border border-border bg-surface hover:bg-surface-raised">Status</Link>
            <Link href="/characters" className="rounded-md px-4 py-2 text-sm border border-border bg-surface hover:bg-surface-raised">Ver personagens</Link>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">Atributos</h2>
        <StatGrid
          gridClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm"
          stats={[
            { label: 'Vida', value: base.hp },
            { label: 'ATQ', value: base.attack },
            { label: 'DEF', value: base.defense },
            { label: 'VEL', value: base.speed },
            { label: 'EN', value: base.energy },
          ]}
        />
      </div>
    </main>
  )
}
