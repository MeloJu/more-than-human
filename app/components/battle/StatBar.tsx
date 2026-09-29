'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { corDaVida, duracaoDaQueda } from '@/app/lib/battle/barra'

/**
 * Barra de recurso com RASTRO do valor anterior.
 *
 * POR QUE O RASTRO. A barra saltava direto do valor velho para o novo, e o
 * salto não diz de onde veio: some 24 de vida e a única forma de saber quanto
 * era antes é ter decorado o número da rodada passada. O rastro é a resposta
 * clássica de jogo de luta — a parte perdida fica visível por um instante,
 * atrás da barra cheia, e só então recolhe. Dá para LER a perda, não só
 * inferi-la.
 *
 * O DELTA É CALCULADO AQUI, não recebido de fora. A barra já sabe o valor de
 * agora e guarda o da renderização anterior, então "quanto mudou" é dela por
 * construção — e isso faz o rastro valer para vida, energia e stamina de
 * graça, em vez de só para o dano que a batalha soube reportar.
 *
 * SÓ RASTREIA QUEDA. Ganhar recurso não tem o mesmo problema: a barra cresce
 * para dentro de espaço vazio, e o de-onde-veio é o próprio contorno.
 *
 * SOB prefers-reduced-motion nada desliza, mas o número do delta continua
 * aparecendo — ele é informação, não enfeite. Mesmo princípio de globals.css.
 *
 * A QUEDA ESCORRE, COMO NO POKÉMON. A barra não salta para o valor novo: ela
 * desce devagar, o número desce contando junto, e na barra de vida a cor
 * muda no caminho (verde, âmbar abaixo da metade, vermelha abaixo de 20%).
 * Quanto maior o golpe, mais tempo ela leva — um arranhão passa rápido, um
 * golpe devastador se arrasta, e é isso que faz ele PESAR na tela.
 */


export function StatBar({
  label,
  current,
  max,
  colorClass,
  icone,
  vida = false,
}: {
  label: string
  current: number
  max: number
  colorClass: string
  /** Ícone antes do rótulo — lê-se a barra pela forma antes de ler a palavra. */
  icone?: ReactNode
  /** Barra de vida: a cor segue a fração que resta (ver corDaVida). */
  vida?: boolean
}) {
  const semMovimento = useReducedMotion()
  const valor = Math.max(0, current)
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0

  // Durante a queda, o número que desce contando. Fora dela, null: a tela
  // mostra o valor real, sem estado para manter em sincronia.
  const [contando, setContando] = useState<number | null>(null)
  const mostrado = contando ?? valor

  // O valor da renderização anterior. Ref e não state: mudá-lo não pode
  // provocar um render novo, senão vira laço.
  const anterior = useRef<{ valor: number; pct: number } | null>(null)
  const [queda, setQueda] = useState<{ chave: number; dePct: number; delta: number; duracao: number } | null>(null)

  useEffect(() => {
    const antes = anterior.current
    anterior.current = { valor, pct }
    // Primeira montagem não tem "antes": nada a rastrear. Ganho não escorre.
    if (!antes || valor >= antes.valor) return
    const duracao = semMovimento ? 0 : duracaoDaQueda(max > 0 ? (antes.valor - valor) / max : 0)
    setQueda({ chave: Date.now(), dePct: antes.pct, delta: antes.valor - valor, duracao })
    if (semMovimento) return
    const contagem = animate(antes.valor, valor, {
      duration: duracao,
      ease: 'linear',
      onUpdate: (v) => setContando(Math.round(v)),
      onComplete: () => setContando(null),
    })
    // Chegou valor novo no meio da contagem: para e volta a mostrar o real,
    // senão o número ficaria congelado no meio do caminho.
    return () => {
      contagem.stop()
      setContando(null)
    }
  }, [valor, pct, max, semMovimento])

  // Na barra de vida a cor acompanha o número que desce, não o valor final:
  // é a troca de cor NO CAMINHO que dá a leitura do Pokémon.
  const corDaBarra = vida ? corDaVida(max > 0 ? mostrado / max : 0) : undefined

  return (
    <div>
      {/* Sombra forte no texto porque a barra agora fica POR CIMA da arte:
          sem ela, número branco sobre céu claro some. É o que deixa a faixa
          translúcida e ainda assim legível. */}
      <div className="relative flex justify-between items-center text-sm mb-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,.95),0_0_8px_rgba(0,0,0,.7)]">
        <span className="flex items-center gap-1.5 font-medium">
          {icone}
          {label}
        </span>
        <span className="tabular-nums font-semibold">
          {mostrado} / {max}
        </span>

        {/* O delta sobe e some ao lado do número, não em cima do retrato: a
            perda pertence à barra que perdeu, e a arte fica limpa. */}
        <AnimatePresence>
          {queda && (
            <motion.span
              key={queda.chave}
              className="absolute right-0 -top-0.5 text-xs font-semibold text-red-500 dark:text-red-400 tabular-nums pointer-events-none"
              initial={semMovimento ? { opacity: 1 } : { opacity: 0, y: 0 }}
              animate={semMovimento ? { opacity: 1 } : { opacity: 1, y: -14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: semMovimento ? 0 : 0.85, ease: 'easeOut' }}
              onAnimationComplete={() => setQueda(null)}
            >
              −{queda.delta}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-black/45 overflow-hidden ring-1 ring-white/10 backdrop-blur-sm">
        {/* O RASTRO fica ATRÁS e mais largo: o pedaço visível entre a barra
            cheia e ele é exatamente o que se perdeu. Espera um instante antes
            de recolher — sem a pausa, ele alcança rápido demais para o olho
            registrar de onde saiu. */}
        {/* Na vida o rastro é vermelho: é o que acabou de sair, parado no valor
            antigo enquanto a barra escorre por cima dele. */}
        <AnimatePresence>
          {queda && !semMovimento && (
            <motion.div
              key={queda.chave}
              className={`absolute inset-y-0 left-0 ${vida ? 'bg-red-500' : colorClass} ${vida ? 'opacity-60' : 'opacity-30'}`}
              initial={{ width: `${queda.dePct}%` }}
              animate={{ width: `${pct}%` }}
              exit={{ opacity: 0 }}
              transition={{ delay: queda.duracao + 0.15, duration: 0.3, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        <motion.div
          className={`absolute inset-y-0 left-0 ${vida ? '' : colorClass}`}
          style={corDaBarra ? { background: corDaBarra } : undefined}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: semMovimento ? 0 : queda?.duracao || 0.25, ease: queda?.duracao ? 'linear' : 'easeOut' }}
        />
      </div>
    </div>
  )
}
