'use client'

import { useRef, useState, useSyncExternalStore, type PointerEvent as PointerDoReact } from 'react'
import { corDaVida } from '@/app/lib/battle/barra'
import { StatusBadges } from './StatusBadges'
import { useMira } from './SeletorDeAlvo'
import type { StatusEffectInstance } from '@/app/lib/battle/types'

/** Um lutador no HUD: o que a barra mostra, e o detalhe que abre no hover. */
export type MembroDoHud = {
  /** Índice no lado do estado — é o alvo que o motor recebe. */
  posicao: number
  nome: string
  nivel?: number
  /** Invocação: o kanji dela no lugar do nível. */
  marca?: string
  hp: number
  max: number
  en: number
  enMax: number
  st?: number
  stMax?: number
  forma?: string
  efeitos: StatusEffectInstance[]
  /** O personagem de quem joga: barra um pouco maior. */
  voce?: boolean
  /** Pode levar golpe (inimigo de pé, não treinador, não na pokébola). */
  miravel?: boolean
}

type Lado = 'esq' | 'dir'
/** compacto null: a pessoa nunca mexeu, e vale o padrão da tela (ver useCelular). */
type Preferencia = { x: number | null; y: number | null; compacto: boolean | null }
type Preferencias = Record<Lado, Preferencia>

/**
 * O HUD da batalha, no estilo de Sword Art Online: a party no canto esquerdo,
 * os inimigos no direito, fixo na tela enquanto se rola até os golpes.
 *
 * Existe porque a página da luta é alta — as cartas grandes, o histórico, as
 * ações —, e na hora de escolher o golpe a vida de todo mundo tinha saído da
 * tela (medido: o primeiro golpe a 1276 px no computador, 2379 no celular).
 * O HUD traz a vida para onde a decisão acontece, sem tirar as cartas.
 *
 * Desenho aprovado no protótipo (design/batalha/hud-de-batalha.html):
 * - TRANSLÚCIDO em repouso, nítido no hover, no foco e no arrasto;
 * - ARRASTÁVEL pela barra de título, e COMPRIMÍVEL (só as barras);
 * - passar o mouse num membro abre energia, stamina e efeitos;
 * - clicar num inimigo mira nele (ver SeletorDeAlvo).
 *
 * Onde a pessoa deixou cada HUD, e se comprimiu, fica no navegador dela.
 */
export function HudDeBatalha({ esquerda, direita }: { esquerda: MembroDoHud[]; direita: MembroDoHud[] }) {
  const prefs = usePreferencias()
  return (
    <>
      <Painel lado="esq" titulo="Party" membros={esquerda} pref={prefs.esq} />
      <Painel lado="dir" titulo="Inimigos" membros={direita} pref={prefs.dir} />
    </>
  )
}

// ---------- preferências salvas no navegador ----------

const CHAVE = 'hud-de-batalha'
/** Abaixo do cabeçalho do site e do título da luta, no topo das cartas. */
const TOPO_PADRAO = 168
/** No celular, colado no cabeçalho: lá o HUD começa comprimido e ocupa pouco. */
const TOPO_NO_CELULAR = 72

const PADRAO: Preferencias = {
  esq: { x: null, y: null, compacto: null },
  dir: { x: null, y: null, compacto: null },
}
const ouvintes = new Set<() => void>()

function lerBruto(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar)
  window.addEventListener('storage', avisar)
  return () => {
    ouvintes.delete(avisar)
    window.removeEventListener('storage', avisar)
  }
}

function lerPreferencias(bruto: string | null): Preferencias {
  if (!bruto) return PADRAO
  try {
    const p = JSON.parse(bruto) as Partial<Preferencias>
    return { esq: { ...PADRAO.esq, ...p.esq }, dir: { ...PADRAO.dir, ...p.dir } }
  } catch {
    return PADRAO
  }
}

function gravar(lado: Lado, mudanca: Partial<Preferencia>) {
  const atual = lerPreferencias(lerBruto())
  const nova = { ...atual, [lado]: { ...atual[lado], ...mudanca } }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(nova))
  } catch {
    // Storage bloqueado: o HUD funciona, só não lembra.
  }
  ouvintes.forEach((f) => f())
}

/**
 * useSyncExternalStore e não useState + efeito: o servidor desenha o padrão
 * (não há localStorage lá), e o React troca pelo salvo depois da hidratação
 * sem acusar diferença entre os dois HTMLs.
 */
function usePreferencias(): Preferencias {
  const bruto = useSyncExternalStore(assinar, lerBruto, () => null)
  return lerPreferencias(bruto)
}

/**
 * Tela estreita? No celular os dois painéis abertos cobrem as posturas, então
 * o padrão lá é comprimido. O servidor responde "não" e o React corrige depois
 * da hidratação, como em usePreferencias.
 */
