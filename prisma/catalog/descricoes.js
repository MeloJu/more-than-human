// Descrição de cada habilidade: a explicação que aparece no tooltip das ações.
//
// POR QUE EXISTE. 411 das 620 habilidades não tinham descrição nenhuma, e o
// tooltip abria mostrando só os efeitos em número — inclusive nas
// assinaturas, Getsuga Tenshō e Mugetsu. O número diz QUANTO; a descrição diz
// O QUE o golpe é e para que ele serve na luta.
//
// TRÊS REGRAS, e todas vêm de erros evitados:
//
//   1. SEM NÚMERO. O tooltip já mostra poder, precisão, recarga e cada efeito
//      com valor. Repetir aqui só garante que um dos dois fique desatualizado
//      no primeiro rebalanceamento — e o balanceamento muda de verdade.
//   2. FATO DA OBRA SÓ ONDE HÁ CERTEZA. Getsuga Tenshō, Kyōka Suigetsu e
//      Hakka no Togame são descritos pelo que são no mangá. Nome inventado
//      pelo jogo ("Aura Ardente", "Garra Corrosiva") é descrito pelo que o
//      golpe FAZ, sem fabricar lore para ele — um fato inventado com cara de
//      canônico é pior que nenhum.
//   3. O PAPEL NA LUTA SAI DO EFEITO REAL da habilidade (prende, drena, abre a
//      defesa, finaliza quem está fraco, prepara um combo), não do nome.
//
// Não confundir com `fala` (o que o personagem DIZ ao usar, no histórico).
// As frases do Deadpool e do Patolino são fala e moram em signatures.js.
//
// Formato: [nome, categoria, descrição]. Nome + categoria é a chave única da
// habilidade no banco.

