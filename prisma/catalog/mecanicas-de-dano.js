// Aplica EXECUTE, PIERCE e COMBO_STUN a habilidades existentes, sem tocar em
// poder, custo ou nos efeitos que já estavam lá.
//
// POR QUE ISTO EXISTE. Um levantamento no elenco de Bleach achou 38 das 186
// habilidades exclusivas com dano puro e nenhum efeito — entre elas golpes
// icônicos como o Getsuga Tenshō. As outras 148 quase sempre repetem o mesmo
// vocabulário de nove tipos (BUFF/DEBUFF/DOT/SHIELD/...), então mesmo "tendo
// efeito" a maioria lê igual. O que faltava não era efeito — era um jeito de
// um golpe ser mecanicamente diferente de outro por causa do que ele É na
// obra, não só de quanto poder tem.
//
// OS TRÊS PRIMEIROS EXEMPLOS, um por mecânica:
//
//   Nigeki Kessatsu: Death Sting (Suì-Fēng) ganha EXECUTE. O nome já diz o
//   que a técnica faz na obra — "dois golpes, morte certa": acertar o mesmo
//   ponto duas vezes mata o alvo. Isto é uma aproximação, não uma réplica
//   literal: um "sempre mata na segunda vez" seria um instakill, violento
//   demais pra qualquer luta ter graça. O bônus contra alvo fraco é o que dá
//   pra fazer sem quebrar o jogo.
//
//   Gran Rey Cero (Grimmjow) ganha PIERCE. Está entre as 38 de dano puro
//   hoje, e é o ultimate mais claro de "poder bruto que a obra trata como
//   devastador mesmo contra quem se defende" do elenco inteiro.
//
//   Brujería: Multi-Strike (Zommari) ganha COMBO_STUN. Ele já tinha "Amor:
//   Paralysis", que atordoa por duas rodadas — só faltava um golpe seguinte
//   pra aproveitar a brecha. O padrão de jogo que isso cria é o mesmo de
//   quem usa kidō: prender numa rodada, finalizar na outra.
//
// ACRESCENTA AO ARRAY DE EFEITOS, nunca substitui — mesmo princípio do
// tags-faltantes.js. Uma skill que já tenha o tipo de efeito não ganha
// duplicata.

