import type { ReactNode } from 'react'

/**
 * As três peças de moldura da tela de batalha.
 *
 * Vieram do mockup de referência do dono do projeto: painel de canto
 * chanfrado com borda luminosa, cabeçalho de seção em caixa alta condensada,
 * e etiqueta de custo recortada. Ficam num arquivo só porque só fazem sentido
 * juntas — são o vocabulário visual da batalha, não componentes soltos.
 */

/** Recorte a 45° no canto superior esquerdo e no inferior direito. */
function chanfro(c: number): string {
  return `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`
}

/**
 * Painel de canto chanfrado, com borda na cor do personagem.
 *
 * POR QUE TRÊS CAMADAS, e não `border` + `clip-path` num div só. O
 * `clip-path` corta o elemento inteiro, inclusive a borda nos cantos
 * recortados e o brilho em volta — o canto chanfrado ficava sem contorno e o
 * brilho sumia. Então:
 *
 *   1. uma camada só com o brilho (filter drop-shadow), SEM recorte —
 *      drop-shadow num elemento com clip-path é cortado junto;
 *   2. dentro dela, a forma recortada pintada na cor da borda;
 *   3. por cima, a forma recortada 1,5px menor, pintada no fundo do painel.
 *
 * O CONTEÚDO fica numa quarta camada, fora de qualquer recorte. Isso importa
 * para o tooltip das ações: ele sai por cima do painel, e com recorte no
 * conteúdo ele seria cortado justamente na primeira fileira de botões.
 */
export function PainelChanfrado({
  cor,
  brilho = false,
  corte = 14,
  className = '',
  children,
}: {
  cor?: string | null
  brilho?: boolean
  corte?: number
  className?: string
  children: ReactNode
}) {
  const borda = cor ?? 'var(--border)'
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={
          brilho && cor
            ? { filter: `drop-shadow(0 0 10px color-mix(in srgb, ${cor} 45%, transparent))` }
            : undefined
        }
      >
        <div className="absolute inset-0" style={{ clipPath: chanfro(corte), background: borda }} />
      </div>
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{ inset: 1.5, clipPath: chanfro(corte - 1), background: 'var(--surface)' }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

/**
 * Cabeçalho de seção: ícone, título em caixa alta condensada, e um traço que
 * corre até a borda — o traço é o que separa o cabeçalho do conteúdo sem
 * precisar de uma caixa em volta.
 */
export function TituloDeSecao({
  icone,
  children,
  direita,
}: {
  icone?: ReactNode
  children: ReactNode
  direita?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5">
      {icone && <span className="shrink-0 opacity-80 flex">{icone}</span>}
      <h2 className="font-titulo italic font-bold uppercase tracking-wider text-lg leading-none">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      {direita}
    </div>
  )
}

/**
 * Etiqueta de custo recortada, no canto de ação e de forma.
 *
 * A cor diz de QUAL reserva sai o custo — energia em ciano, stamina em âmbar.
 * Habilidade defensiva é paga com stamina, e sem a cor separando as duas a
 * reserva defensiva era invisível na tela.
 */
export function TagDeCusto({ children, tipo = 'en' }: { children: ReactNode; tipo?: 'en' | 'st' | 'livre' }) {
  const cor = tipo === 'st' ? '#fbbf24' : tipo === 'livre' ? 'var(--muted)' : 'var(--spirit)'
  return (
    <span
      className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none"
      style={{
        color: cor,
        border: `1px solid color-mix(in srgb, ${cor} 55%, transparent)`,
        background: `color-mix(in srgb, ${cor} 10%, transparent)`,
        borderRadius: '2px 6px 2px 6px',
      }}
    >
      {children}
    </span>
  )
}
