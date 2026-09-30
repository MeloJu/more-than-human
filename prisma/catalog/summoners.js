// Kits dos três invocadores: Red, Suguru Geto e Sung Jin Woo.
//
// ATUALIZAÇÃO (29/09/2026): a batalha passou a aceitar N combatentes por lado,
// e a invocação EM CAMPO existe (ver app/lib/battle/invocacoes.ts). O Geto é o
// primeiro a usá-la — os golpes dele que chamam maldição agora trazem o efeito
// INVOCAR. Red e Sung Jin Woo continuam no modelo abaixo até o desenho de cada
// um ser confirmado. O texto a seguir descreve o modelo antigo e fica como
// registro de por que ele existiu.
//
// POR QUE EXISTE: os três entraram no elenco na passagem de classes e ficaram
// com ZERO habilidades — literalmente só ataque básico, enquanto o resto do
// elenco tem de 16 a 18. Eram os únicos personagens injogáveis do jogo.
//
// INVOCAÇÃO SEM TERCEIRO COMBATENTE. A batalha assume exatamente dois lados
// (BattleState tem player e enemy), então invocação de verdade — uma criatura
// que age sozinha — é mudança de fundo no motor. Até lá, cada invocação é uma
// habilidade que representa o que aquela criatura FAZ: dano, veneno, escudo,
// atordoamento. O nome carrega a fantasia, os efeitos carregam a mecânica.
//
// PROFUNDIDADE DESIGUAL, DE PROPÓSITO. O Red tem 12 habilidades e os outros
// dois têm 6. Não é descuido: o time do Red é a identidade dele, e cada Pokémon
// traz dois golpes com cara própria. As sombras do Sung Jin Woo e os espíritos
// do Geto fazem essencialmente uma coisa cada — dano, e no caso do Geto dano
// mais maldição. Encher os dois até 12 produziria preenchimento, que diluiria
// justamente a identidade que o escalonamento de kit existe para proteger.
//
// O time do Red libera POR POKÉMON, não por golpe solto: os dois golpes de um
// Pokémon chegam juntos, então subir de nível parece capturar um companheiro
// novo em vez de ganhar um botão. Rayquaza fecha no 16, que é o topo alcançável
// com a história recurvada (termina no nível 14) mais algum treino.
//
// ESCALA: todos são assinatura de um dono só, então a regra de
// prisma/catalog/skill-scaling.js os faz escalar da classe — INVOCADOR escala
// de ENERGIA. Não é preciso declarar nada aqui.
//
// PICO E VALE: o invocador NÃO segue a curva das outras classes. Os golpes
// grandes custam mais e ficam mais tempo em cooldown, e os baratos do nível 1
// são o turno em que não há invocação em campo.
//
// Isso existe porque a fantasia do invocador é o poder estar FORA dele, e
// poder ser tirado. A versão fiel disso — a sombra morre e é preciso gastar
// um turno chamando de novo — precisa de estado que o motor não tem:
// BattleState guarda dois combatentes e uma lista de efeitos, e não há onde
// escrever "Igris está fora". Cooldown longo já é essa ausência, escrita com
// o que existe: Igris com cooldown 4 É Igris fora por quatro rodadas.
//
// Há um segundo motivo para não fazer a versão fiel agora, e ele é de jogo:
// perder um turno re-invocando é uma troca de TEMPO, e só vale contra quem
// sabe explorar a janela. pickAiSkill escolhe sempre a de maior poder e não
// faz ideia de que o jogador ficou sem invocação — então contra a IA a
// mecânica seria imposto puro. Ela brilha em PvP, ou depois que a IA souber
// jogar tempo.
//
// O resto segue a curva das escadas de afiliação para que o balanceamento
// continue comparável: energia de 9 a 40, cooldown de 1 a 6.

