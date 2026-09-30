// Kits do elenco de Jujutsu Kaisen.
//
// Segue o critério que saiu da medição em prisma/catalog/signatures.js: DUAS
// opções de dano de peso diferente até o nível 2. Sem isso, o turno seguinte
// ao golpe grande vira ataque básico e a luta se perde ali — foi o que separou
// Vegeta (81%) de Goku (18%) antes daquela correção.
//
// Curva de liberação 1 / 2 / 5 / 9 / 14, e o 14 é o teto porque é onde a
// história recurvada termina o jogador. Os números seguem a mesma escala do
// resto: poder de 14 a 54, energia de 12 a 40, cooldown de 1 a 6.
//
// ESCALA: todos têm um dono só, então skill-scaling.js os liga à classe
// automaticamente — Gojo, Mahito e Jogo em energia; Yuji, Nobara e Sukuna em
// ataque; Megumi em energia por ser INVOCADOR; Hanami em defesa por ser
// TANQUE. Não há nada a declarar aqui.
//
// Domínio (Expansão de Domínio) é sempre o golpe de nível 14: é o ápice da
// técnica de cada um na obra, e o mais caro do kit.

// O DOMÍNIO É UM ESTADO, NÃO UM GOLPE — E É A TRANSFORMAÇÃO DELES.
//
// As cinco Expansões eram poder alto com recarga alta, e nada mais — a tag
// `dominio` existia sem fazer efeito. Cada uma agora abre um estado de três
// rodadas em que os golpes do dono atravessam counter e escudo (o acerto
// garantido da obra) e são amplificados (ver DOMAIN_DAMAGE_BONUS), pago em
// ENERGIA E STAMINA toda rodada — as duas reservas, porque sustentar um
// domínio não é só cursed energy: é a presença inteira de quem abriu
// expandida sobre o espaço, e falta de fôlego derruba tanto quanto falta de
// energia.
//
// NENHUM PERSONAGEM DE JUJUTSU TEM TRANSFORMAÇÃO, e a decisão foi não
// construir uma — o domínio já é o estado de poder à parte de cada um, só que
// como HABILIDADE em vez de como registro em outra tabela. Ele ganhou o que
// faltava para cumprir esse papel: um "up" de verdade. Cada domínio também
// concede um BUFF de defesa em si mesmo, na MESMA magnitude da manutenção —
// o número que custa por rodada é o mesmo que protege por rodada, então
// quanto mais caro o domínio, mais seguro ficar dentro dele.
//
// O poder direto caiu de ~50 para ~30 justamente porque o valor mudou de
// lugar: quem abre não compra um número grande, compra três rodadas em que a
// defesa do outro não vale, a própria fica mais sólida, e os golpes saem
// ampliados. Contra um oponente que não se defende, o domínio vale menos que
// o golpe antigo — e isso é a intenção, não um efeito colateral: ele é a
// resposta a quem se esconde atrás de defesa.
//
// A MAGNITUDE É A MANUTENÇÃO POR RODADA — de energia E de stamina — e é
// também a força do domínio no choque contra outro E o tanto de defesa que
// ele concede: o mais caro de sustentar é o mais refinado, e o mais seguro
// para quem está dentro. A ordem segue a obra — Gojo (22) acima de Sukuna
// (20), depois Mahito (16), Jogo (15) e Megumi (13), cujo Jardim Sombrio é
// incompleto justamente na obra.
//
// Abrir contra um domínio já aberto resolve os dois na hora: o perdedor desaba
// atordoado, e empate derruba os dois. PERDENDO OU EMPATANDO O CHOQUE, o
// domínio nunca abriu — o debuff que cada um carrega e o buff de defesa não
// se aplicam; só o atordoamento acontece. Antes disto ser corrigido, o debuff
// (e agora o buff) vazava mesmo quando a técnica não chegava a existir.

const gojo = {
  character: 'Satoru Gojo',
  skills: [
    {
      name: 'Limitless: Repulsão',
      category: 'OTHER',
      power: 16,
      energyCost: 13,
      cooldown: 1,
      tags: ['maldicao', 'limitless'],
      effects: [],
      level: 1,
    },
    {
      name: 'Técnica Amaldiçoada Azul',
      category: 'OTHER',
      power: 24,
      energyCost: 20,
      cooldown: 2,
      tags: ['maldicao', 'limitless'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 18, duration: 2 }],
      level: 2,
    },
    {
      name: 'Vermelho: Repulsão Invertida',
      category: 'OTHER',
      power: 34,
      energyCost: 28,
      cooldown: 3,
      tags: ['maldicao', 'limitless'],
      effects: [],
      level: 5,
    },
    {
      name: 'Roxo: Imaginário',
      category: 'OTHER',
      power: 46,
      energyCost: 36,
      cooldown: 5,
      tags: ['maldicao', 'limitless'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 22, duration: 2 }],
      level: 9,
    },
    {
      name: 'Expansão de Domínio: Vazio Infinito',
      category: 'OTHER',
      power: 30,
      energyCost: 40,
      cooldown: 6,
      tags: ['maldicao', 'dominio', 'ultimate'],
      effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: 22, duration: 3 }, { type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 22, duration: 3 }],
      level: 14,
    },
  ],
};

