// Itens empilháveis: MATERIAL e CONSUMÍVEL.
//
// POR QUE EXISTE: até aqui o jogo só tinha equipamento, comprado na loja. A
// raid pagava só moeda, e não havia o que forjar nem poção para a vida que não
// volta entre os andares. Desenho aprovado em 30/09/2026:
// - MATERIAL cai da raid (cada monstro deixa o seu) e é gasto na forja da
//   Lisbeth, em receitas e refino. Não se compra: `preco` nulo.
// - CONSUMÍVEL é poção, usada EM BATALHA gastando a rodada, como item de
//   Pokémon. `efeito` diz quanto recupera, em fração do máximo.
//
// Sincronizado por syncItens (prisma/sync-catalog.js), por nome.

const itens = [
  // --- MATERIAIS: a escada dos Hollows de Las Noches ---
  {
    nome: 'Fragmento de Máscara',
    descricao: 'Um pedaço da máscara de osso de um Hollow. Todo Hollow deixa um.',
    tipo: 'MATERIAL',
    raridade: 'COMUM',
    marca: '面',
  },
  {
    nome: 'Resíduo de Cero',
    descricao: 'Reiatsu condensado que sobra do Cero de um Menos. Ainda formiga na mão.',
    tipo: 'MATERIAL',
    raridade: 'COMUM',
    marca: '光',
  },
  {
    nome: 'Garra de Adjuchas',
    descricao: 'A garra de um Adjuchas, o caçador que devorou os seus para pensar.',
    tipo: 'MATERIAL',
    raridade: 'RARO',
    marca: '爪',
  },
  {
    nome: 'Núcleo de Vasto Lorde',
    descricao: 'O centro de um Vasto Lorde, quase um Espada. Pulsa como um coração que não é.',
    tipo: 'MATERIAL',
    raridade: 'EPICO',
    marca: '核',
  },
  {
    nome: 'Osso da Pantera',
    descricao: 'Um pedaço da armadura de osso da Pantera de Grimmjow. Só sai de quem o derrubou.',
    tipo: 'MATERIAL',
    raridade: 'LENDARIO',
    marca: '豹',
  },

  // --- CONSUMÍVEIS: em batalha, gastando a rodada ---
  {
    nome: 'Poção',
    descricao: 'Recupera 30% da vida máxima. Beber gasta a rodada.',
    tipo: 'CONSUMIVEL',
    raridade: 'COMUM',
    marca: '薬',
    preco: 40,
    efeito: { vida: 0.3 },
  },
  {
    nome: 'Super Poção',
    descricao: 'Recupera 60% da vida máxima. Beber gasta a rodada.',
    tipo: 'CONSUMIVEL',
    raridade: 'RARO',
    marca: '癒',
    preco: 110,
    efeito: { vida: 0.6 },
  },
  {
    nome: 'Éter',
    descricao: 'Recupera 50% da energia máxima. Beber gasta a rodada.',
    tipo: 'CONSUMIVEL',
    raridade: 'RARO',
    marca: '気',
    preco: 90,
    efeito: { energia: 0.5 },
  },
];

module.exports = { itens };