/** Red — cada Pokémon do time traz dois golpes, liberados juntos. */
const red = {
  character: 'Red',
  skills: [
    // Pikachu — o companheiro de sempre, disponível desde o começo.
    {
      name: 'Pikachu: Choque do Trovão',
      category: 'OTHER',
      power: 10,
      energyCost: 10,
      cooldown: 1,
      tags: ['pokemon', 'eletrico'],
      effects: [],
      level: 1,
    },
    {
      name: 'Pikachu: Investida Trovão',
      category: 'OTHER',
      power: 16,
      energyCost: 15,
      cooldown: 2,
      tags: ['pokemon', 'eletrico', 'stun'],
      effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }],
      level: 1,
    },

    // Charizard — pressão de fogo, dano que continua depois do golpe.
    {
      name: 'Charizard: Lança-Chamas',
      category: 'OTHER',
      power: 22,
      energyCost: 20,
      cooldown: 3,
      tags: ['pokemon', 'fogo'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 6, duration: 2 }],
      level: 2,
    },
    {
      name: 'Charizard: Asa de Aço',
      category: 'OTHER',
      power: 24,
      energyCost: 21,
      cooldown: 3,
      tags: ['pokemon', 'voador'],
      effects: [],
      level: 2,
    },

    // Blastoise — o Pokémon que sustenta a linha: um golpe pesado e uma casca.
    {
      name: 'Blastoise: Hidrobomba',
      category: 'OTHER',
      power: 32,
      energyCost: 27,
      cooldown: 4,
      tags: ['pokemon', 'agua'],
      effects: [],
      level: 4,
    },
    {
      name: 'Blastoise: Retrair Casco',
      category: 'OTHER',
      power: 0,
      energyCost: 21,
      cooldown: 4,
      tags: ['pokemon', 'shield'],
      effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 34, duration: 2 }],
      level: 4,
    },

    // Venusaur — controle: enfraquece e drena em vez de explodir.
    {
      name: 'Venusaur: Bomba de Sementes',
      category: 'OTHER',
      power: 28,
      energyCost: 24,
      cooldown: 3,
      tags: ['pokemon', 'planta'],
      effects: [],
      level: 7,
    },
    {
      name: 'Venusaur: Semente Sanguessuga',
      category: 'OTHER',
      power: 8,
      energyCost: 25,
      cooldown: 4,
      tags: ['pokemon', 'planta', 'dreno'],
      effects: [
        { type: 'DOT', target: 'ENEMY', magnitude: 9, duration: 3 },
        { type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 14, duration: 2 },
      ],
      level: 7,
    },

    // Snorlax — massa e recuperação, o companheiro que aguenta o round ruim.
    {
      name: 'Snorlax: Corpo Pesado',
      category: 'OTHER',
      power: 38,
      energyCost: 30,
      cooldown: 5,
      tags: ['pokemon', 'normal'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 16, duration: 2 }],
      level: 10,
    },
    {
      name: 'Snorlax: Descanso',
      category: 'OTHER',
      power: 0,
      energyCost: 27,
      cooldown: 5,
      tags: ['pokemon', 'cura'],
      effects: [{ type: 'HEAL', target: 'SELF', magnitude: 36 }],
      level: 10,
    },

    // Mega Rayquaza shiny — o fecho do time, e o golpe mais caro do jogo dele.
    {
      name: 'Mega Rayquaza: Ascensão do Dragão',
      category: 'OTHER',
      power: 44,
      energyCost: 35,
      cooldown: 5,
      tags: ['pokemon', 'dragao', 'lendario'],
      effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 22, duration: 2 }],
      level: 14,
    },
    {
      name: 'Mega Rayquaza: Fúria do Céu Partido',
      category: 'OTHER',
      power: 52,
      energyCost: 40,
      cooldown: 6,
      tags: ['pokemon', 'dragao', 'lendario', 'ultimate'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 24, duration: 2 }],
      level: 14,
    },
  ],
};

/**
 * Suguru Geto — manipulação de espíritos amaldiçoados.
 *
 * A assinatura dele é MALDIÇÃO, não dano bruto: quase todo golpe deixa algo
 * apodrecendo depois. É também o que apresenta o vocabulário de Jujutsu Kaisen
 * ao jogo, para quando o arco de história desse universo entrar.
 *
 * EM CAMPO (desenho aprovado em 29/09/2026, inspirado na Syndra):
 * - as maldições ficam em campo, até três, e atacam sozinhas;
 * - o Dragão Arco-Íris é a guardiã: recebe no lugar dele os golpes de alvo
 *   único (área passa por cima);
 * - o Uzumaki consome TODAS as maldições em campo, cada uma somando poder, e
 *   quem ficar abaixo de 15% da vida cai na hora — chefe não, contra ele fica
 *   o dano extra do EXECUTE.
 *
 * `substituirEfeitos` nos golpes que mudaram de natureza: sem ele o sync
 * preservaria o dano contínuo antigo junto do INVOCAR.
 */