const descricoes = [
  // ───────────────────────────── BLEACH ─────────────────────────────

  // Hollows e Arrancar (escada compartilhada pelos Espada)
  ['Cero Devastador', 'OTHER', 'Um Cero carregado até o limite. Explode no alvo e deixa a queimadura de reiatsu agindo por algumas rodadas.'],
  ['Cero Concentrado', 'OTHER', 'Um Cero comprimido num feixe estreito, que devolve parte do dano como vida.'],
  ['Bala Encadeada', 'OTHER', 'Disparos de Bala em sequência — a versão mais rápida e mais fraca do Cero. Deixa a ferida aberta.'],
  ['Cero', 'OTHER', 'O feixe de reiatsu concentrado que todo Hollow de alto nível dispara. Dano puro, sem efeito extra.'],
  ['Devorar Alma', 'OTHER', 'A fome do Hollow: arranca um pedaço da alma do alvo e o converte em vida.'],
  ['Cero Menor', 'OTHER', 'Um Cero curto, disparado sem carga. Barato, e por isso fácil de encaixar entre golpes maiores.'],
  ['Sonído Cortante', 'OTHER', 'Um corte desferido no meio do Sonído, o passo rápido dos Arrancar. Deixa o alvo mais lento.'],
  ['Mordida Voraz', 'OTHER', 'Uma mordida de Hollow que devolve um pouco do dano como vida.'],
  ['Garra Corrosiva', 'OTHER', 'A garra direta de um Hollow. O golpe mais básico do repertório.'],
  ['Carne Reconstituída', 'OTHER', 'A regeneração dos Hollows levada ao extremo: o corpo se reconstrói e recupera muita vida.'],
  ['Pele de Hierro', 'OTHER', 'Endurece o Hierro, a pele dos Arrancar, e reduz o dano recebido por algumas rodadas.'],
  ['Regeneração Instantânea', 'OTHER', 'A regeneração rápida que quase todo Hollow tem, fechando ferimentos no meio da luta.'],

  // Quincy (escada compartilhada)
  ['Letzt Stil', 'OTHER', 'Quincy: Letzt Stil, o último recurso dos Quincy. Um salto enorme de poder, pago com o próprio corpo, que fica mais lento.'],
  ['Flecha Absoluta', 'OTHER', 'Uma flecha de reishi disparada com toda a concentração, que abre a defesa do alvo.'],
  ['Chuva de Reishi', 'OTHER', 'Uma saraivada de flechas de reishi que cobre o campo.'],
  ['Tiro Perfurante', 'OTHER', 'Uma flecha estreita, feita para furar a guarda. Enfraquece a defesa do alvo.'],
  ['Salva de Flechas', 'OTHER', 'Várias flechas de reishi disparadas de uma vez.'],
  ['Ginto: Fagulha', 'OTHER', 'Um tubo de prata Gintō libera uma faísca de reishi que queima por algumas rodadas.'],
  ['Tiro Rápido', 'OTHER', 'Uma flecha disparada sem mira longa. Barata e confiável.'],
  ['Flecha de Reishi', 'OTHER', 'A flecha básica dos Quincy: reishi do ambiente moldado em projétil.'],
  ['Ginto: Corrente de Prata', 'OTHER', 'Um feitiço de Gintō que prende o alvo em correntes de prata, deixando-o sem agir.'],
  ['Endurecimento de Reishi', 'OTHER', 'Reishi condensado sobre o corpo, formando uma barreira.'],
  ['Passo do Vento', 'OTHER', 'O Hirenkyaku, o passo rápido dos Quincy, deixa o usuário mais veloz.'],
  ['Blut Arterie', 'OTHER', 'Blut Arterie: o reishi corre pelas veias e multiplica o ataque. É a metade ofensiva do Blut.'],

  // Humanos com Fullbring e poderes de rejeição (Chad e Orihime)
  ['Braço Esquerdo do Diabo', 'TAIJUTSU', 'Um golpe com toda a força do Fullbring. Devolve parte do dano como vida.'],
  ['Investida Devastadora', 'TAIJUTSU', 'Avança com o corpo inteiro atrás do golpe.'],
  ['Punho do Gigante', 'TAIJUTSU', 'Um soco carregado com a força do Fullbring.'],
  ['Golpe de Braço Direito', 'TAIJUTSU', 'Um golpe rápido com o braço direito.'],
  ['Soco Reforçado', 'TAIJUTSU', 'Um soco comum, reforçado pelo reiatsu.'],
  ['Barreira Impenetrável', 'OTHER', 'Uma barreira que absorve uma quantidade enorme de dano.'],
  ['Escudo Triplo', 'OTHER', 'Três camadas de proteção sobrepostas diante do corpo.'],
  ['Guarda Firme', 'OTHER', 'O fundamento de toda luta: firmar a base e se proteger. A defesa sobe.'],
  ['Guarda Firme', 'TAIJUTSU', 'Uma posição defensiva que ergue uma proteção leve.'],
  ['Postura de Contra-ataque', 'TAIJUTSU', 'Espera o golpe chegar e devolve parte dele.'],
  ['Rejeição do Destino', 'OTHER', 'Rejeita o ferimento como se ele nunca tivesse acontecido, recuperando vida.'],
  ['Recusa Absoluta', 'OTHER', 'Rejeição total: recupera muita vida e devolve o próximo golpe recebido.'],
  ['Rejeição Menor', 'OTHER', 'Uma rejeição pequena, que fecha ferimentos leves.'],

  // Aaroniero Arruruerie
  ['Nejibana no Kioku: Twin Cauldron', 'OTHER', 'Aaroniero empunha Nejibana, a lança tirada da memória de Kaien Shiba, que ele devorou. O golpe devolve parte do dano como vida.'],
  ['Soul Devour', 'OTHER', 'Glotonería devora um pedaço da alma do alvo e o converte em vida.'],
  ['Cauldron Shield', 'OTHER', 'A massa de Hollows absorvidos se fecha sobre ele como uma carapaça.'],
  ['Absorbed Mass', 'OTHER', 'Reforça o corpo com os Hollows que devorou e fica mais resistente por algumas rodadas.'],

  // As Nödt
  ['Arrow of Fear', 'OTHER', 'Uma flecha que injeta o medo no alvo — o poder de As Nödt, "The Fear". Quem é atingido ataca com menos força.'],
  ['Angstroem: Terror Incarnate', 'OTHER', 'O medo em estado bruto. Derruba o ataque e a defesa do alvo de uma vez.'],
  ["Predator's Patience", 'OTHER', 'Espera a hora certa, como um predador, e fica mais rápido.'],
  ['Paralyzing Screech', 'OTHER', 'Um grito que trava o alvo de pavor e o deixa sem agir.'],

  // Baraggan Luisenbarn
  ['Golpe do Trono', 'OTHER', 'O Rei de Hueco Mundo esmaga o adversário com o peso da própria autoridade.'],
  ['Respira: Decay', 'OTHER', 'Respira, o sopro do envelhecimento: apodrece o que toca e abre a defesa. É letal contra quem já está fraco.'],
  ['Decaying Touch', 'OTHER', 'Um toque que envelhece o que encontra. O alvo continua definhando por algumas rodadas.'],
  ["King's Authority", 'OTHER', 'Baraggan se ergue como o rei que diz ser, e a defesa sobe.'],

  // Bazz-B
  ['Burner Finger 1: Max', 'OTHER', 'Burner Finger 1 no máximo: uma lâmina de fogo disparada do dedo, que queima por várias rodadas.'],
  ['Burner Finger', 'OTHER', 'Chamas disparadas da ponta dos dedos — o poder de Bazz-B, "The Heat". Queima o alvo.'],
  ['Scorching Strike', 'OTHER', 'Um golpe de calor concentrado que deixa queimadura.'],
  ['Heat Wave', 'OTHER', 'Bazz-B eleva a temperatura em volta e o ataque sobe.'],

  // Byakuya Kuchiki
  ['Senbonzakura Kageyoshi', 'OTHER', 'O Bankai de Byakuya: incontáveis lâminas em forma de pétalas de cerejeira cercam o alvo e abrem a defesa dele.'],
  ['Senbonzakura', 'OTHER', 'A Shikai de Byakuya: a lâmina se desfaz em mil pétalas cortantes, que continuam ferindo por algumas rodadas.'],
  ['Shukumei', 'OTHER', 'Um corte direto e preciso, sem nenhum movimento desperdiçado.'],
  ['Orgulho dos Kuchiki', 'OTHER', 'O orgulho da casa Kuchiki: ataque e defesa sobem ao mesmo tempo.'],

  // Chad
  ['El Directo', 'OTHER', 'O soco direto do Brazo Derecha de Gigante. Rende muito mais logo depois de carregar o braço.'],
  ['Brazo Derecho del Gigante: Carga', 'OTHER', 'Chad concentra força no braço do gigante e abre a defesa do alvo. Prepara o El Directo.'],
  ['Brazo Izquierda del Diablo: Guard', 'OTHER', 'O braço do diabo cruzado na frente do corpo como barreira.'],
  ['Iron Resolve', 'OTHER', 'A determinação de Chad em proteger os amigos. A defesa sobe.'],

  // Coyote Starrk
  ['Los Lobos', 'OTHER', 'A Resurrección de Starrk: os lobos de Lilynette atacam em matilha, drenam vida e são letais contra quem já está fraco.'],
  ['Cero Metralleta', 'OTHER', 'Uma rajada de centenas de Ceros de uma vez. Atravessa parte da defesa.'],
  ['Pack Tactics', 'OTHER', 'Um ataque em matilha que abre a defesa do alvo.'],
  ["Lone Wolf's Focus", 'OTHER', 'O lobo solitário se concentra: ataque e velocidade sobem.'],

  // Gin Ichimaru
  ['Kamishini no Yari', 'OTHER', 'O Bankai de Gin: a lâmina se estende numa velocidade absurda e atravessa o alvo, que fica sem reação.'],
  ['Shinsō: Investida', 'OTHER', 'Shinsō, a Shikai de Gin, se estende de repente num golpe à distância.'],
  ['Sorriso Enganoso', 'OTHER', 'O sorriso de raposa de Gin desarma o adversário, que passa a atacar com menos força.'],
  ['Farsa Calculada', 'OTHER', 'Gin finge abrir a guarda e devolve o golpe.'],

  // Grimmjow Jaegerjaquez
  ['Gran Rey Cero', 'OTHER', 'O Cero exclusivo dos Espada, misturado ao próprio sangue. Atravessa parte da defesa e rende muito mais logo depois de um Desgarrón.'],
  ['Desgarrón', 'OTHER', 'As garras da Pantera, a Resurrección de Grimmjow, liberam lâminas de energia. Prepara o Gran Rey Cero.'],
  ['Reckless Assault', 'OTHER', 'Um ataque sem guarda nenhuma: bate forte e abre a própria defesa.'],
  ["Predator's Instinct", 'OTHER', 'O instinto de pantera toma conta, e o ataque sobe.'],

  // Ichigo Kurosaki
  ['Mugetsu', 'OTHER', 'A forma final do Getsuga Tenshō: Ichigo se torna o próprio golpe, uma escuridão que corta tudo. O corte continua ferindo depois.'],
  ['Getsuga Tenshō Negro', 'OTHER', 'O Getsuga Tenshō do Bankai, carregado com o reiatsu do Hollow. Quebra a defesa do alvo.'],
  ['Tensa Zangetsu: Final Getsuga', 'OTHER', 'O golpe em que Ichigo entrega tudo: dano enorme, pago com a própria defesa.'],
  ['Getsuga Tenshō', 'OTHER', 'O golpe que define o Ichigo: Zangetsu libera o reiatsu da lâmina numa onda em forma de lua crescente. Atravessa parte da defesa e rende muito mais logo depois de concentrar o Bankai.'],
  ['Zangetsu: Investida Feroz', 'OTHER', 'Avança fechando a distância e corta no mesmo movimento.'],
  ['Getsuga Jūjishō', 'OTHER', 'Dois Getsuga Tenshō cruzados em forma de cruz. Converte parte do dano em vida.'],
  ['Máscara Hollow', 'OTHER', 'Ichigo puxa a máscara do Hollow interior e já ataca com ela: ataque e velocidade sobem por algumas rodadas.'],
  ['Zangetsu: Corte Ascendente', 'OTHER', 'Um corte de baixo para cima com Zangetsu. Barato e confiável.'],
  ['Zangetsu Parry', 'OTHER', 'Ichigo segura a lâmina na diagonal e devolve parte do golpe que recebe.'],
  ['Bankai Focus', 'OTHER', 'Concentra o reiatsu do Bankai: ataque e velocidade sobem. Prepara o Getsuga Tenshō.'],

  // Izuru Kira
  ['Golpe do Desespero', 'OTHER', 'Um corte melancólico, como o do próprio Kira, que deixa um ferimento envenenado.'],
  ['Wabisuke: Peso Redobrado', 'OTHER', 'Wabisuke, a Shikai de Kira, dobra o peso de tudo o que corta. O alvo, pesado, passa a atacar com menos força.'],
  ['Máscara de Indiferença', 'OTHER', 'Kira se fecha na própria melancolia e ergue uma barreira.'],

  // Jūshirō Ukitake
  ['Vontade de Quem Sobrevive', 'OTHER', 'A vontade de um capitão doente que nunca desistiu. Um golpe das lâminas gêmeas que drena muita vida.'],
  ['Corte das Lâminas Gêmeas', 'OTHER', 'Sōgyo no Kotowari corta com as duas lâminas de uma vez e abre a defesa do alvo.'],
  ['Absorver e Retornar', 'OTHER', 'Sōgyo no Kotowari absorve o ataque por uma lâmina e o devolve pela outra, drenando vida.'],
  ['Dual Strike Barrage', 'OTHER', 'Uma sequência de cortes com as duas lâminas. Converte parte do dano em vida.'],
  ['Sōgyo no Kotowari: Devolver', 'OTHER', 'Devolve um golpe absorvido, e o alvo sai enfraquecido.'],
  ['Sōgyo no Kotowari: Twin Blade', 'OTHER', 'Um corte das duas lâminas, ligadas por uma corda com talismãs.'],
  ['Twin Blade Guard', 'OTHER', 'As lâminas gêmeas cruzadas como barreira.'],
  ['Resilient Spirit', 'OTHER', 'Ukitake resiste à própria doença e recupera um pouco de vida.'],

  // Kaname Tōsen
  ['Suzumushi Tsuishiki: Enma Kōrogi', 'OTHER', 'O Bankai de Tōsen: uma cúpula onde o alvo perde visão, audição, olfato e a noção de reiatsu, e fica sem reação. Rende muito mais logo depois do Grito.'],
  ['Suzumushi: Grito', 'OTHER', 'O som da Shikai de Tōsen, que desnorteia quem ouve. Prepara o Enma Kōrogi.'],
  ['Blind Justice', 'OTHER', 'A justiça cega de Tōsen encontra a brecha e abre a defesa do alvo.'],
  ['Righteous Guard', 'OTHER', 'Tōsen espera o golpe e devolve parte dele.'],

  // Kenpachi Zaraki
  ['Nozarashi', 'OTHER', 'Nozarashi, a Zanpakutō de Kenpachi, finalmente responde a ele: um corte com tanta força que a própria guarda cai.'],
  ['Fio Cego', 'OTHER', 'Um corte bruto, sem técnica nenhuma. Kenpachi nunca precisou de técnica.'],
  ['Teimosia de Kenpachi', 'OTHER', 'Kenpachi se recusa a cair: o golpe devolve parte do dano como vida.'],
  ['Pressão Assassina', 'OTHER', 'O reiatsu esmagador de Kenpachi paralisa o adversário, que fica sem agir.'],
  ['Remover o Tapa-Olho', 'OTHER', 'Kenpachi tira o tapa-olho que devorava o próprio reiatsu, e o ataque dispara.'],

  // Kisuke Urahara
  ['Kannonbiraki Benihime Aratame', 'OTHER', 'O Bankai de Urahara reestrutura tudo o que toca, até o próprio corpo. Atravessa a defesa e converte parte do dano em vida.'],
  ['Benihime: Crimson Strike', 'OTHER', 'Benihime dispara uma lâmina de energia carmesim.'],
  ['Benihime: Corte Certeiro', 'OTHER', 'Um corte preciso de Benihime. Rende muito mais contra quem está preso.'],
  ["Shopkeeper's Trick", 'OTHER', 'Um truque do dono da loja: abre a defesa do alvo e o deixa sem reação.'],
  ['Benihime: Muralha Carmesim', 'OTHER', 'Chikasumi no Tate: Benihime ergue um escudo hexagonal de energia.'],
  ['Calculated Counter', 'OTHER', 'Urahara já tinha previsto o golpe e devolve parte dele.'],

  // Mayuri Kurotsuchi
  ['Konjiki Ashisogi Jizō', 'OTHER', 'O Bankai de Mayuri: uma larva gigante que exala veneno e desmancha a defesa do alvo.'],
  ['Ashisogi Jizō Spores', 'OTHER', 'O veneno de Ashisogi Jizō, a Shikai de Mayuri, que continua agindo por algumas rodadas.'],
  ['Cobaia Descartável', 'OTHER', 'Mayuri trata o adversário como experimento, e ele passa a atacar com menos força.'],
  ['Corpo Descartável', 'OTHER', 'Mayuri se remenda como faria com qualquer experimento, recuperando um pouco de vida.'],

  // Momo Hinamori
  ['Tobiume: Jardim em Chamas', 'OTHER', 'Tobiume espalha bolas de fogo por toda a área, e a queimadura continua por algumas rodadas.'],
  ['Tobiume: Flores Gêmeas', 'OTHER', 'Duas bolas de fogo de Tobiume disparadas ao mesmo tempo.'],
  ['Tobiume: Explosão em Cadeia', 'OTHER', 'Bolas de fogo em sequência, que deixam queimadura.'],
  ['Tobiume: Plum Blossom Fire', 'OTHER', 'O fogo de Tobiume, a Shikai de Momo. Queima por algumas rodadas.'],
  ['Tobiume: Faísca', 'OTHER', 'Uma faísca rápida de Tobiume. Barata.'],
  ['Kido Focus', 'OTHER', 'Momo, especialista em kidō, concentra o reiatsu, e o ataque sobe.'],

  // Nnoitra Gilga
  ['Gran Caída', 'OTHER', 'Uma foice que cai com todo o peso do corpo. Deixa o alvo sangrando e abre a guarda de quem ataca.'],
  ['Santa Teresa: Scythe Slash', 'OTHER', 'Um corte de foice de Santa Teresa, a Resurrección de seis braços de Nnoitra.'],
  ['Bloodlust', 'OTHER', 'A sede de luta de Nnoitra: o golpe devolve parte do dano como vida.'],
  ['Arrogant Pressure', 'OTHER', 'A arrogância do Quinto Espada intimida o alvo, que passa a atacar com menos força.'],

  // Orihime Inoue
  ['Sōten Kisshun: Negar o Golpe', 'OTHER', 'Orihime rejeita o próprio ferimento enquanto ataca: drena vida e abre a defesa do alvo.'],
  ['Rejeição do Evento', 'OTHER', 'Orihime rejeita o que acabou de acontecer, e o alvo sai enfraquecido.'],
  ['Shun Shun Rikka: Retorno', 'OTHER', 'As seis fadas do grampo de Orihime devolvem o dano causado como vida.'],
  ['Koten Zanshun: Corte Duplo', 'OTHER', 'Tsubaki, a fada do ataque, corta o alvo e abre a defesa dele.'],
  ['Tsubaki: Koten Zanshun', 'OTHER', 'Koten Zanshun: Tsubaki, a única fada ofensiva, voa até o alvo e o corta.'],
  ['Santen Kesshun', 'OTHER', 'Três fadas formam um escudo triangular que repele os golpes.'],
  ['Sōten Kisshun', 'OTHER', 'Duas fadas formam um escudo oval que rejeita o ferimento e recupera vida.'],
  ['Dance of the Heavens: Full Reject', 'OTHER', 'Sōten Kisshun na potência máxima: rejeita quase todo o dano sofrido.'],
  ['Encouraging Words', 'OTHER', 'Orihime encoraja quem está do lado dela, e a defesa sobe.'],
  ['Sōten Kisshun: Rejeitar a Morte', 'OTHER', 'Orihime rejeita até a queda de um aliado e o traz de volta à luta.'],

  // Rangiku Matsumoto
  ['Haineko: Corrosão Total', 'OTHER', 'A nuvem de cinzas de Haineko envolve o alvo inteiro: corta por algumas rodadas e o deixa mais lento.'],
  ['Haineko: Lâmina de Pó', 'OTHER', 'A cinza de Haineko se fecha numa lâmina e abre a defesa do alvo.'],
  ['Haineko: Tempestade', 'OTHER', 'Uma tempestade de cinzas cortantes que continua ferindo.'],
  ['Growl, Haineko', 'OTHER', 'Unare, Haineko: a lâmina se desfaz em cinza, que corta por algumas rodadas.'],
  ['Haineko: Cinza nos Olhos', 'OTHER', 'A cinza entra nos olhos do alvo, que passa a atacar com menos força.'],
  ['Haineko: Ash Slash', 'OTHER', 'Um corte de cinza direto.'],
  ['Ash Veil', 'OTHER', 'Um véu de cinza entre Rangiku e o golpe.'],
  ['Flashy Confidence', 'OTHER', 'A confiança despreocupada de Rangiku: ataque e velocidade sobem.'],

  // Renji Abarai
  ['Hihio Zabimaru', 'OTHER', 'O Bankai de Renji: uma serpente gigante de ossos que morde e deixa o alvo sangrando.'],
  ['Zabimaru: Chicotada', 'OTHER', 'Zabimaru se estende como um chicote de lâminas segmentadas e deixa ferida aberta.'],
  ['Determinação de Superar', 'OTHER', 'Renji aperta os dentes para alcançar quem está acima dele, e o ataque sobe.'],
  ['Lealdade Inabalável', 'OTHER', 'A lealdade de Renji vira escudo.'],

  // Retsu Unohana
  ['Minazuki: Verdadeira Forma', 'OTHER', 'A verdadeira Minazuki, que Unohana escondeu por séculos: um corte que deixa o alvo sangrando por algumas rodadas.'],
  ['Corte que Cura e Mata', 'OTHER', 'Unohana corta com a mesma precisão com que cura. O alvo sai enfraquecido.'],
  ['Glimpse of the True Blade', 'OTHER', 'Um vislumbre da primeira Kenpachi por trás da capitã gentil. O corte continua ferindo.'],
  ['A Primeira Kenpachi', 'OTHER', 'Yachiru Unohana, a primeira Kenpachi, volta à tona num corte que drena muita vida.'],
  ['Minazuki: Lâmina Serena', 'OTHER', 'Um corte calmo e preciso, que deixa o alvo mais lento.'],
  ['Calm Composure', 'OTHER', 'A calma inabalável da capitã do 4º Esquadrão. A defesa sobe.'],
  ['Minazuki: Ventre que Cura', 'OTHER', 'Minazuki, a arraia de Unohana, engole um aliado caído e o devolve à luta curado.'],
  ['Minazuki: Mist Balm', 'OTHER', 'A névoa curativa de Minazuki forma uma barreira.'],
  ['Healing Touch', 'OTHER', 'O kidō de cura do 4º Esquadrão.'],

  // Rukia Kuchiki
  ['Hakka no Togame', 'OTHER', 'O Bankai de Rukia congela tudo em volta dela no zero absoluto, e o frio continua agindo por algumas rodadas.'],
  ['San no Mai: Shirafune', 'OTHER', 'A terceira dança: uma lâmina de gelo se forma na ponta da espada, e o mesmo gelo protege Rukia.'],
  ['Tsugi no Mai: Hakuren', 'OTHER', 'A segunda dança: uma onda de gelo que congela o alvo, deixando-o sem agir e mais lento.'],
  ['Sode no Shirayuki: Lâmina de Gelo', 'OTHER', 'Um corte gélido de Sode no Shirayuki. Rende muito mais contra quem está congelado.'],
  ['Dance of the White Moon', 'OTHER', 'Some no Mai: Tsukishiro, a primeira dança, congela um círculo em volta de Rukia como barreira.'],
  ['Sode no Shirayuki: Some Snow', 'OTHER', 'A neve de Sode no Shirayuki deixa o alvo mais lento.'],

  // Ryūken Ishida
  ['Precision Shot', 'OTHER', 'Um tiro calculado do Quincy mais frio da família Ishida.'],
  ['Silver Arrow Barrage', 'OTHER', 'Uma saraivada de flechas prateadas que deixa ferida aberta.'],
  ['Cold Calculation', 'OTHER', 'Ryūken lê o adversário como um diagnóstico, e ele passa a atacar com menos força.'],
  ["Doctor's Composure", 'OTHER', 'A calma de médico: espera o golpe e devolve parte dele.'],

  // Sajin Komamura
  ['Kokujō Tengen Myōō', 'OTHER', 'O Bankai de Komamura: um gigante de armadura que repete cada movimento dele e o protege com o próprio corpo.'],
  ['Tenken Strike', 'OTHER', 'Tenken, a Shikai de Komamura, invoca um braço gigante que golpeia junto com ele.'],
  ["Guardian's Resolve", 'OTHER', 'A lealdade de Komamura vira escudo.'],
  ['Iron Wall', 'OTHER', 'Komamura firma o corpo como uma muralha, e a defesa sobe muito.'],

  // Shunsui Kyōraku
  ['Bushōgoma', 'OTHER', 'Uma das brincadeiras de Katen Kyōkotsu: o vento que sopra do movimento da lâmina. Abre a defesa do alvo.'],
  ['Katen Kyōkotsu: Twin Strike', 'OTHER', 'As duas lâminas de Katen Kyōkotsu atacam juntas.'],
  ['Flower Wind Rondo', 'OTHER', 'Shunsui dança entre as pétalas e fica mais rápido.'],
  ['Lazy Confidence', 'OTHER', 'A preguiça é fachada: Shunsui devolve o golpe quando ninguém espera.'],

  // Sōsuke Aizen
  ['Transcendência', 'OTHER', 'Aizen além do Hōgyoku, acima de Shinigami e Hollow. Arrasa a defesa do alvo.'],
  ['Ilusão de Fragilidade', 'OTHER', 'Kyōka Suigetsu mostra ao alvo uma guarda que não existe, e a defesa de verdade cai.'],
  ['Kyōka Suigetsu: Reflexo Falso', 'OTHER', 'Kyōka Suigetsu mostra ao alvo um reflexo falso, e ele ataca com menos força.'],
  ['Kyōka Suigetsu: Corte Invisível', 'OTHER', 'Um corte que o alvo não vê chegar.'],
  ['Tudo Conforme o Plano', 'OTHER', 'Tudo aconteceu conforme o plano de Aizen. Ele devolve o golpe.'],
  ['Kyōka Suigetsu: Complete Hypnosis', 'OTHER', 'A hipnose completa de Kyōka Suigetsu toma os cinco sentidos do alvo, que passa a atacar muito mais fraco.'],
  ['Hōgyoku: Evolução', 'OTHER', 'O Hōgyoku responde à vontade de Aizen e o faz evoluir: ataque e defesa sobem.'],

  // Suì-Fēng
  ['Suzumebachi Sting', 'OTHER', 'A ferroada de Suzumebachi, a Shikai de Suì-Fēng.'],
  ['Nigeki Kessatsu: Death Sting', 'OTHER', 'Nigeki Kessatsu: dois golpes no mesmo ponto matam. O veneno age por algumas rodadas e é letal contra quem já está fraco.'],
  ["Assassin's Debuff", 'OTHER', 'A comandante das Forças Especiais acha o ponto fraco e abre a defesa do alvo.'],
  ['Shunkō Assault', 'OTHER', 'Suì-Fēng ativa o Shunkō, reiatsu nas costas e nos ombros: velocidade e ataque sobem.'],

  // Szayelaporro Granz
  ['Gabriel: Resurrection Experiment', 'OTHER', 'Gabriel: Szayelaporro renasce de dentro do alvo, que sai com a defesa arrasada.'],
  ['Fornicarás: Toxic Spore', 'OTHER', 'Os esporos de Fornicarás, a Resurrección de Szayelaporro, continuam agindo por algumas rodadas.'],
  ['Self-Regeneration', 'OTHER', 'O cientista se regenera com a própria tecnologia.'],
  ['Analytical Mind', 'OTHER', 'Szayelaporro analisa o adversário, que passa a atacar com menos força.'],

  // Zommari Rureaux
  ['Amor: Paralysis', 'OTHER', 'Amor, o poder de Zommari: os olhos marcam o alvo e tomam o controle do corpo dele, que fica sem agir.'],
  ['Brujería: Multi-Strike', 'OTHER', 'Brujería, a Resurrección de Zommari, ataca com vários golpes de uma vez. Rende muito mais contra quem está preso.'],
  ['All-Seeing Focus', 'OTHER', 'Os olhos espalhados pelo corpo veem tudo em volta, e a velocidade sobe.'],
  ['Binding Gaze', 'OTHER', 'Um olhar que prende os movimentos do alvo e o deixa mais lento.'],

  // Tia Harribel
  ['Tiburón: Sawing Sharks', 'OTHER', 'Tiburón, a Resurrección de Harribel: lâminas de água em rotação cortam o alvo por algumas rodadas. Rende muito mais logo depois de uma Ola Azul.'],
  ['Ola Azul', 'OTHER', 'A onda azul: uma lâmina de energia que atravessa parte da defesa. Prepara o Tiburón.'],
  ['Tidal Focus', 'OTHER', 'Harribel reúne a água em volta, e a defesa sobe.'],
  ['Glacial Barrier', 'OTHER', 'Uma parede de água e gelo que protege Harribel.'],

  // Tōshirō Hitsugaya
  ['Hyōten Hyakkasō', 'OTHER', 'Cem flores de gelo caem do céu: quem é tocado congela por inteiro e fica sem reação.'],
  ['Sōten ni Zase', 'OTHER', 'Sōten ni Zase, Hyōrinmaru: o dragão de gelo da Shikai congela o alvo por algumas rodadas e o deixa mais lento.'],
  ['Hyōrinmaru: Ice Blade', 'OTHER', 'Um corte gélido de Hyōrinmaru. Rende muito mais contra quem está congelado.'],
  ['Frost Armor', 'OTHER', 'O gelo cobre o corpo e forma uma armadura.'],

  // Ulquiorra Cifer
  ['Cero Oscuras', 'OTHER', 'O Cero negro de Ulquiorra, disparado na forma liberada. É letal contra quem já está fraco.'],
  ['Lanza del Relámpago', 'OTHER', 'A lança de relâmpago de Murciélago. Atravessa parte da defesa e converte parte do dano em vida.'],
  ['Hierro Skin', 'OTHER', 'O Hierro de Ulquiorra, uma pele dura como aço.'],
  ['Emotionless Precision', 'OTHER', 'Sem emoção nenhuma, Ulquiorra desmonta os ataques do adversário, que passa a bater com menos força.'],

  // Uryū Ishida
  ['Ginrei Kojaku: Licht Regen', 'OTHER', 'Licht Regen, a chuva de luz: o arco Ginrei Kojaku dispara centenas de flechas e abre a defesa do alvo.'],
  ['Hirenkyaku Shot', 'OTHER', 'Um tiro disparado em pleno Hirenkyaku.'],
  ['Seele Schneider', 'OTHER', 'A espada de reishi dos Quincy, que corta como uma serra e deixa ferida aberta.'],
  ['Blut Vene', 'OTHER', 'Blut Vene: o reishi nas veias endurece o corpo e devolve parte do golpe recebido.'],
  ['Quincy Focus', 'OTHER', 'Uryū concentra o reishi, e o ataque sobe.'],

  // Yamamoto Genryūsai
  ['Zanka no Tachi: Cremation', 'OTHER', 'Zanka no Tachi: o calor do sol inteiro concentrado no gume. Queima por algumas rodadas e rende muito mais logo depois da Ativação.'],
  ['Ryūjin Jakka: Flame Strike', 'OTHER', 'As chamas de Ryūjin Jakka, a Zanpakutō de fogo mais poderosa da Soul Society.'],
  ['Zanka no Tachi: Ativação', 'OTHER', 'Yamamoto recolhe todas as chamas para dentro da lâmina: ataque e defesa sobem. Prepara a Cremação.'],

  // Yammy Llargo
  ['Ira: Rampage', 'OTHER', 'Ira, a Resurrección de Yammy, que cresce junto com a raiva. Destruição pura.'],
  ['Gigantic Fist', 'OTHER', 'Um soco do tamanho de um prédio.'],
  ['Crushing Blow', 'OTHER', 'Um golpe esmagador que amassa a defesa do alvo.'],
  ['Overwhelming Size', 'OTHER', 'Yammy cresce, e o ataque sobe.'],

  // Yhwach
  ['Auswählen: Absolute Judgment', 'OTHER', 'Auswählen: Yhwach toma de volta o poder dos Quincy que julga indignos. Arrasa a defesa do alvo.'],
  ["The Almighty's Strike", 'OTHER', 'Um golpe de quem enxerga o futuro.'],
  ["The Almighty's Foresight", 'OTHER', 'The Almighty enxerga todos os futuros possíveis e devolve o golpe antes dele chegar.'],
  ['Der Sarg: Distortion', 'OTHER', 'Uma distorção no reishi do alvo, que passa a atacar com menos força.'],

  // Yoruichi Shihōin
  ['Shunkō', 'OTHER', 'O Shunkō, técnica que Yoruichi criou: kidō concentrado nas costas e nos ombros. A velocidade sobe.'],
  ['Shunpo: Investida', 'OTHER', 'A Deusa do Flash avança em Shunpo e atravessa parte da defesa.'],
  ['Vital Point Strike', 'OTHER', 'Um golpe no ponto vital, que devolve parte do dano como vida.'],
  ['Goddess of Flash', 'OTHER', 'A Deusa do Flash em ação: velocidade e ataque sobem juntos.'],
  ['Utsusemi', 'OTHER', 'Utsusemi: Yoruichi deixa uma casca vazia no lugar dela e contra-ataca.'],
  // ───────────────────────── JUJUTSU KAISEN ─────────────────────────
  //
  // Expansão de Domínio tem regra própria no motor, e a descrição diz qual:
  // enquanto o domínio está aberto a técnica acerta sempre e bate mais forte,
  // e dois domínios se disputam — o mais forte fica, o outro cai atordoado.

  // Fundamentos (escada compartilhada por quem luta sem técnica própria)
  ['Golpe Decisivo', 'OTHER', 'O golpe que o treino inteiro prepara: acerta com o peso do corpo e abre a defesa do alvo.'],
  ['Investida Total', 'TAIJUTSU', 'Avança sem segurar nada e bate com tudo.'],
  ['Sequência de Chutes', 'TAIJUTSU', 'Uma série de chutes sem pausa entre eles.'],
  ['Joelhada Ascendente', 'TAIJUTSU', 'Uma joelhada de baixo para cima, curta e pesada.'],
  ['Cotovelada', 'TAIJUTSU', 'Um golpe curto de cotovelo, para quando o alvo está perto demais.'],
  ['Chute Baixo', 'TAIJUTSU', 'Um chute rápido na perna. O golpe mais barato do repertório.'],
  ['Finta', 'OTHER', 'Mostra um golpe e desfere outro. O alvo, enganado, ataca com menos força.'],
  ['Fôlego Renovado', 'OTHER', 'Recupera o fôlego no meio da luta e um pouco de vida junto.'],
  ['Esquiva Lateral', 'OTHER', 'Sai da linha do golpe e fica mais rápido.'],
  ['Concentração', 'OTHER', 'Respira e mira. O ataque sobe.'],
  ['Golpe de Contra', 'OTHER', 'Espera o golpe chegar e devolve parte dele.'],

  // Hanami
  ['Floração Fatal', 'OTHER', 'Hanami faz florescer o campo inteiro de uma vez, e as plantas continuam drenando o alvo por algumas rodadas.'],
  ['Semente da Morte', 'OTHER', 'Uma semente plantada no alvo que cresce sugando a energia amaldiçoada dele.'],
  ['Raízes Estranguladoras', 'OTHER', 'Raízes brotam do chão e prendem as pernas do alvo, que fica mais lento.'],
  ['Broto Amaldiçoado', 'OTHER', 'Um broto rápido, disparado do braço de Hanami.'],
  ['Casca de Madeira Viva', 'OTHER', 'Hanami cobre o corpo de madeira, uma casca que aguenta muito dano.'],

  // Jogo
  ['Maelstrom', 'OTHER', 'Uma torrente de fogo e lava que engole o alvo. Dano puro.'],
  ['Erupção', 'OTHER', 'Jogo faz o chão explodir em lava debaixo do alvo, e a queimadura continua por algumas rodadas.'],
  ['Expansão de Domínio: Vulcão Fechado', 'OTHER', 'Caixão da Montanha de Ferro: Jogo prende o alvo dentro de um vulcão, onde o calor queima por algumas rodadas. Dentro do domínio a técnica acerta sempre e bate mais forte.'],
  ['Meteoro Menor', 'OTHER', 'Uma rocha em chamas que cai do alto e deixa queimadura.'],
  ['Brasa', 'OTHER', 'Uma brasa jogada de perto. Barata.'],

  // Mahito
  ['Corpo Espiritual Instantâneo', 'OTHER', 'Corpo Espiritual Instantâneo da Morte Distorcida: Mahito remodela a própria alma na forma mais letal que consegue, e fica mais rápido.'],
  ['Alma Multiplicada', 'OTHER', 'Mahito divide e junta almas num golpe que continua deformando o alvo por algumas rodadas.'],
  ['Expansão de Domínio: Bairro Autoencarnado', 'OTHER', 'Autoencarnação da Perfeição: dentro do domínio de Mahito, a Transfiguração Ociosa alcança a alma do alvo sem precisar de toque. A técnica acerta sempre e bate mais forte.'],
  ['Corpo Distorcido', 'OTHER', 'Mahito deforma o corpo do alvo, que passa a atacar com menos força.'],
  ['Transfiguração Ociosa', 'OTHER', 'A técnica de Mahito: tocar a alma e mudar a forma do corpo junto com ela.'],

  // Megumi Fushiguro
  ['Shikigami: Touro Máximo', 'OTHER', 'O maior dos shikigami de Megumi, que esmaga o alvo com o próprio peso.'],
  ['Shikigami: Sapo Amaldiçoado', 'OTHER', 'O sapo das Dez Sombras agarra o alvo com a língua, e o golpe continua ferindo por algumas rodadas.'],
  ['Expansão de Domínio: Jardim Sombrio', 'OTHER', 'Jardim das Sombras Quiméricas: Megumi inunda tudo de sombra e ataca de qualquer lado. O alvo sai enfraquecido, e dentro do domínio a técnica acerta sempre e bate mais forte.'],
  ['Shikigami: Cães Divinos', 'OTHER', 'Os Cães Divinos, os primeiros shikigami de Megumi, atacam juntos.'],
  ['Shikigami: Nue', 'OTHER', 'Nue, o pássaro elétrico das Dez Sombras, dá um rasante que deixa o alvo mais lento.'],

  // Nobara Kugisaki
  ['Prego Negro', 'OTHER', 'Um prego cravado com toda a energia amaldiçoada que Nobara tem. Arrasa a defesa do alvo.'],
  ['Ressonância Máxima: Hairpin', 'OTHER', 'Hairpin: os pregos fincados no alvo explodem todos juntos.'],
  ['Boneca de Palha', 'OTHER', 'A técnica de Nobara: o que ela faz na boneca de palha acontece com o alvo, que continua sofrendo por algumas rodadas.'],
  ['Ressonância', 'OTHER', 'Um prego cravado na boneca de palha fere o alvo à distância.'],
  ['Martelo e Prego', 'OTHER', 'O martelo de Nobara, usado do jeito mais direto.'],

  // Ryomen Sukuna
  ['Flechas de Fogo', 'OTHER', 'Fuga: Sukuna abre o fogo, uma flecha de chamas que queima o alvo.'],
  ['Fenda', 'OTHER', 'Cleave: um corte que se ajusta à resistência do alvo para parti-lo de uma vez. O ferimento continua sangrando.'],
  ['Expansão de Domínio: Santuário Malévolo', 'OTHER', 'Santuário Malévolo: o domínio de Sukuna dispensa barreira e corta sem parar tudo o que está no alcance. Arrasa a defesa do alvo, e dentro do domínio a técnica acerta sempre e bate mais forte.'],
  ['Desmantelar', 'OTHER', 'Dismantle: o corte à distância de Sukuna, o golpe básico da técnica dele.'],
  ['Corte', 'OTHER', 'Um corte rápido e sem cerimônia.'],

  // Satoru Gojo
  ['Roxo: Imaginário', 'OTHER', 'Roxo: Gojo junta o Azul e o Vermelho, e a colisão apaga tudo o que está no caminho. Arrasa a defesa do alvo.'],
  ['Vermelho: Repulsão Invertida', 'OTHER', 'Vermelho: o Ilimitado invertido, uma força que arremessa o alvo para longe com violência.'],
  ['Expansão de Domínio: Vazio Infinito', 'OTHER', 'Vazio Infinito: dentro do domínio de Gojo, o alvo recebe informação infinita e não consegue fazer nada. Fica sem agir, e dentro do domínio a técnica acerta sempre e bate mais forte.'],
  ['Técnica Amaldiçoada Azul', 'OTHER', 'Azul: o Ilimitado amplificado, que puxa tudo para um ponto. O alvo, arrastado, fica mais lento.'],
  ['Limitless: Repulsão', 'OTHER', 'Um empurrão do Ilimitado, a técnica que o clã Gojo herda. Barato.'],

  // Suguru Geto
  ['Dragão Arco-Íris', 'OTHER', 'O Dragão Arco-Íris, a maldição de escamas mais duras que Geto controla. Continua ferindo por algumas rodadas.'],
  ['Uzumaki: Redemoinho de Maldições', 'OTHER', 'Uzumaki: Geto comprime várias maldições numa só e a dispara.'],
  ['Invocação em Massa', 'OTHER', 'Geto solta várias maldições de uma vez em cima do alvo.'],
  ['Espírito Amaldiçoado Menor', 'OTHER', 'Uma maldição pequena, das muitas que Geto absorveu. Barata.'],
  ['Corrosão Amaldiçoada', 'OTHER', 'Uma maldição que se agarra ao alvo e continua corroendo por algumas rodadas.'],
  ['Deterioração Progressiva', 'OTHER', 'Uma maldição que desgasta o alvo aos poucos: abre a defesa e continua ferindo.'],

  // Yuji Itadori
  ['Ressonância de Sukuna', 'OTHER', 'O poder de Sukuna vaza pelo corpo de Yuji, e o ataque sobe.'],
  ['Impacto Divergente: Segundo Tempo', 'OTHER', 'O Punho Divergente acerta duas vezes: o soco e, um instante depois, a energia amaldiçoada. O segundo impacto continua ferindo.'],
  ['Chute Amaldiçoado', 'OTHER', 'Um chute reforçado de energia amaldiçoada que abre a defesa do alvo.'],
  ['Sequência de Golpes', 'OTHER', 'Uma sequência rápida de socos e chutes.'],
  ['Punho Divergente', 'OTHER', 'Um soco em que a energia amaldiçoada chega um instante depois do punho.'],

  // ───────────────────────── DRAGON BALL Z ──────────────────────────

  // Ki (escada compartilhada pelos Saiyajins)
  ['Estouro Final', 'KI', 'Todo o ki que sobrou, liberado de uma vez. A explosão continua queimando por algumas rodadas.'],
  ['Canhão de Energia', 'KI', 'Um feixe de ki grosso, disparado com as duas mãos, que abre a defesa do alvo.'],
  ['Feixe Perfurante', 'KI', 'Um feixe de ki estreito, feito para atravessar.'],
  ['Investida Fulminante', 'KI', 'Avança envolto em ki e acerta com o corpo inteiro.'],
  ['Explosão de Aura', 'KI', 'A aura explode em volta do corpo e abre a defesa do alvo.'],
  ['Onda de Choque', 'KI', 'Uma onda de ki que empurra o alvo.'],
  ['Golpe Duplo de Ki', 'KI', 'Dois golpes carregados de ki em sequência.'],
  ['Rajada de Ki', 'KI', 'Uma rajada curta de ki. O golpe mais barato do repertório.'],
  ['Barreira de Ki', 'KI', 'Uma esfera de ki em volta do corpo que segura o golpe.'],
  ['Fúria Crescente', 'KI', 'A raiva dos Saiyajins sobe junto com o ki: ataque e defesa sobem.'],
  ['Aura Ardente', 'KI', 'A aura acende e o corpo fica mais leve. A velocidade sobe.'],
  ['Concentração de Ki', 'KI', 'Junta o ki antes do próximo golpe, e o ataque sobe.'],

  // Broly
  ['Gigantic Meteor', 'KI', 'A esfera verde gigante de Broly. Quem é esmagado por ela fica mais lento.'],
  ['Eraser Cannon', 'KI', 'Uma esfera de ki verde disparada com uma mão.'],
  ['Rampage Smash', 'KI', 'Um golpe de pura força bruta.'],
  ['Blaster Shell', 'KI', 'Uma bola de ki pequena e rápida.'],
  ['Unstoppable Rage', 'KI', 'O Saiyajin Lendário perde o controle: o ataque dispara, e a defesa cai junto.'],
  ['Wrathful Roar', 'KI', 'Um grito de fúria que trava o alvo, que fica sem agir.'],
  ['Casca do Lendário', 'KI', 'O ki do Saiyajin Lendário endurece em volta do corpo como uma casca.'],
  ['Spirit Bomb', 'KI', 'A Genki Dama em escala menor: energia emprestada de tudo o que está vivo em volta.'],

  // Goku
  ['Genki Dama', 'KI', 'A Genki Dama: energia emprestada de todos os seres vivos, reunida numa esfera enorme. Quem é atingido sai enfraquecido.'],
  ['Kamehameha Ampliado', 'KI', 'O Kamehameha com toda a força que Goku tem.'],
  ['Punho do Dragão', 'KI', 'O Punho do Dragão: Goku se lança contra o alvo com um dragão de ki em volta do punho. Abre a defesa do alvo.'],
  ['Kamehameha', 'KI', 'A técnica que Goku aprendeu com o Mestre Kame: um feixe de ki disparado das duas mãos.'],
  ['Kaioken', 'KI', 'O Kaioken, que Goku aprendeu com o Senhor Kaioh, multiplica o ki por um instante. Ataque e velocidade sobem.'],
  ['Rajada de Punhos', 'KI', 'Uma sequência rápida de socos.'],
  ['Instant Transmission Counter', 'KI', 'Goku some com o Teletransporte e reaparece atrás do golpe para devolvê-lo.'],
  ['Power Up', 'KI', 'Goku grita e eleva o ki. O ataque sobe.'],

  // Vegeta
  ['Explosão Final', 'KI', 'A Explosão Final de Majin Vegeta: ele queima o próprio corpo num último golpe. A explosão continua ferindo depois.'],
  ['Gamma Burst Flash', 'KI', 'Um feixe de ki concentrado ao extremo, que arrasa a defesa do alvo.'],
  ['Final Flash', 'KI', 'O Final Flash: Vegeta junta as duas mãos e dispara todo o ki num feixe só. Abre a defesa do alvo.'],
  ['Big Bang Attack', 'KI', 'O Big Bang Attack: uma esfera de ki disparada da palma aberta.'],
  ['Galick Gun', 'KI', 'O Galick Gun, o feixe de ki roxo de Vegeta.'],
  ['Investida do Príncipe', 'KI', 'O Príncipe dos Saiyajins avança e bate.'],
  ['Saiyan Onslaught', 'KI', 'Uma sequência impiedosa de golpes que devolve parte do dano como vida.'],
  ['Rajada Múltipla', 'KI', 'Várias bolas de ki disparadas em sequência.'],
  ["Prince's Pride", 'KI', 'O orgulho do Príncipe dos Saiyajins: ataque e defesa sobem.'],

  // ──────────────────────────── NARUTO ──────────────────────────────

  // Ninjutsu (escada compartilhada)
  ['Técnica Proibida', 'NINJUTSU', 'Um jutsu proibido: dano enorme, pago com a própria defesa.'],
  ['Estilo Fogo: Grande Labareda', 'NINJUTSU', 'Uma grande bola de fogo soprada depois dos selos. A queimadura continua por algumas rodadas.'],
  ['Enxame de Clones', 'NINJUTSU', 'Uma multidão de clones cerca o alvo e o deixa mais lento.'],
  ['Estilo Raio: Corrente', 'NINJUTSU', 'Chakra de raio conduzido até o alvo.'],
  ['Golpe do Clone', 'NINJUTSU', 'Um clone distrai, e o golpe vem do outro lado.'],
  ['Estilo Fogo: Chama Breve', 'NINJUTSU', 'Uma chama curta, com poucos selos, que deixa queimadura.'],
  ['Shuriken Certeira', 'NINJUTSU', 'Uma shuriken arremessada com precisão. A ferramenta mais básica do ninja.'],
  ['Prisão de Selos', 'NINJUTSU', 'Um selo que prende o alvo, deixando-o sem agir.'],
  ['Paralisia de Sombra', 'NINJUTSU', 'A Imitação de Sombra do clã Nara: a sombra prende a do alvo, que fica sem agir.'],
  ['Barreira de Selo', 'NINJUTSU', 'Uma barreira erguida com selos.'],
  ['Armadilha de Arame', 'NINJUTSU', 'Um arame esticado no caminho do alvo, que fica mais lento.'],
  ['Névoa Ocultante', 'NINJUTSU', 'Uma névoa cobre o campo, e o alvo, sem enxergar, ataca com menos força.'],

  // Naruto
  ['Rasengan', 'NINJUTSU', 'O Rasengan, criado pelo Quarto Hokage: uma esfera de chakra girando na palma da mão.'],
  ['Shadow Clone Barrage', 'NINJUTSU', 'Uma leva de Clones das Sombras ataca junto. Converte parte do dano em vida.'],
  ['Uzumaki Barrier', 'NINJUTSU', 'Uma barreira de selos, a especialidade do clã Uzumaki.'],
  ['Nine-Tails Chakra Cloak', 'NINJUTSU', 'O chakra da Kurama cobre o corpo de Naruto: ataque e velocidade sobem.'],

  // Sasuke
  ['Amaterasu', 'NINJUTSU', 'As chamas negras do Mangekyō Sharingan, que não se apagam até consumir o alvo. Queimam por algumas rodadas.'],
  ['Chidori', 'NINJUTSU', 'O Chidori, criado por Kakashi: chakra de raio concentrado na mão, com o som de mil pássaros. Deixa o ferimento aberto.'],
  ['Fire Style: Fireball', 'NINJUTSU', 'Estilo Fogo: Grande Bola de Fogo, o jutsu que marca a maioridade no clã Uchiha. Queima por algumas rodadas.'],
  ['Sharingan Insight', 'GENJUTSU', 'O Sharingan lê cada movimento do alvo e acha a brecha na defesa.'],
  // ─────────────────────────── DC E MARVEL ──────────────────────────

  // Meta-humanos (escada compartilhada por DC e Marvel)
  ['Limite Rompido', 'OTHER', 'Passa do limite do próprio corpo num golpe só. O estrago continua por algumas rodadas.'],
  ['Fúria Contida', 'OTHER', 'Toda a raiva guardada, solta de uma vez. Abre a defesa do alvo.'],
  ['Onda Telecinética', 'OTHER', 'Uma onda de força invisível que empurra o alvo e o deixa mais lento.'],
  ['Impacto Concentrado', 'OTHER', 'Toda a força concentrada num ponto só.'],
  ['Rajada Psíquica', 'OTHER', 'Um disparo de energia mental.'],
  ['Golpe Calculado', 'OTHER', 'Um golpe curto e preciso. Barato.'],
  ['Colapso Mental', 'OTHER', 'Uma sobrecarga na mente do alvo, que desaba e fica sem agir.'],
  ['Interferência Mental', 'OTHER', 'Um ruído na mente do alvo que o trava por um instante.'],
  ['Postura Defensiva', 'OTHER', 'Firma a base e fecha a guarda. A defesa sobe.'],
  ['Domínio da Vontade', 'OTHER', 'Uma vontade mais forte se impõe à do alvo, que passa a atacar com menos força.'],
  ['Leitura de Movimento', 'OTHER', 'Lê o próximo passo do alvo antes dele dar, e o alvo fica mais lento.'],
  ['Campo de Força', 'OTHER', 'Uma barreira de energia em volta do corpo.'],

  // Batman
  ['Protocolo Torre de Vigia', 'OTHER', 'O plano que Batman guarda para derrubar até a Liga da Justiça. O alvo fica sem reação.'],
  ['Plano de Contingência', 'OTHER', 'Batman sempre tem um plano para cada adversário. Este acha a brecha na defesa.'],
  ['Gancho e Queda', 'OTHER', 'Batman puxa o alvo com a arma de gancho e cai por cima dele. O alvo fica mais lento.'],
  ['Análise de Padrão', 'OTHER', 'Batman estuda como o adversário luta, e ele passa a atacar com menos força.'],
  ['Batarang Volley', 'OTHER', 'Uma leva de batarangues arremessados de uma vez, que deixam ferida aberta.'],
  ['Grapple Counter', 'OTHER', 'Batman agarra o golpe no meio do caminho e o devolve.'],
  ['Detective Analysis', 'OTHER', 'O maior detetive do mundo encontra o ponto fraco e abre a defesa do alvo.'],
  ['Smoke Bomb Escape', 'OTHER', 'Uma bomba de fumaça, e Batman já não está onde o golpe ia acertar.'],

  // Superman
  ['Heat Vision', 'OTHER', 'A visão de calor: dois feixes disparados dos olhos, que deixam queimadura.'],
  ['Super Strength Slam', 'OTHER', 'Um golpe com a força de quem ergue prédios.'],
  ['Unbreakable', 'OTHER', 'O corpo kryptoniano sob o sol amarelo: uma proteção enorme.'],
  ['Kryptonian Resolve', 'OTHER', 'A determinação do Homem de Aço: ataque e defesa sobem.'],

  // Mulher-Maravilha
  ['Julgamento das Amazonas', 'OTHER', 'Diana julga o alvo como uma guerreira de Themyscira. Arrasa a defesa dele.'],
  ['Golpe da Deusa da Guerra', 'OTHER', 'Um golpe com a força dos deuses do Olimpo. O alvo sai enfraquecido.'],
  ['Investida de Themyscira', 'OTHER', 'A investida das Amazonas, que devolve parte do dano como vida.'],
  ['Laço da Verdade: Prender', 'OTHER', 'O Laço da Verdade enrola o alvo, que fica mais lento.'],
  ['Sword Strike', 'OTHER', 'Um corte com a espada das Amazonas.'],
  ['Lasso of Truth', 'OTHER', 'O Laço da Verdade prende o alvo, que não consegue agir enquanto está amarrado.'],
  ['Amazonian Fury', 'OTHER', 'A fúria de uma guerreira amazona. O ataque sobe.'],
  ['Bracelets of Submission', 'OTHER', 'Os Braceletes da Submissão aparam o golpe e o devolvem.'],

  // Demolidor
  ['Billy Club Strike', 'OTHER', 'Um golpe com o bastão de Matt Murdock.'],
  ['Counter Strike', 'OTHER', 'O Demolidor ouve o golpe chegar e responde antes dele terminar.'],
  ['Adrenaline Surge', 'OTHER', 'A adrenalina segura o Demolidor de pé e devolve um pouco de vida.'],
  ['Radar Sense', 'OTHER', 'O sentido de radar mostra cada golpe antes dele chegar. A defesa sobe.'],

  // Emma Frost
  ['Psychic Blast', 'OTHER', 'Um ataque telepático direto na mente do alvo.'],
  ['Diamond Form Counter', 'OTHER', 'Emma vira diamante e o golpe volta para quem bateu.'],
  ['Diamond Skin', 'OTHER', 'A forma de diamante de Emma, dura o bastante para segurar quase tudo.'],
  ['Mental Domination', 'OTHER', 'Emma toma a mente do alvo, que fica sem agir.'],

  // Jean Grey
  ['Phoenix Surge', 'OTHER', 'O fogo da Fênix queima o alvo por algumas rodadas.'],
  ['Telekinetic Slam', 'OTHER', 'Jean ergue o alvo com telecinese e o joga no chão.'],
  ['Mind Link Weaken', 'OTHER', 'Jean entra na mente do alvo, que passa a atacar com menos força.'],
  ['Phoenix Rebirth', 'OTHER', 'A Fênix sempre renasce. Recupera um pouco de vida.'],

  // ──────────────────────────── POKÉMON ─────────────────────────────
  // O Red não luta: cada golpe é um Pokémon do time dele, e o nome diz qual.

  ['Mega Rayquaza: Fúria do Céu Partido', 'OTHER', 'Mega Rayquaza desce do céu com tudo o que tem. Arrasa a defesa do alvo.'],
  ['Mega Rayquaza: Ascensão do Dragão', 'OTHER', 'Dragon Ascent: Mega Rayquaza sobe ao céu e mergulha contra o alvo. O ataque sobe.'],
  ['Snorlax: Corpo Pesado', 'OTHER', 'Heavy Slam: Snorlax cai com todo o peso em cima do alvo, que fica mais lento.'],
  ['Blastoise: Hidrobomba', 'OTHER', 'Hydro Pump: os canhões do casco de Blastoise disparam água com pressão enorme.'],
  ['Venusaur: Bomba de Sementes', 'OTHER', 'Seed Bomb: Venusaur dispara sementes duras que explodem no alvo.'],
  ['Charizard: Asa de Aço', 'OTHER', 'Steel Wing: Charizard endurece as asas e corta com elas.'],
  ['Charizard: Lança-Chamas', 'OTHER', 'Flamethrower: o fogo de Charizard, que deixa queimadura.'],
  ['Pikachu: Investida Trovão', 'OTHER', 'Volt Tackle: Pikachu se lança coberto de eletricidade, e o alvo fica paralisado.'],
  ['Pikachu: Choque do Trovão', 'OTHER', 'Thunder Shock: uma descarga elétrica rápida. O golpe mais barato do time.'],
  ['Venusaur: Semente Sanguessuga', 'OTHER', 'Leech Seed: uma semente que cresce no alvo e suga a energia dele por algumas rodadas. O alvo sai enfraquecido.'],
  ['Snorlax: Descanso', 'OTHER', 'Rest: Snorlax dorme e acorda com muita vida recuperada.'],
  ['Blastoise: Retrair Casco', 'OTHER', 'Withdraw: Blastoise se fecha no casco.'],

  // ────────────────────────── SOLO LEVELING ─────────────────────────

  ['Exército das Sombras', 'OTHER', 'Jin-Woo chama o exército das sombras inteiro de uma vez. O alvo, cercado, sai enfraquecido.'],
  ['Beru, Formiga-Rei', 'OTHER', 'Beru, o Rei Formiga que virou a sombra mais forte de Jin-Woo, rasga o alvo com as garras. O ferimento continua sangrando.'],
  ['Igris, Cavaleiro de Sangue', 'OTHER', 'Igris, o primeiro cavaleiro das sombras, luta ao lado de Jin-Woo. O ataque sobe.'],
  ['Adaga do Monarca', 'OTHER', 'Um corte rápido de adaga que deixa o alvo sangrando.'],
  ['Erguer: Soldado das Sombras', 'OTHER', 'Arise: Jin-Woo ergue um soldado das sombras para atacar.'],
  ['Tank, Muralha de Ossos', 'OTHER', 'Tank, o urso das sombras, se põe na frente do golpe.'],

  // ──────────────────────── DEADPOOL E PATOLINO ────────────────────────
  // Esses dois já tinham texto, mas era a FALA deles (o que dizem no
  // histórico) e mora em signatures.js. A descrição do golpe é esta.

  // Deadpool
  ['Katanas em X: Corte Cruzado', 'OTHER', 'As duas katanas das costas, sacadas e cruzadas num corte só.'],
  ['Fator de Cura', 'OTHER', 'O fator de cura do Deadpool fecha qualquer ferimento. Recupera vida.'],
  ['Chimichanga Arremessada', 'OTHER', 'Uma chimichanga jogada na cara do alvo, quente o bastante para deixar queimadura.'],
  ['Quebra da Quarta Parede', 'OTHER', 'Deadpool fala com quem está jogando, e o alvo, sem entender nada, abre a guarda. A defesa dele cai.'],
  ['Duplo Katana: Retalho Total', 'OTHER', 'Uma sequência de cortes com as duas katanas que devolve parte do dano como vida.'],
  ['Merc com Boca Grande', 'OTHER', 'O Mercenário Tagarela leva a luta para o lado pessoal. O golpe atravessa boa parte da defesa.'],

  // Patolino
  ['Temporada de Pato!', 'OTHER', 'A velha briga de "temporada de pato ou de coelho", virada contra o alvo: o próximo golpe que ele der volta para ele.'],
  ['Charuto Explosivo', 'OTHER', 'Um charuto oferecido com gentileza, que explode e deixa queimadura.'],
  ['Mine! Mine! Mine!', 'OTHER', 'A ganância do Patolino: pega tudo o que puder, inclusive vida, que volta como parte do dano.'],
  ['Yoicks e Fuga!', 'OTHER', 'Patolino foge e deixa o golpe acertar o nada.'],
  ['Feitiço da Fúria Emplumada', 'OTHER', 'Patolino de mago, com a varinha e a pose. É letal contra quem já está fraco.'],
  // ──────────────────── EQUIPAMENTO E MONSTROS DA RAID ────────────────────
  // Habilidades que não vêm de personagem: as que um equipamento concede a
  // quem o veste, e a garra dos Hollows da raid.

  ['Hollow Claw', 'OTHER', 'A garra de um Hollow. O golpe mais básico de qualquer um deles.'],
  ['Getsuga Tenshō (Zangetsu)', 'OTHER', 'Com Zangetsu em mãos, qualquer um libera o Getsuga Tenshō: a onda de reiatsu em forma de lua crescente.'],
  ['Shinsō: Estocada Estendida', 'OTHER', 'Shinsō se estende numa estocada à distância, e o alvo fica mais lento.'],
  ['Ginto: Barreira Quincy', 'OTHER', 'Um tubo de Gintō se desfaz numa barreira de prata.'],
  ['Luvas de Kidō: Descarga', 'HADO', 'As luvas descarregam o kidō guardado num disparo direto.'],
  ['Sode no Shirayuki: Tsukishiro', 'OTHER', 'Some no Mai: Tsukishiro, a primeira dança: um círculo de gelo sobe do chão e prende o alvo, que fica sem agir.'],
  ['Zabimaru: Hikōtsu', 'OTHER', 'Zabimaru se estende num chicote de lâminas segmentadas.'],
  ['Wabisuke: Peso da Culpa', 'OTHER', 'Cada corte de Wabisuke dobra o peso do alvo, que não consegue mais sustentar a guarda. A defesa dele cai.'],
  ['Senbonzakura: Chire', 'OTHER', 'Chire, Senbonzakura: a lâmina se espalha em mil pétalas que continuam cortando por algumas rodadas.'],
  ['Máscara Hollow: Rugido', 'OTHER', 'O rugido do Hollow interior: o ataque dispara, e a defesa cai junto.'],
  ['Kyōka Suigetsu: Hipnose Completa', 'OTHER', 'Quem viu a liberação de Kyōka Suigetsu cai na hipnose completa: ataque e defesa do alvo caem juntos.'],
];

module.exports = { descricoes };
