// Transformações, extraídas do seed para virarem catálogo sincronizável.
//
// POR QUE SAIU DO SEED: elas estavam embutidas em prisma/seed.js, que é
// destrutivo e só roda em banco vazio. Isso significava que ajustar uma
// transformação em produção era impossível sem apagar jogador. Como as
// próximas — sharingan, portões, selo amaldiçoado, bankai — são muitas, o
// caminho tinha que ser o mesmo dos outros catálogos.
//
// OS NÍVEIS FORAM CORTADOS PELA METADE. Os originais iam de 10 a 70, contra
// uma economia de XP que terminava no nível 14: doze das quinze eram conteúdo
// que ninguém jamais veria. É o mesmo defeito que já apareceu nas escadas de
// afiliação (iam ao 40) e nos kits de assinatura (iam ao 30).
//
// A conta que sustenta o corte: com os DOIS arcos de história, um jogador que
// termina os dois soma 18.200 XP, o que pela curva 50·L·(L−1) o põe no nível
// 19. Depois do corte, sete das quinze cabem nisso — Super Saiyan no 5, SS2 e
// Wrathful no 10, SS3 no 15, SS4 no 18. As de cima (20 a 35) seguem
// aspiracionais de propósito, e passam a ser alcançáveis conforme entrarem
// mais arcos, PvP e recompensa de batalha contra IA.
//
// A chave natural é (personagem, nome): o mesmo nome não se repete para o
// mesmo personagem, e é o que o sync usa para não duplicar.

