import type { ReactNode } from 'react'

/**
 * O cabeçalho do confronto, no estilo do mockup de referência: título em
 * traço de pincel à esquerda, o 対戦 ("confronto") no centro com uma seta de
 * cada lado apontando para ele, e a saída à direita.
 *
 * AS DUAS METADES DO 対戦 TÊM A COR DE CADA LADO, e as setas também. É o
 * mesmo recurso do card: a tela inteira diz quem está de que lado antes de
 * alguém ler um nome.
 *
 * Compartilhado por IA, raid, história e PvP, para o confronto ter a mesma
 * cara em todo modo em vez de cada página inventar o seu.
 */
export function CabecalhoDeBatalha({
  nomeJogador,
  nomeInimigo,
  corJogador,
  corInimigo,
  subtitulo,
  direita,
}: {
  nomeJogador: string
  nomeInimigo: string
  corJogador?: string | null
  corInimigo?: string | null
  subtitulo?: ReactNode
  direita?: ReactNode
}) {
  const cJ = corJogador ?? 'var(--accent)'
  const cI = corInimigo ?? 'var(--spirit)'

  return (
    <header className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="min-w-0">
        {/* Cada nome na cor do seu lado, com halo: o título já diz quem é
            quem, na mesma cor dos cards logo abaixo. */}
        <h1 className="font-pincel text-3xl sm:text-4xl leading-tight">
          <span style={{ color: cJ, textShadow: `0 0 18px color-mix(in srgb, ${cJ} 55%, transparent), 0 2px 6px rgba(0,0,0,.8)` }}>
            {nomeJogador}
          </span>
          <span className="mx-3 text-2xl text-muted">vs</span>
          <span style={{ color: cI, textShadow: `0 0 18px color-mix(in srgb, ${cI} 55%, transparent), 0 2px 6px rgba(0,0,0,.8)` }}>
            {nomeInimigo}
          </span>
        </h1>
        {subtitulo && <div className="mt-1 text-sm text-muted">{subtitulo}</div>}
      </div>

      {/* Some no celular: lá o título já quebra em duas linhas, e o centro
          decorativo empurraria as barras de vida para baixo da dobra. */}
      <div className="hidden lg:flex items-center gap-2" aria-hidden>
        <Seta cor={cJ} sentido="direita" />
        <span className="font-kanji text-5xl leading-none">
          <span style={{ color: cJ, textShadow: `0 0 18px color-mix(in srgb, ${cJ} 55%, transparent)` }}>対</span>
          <span style={{ color: cI, textShadow: `0 0 18px color-mix(in srgb, ${cI} 55%, transparent)` }}>戦</span>
        </span>
        <Seta cor={cI} sentido="esquerda" />
      </div>

      <div className="flex lg:justify-end">{direita}</div>
    </header>
  )
}

/** Traço que afina na ponta, terminando em seta — a lança de cada lado. */
function Seta({ cor, sentido }: { cor: string; sentido: 'direita' | 'esquerda' }) {
  return (
    <svg
      width="120"
      height="14"
      viewBox="0 0 120 14"
      fill="none"
      style={{ transform: sentido === 'esquerda' ? 'scaleX(-1)' : undefined }}
    >
      {/* Cor via `style`, não via atributo: atributo de apresentação do SVG
          não resolve var(--accent), e sem cor própria o personagem cai
          justamente nessa variável. */}
      <defs>
        {/* userSpaceOnUse, e não o padrão objectBoundingBox: o traço é uma
            linha reta, com altura ZERO, e gradiente relativo a uma caixa de
            altura zero não renderiza — a linha sumia e só a ponta da seta
            aparecia, virando um ">" solto. */}
        <linearGradient id={`seta-${sentido}`} gradientUnits="userSpaceOnUse" x1="0" y1="7" x2="108" y2="7">
          <stop offset="0" style={{ stopColor: cor, stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: cor, stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M0 7 L108 7" stroke={`url(#seta-${sentido})`} strokeWidth="2" />
      <path d="M104 2 L116 7 L104 12" style={{ stroke: cor }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
