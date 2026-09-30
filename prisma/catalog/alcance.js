// Alcance de cada golpe: corpo a corpo, à distância ou em área.
//
// DECIDE O QUE AS POSTURAS DEFENDEM. Aparar só vale contra golpe corpo a
// corpo, e esquivar não vale contra golpe em área (ver alcanceDe em
// app/lib/battle/alcance.ts). Com o alcance errado, o jogador que lê a
// luta direito é punido: aparar um Getsuga Tenshō não pode dar certo, porque
// ele é uma onda disparada da lâmina, não um corte de perto.
//
// A REGRA DEDUZ, ESTA LISTA DECIDE. Categoria, tags e nome acertam a maior
// parte (todo kidō é à distância, todo taijutsu é de perto), mas erravam o
// que importa: golpe de espada que é disparo (Getsuga, Desgarrón, El
// Directo), técnica que precisa de contato (Cleave, Transfiguração Ociosa) e
// golpe de Pokémon que é de contato (Volt Tackle, Heavy Slam). O que está
// aqui foi revisado golpe a golpe, e os casos de obra conferidos na wiki de
// cada uma; a nota explica os que não são óbvios.
//
// Formato: [nome, categoria, alcance]. Golpe fora da lista usa a regra.

const alcances = [
  // Ichigo Kurosaki
  ["Getsuga Tenshō", 'OTHER', 'DISTANCIA'], // onda de reiatsu disparada da lâmina
  ["Getsuga Tenshō Negro", 'OTHER', 'DISTANCIA'],
  ["Getsuga Jūjishō", 'OTHER', 'DISTANCIA'],
  ["Tensa Zangetsu: Final Getsuga", 'OTHER', 'DISTANCIA'],
  ["Mugetsu", 'OTHER', 'AREA'], // a escuridão cobre tudo à frente
  ["Getsuga Tenshō (Zangetsu)", 'OTHER', 'DISTANCIA'],
  ["Zangetsu: Corte Ascendente", 'OTHER', 'CORPO'],
  ["Zangetsu: Investida Feroz", 'OTHER', 'CORPO'],

  // Byakuya Kuchiki
  ["Senbonzakura", 'OTHER', 'DISTANCIA'], // lâminas-pétala controladas à distância
  ["Senbonzakura Kageyoshi", 'OTHER', 'AREA'], // milhares de lâminas cercam o alvo
  ["Senbonzakura: Chire", 'OTHER', 'DISTANCIA'],
  ["Shukumei", 'OTHER', 'CORPO'],

  // Gin Ichimaru
  ["Kamishini no Yari", 'OTHER', 'DISTANCIA'], // a lâmina se estende por quilômetros
  ["Shinsō: Investida", 'OTHER', 'DISTANCIA'],
  ["Shinsō: Estocada Estendida", 'OTHER', 'DISTANCIA'],

  // Rukia Kuchiki
  ["Hakka no Togame", 'OTHER', 'AREA'], // congela tudo em volta
  ["Tsugi no Mai: Hakuren", 'OTHER', 'DISTANCIA'],
  ["San no Mai: Shirafune", 'OTHER', 'CORPO'], // a lâmina de gelo se forma na espada
  ["Sode no Shirayuki: Lâmina de Gelo", 'OTHER', 'CORPO'],
  ["Sode no Shirayuki: Tsukishiro", 'OTHER', 'AREA'], // um círculo de gelo sobe do chão

  // Toshiro Hitsugaya
  ["Hyōten Hyakkasō", 'OTHER', 'AREA'],
  ["Sōten ni Zase", 'OTHER', 'DISTANCIA'],
  ["Hyōrinmaru: Ice Blade", 'OTHER', 'CORPO'],

  // Renji Abarai
  ["Hihio Zabimaru", 'OTHER', 'DISTANCIA'], // a serpente de ossos ataca de longe
  ["Zabimaru: Chicotada", 'OTHER', 'DISTANCIA'],
  ["Zabimaru: Hikōtsu", 'OTHER', 'DISTANCIA'],

  // Kenpachi Zaraki
  ["Nozarashi", 'OTHER', 'CORPO'],
  ["Fio Cego", 'OTHER', 'CORPO'],
  ["Teimosia de Kenpachi", 'OTHER', 'CORPO'],

  // Mayuri Kurotsuchi
  ["Konjiki Ashisogi Jizō", 'OTHER', 'AREA'], // a larva espalha veneno em volta
  ["Ashisogi Jizō Spores", 'OTHER', 'DISTANCIA'],

  // Kaname Tosen
  ["Suzumushi: Grito", 'OTHER', 'AREA'], // o som atinge quem está em volta
  ["Suzumushi Tsuishiki: Enma Kōrogi", 'OTHER', 'AREA'], // uma cúpula que fecha o alvo

  // Kisuke Urahara
  ["Kannonbiraki Benihime Aratame", 'OTHER', 'DISTANCIA'], // reestrutura o que está no alcance do Bankai
  ["Benihime: Crimson Strike", 'OTHER', 'DISTANCIA'], // Nake, Benihime: disparo de energia
  ["Benihime: Corte Certeiro", 'OTHER', 'CORPO'],

  // Retsu Unohana
  ["Minazuki: Verdadeira Forma", 'OTHER', 'CORPO'],
  ["Minazuki: Lâmina Serena", 'OTHER', 'CORPO'],
  ["A Primeira Kenpachi", 'OTHER', 'CORPO'],
  ["Glimpse of the True Blade", 'OTHER', 'CORPO'],
  ["Corte que Cura e Mata", 'OTHER', 'CORPO'],

  // Yamamoto Genryūsai
  ["Zanka no Tachi: Cremation", 'OTHER', 'CORPO'], // Higashi: Kyokujitsujin só age com golpe direto
  ["Ryūjin Jakka: Flame Strike", 'OTHER', 'DISTANCIA'],

  // Sajin Komamura
  ["Kokujō Tengen Myōō", 'OTHER', 'DISTANCIA'], // um gigante de cem metros que copia os movimentos
  ["Tenken Strike", 'OTHER', 'DISTANCIA'], // um braço gigante aparece e golpeia

  // Shunsui Kyōraku
  ["Bushōgoma", 'OTHER', 'DISTANCIA'],
  ["Katen Kyōkotsu: Twin Strike", 'OTHER', 'CORPO'],

  // Jūshirō Ukitake
  ["Sōgyo no Kotowari: Devolver", 'OTHER', 'DISTANCIA'], // devolve pela outra lâmina o que absorveu
  ["Absorver e Retornar", 'OTHER', 'DISTANCIA'],
  ["Vontade de Quem Sobrevive", 'OTHER', 'CORPO'],
  ["Sōgyo no Kotowari: Twin Blade", 'OTHER', 'CORPO'],
  ["Corte das Lâminas Gêmeas", 'OTHER', 'CORPO'],
  ["Dual Strike Barrage", 'OTHER', 'CORPO'],

  // Rangiku Matsumoto
  ["Haineko: Corrosão Total", 'OTHER', 'AREA'],
  ["Haineko: Tempestade", 'OTHER', 'AREA'],
  ["Growl, Haineko", 'OTHER', 'DISTANCIA'],
  ["Haineko: Cinza nos Olhos", 'OTHER', 'DISTANCIA'],
  ["Haineko: Lâmina de Pó", 'OTHER', 'DISTANCIA'],
  ["Haineko: Ash Slash", 'OTHER', 'DISTANCIA'],

  // Momo Hinamori
  ["Tobiume: Jardim em Chamas", 'OTHER', 'AREA'],

  // Izuru Kira
  ["Wabisuke: Peso Redobrado", 'OTHER', 'CORPO'],
  ["Wabisuke: Peso da Culpa", 'OTHER', 'CORPO'],
  ["Golpe do Desespero", 'OTHER', 'CORPO'],

  // Sosuke Aizen
  ["Kyōka Suigetsu: Reflexo Falso", 'OTHER', 'DISTANCIA'], // ilusão, não encosta
  ["Ilusão de Fragilidade", 'OTHER', 'DISTANCIA'],
  ["Transcendência", 'OTHER', 'DISTANCIA'],
  ["Kyōka Suigetsu: Corte Invisível", 'OTHER', 'CORPO'],

  // Yoruichi e Suì-Fēng
  ["Shunpo: Investida", 'OTHER', 'CORPO'],
  ["Vital Point Strike", 'OTHER', 'CORPO'],
  ["Suzumebachi Sting", 'OTHER', 'CORPO'],
  ["Nigeki Kessatsu: Death Sting", 'OTHER', 'CORPO'],

  // Chad
  ["El Directo", 'OTHER', 'DISTANCIA'], // rajada de energia do punho, a média distância
  ["Brazo Derecho del Gigante: Carga", 'OTHER', 'DISTANCIA'],
  ["Braço Esquerdo do Diabo", 'TAIJUTSU', 'CORPO'],
  ["Punho do Gigante", 'TAIJUTSU', 'CORPO'],
  ["Golpe de Braço Direito", 'TAIJUTSU', 'CORPO'],
  ["Investida Devastadora", 'TAIJUTSU', 'CORPO'],

  // Orihime Inoue
  ["Tsubaki: Koten Zanshun", 'OTHER', 'DISTANCIA'], // Tsubaki voa até o alvo
  ["Koten Zanshun: Corte Duplo", 'OTHER', 'DISTANCIA'],
  ["Shun Shun Rikka: Retorno", 'OTHER', 'DISTANCIA'],
  ["Rejeição do Evento", 'OTHER', 'DISTANCIA'],
  ["Sōten Kisshun: Negar o Golpe", 'OTHER', 'DISTANCIA'],
  ["Soco Reforçado", 'TAIJUTSU', 'CORPO'],

  // Uryū e Ryūken
  ["Ginrei Kojaku: Licht Regen", 'OTHER', 'DISTANCIA'],
  ["Seele Schneider", 'OTHER', 'CORPO'],

  // Espadas e Arrancar
  ["Desgarrón", 'OTHER', 'DISTANCIA'], // lâminas de reishi arremessadas
  ["Reckless Assault", 'OTHER', 'CORPO'],
  ["Los Lobos", 'OTHER', 'DISTANCIA'], // os lobos avançam e explodem
  ["Pack Tactics", 'OTHER', 'DISTANCIA'],
  ["Lanza del Relámpago", 'OTHER', 'DISTANCIA'], // arremessada
  ["Santa Teresa: Scythe Slash", 'OTHER', 'CORPO'],
  ["Gran Caída", 'OTHER', 'CORPO'],
  ["Bloodlust", 'OTHER', 'CORPO'],
  ["Respira: Decay", 'OTHER', 'DISTANCIA'], // um sopro que envelhece o que alcança
  ["Decaying Touch", 'OTHER', 'CORPO'],
  ["Golpe do Trono", 'OTHER', 'CORPO'],
  ["Nejibana no Kioku: Twin Cauldron", 'OTHER', 'CORPO'],
  ["Soul Devour", 'OTHER', 'CORPO'],
  ["Gabriel: Resurrection Experiment", 'OTHER', 'CORPO'], // renasce de dentro de quem tocou
  ["Fornicarás: Toxic Spore", 'OTHER', 'DISTANCIA'],
  ["Brujería: Multi-Strike", 'OTHER', 'DISTANCIA'],
  ["Amor: Paralysis", 'OTHER', 'DISTANCIA'],
  ["Ira: Rampage", 'OTHER', 'CORPO'],
  ["Crushing Blow", 'OTHER', 'CORPO'],
  ["Gigantic Fist", 'OTHER', 'CORPO'],
  ["Tiburón: Sawing Sharks", 'OTHER', 'DISTANCIA'],
  ["Angstroem: Terror Incarnate", 'OTHER', 'DISTANCIA'],
  ["Auswählen: Absolute Judgment", 'OTHER', 'AREA'],
  ["The Almighty's Strike", 'OTHER', 'CORPO'],
  ["Sonído Cortante", 'OTHER', 'CORPO'],
  ["Devorar Alma", 'OTHER', 'CORPO'],

  // Ryomen Sukuna
  ["Desmantelar", 'OTHER', 'DISTANCIA'], // Dismantle: o corte à distância
  ["Fenda", 'OTHER', 'CORPO'], // Cleave: exige contato fora do domínio
  ["Corte", 'OTHER', 'CORPO'],

  // Satoru Gojo
  ["Técnica Amaldiçoada Azul", 'OTHER', 'DISTANCIA'],
  ["Vermelho: Repulsão Invertida", 'OTHER', 'DISTANCIA'],
  ["Roxo: Imaginário", 'OTHER', 'DISTANCIA'],
  ["Limitless: Repulsão", 'OTHER', 'DISTANCIA'],

  // Suguru Geto
  ["Invocação em Massa", 'OTHER', 'AREA'],
  ["Dragão Arco-Íris", 'OTHER', 'CORPO'], // avança e esmaga com as mandíbulas
  ["Uzumaki: Redemoinho de Maldições", 'OTHER', 'DISTANCIA'], // as maldições comprimidas são disparadas
  ["Espírito Amaldiçoado Menor", 'OTHER', 'CORPO'],
  ["Corrosão Amaldiçoada", 'OTHER', 'DISTANCIA'],
  ["Deterioração Progressiva", 'OTHER', 'DISTANCIA'],

  // Megumi Fushiguro
  ["Shikigami: Cães Divinos", 'OTHER', 'CORPO'], // mordem e rasgam
  ["Shikigami: Nue", 'OTHER', 'CORPO'], // as asas elétricas atordoam no contato
  ["Shikigami: Sapo Amaldiçoado", 'OTHER', 'DISTANCIA'], // agarra com a língua de longe
  ["Shikigami: Max Elephant", 'OTHER', 'AREA'], // o Max Elephant inunda o campo

  // Hanami
  ["Floração Fatal", 'OTHER', 'AREA'],
  ["Semente da Morte", 'OTHER', 'DISTANCIA'],
  ["Raízes Estranguladoras", 'OTHER', 'DISTANCIA'],
  ["Broto Amaldiçoado", 'OTHER', 'DISTANCIA'],

  // Mahito
  ["Transfiguração Ociosa", 'OTHER', 'CORPO'], // precisa tocar a alma
  ["Corpo Distorcido", 'OTHER', 'CORPO'],
  ["Alma Multiplicada", 'OTHER', 'DISTANCIA'],

  // Nobara Kugisaki
  ["Ressonância", 'OTHER', 'DISTANCIA'], // fere à distância pela boneca
  ["Boneca de Palha", 'OTHER', 'DISTANCIA'],
  ["Ressonância Máxima: Hairpin", 'OTHER', 'DISTANCIA'],
  ["Prego Negro", 'OTHER', 'DISTANCIA'],
  ["Martelo e Prego", 'OTHER', 'CORPO'],

  // Yuji Itadori
  ["Ressonância de Sukuna", 'OTHER', 'CORPO'],

  // Dragon Ball
  ["Golpe Duplo de Ki", 'KI', 'CORPO'],
  ["Investida Fulminante", 'KI', 'CORPO'],
  ["Saiyan Onslaught", 'KI', 'CORPO'],
  ["Explosão de Aura", 'KI', 'AREA'],
  ["Estouro Final", 'KI', 'AREA'],
  ["Explosão Final", 'KI', 'AREA'], // Majin Vegeta explode o próprio corpo

  // Naruto
  ["Rasengan", 'NINJUTSU', 'CORPO'], // a esfera fica na mão
  ["Chidori", 'NINJUTSU', 'CORPO'], // o raio fica na mão
  ["Golpe do Clone", 'NINJUTSU', 'CORPO'],
  ["Enxame de Clones", 'NINJUTSU', 'CORPO'],

  // DC e Marvel
  ["Batarang Volley", 'OTHER', 'DISTANCIA'], // arremessados
  ["Análise de Padrão", 'OTHER', 'DISTANCIA'],
  ["Lasso of Truth", 'OTHER', 'DISTANCIA'],
  ["Laço da Verdade: Prender", 'OTHER', 'DISTANCIA'],
  ["Julgamento das Amazonas", 'OTHER', 'CORPO'],
  ["Telekinetic Slam", 'OTHER', 'DISTANCIA'], // telecinese
  ["Interferência Mental", 'OTHER', 'DISTANCIA'],
  ["Colapso Mental", 'OTHER', 'DISTANCIA'],
  ["Fúria Contida", 'OTHER', 'CORPO'],
  ["Impacto Concentrado", 'OTHER', 'CORPO'],
  ["Protocolo Torre de Vigia", 'OTHER', 'CORPO'],
  ["Plano de Contingência", 'OTHER', 'CORPO'],
  ["Gancho e Queda", 'OTHER', 'CORPO'],
  ["Merc com Boca Grande", 'OTHER', 'CORPO'],

  // Pokémon
  ["Charizard: Asa de Aço", 'OTHER', 'CORPO'], // Steel Wing é golpe de contato
  ["Pikachu: Investida Trovão", 'OTHER', 'CORPO'], // Volt Tackle é golpe de contato
  ["Snorlax: Corpo Pesado", 'OTHER', 'CORPO'], // Heavy Slam é golpe de contato
  ["Mega Rayquaza: Ascensão do Dragão", 'OTHER', 'CORPO'],
  ["Mega Charizard X: Garra de Dragão", 'OTHER', 'CORPO'], // Dragon Claw é golpe de contato // Dragon Ascent é golpe de contato

  // Solo Leveling
  ["Adaga do Monarca", 'OTHER', 'CORPO'],
  ["Exército das Sombras", 'OTHER', 'AREA'],
  ["Igris, Cavaleiro de Sangue", 'OTHER', 'CORPO'], // um cavaleiro de espada
  ["Beru, Formiga-Rei", 'OTHER', 'CORPO'], // garras
  ["Erguer: Soldado das Sombras", 'OTHER', 'CORPO'],
  ["Tank, Muralha de Ossos", 'OTHER', 'CORPO'],

  // Patolino
  ["Mine! Mine! Mine!", 'OTHER', 'CORPO'],
  ["Feitiço da Fúria Emplumada", 'OTHER', 'DISTANCIA'],

  // Fundamentos
  ["Finta", 'OTHER', 'CORPO'],
];

module.exports = { alcances };
