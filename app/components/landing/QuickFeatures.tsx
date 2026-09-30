import Link from 'next/link'
import { Swords, Castle, BookOpen, Shield } from 'lucide-react'

/**
 * Só entra aqui o que já existe e é jogável hoje.
 *
 * A versão anterior anunciava "Global Rankings" e "leaderboards competitivos",
 * que nunca existiram. Depois foi o contrário: dizia que PvP "ainda não
 * existe" com o PvP no ar, e prometia árvore de habilidades para todo mundo
 * quando só 13 dos 62 personagens têm uma. Prometer o que não existe, ou
 * esconder o que existe, frustra do mesmo jeito.
 */
const features = [
  {
    icon: Swords,
    title: 'Combate por turnos',
    description:
      'Energia e stamina, posturas (esquivar, aparar, guarda), transformações que cobram para se manter, choque de golpes e domínios.',
  },
  {
    icon: Castle,
    title: 'Raid em grupo',
    description:
      'Las Noches em cinco andares sem recuperar vida entre eles, com aliados contratados no mercado e o Grimmjow esperando na torre.',
  },
  {
    icon: BookOpen,
    title: 'Modo História',
    description:
      'O Arco Soul Society, tenente por tenente até Aizen, e o Incidente de Shibuya. Cada estágio libera o próximo.',
  },
  {
    icon: Shield,
    title: 'Equipamentos',
    description:
      'Compre armas, trajes e acessórios com as moedas que a luta rende, e forje os melhores com o que a raid deixa cair. Os melhores concedem habilidades próprias.',
  },
]

export default function QuickFeatures({ authed }: { authed: boolean }) {
  return (
    <section className="relative py-20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="kicker">O que já dá pra jogar</div>
          <h2 className="heading mt-3 text-3xl sm:text-4xl">
            Um RPG de turnos completo, não uma tela de login bonita
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card card-accent p-5 pl-6">
              <div
                className="flex h-10 w-10 items-center justify-center bg-accent text-background"
                style={{ borderRadius: '2px 8px 2px 8px' }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="heading mt-4 text-lg">{title}</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="heading text-lg">E PvP de verdade</div>
            <p className="text-sm text-muted mt-1">
              Contra outro jogador, com a rodada simultânea: os dois escolhem ao mesmo tempo, e ninguém joga vendo a escolha do outro.
            </p>
          </div>
          {!authed && (
            <Link href="/register" className="btn-primary px-6 py-3 text-sm whitespace-nowrap">
              Começar agora
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
