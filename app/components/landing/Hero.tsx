import Image from 'next/image'
import Link from 'next/link'

type Anime = { name: string; slug: string; _count: { characters: number } }

type HeroProps = {
  authed: boolean
  stats: {
    characters: number
    skills: number
    transformations: number
    stages: number
    animes: Anime[]
  }
}

const ANIME_ICON: Record<string, string> = {
  bleach: '🗡️',
  naruto: '🍃',
  'dragon-ball-z': '⭐',
  'dc-universe': '🦇',
  'marvel-universe': '🕷️',
}

export default function Hero({ authed, stats }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-20 pb-24">
      <div className="absolute inset-0 -z-20">
        <Image
          src="/landing/wallpaper/wallpaper.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
        {/* Escurece o wallpaper o suficiente pro texto ter contraste, e puxa a
            cor pro laranja de reiatsu do resto do app. */}
        <div className="absolute inset-0 bg-[#0a0a0f]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,rgba(255,107,26,0.22),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(77,208,225,0.12),transparent)]" />
      </div>

      {/* Decoração só na metade direita e nas bordas: a coluna de texto ocupa
          a esquerda até ~max-w-xl, e orbe por cima de título não é ambientação,
          é ruído. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-70">
        <div className="floating-orb bottom-28 right-[6%] animate-float-delayed" />
        <div className="floating-ring top-[18%] right-[2%] animate-float" />
        <div className="floating-card bottom-[45%] right-[38%] animate-float hidden xl:block" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center">
        <div className="max-w-xl space-y-8">
          <div className="kicker">Arena de batalha por turnos</div>

          <div className="space-y-4">
            <h1 className="heading text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Empunhe a lâmina dos seus{' '}
              <span className="text-accent">personagens favoritos</span>
            </h1>
            <p className="max-w-lg text-base text-muted sm:text-lg leading-relaxed">
              Combate por turnos com energia, cooldown, efeitos de status e transformações.
              Atravesse o Arco Soul Society, suba a torre de Las Noches com a sua party e forje
              o equipamento com o que ela deixa cair.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {authed ? (
              <>
                <Link href="/dashboard" className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm">
                  Continuar aventura
                </Link>
                <Link href="/story" className="btn-ghost inline-flex items-center justify-center px-6 py-3 text-sm">
                  Modo História
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm">
                  Criar conta grátis
                </Link>
                <Link href="/characters" className="btn-ghost inline-flex items-center justify-center px-6 py-3 text-sm">
                  Ver o catálogo
                </Link>
              </>
            )}
          </div>

          {/* Números reais, consultados do banco — ver lib/landing/queries.ts */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 pt-4">
            {[
              { value: stats.characters, label: 'personagens' },
              { value: stats.skills, label: 'habilidades' },
              { value: stats.transformations, label: 'transformações' },
              { value: stats.stages, label: 'estágios de história' },
            ].map((s) => (
              <div key={s.label}>
                <div className="heading text-2xl text-accent">{s.value}</div>
                <div className="kicker mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden w-full max-w-sm lg:block">
          <div className="card p-5 space-y-3">
            <div className="kicker">Universos no catálogo</div>
            {stats.animes.map((a, idx) => (
              <div
                key={a.slug}
                className={`card-raised card-accent flex items-center gap-4 p-3 pl-4 ${idx % 2 === 1 ? 'ml-5' : ''}`}
              >
                <span className="text-2xl" aria-hidden>{ANIME_ICON[a.slug] ?? '✦'}</span>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{a.name}</div>
                  <div className="text-xs text-muted">
                    {a._count.characters} {a._count.characters === 1 ? 'personagem' : 'personagens'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