const aplicacoes = [
  {
    nomeDaSkill: 'Nigeki Kessatsu: Death Sting',
    categoria: 'OTHER',
    efeitoNovo: { type: 'EXECUTE', target: 'SELF', magnitude: 60 },
  },
  {
    nomeDaSkill: 'Gran Rey Cero',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 40 },
  },
  {
    nomeDaSkill: 'Brujería: Multi-Strike',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_STUN', target: 'SELF', magnitude: 40 },
  },

  // COMBO DE SEQUÊNCIA: carrega numa rodada, finaliza na outra. Quebra com
  // qualquer ação diferente no meio — bloquear, se transformar ou ficar
  // atordoado sem escolher isso apagam a carga do mesmo jeito que atacar
  // com outra coisa.
  //
  //   Chad carrega o braço direito e solta o punho de assinatura.
  {
    nomeDaSkill: 'El Directo',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_FOLLOWUP', target: 'SELF', magnitude: 50, comboTag: 'combo:braco-direito-gigante' },
  },
  //   Grimmjow escala Desgarrón pro Gran Rey Cero — o mesmo golpe que já
  //   ganhou PIERCE acima também paga a sequência.
  {
    nomeDaSkill: 'Gran Rey Cero',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_FOLLOWUP', target: 'SELF', magnitude: 50, comboTag: 'combo:desgarron' },
  },
  //   Kaname abre com Suzumushi (shikai) e finaliza com Enma Kōrogi (bankai)
  //   — a mesma lógica de carga-e-finalização, só que contada com a ordem
  //   real de liberação da zanpakutō em vez de um combo inventado.
  {
    nomeDaSkill: 'Suzumushi Tsuishiki: Enma Kōrogi',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_FOLLOWUP', target: 'SELF', magnitude: 50, comboTag: 'combo:suzumushi' },
  },

  // QUARTO E QUINTO EXEMPLOS de EXECUTE/PIERCE, escolhidos por serem os
  // golpes mais reconhecíveis do elenco que ainda estavam com dano puro.
  //
  //   Getsuga Tenshō (Ichigo) ganha PIERCE. É o golpe mais icônico da obra
  //   inteira, e hoje era só "número maior" — nada nele dizia por que uma
  //   onda de pressão espiritual cortante deveria ser mecanicamente diferente
  //   de um soco. PIERCE captura o que a obra mostra: atravessa guardas,
  //   paredes, hollows inteiros.
  {
    nomeDaSkill: 'Getsuga Tenshō',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 40 },
  },
  //   E ganha COMBO_FOLLOWUP também. A luta do Ichigo é canonicamente burst:
  //   quase todo confronto grande dele é "carrega poder, solta um Getsuga
  //   Tenshō decisivo" — Bankai Focus já É essa carga no kit dele, só nunca
  //   tinha sido ligada a nada. Vira a mesma lógica de shikai→bankai do
  //   Kaname, contada com a progressão real do Ichigo em vez de inventada.
  {
    nomeDaSkill: 'Getsuga Tenshō',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_FOLLOWUP', target: 'SELF', magnitude: 50, comboTag: 'combo:bankai' },
  },
  //   Lanza del Relámpago (Ulquiorra) ganha PIERCE. É a lança relâmpago que
  //   ele crava com Sonído — velocidade e precisão cirúrgica, não força
  //   bruta, então perfurar a defesa é mais fiel que só somar poder.
  {
    nomeDaSkill: 'Lanza del Relámpago',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 35 },
  },
  //   E ganha LIFESTEAL. Ulquiorra regenera de ferimento que mataria qualquer
  //   um — Hierro e a cura hollow compartilhada já contam essa parte dele,
  //   mas nenhuma habilidade PRÓPRIA fazia isso acontecer no meio do ataque.
  {
    nomeDaSkill: 'Lanza del Relámpago',
    categoria: 'OTHER',
    efeitoNovo: { type: 'LIFESTEAL', target: 'SELF', magnitude: 20 },
  },
  //   Cero Oscuras (Ulquiorra) ganha EXECUTE. O cero negro é tratado na obra
  //   como poder de outro patamar — quase matou o Ichigo com máscara de
  //   Vasto Lorde de um só golpe. EXECUTE aproxima isso sem ser instakill:
  //   pune quem já está no fio contra o cero mais forte do elenco Espada.
  {
    nomeDaSkill: 'Cero Oscuras',
    categoria: 'OTHER',
    efeitoNovo: { type: 'EXECUTE', target: 'SELF', magnitude: 50 },
  },
  //   Shunpo: Investida (Yoruichi) ganha PIERCE. É a mestra do Shunpo do
  //   elenco inteiro — rápida demais pra qualquer guarda se ajustar a tempo,
  //   então perfurar a defesa é mais fiel que só bater mais forte.
  {
    nomeDaSkill: 'Shunpo: Investida',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 35 },
  },

  // SEXTO AO NONO EXEMPLO: quatro Espada que ainda estavam com o ultimate
  // (ou o golpe de assinatura) em dano puro.
  //
  //   Gran Caída (Nnoitra) ganha SANGRAMENTO EMPILHÁVEL, não EXECUTE — troca
  //   feita depois do primeiro commit, a pedido do dono do projeto: Santa
  //   Teresa é uma FOICE, e sangramento que piora a cada golpe é mais fiel à
  //   arma do que um bônus contra alvo fraco. EXECUTE media a crueldade dele
  //   como PERSONALIDADE; isto mede o dano da própria lâmina.
  {
    nomeDaSkill: 'Gran Caída',
    categoria: 'OTHER',
    efeitoNovo: { type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 3, stack: true },
  },
  //   Cero Metralleta (Coyote Starrk) ganha PIERCE. É uma rajada de ceros
  //   menores em sequência — volume que satura a guarda, não um golpe só.
  {
    nomeDaSkill: 'Cero Metralleta',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 35 },
  },
  //   Los Lobos (Starrk) ganha EXECUTE. Ele é o oposto do Nnoitra em
  //   personalidade — não briga por prazer, só quer terminar rápido e
  //   descansar. A alcatéia inteira cai em cima de quem já está fraco
  //   porque pra ele decidir rápido é o próprio objetivo da luta.
  {
    nomeDaSkill: 'Los Lobos',
    categoria: 'OTHER',
    efeitoNovo: { type: 'EXECUTE', target: 'SELF', magnitude: 50 },
  },
  //   Ola Azul (Tia Harribel) ganha PIERCE — a onda de Tiburón varre por
  //   cima de guarda, não precisa contorná-la.
  {
    nomeDaSkill: 'Ola Azul',
    categoria: 'OTHER',
    efeitoNovo: { type: 'PIERCE', target: 'SELF', magnitude: 35 },
  },
  //   E Tiburón: Sawing Sharks ganha COMBO_FOLLOWUP ligado a ela — a onda
  //   cerca o alvo em água, e é dali que os tubarões de Tiburón emergem
  //   pra cortar. Mesma lógica carga-e-finalização de Chad/Grimmjow/Kaname/
  //   Ichigo, contada com o próprio zanpakutō dela.
  {
    nomeDaSkill: 'Tiburón: Sawing Sharks',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_FOLLOWUP', target: 'SELF', magnitude: 50, comboTag: 'combo:ola-azul' },
  },
  //   Respira: Decay (Baraggan) ganha EXECUTE. Ele é o Rei-Deus da decadência
  //   e do tempo — sua ideia de poder é que tudo que ele toca já está
  //   morrendo antes de cair. EXECUTE aproxima a decadência acelerando o fim
  //   de quem já está perto dele.
  {
    nomeDaSkill: 'Respira: Decay',
    categoria: 'OTHER',
    efeitoNovo: { type: 'EXECUTE', target: 'SELF', magnitude: 45 },
  },

  // EMPILHÁVEL (stack): ver o campo em app/lib/battle/types.ts. Reaplicar a
  // MESMA habilidade enquanto o efeito anterior dela ainda está de pé SOMA a
  // magnitude em vez de só renovar — pensado pra golpe repetido que piora a
  // cada acerto, até um teto (3× a magnitude-base por padrão).
  //
  //   Zabimaru: Chicotada (Renji) e Burner Finger (Bazz-B) estavam entre as
  //   38 skills de dano puro do levantamento original — os dois primeiros
  //   exemplos, e não por acaso os dois vieram do próprio pedido do dono do
  //   projeto. Zabimaru é uma lâmina segmentada tipo chicote: cada chicotada
  //   reabre o corte anterior mais fundo. Burner Finger é o poder de
  //   assinatura do Bazz-B — Quincy que concentra calor no próprio corpo, e
  //   a obra mostra ele ficando mais quente quanto mais luta.
  {
    nomeDaSkill: 'Zabimaru: Chicotada',
    categoria: 'OTHER',
    efeitoNovo: { type: 'DOT', target: 'ENEMY', magnitude: 6, duration: 2, stack: true },
  },
  {
    nomeDaSkill: 'Burner Finger',
    categoria: 'OTHER',
    efeitoNovo: { type: 'DOT', target: 'ENEMY', magnitude: 6, duration: 2, stack: true },
  },

  // GELO DE VERDADE: Rukia e Hitsugaya, a pedido do dono do projeto — os
  // dois já tinham pedaços de tema gelo espalhados (slow, escudo), mas
  // nenhum congelava de fato. Reaproveita COMBO_STUN, que já existe desde
  // Suì-Fēng/Zommari: não precisa de combo-tag, porque olha o STATUS do
  // alvo (atordoado/congelado), não quem foi que congelou.
  //
  //   Hyōten Hyakkasō (Toshiro) já tinha STUN no ultimate — faltava o pagamento.
  //   Hyōrinmaru: Ice Blade (o básico barato) ganha COMBO_STUN: congela com
  //   o ultimate, acerta em sequência com o básico enquanto ele não reage.
  {
    nomeDaSkill: 'Hyōrinmaru: Ice Blade',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_STUN', target: 'SELF', magnitude: 40 },
  },
  //   Tsugi no Mai: Hakuren (Rukia) ganha STUN — a obra mostra essa técnica
  //   congelando o que toca (paredes, o chão, hollows inteiros), não só
  //   desacelerando. Ela ainda não tinha nenhum congelamento de verdade.
  {
    nomeDaSkill: 'Tsugi no Mai: Hakuren',
    categoria: 'OTHER',
    efeitoNovo: { type: 'STUN', target: 'ENEMY', duration: 1, magnitude: 0 },
  },
  //   Sode no Shirayuki: Lâmina de Gelo (o básico barato dela) ganha
  //   COMBO_STUN — mesma lógica do Toshiro: congela com o Hakuren, finaliza
  //   com o golpe barato.
  {
    nomeDaSkill: 'Sode no Shirayuki: Lâmina de Gelo',
    categoria: 'OTHER',
    efeitoNovo: { type: 'COMBO_STUN', target: 'SELF', magnitude: 40 },
  },

  // URAHARA — ESTRATEGISTA, não combo literal (variando de propósito: nem
  // todo mundo carrega-e-solta). Ele não tinha NENHUMA fonte de
  // atordoamento própria, então o COMBO_STUN da nova Corte Certeiro (ver
  // signatures.js) não tinha o que aproveitar. Shopkeeper's Trick vira a
  // armadilha de verdade: já enfraquecia a defesa do alvo, agora também
  // trava — mesma lógica de trap-e-punição de Suì-Fēng/Zommari/Rukia/
  // Hitsugaya, só que a armadilha é dele mesmo, e não o próprio golpe final.
  {
    nomeDaSkill: "Shopkeeper's Trick",
    categoria: 'OTHER',
    efeitoNovo: { type: 'STUN', target: 'ENEMY', duration: 1, magnitude: 0 },
  },
];

// Efeitos que saíram de uma habilidade. O sync de mecânicas só acrescentava,
// então tirar um efeito precisa ser dito aqui, com o porquê.
const remocoes = [
  // YAMAMOTO — o combo "Ativação carrega, Cremation paga" era o jeito de
  // fazer o burst dele morar no Bankai, a pedido do dono do projeto. Agora a
  // Cremation SÓ EXISTE com o Bankai liberado (ver golpes em
  // transformations.js), que é o mesmo pedido cumprido direto. A Ativação saiu
  // do kit por duplicar a forma, e o bônus de finalização ficaria morto na
  // tela, prometendo um combo que não existe mais.
  { nomeDaSkill: 'Zanka no Tachi: Cremation', categoria: 'OTHER', tipo: 'COMBO_FOLLOWUP' },
];

module.exports = { aplicacoes, remocoes };
