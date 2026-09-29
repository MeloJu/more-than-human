/**
 * A party da raid e o mercado de contratação.
 *
 * POR QUE UM MERCADO. A raid foi desenhada para grupo — o chefe tem golpe de
 * área, persegue quem bate mais, e a party divide a pancada. Quem não tem
 * guilda nem amigos online ficaria de fora dela. O mercado resolve isso com
 * personagens do elenco contratados para UMA raid, controlados pela IA. As
 * vagas são as mesmas que amigos e guilda vão ocupar depois.
 *
 * O CONTRATADO ENTRA NO NÍVEL DO JOGADOR. Mais alto, o mercado viraria o
 * atalho para qualquer raid; mais baixo, ninguém contrataria. No mesmo nível,
 * ele é exatamente um segundo jogador — nem muleta, nem peso.
 */

/** Quantos aliados cabem além do jogador. A party inteira tem três. */
export const VAGAS_DE_CONTRATO = 2

/**
 * Moedas por nível do contratado.
 *
 * Metade do que uma vitória paga contra a IA (MOEDA_POR_NIVEL_NA_VITORIA, 12):
 * a party cheia custa o mesmo que uma vitória de treino rende. Escala com o
 * nível pelo mesmo motivo que a recompensa escala — no nível 20, um preço
 * fixo não seria preço.
 */
export const MOEDA_POR_NIVEL_DO_CONTRATO = 6

export function precoDoContrato(nivel: number): number {
  return MOEDA_POR_NIVEL_DO_CONTRATO * Math.max(1, nivel)
}

export type ErroDeContrato = 'party_cheia' | 'contrato_repetido' | 'contrato_indisponivel' | 'contrato_proprio'

/**
 * Confere os contratos pedidos antes de qualquer cobrança.
 *
 * O formulário vem do navegador, então tudo é revalidado: quantidade, repetido,
 * se o personagem existe no mercado e se não é o próprio personagem do
 * jogador — dois Ichigos na mesma party seria o mesmo lutador duas vezes.
 */
export function validarContratos(
  pedidos: string[],
  mercado: { disponiveis: ReadonlySet<string>; proprioCharacterId: string }
): { ok: true; ids: string[] } | { ok: false; erro: ErroDeContrato } {
  const ids = pedidos.filter((id) => id.length > 0)
  if (ids.length > VAGAS_DE_CONTRATO) return { ok: false, erro: 'party_cheia' }
  if (new Set(ids).size !== ids.length) return { ok: false, erro: 'contrato_repetido' }
  if (ids.includes(mercado.proprioCharacterId)) return { ok: false, erro: 'contrato_proprio' }
  if (ids.some((id) => !mercado.disponiveis.has(id))) return { ok: false, erro: 'contrato_indisponivel' }
  return { ok: true, ids }
}
