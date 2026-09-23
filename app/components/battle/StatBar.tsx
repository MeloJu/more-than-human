'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

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
 */
export function StatBar({
  label,
  current,
  max,
  colorClass,
  icone,
}: {
  label: string
  current: number
  max: number
  colorClass: string
  /** Ícone antes do rótulo — lê-se a barra pela forma antes de ler a palavra. */
  icone?: ReactNode
}) {
  const semMovimento = useReducedMotion()
  const valor = Math.max(0, current)
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0

  // O valor da renderização anterior. Ref e não state: mudá-lo não pode
  // provocar um render novo, senão vira laço.
  const anterior = useRef<{ valor: number; pct: number } | null>(null)
  const [queda, setQueda] = useState<{ chave: number; dePct: number; delta: number } | null>(null)

  useEffect(() => {
    const antes = anterior.current
    anterior.current = { valor, pct }
    // Primeira montagem não tem "antes": nada a rastrear, e mostrar um rastro
    // aqui inventaria uma perda que não aconteceu nesta tela.
    if (!antes) return
    if (valor >= antes.valor) return
    setQueda({ chave: Date.now(), dePct: antes.pct, delta: antes.valor - valor })
  }, [valor, pct])

  return (
    <div>
      <div className="relative flex justify-between items-center text-sm mb-1.5">
        <span className="flex items-center gap-1.5 font-medium">
          {icone}
          {label}
        </span>
        <span className="tabular-nums font-semibold">
          {valor} / {max}
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

      <div className="relative h-1.5 w-full rounded-full bg-background-alt overflow-hidden ring-1 ring-white/5">
        {/* O RASTRO fica ATRÁS e mais largo: o pedaço visível entre a barra
            cheia e ele é exatamente o que se perdeu. Espera um instante antes
            de recolher — sem a pausa, ele alcança rápido demais para o olho
            registrar de onde saiu. */}
        <AnimatePresence>
          {queda && !semMovimento && (
            <motion.div
              key={queda.chave}
              className={`absolute inset-y-0 left-0 ${colorClass} opacity-30`}
              initial={{ width: `${queda.dePct}%` }}
              animate={{ width: `${pct}%` }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        <motion.div
          className={`absolute inset-y-0 left-0 ${colorClass}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: semMovimento ? 0 : 0.25, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
