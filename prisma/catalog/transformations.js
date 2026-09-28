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
  // Toda forma tem preço, e ele sai de uma regra só (precoDaForma, no fim do
  // arquivo). Sem custo nenhum, uma forma que não gasta a rodada seria
  // ativação obrigatória logo no início e deixaria de ser decisão — viraria
  // "a partir do nível 12 você é mais forte", que é aumento de atributo com
  // um clique extra.
  //
  // Os modificadores seguem o arquétipo de cada um em vez de um valor único:
  // a Suì-Fēng ganha ataque enorme e PERDE defesa e velocidade, porque o
  // Jakuhō Raikōben é um míssil que ela mal consegue carregar; o Komamura
  // ganha defesa e perde velocidade; o Kenpachi paga com vida.

  // ---- Goku ----
  //
  // SUPER SAIYAN E SUPER SAIYAN 2 NÃO CORTAM A ENERGIA. Cortavam 5% e 10%, e
  // o kit de ki escala da energia máxima: a forma enfraquecia justamente os
  // golpes principais. Medido, o SSJ do Goku valia −12 pontos de vitória. O
  // dono do projeto pediu que o SSJ2 custe menos que o SSJ3; sem o corte, o
  // SSJ2 vale +38 (Goku) e +26 (Vegeta), e o SSJ3 fica como a forma cara: o
  // único a cortar energia (−20%), e a que mais cobra para manter. Os três
  // continuam gastando a rodada — o Saiyajin para e grita.
  {
    character: 'Goku',
    name: 'Super Saiyan',
    levelRequirement: 5,
    attackModifier: 0.15,
    speedModifier: 0.05,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan 2',
    levelRequirement: 10,
    attackModifier: 0.25,
    speedModifier: 0.1,
  },
  {
    character: 'Goku',
    name: 'Super Saiyan 3',
    levelRequirement: 15,
    attackModifier: 0.35,
    speedModifier: 0.15,
    energyModifier: -0.2,
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
    golpes: [{ name: "Spirit Bomb", category: 'KI' }],
    levelRequirement: 28,
    attackModifier: 0.25,
    defenseModifier: 0.2,
    speedModifier: 0.15,
    energyModifier: 0.15,
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
  },
  {
    character: 'Vegeta',
    name: 'Super Saiyan 2',
    levelRequirement: 10,
    attackModifier: 0.24,
    speedModifier: 0.08,
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
    golpes: [{ name: "Final Flash", category: 'KI' }],
    levelRequirement: 28,
    attackModifier: 0.27,
    defenseModifier: 0.2,
    speedModifier: 0.12,
    energyModifier: 0.12,
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
    golpes: [{ name: "Tensa Zangetsu: Final Getsuga", category: 'OTHER' }],
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.05,
    speedModifier: 0.22,
  },
  {
    character: "Rukia Kuchiki",
    name: "Bankai: Hakka no Togame",
    golpes: [{ name: "Hakka no Togame", category: 'OTHER' }],
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.14,
    energyModifier: 0.05,
  },
  {
    character: "Byakuya Kuchiki",
    name: "Bankai: Senbonzakura Kageyoshi",
    golpes: [{ name: "Senbonzakura Kageyoshi", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.28,
    defenseModifier: 0.04,
    speedModifier: 0.18,
  },
  {
    character: "Renji Abarai",
    name: "Bankai: Hihiō Zabimaru",
    golpes: [{ name: "Hihio Zabimaru", category: 'OTHER' }],
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.27,
    defenseModifier: 0.1,
    speedModifier: 0.06,
  },
  {
    character: "Toshiro Hitsugaya",
    name: "Bankai: Daiguren Hyōrinmaru",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.22,
    defenseModifier: 0.12,
    speedModifier: 0.2,
  },
  {
    character: "Kenpachi Zaraki",
    name: "Bankai: Nozarashi",
    golpes: [{ name: "Nozarashi", category: 'OTHER' }],
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.38,
    defenseModifier: -0.08,
    speedModifier: 0.1,
    drainHpPerTurn: 3,
  },
  {
    character: "Mayuri Kurotsuchi",
    name: "Bankai: Konjiki Ashisogi Jizō",
    golpes: [{ name: "Konjiki Ashisogi Jizō", category: 'OTHER' }],
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.06,
    speedModifier: 0.08,
    energyModifier: 0.1,
  },
  {
    character: "Retsu Unohana",
    name: "Bankai: Minazuki",
    golpes: [{ name: "Minazuki: Verdadeira Forma", category: 'OTHER' }],
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.1,
    speedModifier: 0.08,
    drainHpPerTurn: 2,
  },
  {
    character: "Yamamoto Genryūsai",
    name: "Bankai: Zanka no Tachi",
    golpes: [{ name: "Zanka no Tachi: Cremation", category: 'OTHER' }],
    levelRequirement: 17,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.34,
    defenseModifier: 0.06,
    speedModifier: 0.08,
    drainHpPerTurn: 3,
  },
  {
    character: "Shunsui Kyōraku",
    name: "Bankai: Katen Kyōkotsu",
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
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
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.4,
    defenseModifier: -0.1,
    speedModifier: -0.06,
  },
  {
    character: "Sajin Komamura",
    name: "Bankai: Kokujō Tengen Myō'ō",
    golpes: [{ name: "Kokujō Tengen Myōō", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.18,
    speedModifier: -0.04,
  },
  {
    character: "Gin Ichimaru",
    name: "Bankai: Kamishini no Yari",
    golpes: [{ name: "Kamishini no Yari", category: 'OTHER' }],
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.3,
    defenseModifier: 0.02,
    speedModifier: 0.2,
  },
  {
    character: "Kisuke Urahara",
    name: "Bankai: Kannonbiraki Benihime",
    golpes: [{ name: "Kannonbiraki Benihime Aratame", category: 'OTHER' }],
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.12,
    energyModifier: 0.08,
  },
  {
    character: "Kaname Tosen",
    name: "Bankai: Enma Kōrogi",
    golpes: [{ name: "Suzumushi Tsuishiki: Enma Kōrogi", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.22,
    defenseModifier: 0.06,
    speedModifier: 0.22,
  },
  {
    character: "Izuru Kira",
    name: "Bankai: Shinken Hakkyōken",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.06,
    speedModifier: 0.1,
  },
  {
    character: "Momo Hinamori",
    name: "Bankai: Tobiume Kaika",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.04,
    speedModifier: 0.1,
    energyModifier: 0.1,
  },
  {
    character: "Rangiku Matsumoto",
    name: "Bankai: Haineko Kaijin",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.06,
    speedModifier: 0.12,
    energyModifier: 0.06,
  },
  {
    character: "Jūshirō Ukitake",
    name: "Bankai: Sōgyo no Kotowari",
    levelRequirement: 15,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.22,
    defenseModifier: 0.14,
    speedModifier: 0.08,
    energyModifier: 0.06,
  },
  {
    character: "Ulquiorra Cifer",
    name: "Resurrección: Murciélago",
    golpes: [{ name: "Lanza del Relámpago", category: 'OTHER' }, { name: "Cero Oscuras", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.3,
    defenseModifier: 0.12,
    speedModifier: 0.14,
  },
  {
    character: "Grimmjow Jaegerjaquez",
    name: "Resurrección: Pantera",
    golpes: [{ name: "Desgarrón", category: 'OTHER' }],
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.32,
    defenseModifier: 0.04,
    speedModifier: 0.18,
  },
  {
    character: "Tia Harribel",
    name: "Resurrección: Tiburón",
    golpes: [{ name: "Tiburón: Sawing Sharks", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.16,
    speedModifier: 0.1,
  },
  {
    character: "Coyote Starrk",
    name: "Resurrección: Los Lobos",
    golpes: [{ name: "Los Lobos", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.06,
    speedModifier: 0.2,
  },
  {
    character: "Baraggan Luisenbarn",
    name: "Resurrección: Arrogante",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.2,
    speedModifier: -0.08,
  },
  {
    character: "Nnoitra Gilga",
    name: "Resurrección: Santa Teresa",
    golpes: [{ name: "Santa Teresa: Scythe Slash", category: 'OTHER' }],
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.34,
    defenseModifier: 0.1,
    speedModifier: 0.04,
  },
  {
    character: "Zommari Rureaux",
    name: "Resurrección: Brujería",
    golpes: [{ name: "Brujería: Multi-Strike", category: 'OTHER' }],
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.22,
    defenseModifier: 0.08,
    speedModifier: 0.24,
  },
  {
    character: "Aaroniero Arruruerie",
    name: "Resurrección: Glotonería",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.16,
    speedModifier: 0.02,
  },
  {
    character: "Yammy Llargo",
    name: "Resurrección: Ira",
    golpes: [{ name: "Ira: Rampage", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.3,
    defenseModifier: 0.22,
    speedModifier: -0.1,
  },
  {
    character: "Szayelaporro Granz",
    name: "Resurrección: Fornicarás",
    golpes: [{ name: "Fornicarás: Toxic Spore", category: 'OTHER' }],
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.22,
    defenseModifier: 0.08,
    speedModifier: 0.1,
    energyModifier: 0.12,
  },
  {
    character: "Uryu Ishida",
    name: "Vollständig: Antthesis",
    levelRequirement: 14,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.14,
    speedModifier: 0.16,
  },
  {
    character: "Bazz-B",
    name: "Vollständig: The Heat",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.32,
    defenseModifier: 0.04,
    speedModifier: 0.14,
    drainHpPerTurn: 2,
  },
  {
    character: "As Nödt",
    name: "Vollständig: The Fear",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.24,
    defenseModifier: 0.08,
    speedModifier: 0.22,
  },
  {
    character: "Yhwach",
    name: "O Almighty",
    levelRequirement: 18,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.36,
    defenseModifier: 0.16,
    speedModifier: 0.16,
    energyModifier: 0.1,
  },
  {
    character: "Ryuken Ishida",
    name: "Quincy: Letzt Stil",
    levelRequirement: 13,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.28,
    defenseModifier: 0.06,
    speedModifier: 0.12,
  },
  {
    character: "Ichigo Kurosaki",
    name: "Máscara Hollow",
    levelRequirement: 6,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.2,
    speedModifier: 0.16,
  },
  {
    character: "Chad",
    name: "Brazo Derecha del Gigante",
    levelRequirement: 10,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.26,
    defenseModifier: 0.14,
    speedModifier: -0.04,
  },
  {
    character: "Yoruichi Shihoin",
    name: "Shunkō",
    levelRequirement: 12,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
    attackModifier: 0.2,
    defenseModifier: 0.04,
    speedModifier: 0.3,
  },
  {
    character: "Sosuke Aizen",
    name: "Hōgyoku: Fusão",
    golpes: [{ name: "Transcendência", category: 'OTHER' }],
    levelRequirement: 16,
    // Liberada no meio da troca: não gasta a rodada.
    consumesTurn: false,
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
    golpes: [{ name: "Feitiço da Fúria Emplumada", category: 'OTHER' }],
    levelRequirement: 5,
    attackModifier: 0.15,
    energyModifier: 0.15,
    defenseModifier: -0.05,
  },
  // ---- Formas que eram habilidade de buff ----
  //
  // Estas cinco existiam como habilidade de "buff em si mesmo", mas na obra
  // são estados em que o personagem entra e se mantém — forma. O dono do
  // projeto confirmou cada uma. O nível e os ganhos vêm da habilidade que
  // cada uma substitui, que saiu do kit.

  // Kaioken: o corpo não aguenta. Cobra VIDA por rodada, além do preço de
  // toda forma — é o tema da técnica, e o que a separa do Super Saiyan.
  {
    character: 'Goku',
    name: 'Kaioken',
    levelRequirement: 2,
    consumesTurn: false,
    attackModifier: 0.2,
    speedModifier: 0.18,
    drainHpPerTurn: 3,
  },
  {
    character: 'Naruto Uzumaki',
    name: 'Manto de Chakra da Kurama',
    levelRequirement: 5,
    consumesTurn: false,
    attackModifier: 0.2,
    speedModifier: 0.15,
  },
  // Sharingan: ler o movimento, mais que bater mais forte.
  {
    character: 'Sasuke Uchiha',
    name: 'Sharingan',
    levelRequirement: 1,
    consumesTurn: false,
    attackModifier: 0.1,
    speedModifier: 0.2,
  },
  {
    character: 'Mahito',
    name: 'Corpo Espiritual Instantâneo da Morte Distorcida',
    levelRequirement: 9,
    consumesTurn: false,
    attackModifier: 0.28,
    defenseModifier: 0.08,
    speedModifier: 0.22,
  },
  // Antes do Bankai (nível 16): tirar o tapa-olho que come o próprio reiatsu.
  {
    character: 'Kenpachi Zaraki',
    name: 'Sem o Tapa-Olho',
    levelRequirement: 5,
    consumesTurn: false,
    attackModifier: 0.3,
  },
];

// ---- Preço de toda forma: ativar e manter, em energia e stamina ----
//
// POR QUE EXISTE. Antes só dez das cinquenta e cinco formas tinham
// manutenção, e Super Saiyan e as automáticas não cobravam nem a ativação.
// Transformar era só ganho e não era decisão — era "ligue assim que puder".
// O dono do projeto pediu que toda forma cobre para ativar e para manter, em
// energia E stamina.
//
// UMA REGRA SÓ, e não um número por forma. O preço sai da FORÇA da forma, a
// soma dos ganhos percentuais dela; as PERDAS entram subtraindo, porque a
// Suì-Fēng que troca defesa por ataque já está pagando com o corpo. E
// acompanha o NÍVEL da forma: é uma fração da reserva e da regeneração de um
// personagem MÉDIO no nível em que ela libera. Medir contra a média, e não
// contra quem usa, é o que faz treinar reserva valer — quem tem mais que a
// média sustenta a forma por mais tempo.
//
// O PESO ESTÁ NA STAMINA, E A ENERGIA SÓ BELISCA. Isso saiu do simulador,
// depois que a luta passou a começar com 40% da energia (ver ENERGY_REGEN_PCT
// em app/lib/battle/constants.ts). Energia virou o recurso escasso dos
// golpes, e a forma não consegue disputá-la: com o preço em energia, lutar
// transformado ficou PIOR que lutar sem forma para quase todo mundo — o
// Goku perdia 58 pontos de vitória, o Ichigo 41. Com a mesma forma cobrando
// só stamina, ela voltava a valer. Medido contra o mesmo personagem, no
// mesmo nível, sem forma:
//
//                          o que a forma vale
//   Ichigo, Bankai              +51 pontos
//   Broly, Lendário             +38
//   Byakuya, Bankai             +35
//   Grimmjow, Pantera           +27
//   Kenpachi, Bankai            +13
//   Goku, Super Saiyan 2        +11   (gasta a rodada: é o preço dela)
//
// Os números fixos que o catálogo tinha — 33 a 44 de energia no Bankai, 10
// por rodada no Super Saiyan 3 — saíram por isso: eram de quando a luta
// começava com a energia cheia, e hoje transformariam a forma em armadilha.
// O dreno de VIDA (Kenpachi, Yamamoto, Unohana) continua: é tema, não preço.
//
// A STAMINA DA FORMA CAIU PELA METADE quando as posturas chegaram (ver
// POSTURA_CUSTO em app/lib/battle/constants.ts): as duas passaram a disputar
// a mesma reserva, e com o preço cheio a forma voltou a não valer para o
// Ichigo (+2), o Kenpachi (+2) e o Grimmjow (−13). Com metade, voltaram a
// +19, +16 e +40.

/** Reserva média de energia e stamina no nível 1 (média dos 52 personagens). */
const ENERGIA_MEDIA = 123;
const STAMINA_MEDIA = 107;
/**
 * Espelhos de LEVEL_SCALING, ENERGY_REGEN_PCT e STAMINA_REGEN_PCT
 * (app/lib/battle/constants.ts). O catálogo é CommonJS e não importa o
 * TypeScript; mudou lá, muda aqui.
 */
const ESCALA_POR_NIVEL = 0.12;
const REGEN_ENERGIA = 0.06;
const REGEN_STAMINA = 0.05;

/** Ativação: fração da reserva média, por ponto de força. */
const ATIVACAO_ENERGIA = 0.04;
const ATIVACAO_STAMINA = 0.06;
/** Manutenção: fração da regeneração média por rodada, por ponto de força. */
const MANUTENCAO_ENERGIA = 0.075;
const MANUTENCAO_STAMINA = 1.2;
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
    // Piso de 1 em tudo: toda forma cobra as quatro coisas, mesmo a mais fraca.
    activationCost: Math.max(1, Math.round(forca * ATIVACAO_ENERGIA * energia)),
    activationStaminaCost: Math.max(1, Math.round(forca * ATIVACAO_STAMINA * stamina)),
    drainPerTurn: Math.max(1, Math.round(forca * MANUTENCAO_ENERGIA * REGEN_ENERGIA * energia)),
    drainStaminaPerTurn: Math.max(1, Math.round(forca * MANUTENCAO_STAMINA * REGEN_STAMINA * stamina)),
  };
}

module.exports = {
  transformations: transformations.map((def) => ({ ...def, ...precoDaForma(def) })),
  precoDaForma,
};