const yuji = {
  character: 'Yuji Itadori',
  skills: [
    {
      name: 'Punho Divergente',
      category: 'OTHER',
      power: 17,
      energyCost: 12,
      cooldown: 1,
      tags: ['fisico'],
      effects: [],
      level: 1,
    },
    {
      name: 'Sequência de Golpes',
      category: 'OTHER',
      power: 25,
      energyCost: 19,
      cooldown: 2,
      tags: ['fisico'],
      effects: [],
      level: 2,
    },
    {
      name: 'Chute Amaldiçoado',
      category: 'OTHER',
      power: 33,
      energyCost: 26,
      cooldown: 3,
      tags: ['fisico', 'maldicao'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 16, duration: 2 }],
      level: 5,
    },
    {
      name: 'Impacto Divergente: Segundo Tempo',
      category: 'OTHER',
      power: 43,
      energyCost: 34,
      cooldown: 4,
      tags: ['fisico'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 2 }],
      level: 9,
    },
    {
      name: 'Ressonância de Sukuna',
      category: 'OTHER',
      power: 52,
      energyCost: 40,
      cooldown: 6,
      tags: ['maldicao', 'ultimate'],
      effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 22, duration: 2 }],
      level: 14,
    },
  ],
};

const megumi = {
  character: 'Megumi Fushiguro',
  // EM CAMPO (29/09/2026): os shikigami viram invocações — um por vez, e
  // chamar outro recolhe o atual (ver app/lib/battle/invocacoes.ts). A ação
  // do Megumi é o bastão (o ataque básico) ou a ORDEM do golpe especial do
  // shikigami em campo. O Mahoraga fecha o kit e cobra vida por rodada.
  skills: [
    {
      name: 'Shikigami: Nue',
      category: 'OTHER',
      power: 0,
      energyCost: 13,
      cooldown: 1,
      tags: ['shikigami'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'nue' }],
      substituirEfeitos: true,
      level: 1,
    },
    {
      name: 'Shikigami: Cães Divinos',
      category: 'OTHER',
      power: 0,
      energyCost: 19,
      cooldown: 2,
      tags: ['shikigami'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'caes-divinos' }],
      substituirEfeitos: true,
      level: 2,
    },
    {
      name: 'Shikigami: Sapo Amaldiçoado',
      category: 'OTHER',
      power: 0,
      energyCost: 25,
      cooldown: 3,
      tags: ['shikigami'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'sapo' }],
      substituirEfeitos: true,
      level: 5,
    },
    {
      name: 'Shikigami: Max Elephant',
      category: 'OTHER',
      power: 0,
      energyCost: 34,
      cooldown: 5,
      tags: ['shikigami'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'max-elephant' }],
      substituirEfeitos: true,
      level: 9,
    },
    {
      name: 'Expansão de Domínio: Jardim Sombrio',
      category: 'OTHER',
      power: 28,
      energyCost: 39,
      cooldown: 6,
      tags: ['shikigami', 'dominio', 'ultimate'],
      effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: 13, duration: 3 }, { type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 20, duration: 2 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 13, duration: 3 }],
      level: 14,
    },
    {
      name: 'Shikigami: Mahoraga',
      category: 'OTHER',
      power: 0,
      energyCost: 40,
      cooldown: 8,
      tags: ['shikigami', 'ultimate'],
      effects: [{ type: 'INVOCAR', target: 'SELF', magnitude: 1, invocacao: 'mahoraga' }],
      substituirEfeitos: true,
      level: 16,
    },
  ],
};

const nobara = {
  character: 'Nobara Kugisaki',
  skills: [
    {
      name: 'Martelo e Prego',
      category: 'OTHER',
      power: 17,
      energyCost: 12,
      cooldown: 1,
      tags: ['fisico', 'maldicao'],
      effects: [],
      level: 1,
    },
    {
      name: 'Ressonância',
      category: 'OTHER',
      power: 25,
      energyCost: 20,
      cooldown: 2,
      tags: ['maldicao'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 6, duration: 2 }],
      level: 2,
    },
    {
      name: 'Boneca de Palha',
      category: 'OTHER',
      power: 32,
      energyCost: 26,
      cooldown: 3,
      tags: ['maldicao'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 9, duration: 3 }],
      level: 5,
    },
    {
      name: 'Ressonância Máxima: Hairpin',
      category: 'OTHER',
      power: 43,
      energyCost: 34,
      cooldown: 4,
      tags: ['maldicao'],
      effects: [],
      level: 9,
    },
    {
      name: 'Prego Negro',
      category: 'OTHER',
      power: 51,
      energyCost: 39,
      cooldown: 6,
      tags: ['maldicao', 'ultimate'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 22, duration: 2 }],
      level: 14,
    },
  ],
};

