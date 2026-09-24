// Cor de destaque de cada personagem, para o tema da batalha.
//
// DERIVADA DA ARTE, nao escolhida a mao — ver scripts/cor-por-personagem.js.
// Sao 62 personagens: escolher 62 cores no olho seriam 62 decisoes que
// ninguem revisou, e que ficariam desatualizadas assim que a arte mudasse.
// Lendo da imagem, trocar o retrato reajusta a cor sozinho.
//
// O metodo e histograma de matiz ponderado por saturacao, descartando pixel
// quase preto, quase branco, dessaturado e a faixa de pele. Media simples
// nao serve: media de imagem colorida tende a marrom acinzentado.
//
// A derivacao acerta a maioria e erra alguns — Deadpool sai amarelo porque o
// vermelho dele perde para o fundo no retrato atual. A correcao e por
// personagem, aqui, e sobrescreve a derivacao.
//
// MORA EM Character, NAO EM Anime: Ichigo e Hitsugaya sao os dois de Bleach
// e tem identidade cromatica oposta. Tema por universo pintaria os dois
// iguais, que e o oposto do que a tela de batalha precisa.
const coresPorSlug = {
  'aaroniero-arruruerie': '#f8b659',
  'as-nodt': '#3172ce',
  'baraggan-luisenbarn': '#22aedd',
  'batman': '#398bc6',
  'bazz-b': '#398bc6',
  'broly': '#f69b5b',
  'byakuya-kuchiki': '#c6395c',
  'chad': '#f5b55c',
  'daredevil': '#f89b59',
  'deadpool': '#f8eb59',
  'emma-frost': '#f8d059',
  'gin-ichimaru': '#79a0d8',
  'goku': '#f87e56',
  'grimmjow-jaegerjaquez': '#2d3ad2',
  'hanami': '#da3425',
  'ichigo-kurosaki': '#f8b659',
  'izuru-kira': '#efb461',
  'jean-grey': '#f8d059',
  'jogo': '#c7d15f',
  'kaname-tosen': '#f31f0c',
  'kenpachi-zaraki': '#f50a93',
  'kisuke-urahara': '#f87d54',
  'mayuri-kurotsuchi': '#395cc6',
  'megumi-fushiguro': '#5cc639',
  'momo-hinamori': '#278ed8',
  'naruto-uzumaki': '#f89b59',
  'nnoitra-gilga': '#59b6f8',
  'nobara-kugisaki': '#c64539',
  'orihime-inoue': '#f8b659',
  'patolino': '#f5bb0f',
  'rangiku-matsumoto': '#e3786e',
  'red': '#cf5b64',
  'renji-abarai': '#e51a2b',
  'retsu-unohana': '#5c39c6',
  'rukia-kuchiki': '#69b3e7',
  'ryomen-sukuna': '#c6483c',
  'ryuken-ishida': '#f89b59',
  'sajin-komamura': '#dc23cd',
  'sasuke-uchiha': '#d88179',
  'satoru-gojo': '#f8b659',
  'shunsui-kyoraku': '#b36ae6',
  'sosuke-aizen': '#4a85d7',
  'suguru-geto': '#c7a338',
  'sui-feng': '#f84c5a',
  'sung-jin-woo': '#59b6f8',
  'superman': '#c74438',
  'szayelaporro-granz': '#f8599b',
  'tia-harribel': '#f8d059',
  'toshiro-hitsugaya': '#f8b659',
  'uryu-ishida': '#59ebf8',
  'vegeta': '#1e4fe1',
  'wonder-woman': '#1691e9',
  'yamamoto-genryusai': '#f8b659',
  'yammy-llargo': '#f0e461',
  'yoruichi-shihoin': '#f78636',
  'yuji-itadori': '#f50a45',
  'zommari-rureaux': '#2f8dd0',
};

/**
 * COR SECUNDÁRIA: a matiz mais forte da arte que esteja a 60° ou mais da
 * primária. Também é saída do script, e também pode ser regerada inteira.
 *
 * Serve para o CONFRONTO, não para o card isolado: quando os dois lados têm
 * primárias quase iguais, o adversário troca para a secundária dele — ver
 * app/lib/battle/cores.ts. Metade do elenco tem uma; quem não tem cai numa
 * cor de contraste do tema.
 */
const secundariasPorSlug = {
  'aaroniero-arruruerie': '#79a0d8',
  'as-nodt': '#f89b59',
  'baraggan-luisenbarn': '#c6ba39',
  'batman': '#c0d879',
  'broly': '#2d8dd2',
  'byakuya-kuchiki': '#3945c6',
  'chad': '#dd2270',
  'deadpool': '#39a3c6',
  'emma-frost': '#7981d8',
  'gin-ichimaru': '#e3c66d',
  'goku': '#0a45f5',
  'ichigo-kurosaki': '#79c0d8',
  'jean-grey': '#8b39c6',
  'kaname-tosen': '#3a2cd3',
  'mayuri-kurotsuchi': '#f1cd60',
  'megumi-fushiguro': '#398bc6',
  'momo-hinamori': '#d64b56',
  'retsu-unohana': '#f88059',
  'ryuken-ishida': '#79a0d8',
  'sajin-komamura': '#d1b560',
  'satoru-gojo': '#519ed5',
  'shunsui-kyoraku': '#e26f8b',
  'sui-feng': '#2f72d0',
  'szayelaporro-granz': '#f8b659',
  'toshiro-hitsugaya': '#75d3db',
  'uryu-ishida': '#4539c6',
  'vegeta': '#f8d059',
  'wonder-woman': '#f69b5b',
  'yoruichi-shihoin': '#1ed1e1',
  'zommari-rureaux': '#c6395c',
};

/**
 * CORREÇÕES MANUAIS, que vencem a derivação.
 *
 * Ficam num bloco à parte de propósito: o bloco de cima é SAÍDA de
 * scripts/cor-por-personagem.js e pode ser regerado inteiro; este aqui é
 * decisão humana e não pode sumir numa regeneração.
 *
 * A regra combinada é corrigir POR PERSONAGEM, conforme cada um for sendo
 * revisado — não numa folha em massa.
 */
const correcoes = {
  // A arte atual dele é dominada por tons quentes: as três matizes mais
  // fortes da derivação são TODAS laranja (#f8b659 com 44%), então não havia
  // alternativa para escolher — ele saía com a mesma cor do Ichigo, que é
  // justamente o par que motivou a cor por personagem. O azul-gelo segue o
  // mockup de referência do dono do projeto, que pinta o Hitsugaya assim.
  'toshiro-hitsugaya': '#4fb3f5',
};

module.exports = {
  coresPorSlug: { ...coresPorSlug, ...correcoes },
  secundariasPorSlug,
};
