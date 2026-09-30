// Habilidades renomeadas para refletir a obra, sem tocar em mecânica.
//
// POR QUE ESTE ARQUIVO EXISTE. Um levantamento no elenco de Bleach mostrou 186
// habilidades exclusivas (uma por dono), das quais boa parte carrega nome
// inventado — sub-técnicas compostas em cima de um zanpakutō real ("Haineko:
// Corrosão Total", quando Haineko na obra tem UMA habilidade sem sub-nomes) e,
// mais comum ainda, um passivo de personalidade genérico por personagem
// ("Iron Resolve", "Lazy Confidence", "Cold Calculation") que não existe na
// obra em lugar nenhum.
//
// A REGRA DE FONTE, na ordem em que se aplica: (1) nome usado no anime/mangá —
// confiança alta; (2) o sistema numérico de kidō, que a obra estabelece ir até
// 99 mesmo sem mostrar todos em tela — usar o número é canônico mesmo sem
// nome de tela; (3) onde não sobra nada disso, uma ação GENÉRICA sem título
// pomposo — "golpe de espada", não um nome de técnica inventado fingindo ser
// canônico. Termos de jogo oficial (Brave Souls e similares) entram quando
// confirmados, mas não são citados de memória sem certeza: um "nome oficial"
// fabricado seria o mesmo problema disfarçado.
//
// SÓ O NOME MUDA, NÃO O NÚMERO. Poder, custo, efeito e nível de requisito
// continuam exatamente onde estavam — trocar o rótulo não é trocar o
// balanceamento, e por isso esta passagem não precisa de nova medição.
//
// CADA ENTRADA REGISTRA A FONTE, para a próxima pessoa (ou eu, daqui a um
// mês) não precisar refazer a pesquisa nem confiar cegamente na anterior.

