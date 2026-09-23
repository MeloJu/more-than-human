'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Flame } from 'lucide-react'
import { PainelChanfrado, TituloDeSecao } from './Moldura'

/**
 * A faixa das formas: um clique abre ou fecha, e dentro ela rola para o lado.
 *
 * O PADRÃO VEIO DO DONO DO PROJETO, e os números do catálogo confirmaram:
 * 21 personagens não têm forma nenhuma, 37 têm uma só, e Goku e Vegeta têm
 * SEIS. Uma grade fixa de duas colunas ficava vazia para uns e virava três
 * linhas empilhadas para outros, empurrando as ações para fora da tela. Uma
 * tira que rola na horizontal serve os três casos com a mesma altura.
 *
 * NASCE ABERTA. Recolher é escolha de quem já conhece as formas; esconder por
 * padrão repetiria o problema original, quando as formas ficavam no fim da
 * página e quem não rolasse nunca descobria que existiam.
 */
export function FaixaDeFormas({ quantidade, cor, children }: { quantidade: number; cor?: string | null; children: ReactNode }) {
  const [aberta, setAberta] = useState(true)
  const c = cor ?? 'var(--accent)'

  return (
    <PainelChanfrado>
      <div className="p-4 space-y-3">
        {/* O botão é só o contador: o título é um <h2>, e cabeçalho dentro
            de <button> é HTML inválido. */}
        <TituloDeSecao
          icone={<Flame className="h-5 w-5" style={{ color: c }} />}
          direita={
            <button
              type="button"
              onClick={() => setAberta((v) => !v)}
              aria-expanded={aberta}
              className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
            >
              <span>{quantidade === 1 ? '1 forma' : `${quantidade} formas`}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${aberta ? 'rotate-180' : ''}`} />
            </button>
          }
        >
          Formas
        </TituloDeSecao>

        {aberta && (
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">{children}</div>
            {/* A sombra na direita diz que há mais fora da tela — sem ela, uma
                tira que rola parece uma tira que acabou. Só com mais de duas,
                que é quando de fato transborda. */}
            {quantidade > 2 && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 bottom-1 w-16"
                style={{ background: 'linear-gradient(to left, var(--surface), transparent)' }}
              />
            )}
          </div>
        )}
      </div>
    </PainelChanfrado>
  )
}
