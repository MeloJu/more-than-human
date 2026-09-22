import { resolveErrorMessage } from '@/app/lib/error-messages'
import { saborDoDot } from './engine'
import type { DotFlavor, EffectType, Stat } from './types'

export type EffectLike = { type: EffectType; stat?: Stat; magnitude: number; flavor?: DotFlavor; stack?: boolean }

/**
 * Ícone e nome de cada natureza de dano contínuo.
 *
 * VIVE AQUI, e não no componente que desenha as tarjas, porque são DUAS telas
 * lendo a mesma coisa: a tarja de status na batalha e o texto do efeito no
 * cartão da habilidade. Enquanto cada uma tinha a própria tabela, a segunda
 * mostrava 🔥 para todo dano contínuo — inclusive para veneno e corte — e
 * contradizia a primeira na mesma partida.
 */
export const DOT_SABOR: Record<DotFlavor, { icone: string; rotulo: string }> = {
  queimadura: { icone: '🔥', rotulo: 'Queimadura' },
  veneno: { icone: '☠️', rotulo: 'Veneno' },
  sangramento: { icone: '🩸', rotulo: 'Sangramento' },
  maldicao: { icone: '🟣', rotulo: 'Maldição' },
  congelamento: { icone: '❄️', rotulo: 'Congelamento' },
  espiritual: { icone: '💠', rotulo: 'Queimadura espiritual' },
}

/** Quando a habilidade não diz de que natureza é o dano — ver StatusBadges. */
export const DOT_GENERICO = { icone: '⏳', rotulo: 'Dano contínuo' }

const STAT_LABEL: Record<Stat, string> = { attack: 'ATQ', defense: 'DEF', speed: 'VEL' }
const EFFECT_ICON: Record<EffectType, string> = {
  BUFF: '↑',
  DEBUFF: '↓',
  DOT: '⏳',
  STUN: '😵',
  COUNTER: '🔄',
  SHIELD: '🛡️',
  HEAL: '💚',
  LIFESTEAL: '🩸',
  DOMAIN: '🌌',
  REVIVE: '🕊️',
  EXECUTE: '☠️',
  PIERCE: '🗡️',
  COMBO_STUN: '⚡',
  COMBO_FOLLOWUP: '🔗',
}

export function describeEffect(e: EffectLike): string {
  switch (e.type) {
    case 'BUFF':
      return `${EFFECT_ICON.BUFF} ${e.stat ? STAT_LABEL[e.stat] : ''} +${e.magnitude}%`
    case 'DEBUFF':
      return `${EFFECT_ICON.DEBUFF} ${e.stat ? STAT_LABEL[e.stat] : ''} -${e.magnitude}%${e.stack ? ' (empilha)' : ''}`
    // O ícone segue a NATUREZA quando ela é conhecida. Antes era 🔥 fixo, e
    // era o que fazia todo dano contínuo parecer fogo no cartão da habilidade.
    case 'DOT':
      return `${(e.flavor ? DOT_SABOR[e.flavor] : DOT_GENERICO).icone} ${e.magnitude}/rodada${e.stack ? ' (empilha)' : ''}`
    case 'STUN':
      return `${EFFECT_ICON.STUN} Atordoa`
    case 'COUNTER':
      return `${EFFECT_ICON.COUNTER} Reflete ${e.magnitude}%`
    case 'SHIELD':
      return `${EFFECT_ICON.SHIELD} Escudo ${e.magnitude}`
    case 'HEAL':
      return `${EFFECT_ICON.HEAL} Cura ${e.magnitude}`
    case 'LIFESTEAL':
      return `${EFFECT_ICON.LIFESTEAL} Vampirismo ${e.magnitude}%`
    // A magnitude do domínio é a manutenção por rodada, não dano: dizer só o
    // número seria enganoso, então o texto diz as duas coisas que importam —
    // que o golpe passa por defesa e quanto custa manter aberto.
    case 'DOMAIN':
      return `${EFFECT_ICON.DOMAIN} Domínio · acerto garantido · ${e.magnitude} EN e ST/rodada`
    case 'REVIVE':
      return `${EFFECT_ICON.REVIVE} Traz um aliado caído de volta com ${e.magnitude}% da vida`
    case 'EXECUTE':
      return `${EFFECT_ICON.EXECUTE} +${e.magnitude}% de dano contra alvo com pouca vida`
    case 'PIERCE':
      return `${EFFECT_ICON.PIERCE} Ignora ${e.magnitude}% da defesa do alvo`
    case 'COMBO_STUN':
      return `${EFFECT_ICON.COMBO_STUN} +${e.magnitude}% de dano contra alvo atordoado`
    case 'COMBO_FOLLOWUP':
      return `${EFFECT_ICON.COMBO_FOLLOWUP} +${e.magnitude}% de dano em sequência`
  }
}

const BATTLE_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Batalha não encontrada.',
  invalid_skill: 'Essa habilidade não está disponível pro seu personagem.',
  illegal_move: 'Você não pode usar essa habilidade agora (energia insuficiente ou em cooldown).',
  invalid_transformation: 'Essa transformação não está disponível pro seu personagem.',
  already_transformed: 'Você já está transformado nessa batalha.',
  conflict: 'Essa rodada já foi resolvida em outra aba — a tela foi atualizada.',
  insufficient_energy: 'Energia insuficiente para liberar essa forma.',
  tier_locked: 'Seu personagem ainda não tem nível para encarar esse inimigo.',
}

export function battleErrorMessage(code: string | undefined): string | null {
  return resolveErrorMessage(BATTLE_ERROR_MESSAGES, code, 'Ocorreu um erro inesperado.')
}


/**
 * Descreve os efeitos de uma HABILIDADE, deduzindo a natureza do dano
 * contínuo a partir das tags dela.
 *
 * Existe porque SkillEffect não guarda o sabor — ele só é decidido quando o
 * efeito é APLICADO, a partir das tags de quem lançou. Sem esta função, o
 * cartão da habilidade mostrava o ícone genérico para todo dano contínuo,
 * enquanto a mesma habilidade em batalha mostrava veneno ou corte: duas telas
 * discordando sobre o mesmo golpe.
 */
export function descreverEfeitosDaHabilidade(skill: {
  effects: { type: EffectType; stat?: Stat; magnitude: number }[]
  tags: string[]
}): string[] {
  const flavor = saborDoDot(skill.tags)
  return skill.effects.map((e) => describeEffect(e.type === 'DOT' ? { ...e, flavor } : e))
}
