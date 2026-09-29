/**
 * Os destinos do jogo e a que seção cada página pertence.
 *
 * Eram doze links soltos na barra de cima, e em tela menor que 1280px o fim
 * da lista rolava para fora de vista. Agora são seis seções; cada uma sabe
 * quais caminhos são dela, e as páginas de uma mesma seção se ligam por abas
 * (ver AbasDaSecao). Decisão de design aprovada pelo dono do projeto — ver o
 * canvas "Telas de Entrada".
 *
 * Um arquivo só, sem React, para a barra de cima, a de baixo (celular) e as
 * abas lerem a MESMA tabela. Duas listas separadas divergiriam na primeira
 * página nova.
 */

export type Secao = {
  href: string
  rotulo: string
  /** Os caminhos que acendem esta seção, além do próprio href. */
  caminhos: string[]
  /** Aparece na barra de baixo do celular (cinco no máximo, pelo polegar). */
  noCelular: boolean
}

export const SECOES_LOGADO: Secao[] = [
  { href: '/dashboard', rotulo: 'Central', caminhos: ['/dashboard'], noCelular: true },
  { href: '/battle', rotulo: 'Batalha', caminhos: ['/battle'], noCelular: true },
  { href: '/story', rotulo: 'História', caminhos: ['/story'], noCelular: true },
  {
    href: '/status',
    rotulo: 'Personagem',
    caminhos: ['/status', '/equipment', '/treino', '/select', '/create'],
    noCelular: true,
  },
  { href: '/shop', rotulo: 'Loja', caminhos: ['/shop'], noCelular: true },
  { href: '/characters', rotulo: 'Catálogo', caminhos: ['/characters', '/skills'], noCelular: false },
]

export const SECOES_VISITANTE: Secao[] = [
  { href: '/', rotulo: 'Início', caminhos: [], noCelular: false },
  { href: '/characters', rotulo: 'Catálogo', caminhos: ['/characters', '/skills'], noCelular: false },
]

/** A seção está aberta quando o caminho atual é dela (ou está dentro dela). */
export function secaoAtiva(secao: Secao, caminho: string): boolean {
  if (secao.href === '/') return caminho === '/'
  return [secao.href, ...secao.caminhos].some((c) => caminho === c || caminho.startsWith(c + '/'))
}

/** As abas de cada seção que tem mais de uma página. */
export const ABAS_DO_PERSONAGEM = [
  { href: '/status', rotulo: 'Status' },
  { href: '/equipment', rotulo: 'Equipamento' },
  { href: '/treino', rotulo: 'Treino' },
]

export const ABAS_DO_CATALOGO = [
  { href: '/characters', rotulo: 'Personagens' },
  { href: '/skills', rotulo: 'Habilidades' },
]