const transformations = [
  // ---- Bleach: Bankai, Resurrección e Vollständig ----
  //
  // NENHUMA DELAS GASTA A RODADA. Super Saiyan gasta — o Goku para, grita, e
  // leva porrada enquanto isso. Bankai não: é liberado no meio da troca e o
  // golpe segue. Por isso consumesTurn é campo e não regra fixa do motor.
  //
  // O preço é ENERGIA, cobrada uma vez na ativação. Sem custo nenhum, uma
  // forma que não gasta a rodada seria ativação obrigatória logo no início e
  // deixaria de ser decisão — viraria "a partir do nível 12 você é mais
  // forte", que é aumento de atributo com um clique extra. Com custo, a
  // pergunta vira QUANDO liberar: agora, e ficar sem energia para o resto da
  // luta, ou segurar.
  //
  // Os modificadores seguem o arquétipo de cada um em vez de um valor único:
  // a Suì-Fēng ganha ataque enorme e PERDE defesa e velocidade, porque o
  // Jakuhō Raikōben é um míssil que ela mal consegue carregar; o Komamura
  // ganha defesa e perde velocidade; o Kenpachi paga com vida.

  // ---- Goku ----
  {
    character: 'Goku',
    name: 'Super Saiyan',
    levelRequirement: 5,
    attackModifier: 0.15,
    speedModifier: 0.05,
    energyModifier: -0.05,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan 2',
    levelRequirement: 10,
    attackModifier: 0.25,
    speedModifier: 0.1,
    energyModifier: -0.1,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan 3',
    levelRequirement: 15,
    attackModifier: 0.35,
    speedModifier: 0.15,
    energyModifier: -0.2,
    // Dreno é o preço da forma: ela cai sozinha quando a energia não sustenta
    // mais (ver engine.ts, tickTransformationDrain).
    drainPerTurn: 10,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan God',
    levelRequirement: 23,
    attackModifier: 0.2,
    defenseModifier: 0.2,
    speedModifier: 0.1,
    energyModifier: 0.1,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan Blue',
    levelRequirement: 28,
    attackModifier: 0.25,
    defenseModifier: 0.2,
    speedModifier: 0.15,
    energyModifier: 0.15,
    unlocksSkill: { name: 'Spirit Bomb', category: 'KI' },
  },
  {
    character: 'Goku',
    name: 'Ultra Instinct',
    levelRequirement: 35,
    defenseModifier: 0.25,
    speedModifier: 0.3,
    triggerType: 'LOW_HP',
    triggerPayload: { threshold: 0.35 },
  },

  // ---- Vegeta ----
  {
    character: 'Vegeta',
    name: 'Super Saiyan',
    levelRequirement: 5,
    attackModifier: 0.14,
    speedModifier: 0.04,
    energyModifier: -0.05,
  },
  {
    character: 'Vegeta',
    name: 'Super Saiyan 2',
    levelRequirement: 10,
    attackModifier: 0.24,
    speedModifier: 0.08,
    energyModifier: -0.1,
  },
  {
    character: 'Vegeta',
    name: 'Super Saiyan 4',
    levelRequirement: 18,
    attackModifier: 0.32,
    defenseModifier: 0.1,
    speedModifier: 0.12,
    energyModifier: -0.15,
  },
  {
    character: 'Vegeta',
    name: 'Super Saiyan God',
    levelRequirement: 23,
    attackModifier: 0.22,
    defenseModifier: 0.18,
    speedModifier: 0.1,
    energyModifier: 0.1,
  },
  {
    character: 'Vegeta',
    name: 'Super Saiyan Blue',
    levelRequirement: 28,
    attackModifier: 0.27,
    defenseModifier: 0.2,
    speedModifier: 0.12,
    energyModifier: 0.12,
    unlocksSkill: { name: 'Final Flash', category: 'KI' },
  },
  {
    character: 'Vegeta',
    name: 'Ultra Ego',
    levelRequirement: 33,
    attackModifier: 0.35,
    defenseModifier: 0.05,
    energyModifier: 0.2,
    triggerType: 'ON_DAMAGE_TAKEN',
    triggerPayload: { stacks: 3, bonusPerStack: 0.05 },
    drainPerTurn: 5,
  },

  // ---- Broly ----
  {
    character: 'Broly',
    name: 'Wrathful',
    levelRequirement: 10,
    attackModifier: 0.2,
    defenseModifier: 0.1,
    triggerType: 'ON_DAMAGE_TAKEN',
  },
  {
    character: 'Broly',
    name: 'Legendary Super Saiyan',
    levelRequirement: 20,
    attackModifier: 0.4,
    defenseModifier: 0.2,
    speedModifier: 0.1,
    energyModifier: -0.1,
    drainPerTurn: 8,
  },
  {
    character: 'Broly',
    name: 'Full Power',
    levelRequirement: 28,
    attackModifier: 0.5,
    defenseModifier: 0.25,
    speedModifier: 0.15,
    triggerType: 'LOW_HP',
    triggerPayload: { threshold: 0.3 },
  },
  {
    character: "Ichigo Kurosaki",
    name: "Bankai: Tensa Zangetsu",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 34,
    attackModifier: 0.26,
    defenseModifier: 0.05,
    speedModifier: 0.22,
  },
  {
    character: "Rukia Kuchiki",
    name: "Bankai: Hakka no Togame",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 38,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.14,
    energyModifier: 0.05,
    drainPerTurn: 4,
  },
  {
    character: "Byakuya Kuchiki",
    name: "Bankai: Senbonzakura Kageyoshi",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.28,
    defenseModifier: 0.04,
    speedModifier: 0.18,
  },
  {
    character: "Renji Abarai",
    name: "Bankai: Hihiō Zabimaru",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 33,
    attackModifier: 0.27,
    defenseModifier: 0.1,
    speedModifier: 0.06,
  },
  {
    character: "Toshiro Hitsugaya",
    name: "Bankai: Daiguren Hyōrinmaru",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.22,
    defenseModifier: 0.12,
    speedModifier: 0.2,
    drainPerTurn: 3,
  },
  {
    character: "Kenpachi Zaraki",
    name: "Bankai: Nozarashi",
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 40,
    attackModifier: 0.38,
    defenseModifier: -0.08,
    speedModifier: 0.1,
    drainHpPerTurn: 3,
  },
  {
    character: "Mayuri Kurotsuchi",
    name: "Bankai: Konjiki Ashisogi Jizō",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 37,
    attackModifier: 0.24,
    defenseModifier: 0.06,
    speedModifier: 0.08,
    energyModifier: 0.1,
  },
  {
    character: "Retsu Unohana",
    name: "Bankai: Minazuki",
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 38,
    attackModifier: 0.26,
    defenseModifier: 0.1,
    speedModifier: 0.08,
    drainHpPerTurn: 2,
  },
  {
    character: "Yamamoto Genryūsai",
    name: "Bankai: Zanka no Tachi",
    levelRequirement: 17,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 42,
    attackModifier: 0.34,
    defenseModifier: 0.06,
    speedModifier: 0.08,
    drainPerTurn: 5,
    drainHpPerTurn: 3,
  },
  {
    character: "Shunsui Kyōraku",
    name: "Bankai: Katen Kyōkotsu",
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 39,
    attackModifier: 0.25,
    defenseModifier: 0.05,
    speedModifier: 0.12,
    energyModifier: 0.08,
    drainHpPerTurn: 2,
  },
  {
    character: "Suì-Fēng",
    name: "Bankai: Jakuhō Raikōben",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 40,
    attackModifier: 0.4,
    defenseModifier: -0.1,
    speedModifier: -0.06,
  },
  {
    character: "Sajin Komamura",
    name: "Bankai: Kokujō Tengen Myō'ō",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.24,
    defenseModifier: 0.18,
    speedModifier: -0.04,
  },
  {
    character: "Gin Ichimaru",
    name: "Bankai: Kamishini no Yari",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.3,
    defenseModifier: 0.02,
    speedModifier: 0.2,
  },
  {
    character: "Kisuke Urahara",
    name: "Bankai: Kannonbiraki Benihime",
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 38,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.12,
    energyModifier: 0.08,
  },
  {
    character: "Kaname Tosen",
    name: "Bankai: Enma Kōrogi",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.22,
    defenseModifier: 0.06,
    speedModifier: 0.22,
  },
  {
    character: "Izuru Kira",
    name: "Bankai: Shinken Hakkyōken",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 34,
    attackModifier: 0.26,
    defenseModifier: 0.06,
    speedModifier: 0.1,
  },
  {
    character: "Momo Hinamori",
    name: "Bankai: Tobiume Kaika",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.24,
    defenseModifier: 0.04,
    speedModifier: 0.1,
    energyModifier: 0.1,
  },
  {
    character: "Rangiku Matsumoto",
    name: "Bankai: Haineko Kaijin",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.24,
    defenseModifier: 0.06,
    speedModifier: 0.12,
    energyModifier: 0.06,
  },
  {
    character: "Jūshirō Ukitake",
    name: "Bankai: Sōgyo no Kotowari",
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 37,
    attackModifier: 0.22,
    defenseModifier: 0.14,
    speedModifier: 0.08,
    energyModifier: 0.06,
  },
  {
    character: "Ulquiorra Cifer",
    name: "Resurrección: Murciélago",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.3,
    defenseModifier: 0.12,
    speedModifier: 0.14,
  },
  {
    character: "Grimmjow Jaegerjaquez",
    name: "Resurrección: Pantera",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 33,
    attackModifier: 0.32,
    defenseModifier: 0.04,
    speedModifier: 0.18,
  },
  {
    character: "Tia Harribel",
    name: "Resurrección: Tiburón",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.24,
    defenseModifier: 0.16,
    speedModifier: 0.1,
  },
  {
    character: "Coyote Starrk",
    name: "Resurrección: Los Lobos",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.26,
    defenseModifier: 0.06,
    speedModifier: 0.2,
  },
  {
    character: "Baraggan Luisenbarn",
    name: "Resurrección: Arrogante",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 38,
    attackModifier: 0.26,
    defenseModifier: 0.2,
    speedModifier: -0.08,
  },
  {
    character: "Nnoitra Gilga",
    name: "Resurrección: Santa Teresa",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 33,
    attackModifier: 0.34,
    defenseModifier: 0.1,
    speedModifier: 0.04,
  },
  {
    character: "Zommari Rureaux",
    name: "Resurrección: Brujería",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 33,
    attackModifier: 0.22,
    defenseModifier: 0.08,
    speedModifier: 0.24,
  },
  {
    character: "Aaroniero Arruruerie",
    name: "Resurrección: Glotonería",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 34,
    attackModifier: 0.24,
    defenseModifier: 0.16,
    speedModifier: 0.02,
  },
  {
    character: "Yammy Llargo",
    name: "Resurrección: Ira",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.3,
    defenseModifier: 0.22,
    speedModifier: -0.1,
  },
  {
    character: "Szayelaporro Granz",
    name: "Resurrección: Fornicarás",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.22,
    defenseModifier: 0.08,
    speedModifier: 0.1,
    energyModifier: 0.12,
  },
  {
    character: "Uryu Ishida",
    name: "Vollständig: Antthesis",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 36,
    attackModifier: 0.26,
    defenseModifier: 0.14,
    speedModifier: 0.16,
  },
  {
    character: "Bazz-B",
    name: "Vollständig: The Heat",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.32,
    defenseModifier: 0.04,
    speedModifier: 0.14,
    drainHpPerTurn: 2,
  },
  {
    character: "As Nödt",
    name: "Vollständig: The Fear",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 35,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.22,
  },
  {
    character: "Yhwach",
    name: "O Almighty",
    levelRequirement: 18,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 44,
    attackModifier: 0.36,
    defenseModifier: 0.16,
    speedModifier: 0.16,
    energyModifier: 0.1,
  },
  {
    character: "Ryuken Ishida",
    name: "Quincy: Letzt Stil",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 34,
    attackModifier: 0.28,
    defenseModifier: 0.06,
    speedModifier: 0.12,
  },
  {
    character: "Ichigo Kurosaki",
    name: "Máscara Hollow",
    levelRequirement: 6,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 20,
    attackModifier: 0.2,
    speedModifier: 0.16,
    drainPerTurn: 4,
  },
  {
    character: "Chad",
    name: "Brazo Derecha del Gigante",
    levelRequirement: 10,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 26,
    attackModifier: 0.26,
    defenseModifier: 0.14,
    speedModifier: -0.04,
  },
  {
    character: "Yoruichi Shihoin",
    name: "Shunkō",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 30,
    attackModifier: 0.2,
    defenseModifier: 0.04,
    speedModifier: 0.3,
    drainPerTurn: 3,
  },
  {
    character: "Sosuke Aizen",
    name: "Hōgyoku: Fusão",
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada, mas cobra energia.
    consumesTurn: false,
    activationCost: 40,
    attackModifier: 0.3,
    defenseModifier: 0.18,
    speedModifier: 0.12,
    energyModifier: 0.1,
  },

  // ---- Cartoon: crossover goofy ----
  //
  // GASTA A RODADA de propósito, diferente do Bankai/Resurrección acima —
  // ele PARA a luta pra trocar de roupa, e isso é a piada: um momento cômico
  // de vulnerabilidade antes do poder chegar, igual o Super Saiyan do Goku.
  {
    character: 'Patolino',
    name: 'Calça Nova da Loja: O Mago',
    levelRequirement: 5,
    attackModifier: 0.15,
    energyModifier: 0.15,
    defenseModifier: -0.05,
    unlocksSkill: { name: 'Feitiço da Fúria Emplumada', category: 'OTHER' },
  },
];

