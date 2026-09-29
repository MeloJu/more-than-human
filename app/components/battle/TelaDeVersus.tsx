'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

export type LutadorDoVersus = { nome: string; imagem: string | null; cor: string; linha: string }

/**
 * A tela de versus: quem enfrenta quem, antes da primeira rodada.
 *
 * Porta o protótipo aprovado no canvas da raid: os dois lados entram em
 * diagonal, o VS bate com um clarão e a tela treme, os nomes sobem, o
 * oponente fala (quando tem fala), e o botão Lutar aparece. Uns 2 segundos.
 * As animações moram em globals.css (.versus-*).
 *
 * APARECE UMA VEZ POR LUTA. Só na luta recém-criada, e a lembrança fica no
 * sessionStorage do navegador: recarregar a página não repete a entrada.
 * O servidor sempre renderiza fechado; quem decide abrir é o cliente, depois
 * de ler o storage — senão o HTML do servidor e o do cliente divergiriam.
 *
 * A fala do oponente nunca cita o personagem de quem joga.
 */
export function TelaDeVersus({
  chave,
  local,
  esquerda,
  direita,
  rotuloDaDireita,
  fala,
}: {
  /** O id da luta: é o que marca a entrada como já vista. */
  chave: string
  local: string
  /** Você primeiro; na raid, a party inteira. */
  esquerda: LutadorDoVersus[]
  direita: LutadorDoVersus
  /** "Chefe do andar", por exemplo. */
  rotuloDaDireita?: string
  fala?: string
}) {
  const [aberta, setAberta] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const chaveDoStorage = `versus:${chave}`

  useEffect(() => {
    let visto = false
    try {
      visto = sessionStorage.getItem(chaveDoStorage) === '1'
    } catch {
      // Storage bloqueado (janela privada, cookies desligados): mostra.
    }
    if (visto) return
    const quadro = requestAnimationFrame(() => setAberta(true))
    return () => cancelAnimationFrame(quadro)
  }, [chaveDoStorage])

  const fechar = () => {
    try {
      sessionStorage.setItem(chaveDoStorage, '1')
    } catch {
      // Sem storage, a entrada pode voltar num recarregamento. Não é grave.
    }
    setAberta(false)
  }

  useEffect(() => {
    if (!aberta) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', tecla)
    // O foco vai para o botão quando ele aparece, para Enter já lutar.
    const foco = window.setTimeout(() => botao.current?.focus(), 1800)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', tecla)
      window.clearTimeout(foco)
    }
    // fechar depende só de chaveDoStorage, que já está na chave do efeito de cima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta])

  if (!aberta) return null

  const eu = esquerda[0]
  const retrato = (l: LutadorDoVersus, sizes: string) =>
    l.imagem ? (
      <Image src={l.imagem} alt="" fill className="object-cover" style={{ objectPosition: FOCO[l.imagem] ?? '50% 10%' }} sizes={sizes} priority />
    ) : (
      <CharacterMonogram name={l.nome} />
    )

  return (
    <div role="dialog" aria-modal="true" aria-label={`${eu.nome} contra ${direita.nome}`} className="fixed inset-0 z-[60] overflow-hidden bg-[#07070b] text-foreground"
      // margin 0 inline: a página em volta usa space-y, que dá margem aos
      // filhos e empurrava esta tela 24px para baixo, deixando a página aparecer.
      style={{ margin: 0 }}
    >
      <div className="versus-palco absolute inset-0">
        <div
          aria-hidden
          className="versus-linhas absolute -inset-10 opacity-55"
          style={{
            backgroundImage:
              'repeating-linear-gradient(105deg, rgba(255,255,255,.05) 0 2px, transparent 2px 22px, rgba(255,255,255,.025) 22px 23px, transparent 23px 60px)',
          }}
        />

        {/* Lado esquerdo: você, ou a party inteira em fatias */}
        <div className="versus-esq absolute inset-0" style={{ clipPath: 'polygon(0 0, 58% 0, 42% 100%, 0 100%)' }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, color-mix(in srgb, ${eu.cor} 40%, transparent) 0%, rgba(10,10,15,.2) 70%), #0b0b12` }} />
          <div className="absolute inset-y-0 left-0 w-[58%] flex">
            {esquerda.map((l, i) => (
              <div key={i} className="relative h-full flex-1" style={esquerda.length > 1 ? { clipPath: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)' } : undefined}>
                {retrato(l, '(max-width: 768px) 60vw, 800px')}
              </div>
            ))}
          </div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,7,11,.95) 0%, rgba(7,7,11,.5) 26%, transparent 48%)' }} />
        </div>

        {/* Lado direito: o oponente */}
        <div className="versus-dir absolute inset-0" style={{ clipPath: 'polygon(58.7% 0, 100% 0, 100% 100%, 42.7% 100%)' }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(245deg, color-mix(in srgb, ${direita.cor} 50%, transparent) 0%, rgba(10,10,15,.2) 70%), #0b0b12` }} />
          <div className="absolute inset-y-0 right-0 w-[60%]">{retrato(direita, '(max-width: 768px) 60vw, 900px')}</div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,7,11,.95) 0%, rgba(7,7,11,.5) 26%, transparent 48%)' }} />
        </div>

        {/* A costura entre os lados */}
        <svg aria-hidden className="versus-costura absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="versus-costura" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={direita.cor} />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor={eu.cor} />
            </linearGradient>
          </defs>
          <line x1="58.35" y1="0" x2="42.35" y2="100" stroke="url(#versus-costura)" strokeWidth="6" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="versus-local absolute inset-x-0 top-6 flex justify-center px-4">
          <span className="px-4 py-1.5 text-xs sm:text-[13px] font-semibold uppercase tracking-[.12em] border border-white/20 bg-[#07070b]/70 backdrop-blur" style={{ borderRadius: '2px 10px 2px 10px' }}>
            {local}
          </span>
        </div>

        <div className="absolute inset-x-0 top-[30%] flex justify-center pointer-events-none">
          <span
            className="versus-vs font-titulo italic font-extrabold leading-[.8] text-white text-[120px] sm:text-[200px] lg:text-[230px]"
            style={{ WebkitTextStroke: '3px #07070b', textShadow: `-10px 0 0 ${eu.cor}, 10px 0 0 ${direita.cor}, 0 0 60px rgba(255,255,255,.5)` }}
          >
            VS
          </span>
        </div>
        <div aria-hidden className="versus-clarao absolute inset-0 bg-white pointer-events-none" />

        {/* Os nomes */}
        <div className="versus-nomes absolute left-4 sm:left-12 bottom-28 sm:bottom-12 flex flex-col gap-2.5 max-w-[45%]">
          {esquerda.map((l, i) => (
            <div key={i} className="flex items-center gap-3">
              <span aria-hidden className="w-1.5 shrink-0" style={{ height: i === 0 ? 64 : 32, background: l.cor, boxShadow: `0 0 14px ${l.cor}` }} />
              <div className="min-w-0">
                <div
                  className={`font-titulo italic font-extrabold uppercase leading-[.95] ${i === 0 ? 'text-2xl sm:text-5xl [overflow-wrap:anywhere]' : 'text-xl sm:text-3xl truncate'}`}
                  style={{ textShadow: `0 0 24px ${l.cor}, 0 3px 6px rgba(0,0,0,.9)` }}
                >
                  {l.nome}
                </div>
                <div className="text-xs sm:text-sm text-zinc-300">{l.linha}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="versus-nomes absolute right-4 sm:right-12 bottom-28 sm:bottom-12 flex items-center gap-3 text-right max-w-[45%]">
          <div className="min-w-0">
            {rotuloDaDireita && <div className="text-[11px] font-bold uppercase tracking-[.16em] text-red-300">{rotuloDaDireita}</div>}
            <div className="font-titulo italic font-extrabold uppercase leading-[.95] text-2xl sm:text-5xl [overflow-wrap:anywhere]" style={{ textShadow: `0 0 24px ${direita.cor}, 0 3px 6px rgba(0,0,0,.9)` }}>
              {direita.nome}
            </div>
            <div className="text-xs sm:text-sm text-zinc-300">{direita.linha}</div>
          </div>
          <span aria-hidden className="w-1.5 shrink-0 h-16" style={{ background: direita.cor, boxShadow: `0 0 14px ${direita.cor}` }} />
        </div>

        {fala && (
          <div className="versus-fala absolute right-4 sm:right-14 top-20 sm:top-24 w-[min(380px,calc(100%-2rem))] px-4 py-3 border bg-[#07070b]/80 backdrop-blur" style={{ borderColor: `color-mix(in srgb, ${direita.cor} 75%, transparent)`, borderRadius: '2px 14px 2px 14px' }}>
            <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: `color-mix(in srgb, ${direita.cor} 50%, white)` }}>
              {direita.nome}
            </div>
            <p className="mt-1 text-[15px] leading-snug">{fala}</p>
          </div>
        )}

        <div className="versus-lutar absolute inset-x-0 bottom-6 sm:bottom-12 flex justify-center">
          <button
            ref={botao}
            type="button"
            onClick={fechar}
            className="px-11 py-3.5 font-titulo italic font-extrabold uppercase tracking-[.08em] text-2xl text-[#0a0a0f] bg-accent shadow-[0_0_34px_rgba(255,107,26,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}
          >
            Lutar
          </button>
        </div>
      </div>
    </div>
  )
}
