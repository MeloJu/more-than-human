/**
 * As raids: arcos temáticos em andares, com monstros menores no caminho e um
 * chefe no fim.
 *
 * MORA EM CÓDIGO, NÃO NO BANCO. Uma raid é roteiro — a ordem dos andares, quem
 * aparece em cada um, o nome do lugar — e muda junto com o código que a
 * encena. No banco ela exigiria sync de catálogo para cada ajuste de roteiro
 * sem ganhar nada: nenhum jogador edita raid. O banco guarda só a INCURSÃO
 * (RaidRun), que referencia a raid pelo slug.
 *
 * Os inimigos são referenciados pelo NOME do catálogo (Monster.name e
 * Character.name), os mesmos nomes que o seed e o sync usam.
 */

import type { PerfilDeChefe } from '@/app/lib/battle/ai'

export type InimigoDoAndar =
  | {
      monstro: string
      /**
       * O nível do monstro é do ANDAR, fixo, e não acompanha o do jogador.
       * A raid avulsa por tier já tinha medido isso: se os dois lados crescem
       * pela mesma escala, a razão entre eles nunca muda e subir de nível
       * deixa de aproximar alguém da vitória. Fixo, o andar é uma escada.
       *
       * E o nível existe porque, com a força crua do catálogo, os quatro
       * andares antes do chefe não arranhavam uma party de nível 10: medido
       * com parties sorteadas do elenco, nenhuma caía antes da torre, e a
       * raid virava quatro lutas de graça e um chefe. Com nível, eles
       * desgastam, e é esse desgaste que o chefe cobra.
       */
      nivel: number
    }
  | {
      personagem: string
      /** Nível com que entra: decide stats, golpes e formas liberadas. */
      nivel: number
      /**
       * Quantas vezes a vida do personagem nesse nível. O chefe enfrenta a
       * party inteira: com a vida de um lutador comum, cairia em duas rodadas.
       */
      vidaDeChefe?: number
      /** As particularidades de chefe — ver PerfilDeChefe. */
      perfil?: PerfilDeChefe
      /** O que ele diz na virada para a fase 2. Nunca cita o personagem de quem joga. */
      falaDaFaseDois?: string
      /** O que ele diz na tela de versus, antes da luta. Mesma regra da fase 2. */
      falaDeEntrada?: string
    }

export type Andar = {
  nome: string
  /** Uma linha do que se vê ao chegar. */
  descricao: string
  /** O primeiro é o principal: a carta grande da tela. */
  inimigos: InimigoDoAndar[]
  chefe?: boolean
}

export type Raid = {
  slug: string
  nome: string
  descricao: string
  /** Abaixo disso a raid não abre: é guarda-corpo, não ajuste fino. */
  nivelMinimo: number
  andares: Andar[]
}

export const RAIDS: Raid[] = [
  {
    slug: 'las-noches',
    nome: 'Las Noches',
    descricao:
      'A fortaleza de Aizen no deserto de Hueco Mundo. Hollows no caminho, Menos na floresta de cristal, e a Sexta Espada esperando na torre.',
    // META DO DONO DO PROJETO: nunca 100% antes do nível 20. Medido com
    // parties de três sorteadas do elenco, a IA jogando por todos (o Grimmjow
    // pelo perfil de chefe) e a vida passando de andar em andar:
    //
    //   nível   12    14    16    18    19    20
    //   vence  12%   52%   86%   90%   92%  100%
    //
    // Quase tudo que perde, perde no Grimmjow: chega machucado. A luta com
    // ele dura de 11 a 16 rodadas. No nível 10 ninguém vencia, por isso a
    // entrada é no 12. Quem lê o aviso e escolhe a postura certa vai melhor
    // que a IA, então na mão o número é maior.
    nivelMinimo: 12,
    andares: [
      {
        nome: 'Deserto de Hueco Mundo',
        descricao: 'Areia branca, lua parada. Três Hollows farejam a party antes de ela ver a fortaleza.',
        inimigos: [{ monstro: 'Hollow', nivel: 11 }, { monstro: 'Hollow', nivel: 11 }, { monstro: 'Hollow', nivel: 11 }],
      },
      {
        nome: 'Floresta de Menos',
        descricao: 'Árvores de quartzo sob a areia. Um Menos Grande se ergue, e um Hollow vem atrás dele.',
        inimigos: [{ monstro: 'Menos Grande', nivel: 11 }, { monstro: 'Hollow', nivel: 11 }],
      },
      {
        nome: 'Corredores de Las Noches',
        descricao: 'Dentro da fortaleza, o céu é pintado. Dois Adjuchas guardam o caminho.',
        inimigos: [{ monstro: 'Adjuchas', nivel: 11 }, { monstro: 'Adjuchas', nivel: 11 }],
      },
      {
        nome: 'Portão da Sexta Torre',
        descricao: 'Um Vasto Lorde guarda a torre. Quase um Espada.',
        inimigos: [{ monstro: 'Vasto Lorde', nivel: 12 }],
      },
      {
        nome: 'Sexta Torre',
        descricao: 'Grimmjow Jaegerjaquez, a Sexta Espada. Ele estava esperando alguém que valesse a pena.',
        // Nível 18: acima de quem entra, e acima da Pantera (12), que é a
        // fase 2 dele. É o chefe que segura a raid até perto do nível 20.
        inimigos: [
          {
            personagem: 'Grimmjow Jaegerjaquez',
            nivel: 18,
            // x3,5 e não x2: com o perfil de chefe ele ficou MAIS FÁCIL (75% de
            // vitória no nível 10 com x2). Ele gasta rodadas carregando, fica
            // exposto depois, e só solta a Pantera na metade — antes liberava
            // no começo e lutava transformado a luta inteira.
            vidaDeChefe: 3.5,
            // Estilo souls, confirmado com o dono do projeto: persegue quem
            // mais bate, anuncia o Gran Rey Cero (e fica exposto depois), e
            // solta a Pantera na metade da vida — quando o Desgarrón passa a
            // preparar o Cero.
            perfil: {
              predador: true,
              golpeCarregado: 'Gran Rey Cero',
              faseDois: { vida: 0.5, forma: 'Resurrección: Pantera' },
            },
            falaDaFaseDois: 'Kishire, Pantera!',
            // A fala do protótipo aprovado no canvas da raid.
            falaDeEntrada: 'Vieram em bando? Melhor. Assim a caçada não acaba rápido.',
          },
        ],
        chefe: true,
      },
    ],
  },
]

export function raidPorSlug(slug: string): Raid | undefined {
  return RAIDS.find((r) => r.slug === slug)
}