const CELULAR = '(max-width: 639px)'
function useCelular(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(CELULAR)
      consulta.addEventListener('change', avisar)
      return () => consulta.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CELULAR).matches,
    () => false
  )
}

// ---------- um dos dois painéis ----------

function Painel({ lado, titulo, membros, pref }: { lado: Lado; titulo: string; membros: MembroDoHud[]; pref: Preferencia }) {
  const caixa = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ dx: number; dy: number; x: number; y: number; moveu: boolean } | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const direita = lado === 'dir'
  const celular = useCelular()
  const compacto = pref.compacto ?? celular

  const comecar = (e: PointerDoReact<HTMLButtonElement>) => {
    const el = caixa.current
    if (!el) return
    const r = el.getBoundingClientRect()
    arrasto.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, x: r.left, y: r.top, moveu: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    setArrastando(true)
  }
  const mover = (e: PointerDoReact<HTMLButtonElement>) => {
    const a = arrasto.current
    const el = caixa.current
    if (!a || !el) return
    // Preso dentro da janela: o HUD nunca sai inteiro da tela.
    const x = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, e.clientX - a.dx))
    const y = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, e.clientY - a.dy))
    el.style.left = `${x}px`
    el.style.right = 'auto'
    el.style.top = `${y}px`
    Object.assign(a, { x, y, moveu: true })
  }
  const soltar = () => {
    const a = arrasto.current
    arrasto.current = null
    setArrastando(false)
    if (a?.moveu) gravar(lado, { x: Math.round(a.x), y: Math.round(a.y) })
  }

  // Sem posição salva, cada um no seu canto, abaixo do título da luta (o
  // "Hero vs Menos Grande" e o botão de sair da raid ficam livres).
  const posicao =
    pref.x === null || pref.y === null
      ? direita
        ? { top: celular ? TOPO_NO_CELULAR : TOPO_PADRAO, right: 12 }
        : { top: celular ? TOPO_NO_CELULAR : TOPO_PADRAO, left: 12 }
      : { top: `min(${pref.y}px, calc(100vh - 3rem))`, left: `min(${pref.x}px, calc(100vw - 4rem))` }

  return (
    <div
      ref={caixa}
      aria-label={`HUD: ${titulo}`}
      className={`fixed z-30 flex w-[min(18rem,46vw)] flex-col gap-1.5 transition-opacity duration-200 ${
        arrastando ? 'opacity-100' : 'opacity-70 hover:opacity-100 focus-within:opacity-100'
      } ${direita ? 'items-end' : ''} ${compacto ? 'gap-3' : ''}`}
      style={posicao}
    >
      <div className={`flex w-full items-center gap-1.5 ${direita ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          aria-label={`Arrastar o HUD ${titulo}`}
          className={`flex min-w-0 flex-1 touch-none items-center gap-1.5 px-1 py-0.5 font-titulo text-[10px] font-bold uppercase tracking-[.3em] text-[#d2e1ff]/60 ${
            arrastando ? 'cursor-grabbing' : 'cursor-grab'
          } ${direita ? 'flex-row-reverse' : ''}`}
        >
          <span aria-hidden className="text-xs tracking-normal">
            ⠿
          </span>
          {titulo}
        </button>
        <button
          type="button"
          onClick={() => gravar(lado, { compacto: !compacto })}
          aria-expanded={!compacto}
          aria-label={`${compacto ? 'Expandir' : 'Comprimir'} o HUD ${titulo}`}
          className="grid h-5 w-5 rotate-45 scale-[.82] place-items-center border border-[#d2e1ff]/50 bg-[#0c0e16]/60 text-[13px] font-bold text-[#dfe7ff]"
        >
          <span className="-rotate-45">{compacto ? '+' : '–'}</span>
        </button>
      </div>
      {membros.map((m) => (
        <Membro key={m.posicao} membro={m} direita={direita} compacto={compacto} />
      ))}
    </div>
  )
}

// ---------- um lutador ----------

const VEU = 'rgba(12,14,22,.6)'
const LINHA = 'rgba(210,225,255,.5)'

function Membro({ membro: m, direita, compacto }: { membro: MembroDoHud; direita: boolean; compacto: boolean }) {
  const { alvo, mirar } = useMira()
  const [aberto, setAberto] = useState(false)
  const fracao = m.max > 0 ? Math.max(0, m.hp) / m.max : 0
  const caido = m.hp <= 0
  const ehAlvo = Boolean(m.miravel) && alvo === m.posicao
  const largura = m.voce ? '100%' : '88%'
  const barra = (
    <span
      className="relative block overflow-hidden"
      style={{
        height: compacto ? 7 : m.voce ? 12 : 10,
        background: 'rgba(8,10,16,.85)',
        borderBottom: `1px solid ${LINHA}`,
        clipPath: direita ? 'polygon(7px 0, 100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, calc(100% - 7px) 100%, 0 100%)',
      }}
    >
      <i
        className="absolute inset-y-px block transition-[width,background-color] duration-700 ease-out"
        style={{
          [direita ? 'right' : 'left']: 0,
          width: `${fracao * 100}%`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${corDaVida(fracao)} 80%, #fff), ${corDaVida(fracao)})`,
        }}
      />
    </span>
  )

  return (
    <button
      type="button"
      onClick={() => {
        if (m.miravel) mirar(m.posicao)
        setAberto((a) => !a)
      }}
      aria-label={`${m.nome}: ${Math.max(0, m.hp)} de ${m.max} de vida${m.miravel ? '. Clique para mirar' : ''}`}
      aria-pressed={m.miravel ? ehAlvo : undefined}
      className={`group/membro relative block text-left drop-shadow-[0_2px_6px_rgba(0,0,0,.55)] ${caido ? 'opacity-45 grayscale' : ''} ${
        m.miravel ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ width: largura }}
    >
      {compacto ? (
        <span className="relative block">
          <span
            className={`absolute -top-3 font-titulo text-[10px] font-bold uppercase italic tracking-wider text-[#dfe7ff] ${direita ? 'right-1' : 'left-1'}`}
          >
            {ehAlvo && <span className="mr-1 text-spirit">◎</span>}
            {m.nome} · {Math.max(0, m.hp)}
          </span>
          {barra}
        </span>
      ) : (
        <span className={`grid items-center gap-x-2 ${direita ? 'grid-cols-[1fr_28px]' : 'grid-cols-[28px_1fr]'}`}>
          {/* O losango do nível — ou o kanji da invocação. */}
          <span
            className={`row-span-2 grid h-7 w-7 rotate-45 scale-[.8] place-items-center border font-titulo text-[11px] font-bold backdrop-blur ${direita ? 'col-start-2' : ''}`}
            style={{
              background: ehAlvo ? 'color-mix(in srgb, var(--spirit) 30%, rgba(12,14,22,.6))' : VEU,
              borderColor: ehAlvo ? 'var(--spirit)' : LINHA,
            }}
          >
            <span className={`-rotate-45 ${m.marca ? 'font-kanji text-xs' : ''}`}>{m.marca ?? m.nivel ?? ''}</span>
          </span>
          <span
            className={`flex items-baseline justify-between gap-2 px-2 pb-0.5 pt-1 backdrop-blur ${direita ? 'col-start-1 row-start-1' : ''}`}
            style={{
              background: VEU,
              borderTop: `1px solid ${ehAlvo ? 'var(--spirit)' : LINHA}`,
              clipPath: direita ? 'polygon(0 0, 100% 0, 100% 100%, 8px 100%)' : 'polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}
          >
            <span className="min-w-0 truncate font-titulo text-[13px] font-bold uppercase italic tracking-wider text-[#eef2ff]">
              {ehAlvo && <span className="mr-1.5 bg-spirit px-1 py-px font-sans text-[9px] font-bold not-italic tracking-[.14em] text-background">ALVO</span>}
              {m.nome}
              {m.forma && (
                <span title={m.forma} className="ml-1 font-kanji text-[11px] not-italic text-accent [text-shadow:0_0_8px_var(--accent)]">
                  変
                </span>
              )}
            </span>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#dfe7ff]">
              {Math.max(0, m.hp)}/{m.max}
            </span>
          </span>
          <span className={direita ? 'col-start-1 row-start-2' : ''}>{barra}</span>

          {/* O detalhe: abre no hover (e no toque, no celular). */}
          <span
            className={`col-span-1 mt-1 flex-col gap-1 px-2 py-1.5 text-[11px] text-[#c9d3ee] backdrop-blur ${
              direita ? 'col-start-1 border-r' : 'col-start-2 border-l'
            } ${aberto ? 'flex' : 'hidden group-hover/membro:flex group-focus-visible/membro:flex'}`}
            style={{ background: VEU, borderColor: LINHA }}
          >
            {m.forma && <span className="text-accent">{m.forma}</span>}
            <Reserva rotulo="EN" valor={m.en} max={m.enMax} cor="#38bdf8" />
            {m.stMax ? <Reserva rotulo="ST" valor={m.st ?? 0} max={m.stMax} cor="#f59e0b" /> : null}
            {m.efeitos.length > 0 && <StatusBadges effects={m.efeitos} />}
          </span>
        </span>
      )}
    </button>
  )
}

function Reserva({ rotulo, valor, max, cor }: { rotulo: string; valor: number; max: number; cor: string }) {
  return (
    <span className="grid grid-cols-[20px_1fr_auto] items-center gap-1.5 tabular-nums">
      <span>{rotulo}</span>
      <span className="relative h-1 overflow-hidden rounded-sm bg-white/10">
        <i className="absolute inset-y-0 left-0 block" style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%`, background: cor }} />
      </span>
      <span>{valor}</span>
    </span>
  )
}