// ---- Preço de toda forma: ativar e manter, em energia e stamina ----
//
// POR QUE EXISTE. Antes só dez das cinquenta e cinco formas tinham
// manutenção, e Super Saiyan e as automáticas não cobravam nem a ativação.
// Transformar era só ganho, e a reserva nunca acabava numa luta: em cem
// lutas simuladas o Ichigo nunca desceu de 61% de energia. Com isso, treinar
// energia ou stamina não valia nada, e a forma não era uma decisão — era
// "ligue assim que puder".
//
// Agora toda forma cobra as quatro coisas, e o dono do projeto pediu as duas
// reservas de propósito: a forma disputa energia com os golpes e stamina com
// a guarda. Quanto mais tempo transformado, menos sobra para o resto — e
// quem treinou a reserva sustenta a forma por mais tempo.
//
// UMA REGRA SÓ, e não um número por forma. O preço sai da FORÇA da forma, a
// soma dos ganhos percentuais dela; as PERDAS entram subtraindo, porque a
// Suì-Fēng que troca defesa por ataque já está pagando com o corpo. Assim
// forma nova ganha preço coerente sem ninguém precisar inventar um número.
//
// O que o catálogo já dizia CONTINUA VALENDO como piso, e não é
// sobrescrito: o custo de ativação do Bankai, e o dreno pesado do Super
// Saiyan 3 e do Lendário, que são o tema daquelas formas.
//
// O PREÇO ACOMPANHA O NÍVEL DA FORMA. A primeira versão cobrava números
// fixos pequenos (6 de energia por rodada num Bankai) e a simulação mostrou
// que não mudava nada: a reserva cresce com o nível, e no nível 13 o Ichigo
// tem 242 de energia e recupera 19 por rodada. Então o preço é uma fração da
// reserva e da regeneração de um personagem MÉDIO no nível em que a forma
// libera. A regra mede contra a média, e não contra a reserva de quem usa,
// de propósito: quem treinou energia ou stamina tem reserva acima da média e
// sustenta a forma por mais tempo — é isso que faz o treino valer.

