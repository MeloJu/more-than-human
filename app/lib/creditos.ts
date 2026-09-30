/**
 * Créditos de propriedade intelectual, por franquia.
 *
 * POR QUE ESTE ARQUIVO EXISTE. O jogo usa personagens de obras que têm dono —
 * e, a partir de agora, também arte deles. A decisão de usar foi do dono do
 * projeto, tomada com o risco explicitado: projeto educativo, sem fim
 * comercial, com crédito visível. Este arquivo é a metade "crédito visível"
 * dessa decisão, e é o que a página /creditos e o rodapé leem.
 *
 * NENHUM PERSONAGEM É DO PROJETO. Nome, aparência e técnicas pertencem aos
 * criadores e detentores listados abaixo; aqui existe apenas uma implementação
 * de regras de jogo escrita do zero.
 *
 * A CHAVE É O SLUG DO ANIME na tabela Anime — o mesmo que characters.js usa —
 * para o crédito acompanhar automaticamente qualquer personagem novo que entre
 * numa franquia já listada, em vez de precisar de manutenção por personagem.
 */
export type Credito = {
  /** Como a obra é chamada na tela. */
  obra: string
  /** Quem criou. */
  criador: string
  /** Quem detém os direitos hoje. */
  detentor: string
}

export const CREDITOS: Record<string, Credito> = {
  naruto: {
    obra: 'Naruto',
    criador: 'Masashi Kishimoto',
    detentor: 'Shueisha / Pierrot',
  },
  bleach: {
    obra: 'Bleach',
    criador: 'Tite Kubo',
    detentor: 'Shueisha / Studio Pierrot',
  },
  'dragon-ball-z': {
    obra: 'Dragon Ball',
    criador: 'Akira Toriyama',
    detentor: 'Shueisha / Toei Animation / Bird Studio',
  },
  'jujutsu-kaisen': {
    obra: 'Jujutsu Kaisen',
    criador: 'Gege Akutami',
    detentor: 'Shueisha / MAPPA',
  },
  'solo-leveling': {
    obra: 'Solo Leveling',
    criador: 'Chugong (obra), Jang Sung-rak "DUBU" (arte)',
    detentor: 'D&C Media / Redice Studio',
  },
  pokemon: {
    obra: 'Pokémon',
    criador: 'Satoshi Tajiri e Ken Sugimori',
    detentor: 'The Pokémon Company / Nintendo / Game Freak / Creatures',
  },
  'marvel-universe': {
    obra: 'Universo Marvel',
    criador: 'Criadores creditados em cada personagem',
    detentor: 'Marvel Characters, Inc. / The Walt Disney Company',
  },
  'dc-universe': {
    obra: 'Universo DC',
    criador: 'Criadores creditados em cada personagem',
    detentor: 'DC Comics / Warner Bros. Discovery',
  },
  cartoon: {
    obra: 'Looney Tunes',
    criador: 'Criadores creditados em cada personagem',
    detentor: 'Warner Bros. Entertainment Inc.',
  },
  'sword-art-online': {
    obra: 'Sword Art Online',
    criador: 'Reki Kawahara',
    detentor: 'Reki Kawahara / KADOKAWA / SAO Project',
  },
}

/**
 * Quem aparece no jogo SEM ser personagem jogável — NPC de loja, de forja.
 * A página de créditos lê do banco os animes com personagem; estes não
 * estão lá, e sem esta lista apareceriam no jogo sem crédito.
 */
export const NPCS: { nome: string; papel: string; obra: string }[] = [
  { nome: 'Lisbeth', papel: 'a ferreira da forja', obra: 'sword-art-online' },
]

/** Aviso curto, para o rodapé de todas as páginas. */
export const AVISO_CURTO =
  'Projeto educativo, sem fins lucrativos. Personagens, nomes e arte pertencem aos seus criadores e detentores de direitos.'
