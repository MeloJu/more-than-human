/**
 * As cores dos dois lados de um confronto.
 *
 * O PROBLEMA: a cor de cada personagem vem da própria arte, e dois
 * personagens podem ter arte da mesma família de cor. Ichigo e Jean Grey
 * saíram laranja e amarelo, a 10 graus de matiz — e a tela, que existe para
 * dizer de relance de quem é cada barra, pintava os dois lados iguais.
 *
 * A REGRA, em ordem:
 *
 *   1. O jogador fica SEMPRE com a própria cor. É o personagem dele, e a cor
 *      é a identidade que ele escolheu jogar.
 *   2. Se o adversário colide, troca para a SECUNDÁRIA dele — a segunda cor
 *      forte da arte dele, a 60 graus ou mais da primária. É o que mantém o
 *      tema: a Jean Grey vira o roxo do cosmos da Fênix, o Goku vira o azul.
 *   3. Sem secundária, ou se ela também colide, cai na cor do tema mais
 *      distante da do jogador. Não é temático, mas é legível — e legível
 *      vence temático quando só dá para ter um.
 */

/** Abaixo disto, duas cores lado a lado leem como a mesma. */
export const DISTANCIA_MINIMA_DE_MATIZ = 45

/** Cores do tema usadas como último recurso: espalhadas pelo círculo. */
const RESERVAS = ['#4dd0e1', '#ff6b1a', '#a855f7', '#22c55e']

/** Matiz em graus de um hex #rrggbb, ou null se não for uma cor válida. */
export function matiz(hex: string | null | undefined): number | null {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return null // cinza não tem matiz
  const d = max - min
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return h
}

/** Distância no círculo de matiz, de 0 a 180. */
export function distanciaDeMatiz(a: string | null | undefined, b: string | null | undefined): number {
  const ha = matiz(a)
  const hb = matiz(b)
  if (ha === null || hb === null) return 180
  const d = Math.abs(ha - hb) % 360
  return Math.min(d, 360 - d)
}

export type CoresDoPersonagem = { primaria: string | null; secundaria: string | null }

export function coresDoConfronto(
  jogador: CoresDoPersonagem,
  inimigo: CoresDoPersonagem,
  padraoJogador = '#ff6b1a',
  padraoInimigo = '#4dd0e1'
): { jogador: string; inimigo: string } {
  const cJ = jogador.primaria ?? padraoJogador
  const primariaInimigo = inimigo.primaria ?? padraoInimigo

  if (distanciaDeMatiz(cJ, primariaInimigo) >= DISTANCIA_MINIMA_DE_MATIZ) {
    return { jogador: cJ, inimigo: primariaInimigo }
  }

  if (inimigo.secundaria && distanciaDeMatiz(cJ, inimigo.secundaria) >= DISTANCIA_MINIMA_DE_MATIZ) {
    return { jogador: cJ, inimigo: inimigo.secundaria }
  }

  const reserva = RESERVAS.reduce((melhor, c) =>
    distanciaDeMatiz(cJ, c) > distanciaDeMatiz(cJ, melhor) ? c : melhor
  )
  return { jogador: cJ, inimigo: reserva }
}