const sukuna = {
  character: 'Ryomen Sukuna',
  skills: [
    {
      name: 'Corte',
      category: 'OTHER',
      power: 18,
      energyCost: 12,
      cooldown: 1,
      tags: ['maldicao'],
      effects: [],
      level: 1,
    },
    {
      name: 'Desmantelar',
      category: 'OTHER',
      power: 26,
      energyCost: 20,
      cooldown: 2,
      tags: ['maldicao'],
      effects: [],
      level: 2,
    },
    {
      name: 'Fenda',
      category: 'OTHER',
      power: 35,
      energyCost: 27,
      cooldown: 3,
      tags: ['maldicao'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 2 }],
      level: 5,
    },
    {
      name: 'Flechas de Fogo',
      category: 'OTHER',
      power: 45,
      energyCost: 35,
      cooldown: 5,
      tags: ['maldicao', 'fogo'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 2 }],
      level: 9,
    },
    {
      name: 'Expansão de Domínio: Santuário Malévolo',
      category: 'OTHER',
      power: 32,
      energyCost: 40,
      cooldown: 6,
      tags: ['maldicao', 'dominio', 'ultimate'],
      effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: 20, duration: 3 }, { type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 24, duration: 3 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 20, duration: 3 }],
      level: 14,
    },
  ],
};

const mahito = {
  character: 'Mahito',
  skills: [
    {
      name: 'Transfiguração Ociosa',
      category: 'OTHER',
      power: 15,
      energyCost: 13,
      cooldown: 1,
      tags: ['maldicao', 'alma'],
      effects: [],
      level: 1,
    },
    {
      name: 'Corpo Distorcido',
      category: 'OTHER',
      power: 23,
      energyCost: 20,
      cooldown: 2,
      tags: ['maldicao', 'alma'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 16, duration: 2 }],
      level: 2,
    },
    {
      name: 'Alma Multiplicada',
      category: 'OTHER',
      power: 31,
      energyCost: 26,
      cooldown: 3,
      tags: ['maldicao', 'alma'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 9, duration: 3 }],
      level: 5,
    },
    {
      name: 'Expansão de Domínio: Bairro Autoencarnado',
      category: 'OTHER',
      power: 29,
      energyCost: 39,
      cooldown: 6,
      tags: ['maldicao', 'dominio', 'ultimate'],
      effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: 16, duration: 3 }, { type: 'DOT', target: 'ENEMY', magnitude: 11, duration: 3 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 16, duration: 3 }],
      level: 14,
    },
  ],
};

const jogo = {
  character: 'Jogo',
  skills: [
    {
      name: 'Brasa',
      category: 'OTHER',
      power: 16,
      energyCost: 13,
      cooldown: 1,
      tags: ['maldicao', 'fogo'],
      effects: [],
      level: 1,
    },
    {
      name: 'Meteoro Menor',
      category: 'OTHER',
      power: 24,
      energyCost: 20,
      cooldown: 2,
      tags: ['maldicao', 'fogo'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 7, duration: 2 }],
      level: 2,
    },
    {
      name: 'Erupção',
      category: 'OTHER',
      power: 33,
      energyCost: 27,
      cooldown: 3,
      tags: ['maldicao', 'fogo'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 9, duration: 3 }],
      level: 5,
    },
    {
      name: 'Maelstrom',
      category: 'OTHER',
      power: 43,
      energyCost: 35,
      cooldown: 5,
      tags: ['maldicao', 'fogo'],
      effects: [],
      level: 9,
    },
    {
      name: 'Expansão de Domínio: Vulcão Fechado',
      category: 'OTHER',
      power: 30,
      energyCost: 39,
      cooldown: 6,
      tags: ['maldicao', 'dominio', 'ultimate'],
      effects: [{ type: 'DOMAIN', target: 'SELF', magnitude: 15, duration: 3 }, { type: 'DOT', target: 'ENEMY', magnitude: 12, duration: 3 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 15, duration: 3 }],
      level: 14,
    },
  ],
};

const hanami = {
  character: 'Hanami',
  skills: [
    {
      name: 'Broto Amaldiçoado',
      category: 'OTHER',
      power: 15,
      energyCost: 12,
      cooldown: 1,
      tags: ['maldicao', 'natureza'],
      effects: [],
      level: 1,
    },
    {
      name: 'Raízes Estranguladoras',
      category: 'OTHER',
      power: 22,
      energyCost: 19,
      cooldown: 2,
      tags: ['maldicao', 'natureza'],
      effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 16, duration: 2 }],
      level: 2,
    },
    {
      name: 'Semente da Morte',
      category: 'OTHER',
      power: 29,
      energyCost: 25,
      cooldown: 3,
      tags: ['maldicao', 'natureza'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 3 }],
      level: 5,
    },
    {
      name: 'Casca de Madeira Viva',
      category: 'OTHER',
      power: 0,
      energyCost: 24,
      cooldown: 4,
      tags: ['maldicao', 'shield'],
      effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 34, duration: 2 }],
      level: 9,
    },
    {
      name: 'Floração Fatal',
      category: 'OTHER',
      power: 47,
      energyCost: 38,
      cooldown: 6,
      tags: ['maldicao', 'natureza', 'ultimate'],
      effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 11, duration: 3 }],
      level: 14,
    },
  ],
};

const jujutsuKits = [gojo, yuji, megumi, nobara, sukuna, mahito, jogo, hanami];

module.exports = { jujutsuKits };
