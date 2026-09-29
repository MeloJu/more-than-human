import Image from 'next/image'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import Link from 'next/link'
import { listCharacters } from '@/app/lib/characters/queries'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DO_CATALOGO } from '@/app/lib/navegacao'

export const dynamic = 'force-dynamic'

export default async function CharactersPage() {
  const characters = await listCharacters()

  return (
    <main className="mx-auto max-w-6xl p-6">
      <AbasDaSecao abas={ABAS_DO_CATALOGO} className="mb-6" />
      <h1 className="text-3xl font-bold mb-6">Personagens</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((c) => (
          <div key={c.id} className="rounded-lg border bg-surface-raised p-4 shadow">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 bg-background-alt rounded overflow-hidden flex-shrink-0">
                {c.imageUrl ? (
                  <Image
                    src={c.imageUrl}
                    alt={c.name}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover object-top"
                    sizes="(max-width: 768px) 80px, 96px"
                    quality={90}
                  />
                ) : (
                  <CharacterMonogram name={c.name} />
                )}
              </div>
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-muted">{c.anime.name}{c.affiliation ? ` • ${c.affiliation.name}` : ''}</div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div className="flex gap-3 text-muted">
                <span>Vida {c.hp}</span>
                <span>ATQ {c.attack}</span>
                <span>DEF {c.defense}</span>
                <span>VEL {c.speed}</span>
                <span>EN {c.energy}</span>
              </div>
              {c.characterSkills.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted">Habilidades</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.characterSkills.map((cs) => (
                      <span key={cs.skillId} className="text-xs bg-background-alt px-2 py-0.5 rounded">
                        {cs.skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Link href={`/characters/${c.id}`} className="text-accent hover:underline text-sm">Ver detalhes</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