const geto = {
  character: 'Suguru Geto',
  skills: [
    {
      name: 'Espírito Amaldiçoado Menor',
      category: 'OTHER',
      power: 0,
      energyCost: 10,
      cooldown: 1,
      tags: ['maldicao'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'maldicao-menor' }],
      substituirEfeitos: true,
      level: 1,
    },
    {
      name: 'Corrosão Amaldiçoada',
      category: 'OTHER',
      power: 6,
      energyCost: 14,
      cooldown: 2,
      tags: ['maldicao', 'veneno'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 3 }],
      level: 1,
    },
    {
      name: 'Invocação em Massa',
      category: 'OTHER',
      power: 0,
      energyCost: 22,
      cooldown: 3,
      tags: ['maldicao'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 2, invocacao: 'maldicao-menor' }],
      substituirEfeitos: true,
      level: 2,
    },
    {
      name: 'Deterioração Progressiva',
      category: 'OTHER',
      power: 4,
      energyCost: 25,
      cooldown: 4,
      tags: ['maldicao', 'debuff'],
      effects: [
        { type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 20, duration: 3 },
        { type: 'DOT', target: 'ENEMY', magnitude: 7, duration: 3 },
      ],
      level: 6,
    },
    {
      name: 'Uzumaki: Redemoinho de Maldições',
      category: 'OTHER',
      power: 30,
      energyCost: 33,
      cooldown: 5,
      tags: ['maldicao'],
      effects: [
        { type: 'CONSUMIR', target: 'SELF', magnitude: 16, grupo: 'maldicao' },
        { type: 'EXECUTE', target: 'SELF', magnitude: 40 },
        { type: 'ABATE', target: 'SELF', magnitude: 15 },
      ],
      substituirEfeitos: true,
      level: 10,
    },
    {
      name: 'Dragão Arco-Íris',
      category: 'OTHER',
      power: 0,
      energyCost: 38,
      cooldown: 6,
      tags: ['maldicao', 'ultimate'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'dragao-arco-iris' }],
      substituirEfeitos: true,
      level: 14,
    },
  ],
};

/**
 * Sung Jin Woo — o exército das sombras.
 *
 * Cada sombra é dano, com uma exceção de sustentação (Tank). É o invocador mais
 * direto dos três de propósito: a fantasia dele é quantidade e avanço, não
 * controle.
 */
const sungJinWoo = {
  character: 'Sung Jin Woo',
  skills: [
    {
      name: 'Erguer: Soldado das Sombras',
      category: 'OTHER',
      power: 0,
      energyCost: 10,
      cooldown: 1,
      tags: ['sombra'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'soldado-sombra' }],
      substituirEfeitos: true,
      level: 1,
    },
    {
      name: 'Adaga do Monarca',
      category: 'OTHER',
      power: 15,
      energyCost: 13,
      cooldown: 1,
      tags: ['sombra', 'sangramento'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 5, duration: 2 }],
      level: 1,
    },
    {
      name: 'Igris, Cavaleiro de Sangue',
      category: 'OTHER',
      power: 0,
      energyCost: 26,
      cooldown: 4,
      tags: ['sombra'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'igris' }],
      substituirEfeitos: true,
      level: 2,
    },
    {
      name: 'Tank, Muralha de Ossos',
      category: 'OTHER',
      power: 0,
      energyCost: 22,
      cooldown: 4,
      tags: ['sombra'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'tank' }],
      substituirEfeitos: true,
      level: 6,
    },
    {
      name: 'Beru, Formiga-Rei',
      category: 'OTHER',
      power: 0,
      energyCost: 34,
      cooldown: 5,
      tags: ['sombra'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'beru' }],
      substituirEfeitos: true,
      level: 10,
    },
    {
      name: 'Exército das Sombras',
      category: 'OTHER',
      power: 50,
      energyCost: 40,
      cooldown: 6,
      tags: ['sombra', 'ultimate'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 22, duration: 2 }],
      level: 14,
    },
  ],
};

const summoners = [red, geto, sungJinWoo];

module.exports = { summoners };
