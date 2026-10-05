/**
 * As MISSÕES DIÁRIAS: três por dia, sorteadas por conta, medidas nas lutas
 * do dia. Funções puras — a leitura do banco está em queries.ts.
 *
 * Existem para dar meta a quem já voltou pela recompensa diária: o teto de 5
 * vitórias pagas era comunicado como limite ("acabou"), e uma missão o vira
 * objetivo ("faltam 2"). As de universo e de transformação empurram o jogador
 * para personagens e formas que ele provavelmente nunca tocou — criar um
 * personagem novo é de graça, e a IA escala com o nível dele, então "vença
 * com alguém de Bleach" é cumprível no mesmo dia.
 *
 * O SORTEIO É DETERMINÍSTICO (conta + dia como semente), então não há tabela
 * de missões atribuídas: recalcular dá sempre as mesmas três. Só o resgate é
 * gravado (MissaoResgatada).
 */

/** O que as lutas do dia renderam, do ponto de vista de quem joga. */
export type ResumoDoDia = {
  vitorias: number
  vitoriasDeTreino: number
  andaresDeRaid: number
  /** Vitórias por universo do personagem que lutou (slug do Anime). */
  vitoriasPorUniverso: Record<string, number>
  formasLiberadas: number
  dano: number
  aparados: number
  esquivas: number
}

export const RESUMO_VAZIO: ResumoDoDia = {
  vitorias: 0,
  vitoriasDeTreino: 0,
  andaresDeRaid: 0,
  vitoriasPorUniverso: {},
  formasLiberadas: 0,
  dano: 0,
  aparados: 0,
  esquivas: 0,
}

/** Os universos que entram na missão de universo: os com elenco para escolher. */
export const UNIVERSOS_DA_MISSAO = [
  { slug: 'bleach', nome: 'Bleach' },
  { slug: 'jujutsu-kaisen', nome: 'Jujutsu Kaisen' },
  { slug: 'marvel-universe', nome: 'Marvel' },
  { slug: 'dragon-ball-z', nome: 'Dragon Ball Z' },
  { slug: 'dc-universe', nome: 'DC' },
] as const

type Universo = (typeof UNIVERSOS_DA_MISSAO)[number]

type Molde = {
  id: string
  meta: number
  moedas: number
  titulo: (universo: Universo) => string
  medir: (resumo: ResumoDoDia, universo: Universo) => number
}

/** As de vitória: uma delas abre o dia, sempre. */
const DE_VITORIA: Molde[] = [
  { id: 'vitorias-3', meta: 3, moedas: 100, titulo: () => 'Vença 3 lutas, em qualquer modo', medir: (r) => r.vitorias },
  { id: 'treino-5', meta: 5, moedas: 150, titulo: () => 'Vença as 5 lutas pagas do treino contra a IA', medir: (r) => r.vitoriasDeTreino },
]

/** As outras: duas por dia. */
const VARIADAS: Molde[] = [
  { id: 'raid-1', meta: 1, moedas: 120, titulo: () => 'Vença um andar de raid', medir: (r) => r.andaresDeRaid },
  {
    id: 'universo-1',
    meta: 1,
    moedas: 150,
    titulo: (u) => `Vença uma luta com um personagem de ${u.nome}`,
    medir: (r, u) => r.vitoriasPorUniverso[u.slug] ?? 0,
  },
  { id: 'forma-1', meta: 1, moedas: 100, titulo: () => 'Libere uma transformação numa luta', medir: (r) => r.formasLiberadas },
  { id: 'dano-1500', meta: 1500, moedas: 100, titulo: () => 'Cause 1.500 de dano', medir: (r) => r.dano },
  { id: 'aparar-2', meta: 2, moedas: 120, titulo: () => 'Apare 2 golpes com a postura Aparar', medir: (r) => r.aparados },
  { id: 'esquivar-2', meta: 2, moedas: 120, titulo: () => 'Esquive de 2 golpes com a postura Esquivar', medir: (r) => r.esquivas },
]

