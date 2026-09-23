'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ImpactoNoLutador } from '@/app/lib/battle/rodada'

/**
 * Encena o golpe que o lutador acabou de levar.
 *
 * POR QUE ENVOLVE a carta em vez de animar dentro dela: FighterCard é
 * componente de servidor e lê o estado do banco. Ele continua sendo a fonte
 * do "depois"; o que falta é o MOMENTO entre um estado e outro, e isso é
 * necessariamente cliente.
 *
 * O NÚMERO DO DANO NÃO MORA AQUI. Ele nasceu em cima do retrato e ficava
 * horrível — texto grande atravessando a arte do personagem. O lugar dele é
 * a barra que perdeu o recurso, junto do próprio número: ver StatBar, que
 * calcula o próprio delta e ainda ganha o rastro do valor anterior de brinde.
 * Aqui fica só o que é da CARTA INTEIRA: o baque e a marca de quem apanhou.
 *
 * A INTENSIDADE VEM DO MOTOR: `severidade` já é calculada sobre a vida máxima
 * do alvo, então o mesmo 30 de dano sacode pouco num tanque e muito num
 * conjurador — igual ao texto do log, que escolhe entre "raspou em" e
 * "arrebentou" pela mesma medida.
 *
 * TOCA NA CHEGADA DA PÁGINA, e isso é deliberado: a rodada é resolvida no
 * servidor e a página re-renderiza logo depois do clique, então chegar na
 * tela É o instante em que o golpe aconteceu.
 *
 * SOB prefers-reduced-motion nada se move. O que se perde aqui é só ênfase —
 * a informação (quanto caiu, de quanto para quanto) está na barra, que
 * continua mostrando o número.
 */

/** Deslocamento do baque, em pixels, pela severidade do pior golpe. */
const DESLOCAMENTO: Record<NonNullable<ImpactoNoLutador['severidade']>, number> = {
  raspao: 3,
  solido: 7,
  pesado: 12,
  devastador: 18,
}

type Golpe = { chave: number; deslocamento: number; critico: boolean; guardaQuebrada: boolean; teveDano: boolean }

export function CartaAnimada({
  impacto,
  rodada,
  children,
}: {
  impacto: ImpactoNoLutador
  /** Muda a cada rodada resolvida — é o gatilho da encenação. */
  rodada: number
  children: React.ReactNode
}) {
  const semMovimento = useReducedMotion()
  const [golpe, setGolpe] = useState<Golpe | null>(null)

  useEffect(() => {
    if (impacto.dano <= 0 && !impacto.guardaQuebrada) return
    setGolpe({
      chave: rodada,
      // Dano contínuo chega sem severidade: é a mesma mordida toda rodada, e
      // sacudir a carta por ela diria "você levou um golpe AGORA" quando não
      // levou. Fica sem baque — a barra ainda conta a perda.
      deslocamento: impacto.severidade ? DESLOCAMENTO[impacto.severidade] : 0,
      critico: impacto.critico,
      guardaQuebrada: impacto.guardaQuebrada,
      teveDano: impacto.dano > 0,
    })
    // Depende SÓ da rodada: qualquer re-render sem rodada nova (navegação,
    // revalidação) não pode re-encenar um golpe que já passou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodada])

  const baque = golpe && !semMovimento && golpe.deslocamento > 0
  const d = golpe?.deslocamento ?? 0
  // Golpe forte merece linha de velocidade; raspão não. O corte é o mesmo que
  // separa "acertou" de "acertou em cheio" no texto do log.
  const forte = golpe ? golpe.deslocamento >= DESLOCAMENTO.pesado : false

  return (
    // h-full nos dois níveis: os três painéis da linha (carta, histórico,
    // carta) têm a mesma altura, e sem isto a carta encolhia para o próprio
    // conteúdo e a linha ficava dentada.
    <div className="relative h-full">
      <motion.div
        className="h-full"
        animate={baque ? { x: [0, -d, d, -d * 0.6, d * 0.4, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      {/* ANEL DE IMPACTO em vez de lavar a carta de vermelho: a arte do
          personagem fica limpa (importa mais ainda quando ela for de verdade,
          e não monograma), e a borda ainda diz "foi ESTE que apanhou".
          Âmbar no crítico, mesmo par de cores que o log já usa. */}
      <AnimatePresence>
        {golpe?.teveDano && !semMovimento && (
          <motion.div
            key={`anel-${golpe.chave}`}
            className={`absolute inset-0 rounded-lg pointer-events-none ring-2 ${
              golpe.critico ? 'ring-amber-400' : 'ring-red-500'
            }`}
            initial={{ opacity: 0.95, boxShadow: `0 0 0 0 ${golpe.critico ? 'rgba(251,191,36,.55)' : 'rgba(239,68,68,.5)'}` }}
            animate={{ opacity: 0, boxShadow: `0 0 0 16px rgba(0,0,0,0)` }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* LINHAS DE VELOCIDADE — o corte diagonal que passa na tela quando o
          golpe entra forte. É o vocabulário visual de impacto de anime, e sai
          inteiro de CSS: nenhuma arte para baixar, nada com dono. */}
      <AnimatePresence>
        {forte && !semMovimento && (
          <motion.div
            key={`vento-${golpe!.chave}`}
            className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute -inset-x-1/2 inset-y-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(107deg, transparent 0 9px, rgba(255,255,255,.55) 9px 11px, transparent 11px 26px)',
                maskImage: 'linear-gradient(90deg, transparent, black 35%, black 65%, transparent)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent, black 35%, black 65%, transparent)',
              }}
              initial={{ x: '-30%' }}
              animate={{ x: '30%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guarda partida é consequência, não dano: quem apanhou perde a rodada
          seguinte. Fica no RODAPÉ da carta — em cima do retrato era o mesmo
          erro do número de dano. */}
      <AnimatePresence>
        {golpe?.guardaQuebrada && (
          <motion.div
            key={`guarda-${golpe.chave}`}
            className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none"
            initial={semMovimento ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.3 }}
          >
            <span className="rounded-full bg-amber-500 text-background text-xs font-semibold px-2 py-1 shadow-lg">
              Guarda partida
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