const renomeacoes = [
  // KENPACHI ZARAKI é o caso mais difícil do elenco: na obra ele não usa
  // NENHUMA técnica nomeada — a caracterização dele é justamente essa, ele só
  // balança a espada. Mesmo assim, quatro momentos/traços canônicos bem
  // conhecidos encaixam exatamente nos efeitos que o kit já tinha.
  {
    nomeAntigo: 'Battle Fury',
    categoria: 'OTHER',
    nomeNovo: 'Remover o Tapa-Olho',
    fonte: 'anime/mangá — o tapa-olho sela boa parte do reiatsu dele; removê-lo é um momento recorrente (contra Ichigo, entre outros) que libera poder de verdade.',
  },
  {
    nomeAntigo: "Intimidating Bloodlust",
    categoria: 'OTHER',
    nomeNovo: 'Pressão Assassina',
    fonte: 'anime/mangá — o reiatsu dele sozinho já derruba ou paralisa quem tem vontade fraca, mostrado várias vezes contra oponentes menores.',
  },
  {
    nomeAntigo: 'Nozarashi Unleashed',
    categoria: 'OTHER',
    nomeNovo: 'Nozarashi',
    fonte: 'anime/mangá — o nome verdadeiro da zanpakutō dele, revelado tarde na obra; dizê-lo em voz alta é o próprio ato de poder.',
  },
  {
    nomeAntigo: "Berserker's Endurance",
    categoria: 'OTHER',
    nomeNovo: 'Teimosia de Kenpachi',
    fonte: 'anime/mangá — ele segue lutando através de ferimentos que derrubariam qualquer outro; é caracterização repetida, não uma técnica com nome.',
  },
  {
    // Renomeado uma SEGUNDA vez: "Golpe Bruto" já tinha saído do genérico
    // "Reckless Slash" no commit anterior, mas era genérico ainda — o tipo
    // de nome que serviria pra qualquer espadachim do elenco. nomeAntigo
    // aponta pro nome ATUAL no banco (Golpe Bruto), não pro original — a
    // função busca pelo nome de agora, não pela origem histórica.
    nomeAntigo: 'Golpe Bruto',
    categoria: 'OTHER',
    nomeNovo: 'Fio Cego',
    fonte: 'anime/mangá — fato real e específico dele: a Nozarashi nunca é afiada, de propósito, porque ele não liga pra elegância na luta, só pro prazer do combate contra alguém forte.',
  },

  // IZURU KIRA. A marca dele é o autodesprezo — a linha mais famosa do
  // personagem é se descrever como "o homem mais covarde do Seireitei".
  {
    nomeAntigo: 'Wabisuke: Heavy Blow',
    categoria: 'OTHER',
    nomeNovo: 'Wabisuke: Peso Redobrado',
    fonte: 'anime/mangá — mais preciso que o nome antigo: o Wabisuke literalmente dobra o peso do que corta, não é só "um golpe pesado".',
  },
  {
    nomeAntigo: 'Despairing Slash',
    categoria: 'OTHER',
    nomeNovo: 'Golpe do Desespero',
    fonte: 'traço de personagem real, só traduzido — o autodesprezo do Kira é a marca mais conhecida dele.',
  },
  {
    nomeAntigo: 'Quiet Resolve',
    categoria: 'OTHER',
    nomeNovo: 'Máscara de Indiferença',
    fonte: 'traço de personagem — ele esconde o desespero atrás de uma calma fingida.',
  },

  // RENJI ABARAI. O arco dele em Soul Society é inteiro sobre superar a
  // própria fraqueza para alcançar Ichigo e Byakuya, e proteger a Rukia.
  {
    nomeAntigo: 'Zabimaru Strike',
    categoria: 'OTHER',
    nomeNovo: 'Zabimaru: Chicotada',
    fonte: 'mais preciso que o nome antigo — Zabimaru é uma lâmina segmentada tipo chicote/espinha, não um golpe genérico de espada.',
  },
  {
    nomeAntigo: 'Fierce Resolve',
    categoria: 'OTHER',
    nomeNovo: 'Determinação de Superar',
    fonte: 'traço de personagem — o motor de tudo que o Renji faz na Soul Society é superar a própria fraqueza.',
  },
  {
    nomeAntigo: 'Tenacious Guard',
    categoria: 'OTHER',
    nomeNovo: 'Lealdade Inabalável',
    fonte: 'traço de personagem — a devoção dele à Rukia e aos amigos, não uma postura defensiva genérica.',
  },

  // MAYURI KUROTSUCHI. Cientista louco sem empatia nenhuma — trata todo
  // mundo, inclusive os próprios subordinados, como cobaia descartável.
  {
    nomeAntigo: 'Toxic Experiment',
    categoria: 'OTHER',
    nomeNovo: 'Cobaia Descartável',
    fonte: 'traço de personagem — é assim que ele enxerga qualquer um à frente dele, aliado ou inimigo.',
  },
  {
    nomeAntigo: 'Regenerative Formula',
    categoria: 'OTHER',
    nomeNovo: 'Corpo Descartável',
    fonte: 'anime/mangá — fato real da obra: ele mantém corpos de reposição prontos para quando o atual for destruído.',
  },

  // BYAKUYA KUCHIKI. A obsessão dele com a honra do clã Kuchiki é o traço
  // que define cada decisão que ele toma na Soul Society.
  {
    nomeAntigo: 'Noble Resolve',
    categoria: 'OTHER',
    nomeNovo: 'Orgulho dos Kuchiki',
    fonte: 'traço de personagem — a nobreza do clã acima de tudo, inclusive dos próprios sentimentos.',
  },
  // "Shukumei" fica como está: não tenho fonte confiável para esse nome e
  // prefiro não mexer sem confirmar de onde ele veio.

  // GIN ICHIMARU. O sorriso perpétuo escondendo as intenções reais é o
  // traço mais icônico do personagem — e o arco dele inteiro acaba sendo
  // uma armação de anos contra o próprio Aizen.
  {
    nomeAntigo: 'Shinsō Extension',
    categoria: 'OTHER',
    nomeNovo: 'Shinsō: Investida',
    fonte: 'anime/mangá — mesmo conceito (a lâmina dispara pra frente em alta velocidade), frase mais direta.',
  },
  {
    nomeAntigo: 'Deceptive Smile',
    categoria: 'OTHER',
    nomeNovo: 'Sorriso Enganoso',
    fonte: 'traço de personagem, só traduzido — o sorriso constante é a marca mais reconhecível do Gin.',
  },
  {
    nomeAntigo: 'Sly Counter',
    categoria: 'OTHER',
    nomeNovo: 'Farsa Calculada',
    fonte: 'traço de personagem — o arco dele inteiro foi uma armação calculada contra o Aizen.',
  },

  // SOSUKE AIZEN. Ter antecipado e planejado tudo com séculos de
  // antecedência é o traço que define o personagem inteiro.
  {
    nomeAntigo: 'Perfect Anticipation',
    categoria: 'OTHER',
    nomeNovo: 'Tudo Conforme o Plano',
    fonte: 'traço de personagem — a frase que resume o Aizen inteiro; ele sempre esteve um passo à frente.',
  },
  {
    nomeAntigo: 'Shattered Shield',
    categoria: 'OTHER',
    nomeNovo: 'Ilusão de Fragilidade',
    fonte: 'liga ao tema real de hipnose/ilusão do Kyōka Suigetsu, em vez de um "quebra-escudo" sem tema.',
  },

  // CHAD. "Overwhelming Force" era exatamente o molde genérico que este
  // catálogo existe pra corrigir — serviria a qualquer brawler do elenco.
  // Vira a carga real do braço direito, e ganha a combo-tag que a liga ao
  // El Directo em prisma/catalog/mecanicas-de-dano.js.
  {
    nomeAntigo: 'Overwhelming Force',
    categoria: 'OTHER',
    nomeNovo: 'Brazo Derecho del Gigante: Carga',
    fonte: 'anime/mangá — o nome real do braço direito dele; carregar poder nele antes de socar é como ele luta na obra.',
  },

  // KANAME TOSEN. "Suzumushi Strike" misturava o nome real da zanpakutō com
  // um sufixo em inglês sem fonte — o comando de liberação dela na obra é
  // "Nake, Suzumushi" ("Cante/Grite, Suzumushi"), e é o som do grilo-sino que
  // a torna capaz de silenciar sentidos e amplificar kidō. Ganha a combo-tag
  // que a liga ao Enma Kōrogi em prisma/catalog/mecanicas-de-dano.js — shikai
  // abrindo caminho pro bankai é a mesma lógica de carga-e-finalização do
  // Chad e do Grimmjow, só que contada com a progressão real da obra.
  {
    nomeAntigo: 'Suzumushi Strike',
    categoria: 'OTHER',
    nomeNovo: 'Suzumushi: Grito',
    fonte: 'anime/mangá — "Nake, Suzumushi" é o comando de liberação real da zanpakutō; o grito é o som do grilo-sino.',
  },

  // YORUICHI SHIHOIN. "Flash Step Strike" traduzia Shunpo pro inglês em vez
  // de usar o termo que a obra já usa — ela é conhecida como a "Deusa do
  // Shunpo" precisamente por essa técnica, não por um golpe genérico com
  // nome de efeito sonoro.
  {
    nomeAntigo: 'Flash Step Strike',
    categoria: 'OTHER',
    nomeNovo: 'Shunpo: Investida',
    fonte: 'anime/mangá — Shunpo é o termo canônico (Flash Step); ela é chamada de "Deusa do Shunpo" na própria obra.',
  },

  // BARAGGAN LUISENBARN. "Ancient Malice" lia como nome de técnica inventado
  // — Título Em Maiúsculas sem fonte nenhuma. Ele não tem golpe básico
  // nomeado na obra; a regra (3) do topo deste arquivo pede uma ação sem
  // título pomposo nesse caso, então vira uma descrição simples ligada ao
  // traço mais óbvio dele — o trono e a obsessão com ser rei.
  {
    nomeAntigo: 'Ancient Malice',
    categoria: 'OTHER',
    nomeNovo: 'Golpe do Trono',
    fonte: 'sem nome de técnica na obra — descrição simples em vez de título inventado (regra 3), ligada à obsessão dele com o próprio trono.',
  },

  // YAMAMOTO GENRYŪSAI. "Commander's Will" era um buff genérico sem fonte —
  // vira a liberação do Bankai em si, a pedido do dono do projeto: o shikai
  // dele é descrito na obra como "só uma espada normal", e Bankai é
  // literalmente onde toda a força dele mora. Ganha a combo-tag que a liga
  // à Zanka no Tachi: Cremation em mecanicas-de-dano.js.
  {
    nomeAntigo: "Commander's Will",
    categoria: 'OTHER',
    nomeNovo: 'Zanka no Tachi: Ativação',
    fonte: 'anime/mangá — Zanka no Tachi é o nome real do Bankai dele; liberar é o próprio ato de virar a luta.',
  },

  // KISUKE URAHARA. "Kageyoshi: Shield Wall" usava um nome que NÃO é dele —
  // Kageyoshi é o Bankai do Byakuya (Senbonzakura Kageyoshi), claramente uma
  // referência colada errada. A defesa de Benihime vira o nome certo.
  {
    nomeAntigo: 'Kageyoshi: Shield Wall',
    categoria: 'OTHER',
    nomeNovo: 'Benihime: Muralha Carmesim',
    fonte: 'correção — "Kageyoshi" pertence ao Byakuya (Senbonzakura Kageyoshi), não ao Urahara; Benihime é a zanpakutō real dele.',
  },
  {
    nomeAntigo: 'Shikigami: Touro Máximo',
    categoria: 'OTHER',
    nomeNovo: 'Shikigami: Max Elephant',
    fonte: 'anime/mangá — o shikigami é o Max Elephant (満象, elefante), que inunda o campo; "Touro" era erro de tradução.',
  },
];

module.exports = { renomeacoes };
