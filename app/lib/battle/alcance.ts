import type { Alcance, SkillDef } from './types'

/**
 * De onde vem o golpe: corpo a corpo, à distância ou em área.
 *
 * Existe por causa das posturas. APARAR só funciona contra golpe corpo a
 * corpo — é preciso alcançar a lâmina —, e ESQUIVAR não funciona contra golpe
 * em área, porque não há para onde ir. Sem saber o alcance, as duas posturas
 * seriam a mesma coisa com nomes diferentes.
 *
 * DEDUZIDO, E NÃO GRAVADO HABILIDADE POR HABILIDADE, porque são 482 golpes de
 * dano e a maioria já diz o que é pela categoria (Taijutsu é corpo a corpo,
 * kidō é à distância) ou pelas tags. O que a regra erra é corrigido no
 * catálogo e chega em `skill.alcance`, que sempre vence a dedução.
 */

/** Tags que fazem o golpe atingir a área inteira. */
const TAGS_AREA = new Set(['aoe', 'area', 'dominio'])

/** Tags de golpe que precisa encostar. */
const TAGS_CORPO = new Set(['espada', 'fisico', 'claw', 'whip', 'smash', 'multi-hit'])

/** Tags de golpe disparado. */
const TAGS_DISTANCIA = new Set([
  'beam', 'cero', 'fire', 'fogo', 'ice', 'gelo', 'water', 'agua', 'lightning', 'eletrico',
  'psychic', 'kido', 'hado', 'bakudo', 'ki', 'quincy', 'shikigami', 'sombra', 'pokemon',
])

/** Categorias que já dizem tudo. */
const CATEGORIA: Record<string, Alcance> = {
  TAIJUTSU: 'CORPO',
  HADO: 'DISTANCIA',
  BAKUDO: 'DISTANCIA',
  KIDO: 'DISTANCIA',
  KI: 'DISTANCIA',
  NINJUTSU: 'DISTANCIA',
  GENJUTSU: 'DISTANCIA',
}

/**
 * Palavras do nome, para o que não tem categoria nem tag que decida — quase
 * todo o "OTHER" do Bleach e dos heróis. Olha o nome inteiro em minúsculas.
 */
const NOME_DISTANCIA = /\b(cero|flecha|arrow|tiro|shot|feixe|beam|rajada|onda|chuva|bala|disparo|canh[aã]o|blast|vision|lan[çc]a|chamas?|flame|fogo|fire|gelo|ice)\b/
const NOME_CORPO = /\b(corte|golpe|soco|chute|punho|investida|strike|slash|fist|garra|mordida|estocada|l[aâ]mina|blade|smash|slam|sting|ferroada|cotovelada|joelhada|cabe[çc]ada)\b/

export function alcanceDe(skill: Pick<SkillDef, 'alcance' | 'category' | 'tags' | 'name' | 'effects'> | null): Alcance {
  // O ataque básico é sempre um golpe de perto.
  if (!skill) return 'CORPO'
  if (skill.alcance) return skill.alcance

  if (skill.tags.some((t) => TAGS_AREA.has(t)) || skill.effects.some((e) => e.type === 'DOMAIN')) return 'AREA'
  if (skill.category && CATEGORIA[skill.category]) {
    // Taijutsu é sempre corpo; um ki ou ninjutsu marcado como físico também.
    if (skill.tags.some((t) => TAGS_CORPO.has(t))) return 'CORPO'
    return CATEGORIA[skill.category]
  }
  if (skill.tags.some((t) => TAGS_CORPO.has(t))) return 'CORPO'
  if (skill.tags.some((t) => TAGS_DISTANCIA.has(t))) return 'DISTANCIA'

  const nome = skill.name.toLowerCase()
  if (NOME_DISTANCIA.test(nome)) return 'DISTANCIA'
  if (NOME_CORPO.test(nome)) return 'CORPO'

  // O que sobra é, na maior parte, golpe de arma de quem luta de perto.
  return 'CORPO'
}