/** Completar as três do dia dá isto, além das moedas de cada uma. */
export const BONUS_DAS_TRES = { nome: 'Poção', quantidade: 1 } as const

export type MissaoDoDia = {
  id: string
  titulo: string
  meta: number
  moedas: number
  /** Progresso de hoje, já limitado à meta. */
  feito: number
  completa: boolean
}

/** Um número de 32 bits a partir do texto (FNV-1a): a semente do sorteio. */
function semente(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Gerador pequeno e reprodutível (mulberry32): mesma semente, mesma sequência. */
function sorteador(s: number): () => number {
  let a = s
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** "2026-10-05": a chave do dia em UTC, o mesmo dia da recompensa diária. */
export function chaveDoDia(dia: Date): string {
  return dia.toISOString().slice(0, 10)
}

/**
 * As três missões da conta no dia, com o progresso medido no resumo. Uma de
 * vitória abre a lista; as outras duas saem das variadas, sem repetir.
 */
export function missoesDoDia(userId: string, dia: Date, resumo: ResumoDoDia = RESUMO_VAZIO): MissaoDoDia[] {
  const sortear = sorteador(semente(`${userId}:${chaveDoDia(dia)}`))
  const universo = UNIVERSOS_DA_MISSAO[Math.floor(sortear() * UNIVERSOS_DA_MISSAO.length)]
  const abertura = DE_VITORIA[Math.floor(sortear() * DE_VITORIA.length)]
  const restantes = [...VARIADAS]
  const escolhidas: Molde[] = [abertura]
  for (let i = 0; i < 2; i++) {
    escolhidas.push(restantes.splice(Math.floor(sortear() * restantes.length), 1)[0])
  }
  return escolhidas.map((m) => {
    const feito = Math.min(m.meta, Math.max(0, Math.floor(m.medir(resumo, universo))))
    return { id: m.id, titulo: m.titulo(universo), meta: m.meta, moedas: m.moedas, feito, completa: feito >= m.meta }
  })
}

// ---------- o resumo, a partir das lutas ----------

/** Uma linha de turno, só com o que as missões leem. */
export type TurnoParaMissao = {
  side: 'PLAYER' | 'ENEMY'
  kind: string
  damage?: number
  aparou?: boolean
  esquivou?: boolean
}

/** Uma luta do dia, já na perspectiva de quem joga. */
export type LutaParaMissao = {
  /** O lado de quem joga no motor: PLAYER no geral, ENEMY quando é o convidado do PvP. */
  meuLado: 'PLAYER' | 'ENEMY'
  venceu: boolean
  modo: 'treino' | 'raid' | 'historia' | 'pvp'
  /** Slug do universo do personagem com que lutou. */
  universo: string
  turnos: TurnoParaMissao[]
}

/**
 * Soma as lutas do dia no resumo. Dano, transformação, aparada e esquiva
 * contam em qualquer luta, ganha ou perdida — quem treinou a postura cumpriu
 * a missão mesmo caindo no fim. Vitórias, só as ganhas.
 */
export function resumirLutas(lutas: LutaParaMissao[]): ResumoDoDia {
  const r: ResumoDoDia = { ...RESUMO_VAZIO, vitoriasPorUniverso: {} }
  for (const luta of lutas) {
    if (luta.venceu) {
      r.vitorias += 1
      if (luta.modo === 'treino') r.vitoriasDeTreino += 1
      if (luta.modo === 'raid') r.andaresDeRaid += 1
      r.vitoriasPorUniverso[luta.universo] = (r.vitoriasPorUniverso[luta.universo] ?? 0) + 1
    }
    for (const t of luta.turnos) {
      const meu = t.side === luta.meuLado
      if (meu && t.kind === 'TRANSFORM') r.formasLiberadas += 1
      if (meu && t.kind === 'ATTACK') r.dano += t.damage ?? 0
      // Aparar e esquivar ficam gravados na linha de quem ATACOU: o golpe do
      // outro lado que eu aparei ou de que eu esquivei.
      if (!meu && t.aparou) r.aparados += 1
      if (!meu && t.esquivou) r.esquivas += 1
    }
  }
  return r
}
