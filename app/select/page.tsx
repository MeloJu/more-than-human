import Link from "next/link";
import { requireUser } from '@/app/lib/session'
import { getUserCharacters } from '@/app/lib/progression/queries'
import { selectCharacter } from '@/app/lib/progression/actions'

export default async function SelectCharacterPage() {
  const user = await requireUser()

  const list = await getUserCharacters(user.id)

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Escolher personagem</h1>
        <Link href="/create" className="btn-primary rounded-md px-4 py-2 text-sm">Criar novo</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((uc) => (
          <form key={uc.id} action={selectCharacter} className="card p-5 flex flex-col gap-3">
            <input type="hidden" name="userCharacterId" value={uc.id} />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{uc.nickname}</div>
                <div className="text-sm opacity-70">{uc.character.name}</div>
              </div>
              <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm">Escolher</button>
            </div>
            <div className="text-sm flex gap-3 opacity-80">
              <span>Nível {uc.level}</span>
              <span>PvP {uc.pvpWins}</span>
              <span>IA {uc.npcWins}</span>
            </div>
          </form>
        ))}
      </div>
    </main>
  )
}
