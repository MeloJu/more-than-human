// Kits dos monstros de raid — a escada dos Hollows de Bleach.
//
// POR QUE EXISTE: os quatro monstros nasceram no seed com UM golpe só, a
// mesma Garra de Hollow, e o tier deles era só uma barra de vida maior. A
// raid de Las Noches subia de andar sem o inimigo mudar de jeito.
//
// A ESCADA É A DA OBRA, do mais bruto ao mais esperto:
// - Hollow: fome. Vem em bando e se cura mordendo.
// - Menos Grande: gigante lento, o primeiro a disparar Cero — e o Cero dele
//   varre a party inteira (EM_AREA).
// - Adjuchas: caçador rápido e esperto (o Grimmjow antes de virar Arrancar):
//   sangra, dispara, atravessa a guarda.
// - Vasto Lorde: quase humano, o mais perigoso. Cero forte, a pele de aço
//   (Hierro), e a pressão espiritual que enfraquece a party inteira.
//
// NOMES PRÓPRIOS, e não "Cero": o "Cero", a "Mordida Voraz" e o "Devorar Alma" do catálogo são
// dos kits das Espada, e mexer neles mudaria o Grimmjow e os outros.
//
// O ATAQUE DO MONSTRO CAIU UM TERÇO com o kit (`ataque`, antes só no seed).
// Com um golpe só de recarga 1, o monstro antigo BLOQUEAVA metade das rodadas
// — a IA bloqueia sem golpe pronto —, e a dificuldade da raid vinha em boa
// parte desse desperdício. Com o kit ele ataca toda rodada: sem o corte, o
// dano por andar dobrava (medido na simulação da raid).
//
// A GARRA FICA EM TODOS, como golpe barato de reserva: sem ela, o monstro sem
// energia para os golpes grandes bloqueava, e com o Hierro as lutas se
// arrastavam — a party chegava ao Grimmjow gasta e a raid despencava (medido:
// 6% de vitória no nível 14, contra 55% antes dos kits).
//
// Desenho aprovado em 30/09/2026, incluindo o golpe em área que pega todos os
// players (pedido do usuário). Números medidos na simulação da raid.
//
// Sincronizado por syncMonstros (prisma/sync-catalog.js): cria o golpe,
// liga ao monstro e desliga o que saiu do kit. Monstro não tem dado de
// jogador, então desligar é seguro.

const garra = {
  name: 'Garra de Hollow',
  category: 'OTHER',
  power: 12,
  energyCost: 8,
  cooldown: 1,
  tags: ['claw', 'hollow'],
  alcance: 'CORPO',
  effects: [],
  description: 'A garra de um Hollow comum. Fraca sozinha, perigosa em bando.',
};

const monstros = [
  {
    monstro: 'Hollow',
    ataque: 7,
    skills: [
      garra,
      {
        name: 'Mordida Faminta',
        category: 'OTHER',
        power: 14,
        energyCost: 12,
        cooldown: 2,
        tags: ['claw', 'hollow'],
        alcance: 'CORPO',
        effects: [{ type: 'LIFESTEAL', target: 'SELF', magnitude: 30 }],
        description: 'O Hollow crava os dentes e se alimenta da alma do alvo, recuperando parte do dano como vida.',
      },
    ],
  },
  {
    monstro: 'Menos Grande',
    ataque: 11,
    skills: [
      garra,
      {
        name: 'Cero Gigante',
        category: 'OTHER',
        power: 12,
        energyCost: 30,
        cooldown: 4,
        tags: ['cero', 'hollow'],
        alcance: 'AREA',
        effects: [{ type: 'EM_AREA', target: 'ENEMY', magnitude: 0 }],
        description: 'O Menos Grande abre a boca e varre o campo com um Cero. Acerta a party inteira.',
      },
      {
        name: 'Pisotear',
        category: 'OTHER',
        power: 14,
        energyCost: 14,
        cooldown: 2,
        tags: ['smash', 'hollow'],
        alcance: 'CORPO',
        effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 15, duration: 2 }],
        description: 'O gigante pisa com todo o peso. O alvo fica mais lento.',
      },
    ],
  },
  {
    monstro: 'Adjuchas',
    ataque: 15,
    skills: [
      garra,
      {
        name: 'Garras Rápidas',
        category: 'OTHER',
        power: 14,
        energyCost: 12,
        cooldown: 1,
        tags: ['claw', 'hollow', 'sangramento'],
        alcance: 'CORPO',
        effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 4, duration: 2 }],
        description: 'Uma sequência de garradas rápidas. O ferimento continua sangrando.',
      },
      {
        name: 'Cero do Adjuchas',
        category: 'OTHER',
        power: 18,
        energyCost: 18,
        cooldown: 2,
        tags: ['cero', 'hollow'],
        alcance: 'DISTANCIA',
        effects: [],
        description: 'Um Cero rápido, mais fraco que o de um Menos, disparado sem pausa.',
      },
      {
        name: 'Bote do Caçador',
        category: 'OTHER',
        power: 18,
        energyCost: 16,
        cooldown: 3,
        tags: ['claw', 'hollow'],
        alcance: 'CORPO',
        effects: [{ type: 'PIERCE', target: 'SELF', magnitude: 25 }],
        description: 'O Adjuchas espera a brecha e dá o bote, atravessando parte da defesa.',
      },
    ],
  },
  {
    monstro: 'Vasto Lorde',
    ataque: 19,
    skills: [
      garra,
      {
        name: 'Cero do Vasto Lorde',
        category: 'OTHER',
        power: 24,
        energyCost: 28,
        cooldown: 3,
        tags: ['cero', 'hollow'],
        alcance: 'DISTANCIA',
        effects: [],
        description: 'O Cero de um Vasto Lorde, quase no nível de um Espada.',
      },
      {
        name: 'Hierro',
        category: 'OTHER',
        power: 0,
        energyCost: 18,
        cooldown: 4,
        tags: ['hollow', 'shield'],
        effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 20, duration: 2 }],
        description: 'A pele de aço dos Hollows mais fortes. Absorve os próximos golpes.',
      },
      {
        name: 'Garra Dilacerante',
        category: 'OTHER',
        power: 20,
        energyCost: 20,
        cooldown: 2,
        tags: ['claw', 'hollow', 'sangramento'],
        alcance: 'CORPO',
        effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 5, duration: 3 }],
        description: 'Um golpe pesado que rasga fundo. O ferimento sangra por algumas rodadas.',
      },
      {
        name: 'Pressão Espiritual',
        category: 'OTHER',
        power: 8,
        energyCost: 22,
        cooldown: 4,
        tags: ['hollow', 'reiatsu'],
        alcance: 'AREA',
        effects: [
          { type: 'EM_AREA', target: 'ENEMY', magnitude: 0 },
          { type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 10, duration: 2 },
        ],
        description: 'O Vasto Lorde solta a pressão espiritual. Machuca pouco, mas enfraquece o ataque da party inteira.',
      },
    ],
  },
];

module.exports = { monstros };