/** Reserva média de energia e stamina no nível 1 (média dos 52 personagens). */
const ENERGIA_MEDIA = 123;
const STAMINA_MEDIA = 107;
/**
 * Espelhos de LEVEL_SCALING, ENERGY_REGEN_PCT e STAMINA_REGEN_PCT
 * (app/lib/battle/constants.ts). O catálogo é CommonJS e não importa o
 * TypeScript; mudou lá, muda aqui.
 */
const ESCALA_POR_NIVEL = 0.12;
const REGEN_ENERGIA = 0.08;
const REGEN_STAMINA = 0.05;

/** Ativação: fração da reserva média, por ponto de força. */
const ATIVACAO_ENERGIA = 0.25;
const ATIVACAO_STAMINA = 0.2;
/**
 * Manutenção: fração da regeneração média por rodada, por ponto de força.
 *
 * O PESO ESTÁ NA STAMINA, e isso saiu da simulação. Com a energia pesada
 * (1,5 da regeneração), o Lendário do Broly e o SSJ3 ficaram PIORES que lutar
 * sem forma: a manutenção comia a energia que o kit de ki precisa para
 * existir. E com a stamina leve, ela nunca acabava e treiná-la seguia
 * valendo zero. Invertendo — a forma pesa na stamina e belisca a energia —,
 * medido contra o mesmo personagem um nível acima:
 *
 *                   sem forma   preço antigo   preço novo   +5 stamina
 *   Ichigo Bankai       2%          23%            8%          12%
 *   Goku SSJ2           9%          54%           46%          54%
 *   Broly Lendário     24%          38%           37%          38%
 *
 * A forma continua valendo muito, mas passou a ter PRAZO: o Bankai do Ichigo
 * cai por volta da 11ª rodada, e 5 pontos de stamina o seguram até a 17ª.
 * Stamina virou treino de quem depende de forma; energia, de quem depende
 * de ki (o Broly ganha 14 pontos com +5 de energia).
 */
