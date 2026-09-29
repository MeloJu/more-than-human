import Link from 'next/link'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { requireUser } from '@/app/lib/session'
import { getUserCharacters } from '@/app/lib/progression/queries'
import { selectCharacter } from '@/app/lib/progression/actions'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

const CLASSE: Record<string, string> = {
  TANQUE: 'Tanque',
  ATACANTE: 'Atacante',
  VELOZ: 'Veloz',
  SUPORTE: 'Suporte',
  CONJURADOR: 'Conjurador',
  INVOCADOR: 'Invocador',
}

/**
 * Escolher quem luta, pela arte.
 *
 * Era uma lista de cartões de texto (apelido, nome e três números). Agora cada
 * personagem da conta é uma carta com a arte inteira, na cor dele, como na
 * luta — e a carta inteira é o botão. Desenho aprovado no canvas "Telas de
 * Entrada".
 */
export default async function SelectCharacterPage() {
  const user = await requireUser()
  const list = await getUserCharacters(user.id)
  const emUso = user.selectedCharacterId

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="kicker">
            Sua conta · {list.length} personage{list.length === 1 ? 'm' : 'ns'}
          </div>
          <h1 className="font-titulo italic font-extrabold uppercase text-4xl leading-none">Escolha quem luta</h1>
        </div>
        <span aria-hidden className="font-kanji text-4xl leading-none text-accent opacity-90 whitespace-nowrap shrink-0">
          選択
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {list.map((uc) => {
          const cor = uc.character.corDestaque ?? 'var(--accent)'
          const ativo = uc.id === emUso
          return (
            <form key={uc.id} action={selectCharacter}>
              <input type="hidden" name="userCharacterId" value={uc.id} />
              <button
                type="submit"
                aria-label={`Lutar com ${uc.nickname} (${uc.character.name})`}
                className="group relative block w-full h-[320px] sm:h-[440px] text-left transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={ativo ? { filter: `drop-shadow(0 0 14px color-mix(in srgb, ${cor} 45%, transparent))` } : undefined}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 transition-colors"
                  style={{
                    background: ativo ? cor : 'var(--border)',
                    clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
                  }}
                />
                <span
                  className="absolute overflow-hidden bg-background-alt"
                  style={{ inset: 2, clipPath: 'polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px)' }}
                >
                  {uc.character.imageUrl ? (
                    <Image
                      src={uc.character.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      style={{ objectPosition: FOCO[uc.character.imageUrl] ?? '50% 20%' }}
                      sizes="(max-width: 768px) 50vw, 320px"
                    />
                  ) : (
                    <CharacterMonogram name={uc.character.name} />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, rgba(10,10,15,.95) 0%, rgba(10,10,15,.7) 28%, transparent 55%), linear-gradient(to top, color-mix(in srgb, ${cor} ${ativo ? 38 : 18}%, transparent) 0%, transparent 40%)`,
                    }}
                  />
                </span>
                <span
                  className="absolute top-3 right-3 px-3 py-0.5 text-sm font-titulo italic font-bold text-background"
                  style={{ background: cor, clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
                >
                  Lv{uc.level}
                </span>
                {ativo && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-background bg-accent" style={{ borderRadius: '2px 7px 2px 7px' }}>
                    Em uso
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-5 w-1 shrink-0" style={{ background: cor, boxShadow: `0 0 10px ${cor}` }} />
                    <span className="text-lg sm:text-xl font-bold leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,.9)' }}>
                      {uc.nickname}
                    </span>
                  </span>
                  <span className="text-[13px] text-zinc-300 truncate">
                    {uc.character.name}
                    {uc.character.class ? ` · ${CLASSE[uc.character.class] ?? uc.character.class}` : ''}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {uc.npcWins} vitória{uc.npcWins === 1 ? '' : 's'} contra a IA · {uc.pvpWins} no PvP
                  </span>
                </span>
              </button>
            </form>
          )
        })}

        <Link
          href="/create"
          className="group flex h-[320px] sm:h-[440px] flex-col items-center justify-center gap-3 border-[1.5px] border-dashed border-zinc-600 text-muted transition-colors hover:border-accent"
          style={{ borderRadius: '2px 14px 2px 14px' }}
        >
          <span className="grid h-14 w-14 place-items-center border-[1.5px] border-zinc-600 text-accent group-hover:border-accent" style={{ borderRadius: '2px 12px 2px 12px' }}>
            <Plus className="h-6 w-6" />
          </span>
          <span className="text-base font-bold text-foreground">Criar personagem</span>
          <span className="max-w-[200px] text-center text-[13px]">Escolha um dos personagens do catálogo.</span>
        </Link>
      </div>
    </main>
  )
}
