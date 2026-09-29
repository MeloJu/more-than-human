import Link from 'next/link'

/**
 * As portas de batalha. Versão funcional: o redesenho com arte vem na etapa
 * das telas de entrada (ver o levantamento de design).
 */
const modos = [
  {
    href: '/battle/ai',
    titulo: 'Treino contra a IA',
    texto: 'Luta rápida contra um personagem no seu nível. As cinco primeiras vitórias do dia pagam XP e moedas.',
  },
  {
    href: '/battle/raid',
    titulo: 'Raid',
    texto: 'Las Noches em cinco andares, com aliados contratados no mercado e o Grimmjow no topo.',
  },
  {
    href: '/battle/pvp',
    titulo: 'PvP',
    texto: 'Contra outro jogador, em rodada simultânea: os dois escolhem ao mesmo tempo.',
  },
]

export default function BattlePage() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Batalha</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {modos.map((m) => (
          <Link key={m.href} href={m.href} className="card p-6 hover:shadow-lg transition-shadow">
            <h3 className="font-semibold">{m.titulo}</h3>
            <p className="text-sm mt-1 opacity-70">{m.texto}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
