import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCharacterById } from '@/app/lib/characters/queries'
import { CharacterImage } from '@/app/components/CharacterImage'
import { StatGrid } from '@/app/components/StatGrid'

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || typeof id !== 'string') return notFound()

  const c = await getCharacterById(id)
  if (!c) return notFound()

  return (
    // overflow-x-clip: as manchas de cor ficam de propósito fora da caixa, e
    // sem o corte elas alargavam a página no celular (470px numa tela de 390).
    <main className="relative mx-auto max-w-6xl p-6 space-y-6 overflow-x-clip">
      <div className="pointer-events-none absolute -top-10 -left-14 h-56 w-56 rounded-full bg-gradient-to-br from-[#4f46e5]/40 via-[#60a5fa]/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#0ea5e9]/30 via-[#818cf8]/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-gradient-to-br from-[#facc15]/20 via-[#fb7185]/20 to-transparent blur-3xl" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{c.name}</h1>
          <div className="text-sm opacity-70">{c.anime.name}{c.affiliation ? ` • ${c.affiliation.name}` : ''}</div>
        </div>
        <Link href="/characters" className="text-sm underline">Voltar à lista</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Portrait */}
        <div className="card p-4">
          <CharacterImage
            src={c.imageUrl}
            alt={c.name}
            containerClassName="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-background-alt"
            placeholderClassName="h-full w-full flex items-center justify-center text-muted"
          />
        </div>

        {/* Stats */}
        <div className="md:col-span-2 card p-6">
          <h2 className="text-lg font-semibold mb-3">Atributos</h2>
          <StatGrid
            gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm"
            itemClassName="rounded-md border border-border p-3 bg-surface-raised"
            stats={[
              { label: 'Vida', value: c.hp },
              { label: 'Ataque', value: c.attack },
              { label: 'Defesa', value: c.defense },
              { label: 'Velocidade', value: c.speed },
              { label: 'Energia', value: c.energy },
            ]}
          />
        </div>
      </div>

      {/* Skills */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Habilidades</h2>
        </div>
        {c.characterSkills.length === 0 ? (
          <div className="text-sm opacity-70">Nenhuma habilidade ainda.</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {c.characterSkills.map(cs => (
              <li key={cs.skillId} className="rounded-md border border-border p-3 bg-surface-raised">
                <div className="font-medium">{cs.skill.name}</div>
                <div className="text-xs opacity-70 mt-0.5">Poder {cs.skill.power} • Energia {cs.skill.energyCost} • Recarga {cs.skill.cooldown}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