const MANUTENCAO_ENERGIA = 0.5;
const MANUTENCAO_STAMINA = 4.0;
/** Piso da força, para forma quase só de troca não sair de graça. */
const FORCA_MINIMA = 0.1;

function forcaDaForma(def) {
  const soma =
    (def.attackModifier ?? 0) +
    (def.defenseModifier ?? 0) +
    (def.speedModifier ?? 0) +
    Math.max(0, def.energyModifier ?? 0);
  return Math.max(FORCA_MINIMA, soma);
}

function precoDaForma(def) {
  const forca = forcaDaForma(def);
  const escala = 1 + ESCALA_POR_NIVEL * (def.levelRequirement - 1);
  const energia = ENERGIA_MEDIA * escala;
  const stamina = STAMINA_MEDIA * escala;
  return {
    activationCost: Math.max(def.activationCost ?? 0, Math.round(forca * ATIVACAO_ENERGIA * energia)),
    activationStaminaCost: Math.round(forca * ATIVACAO_STAMINA * stamina),
    drainPerTurn: Math.max(def.drainPerTurn ?? 0, Math.round(forca * MANUTENCAO_ENERGIA * REGEN_ENERGIA * energia)),
    drainStaminaPerTurn: Math.max(1, Math.round(forca * MANUTENCAO_STAMINA * REGEN_STAMINA * stamina)),
  };
}

module.exports = {
  transformations: transformations.map((def) => ({ ...def, ...precoDaForma(def) })),
  precoDaForma,
};
