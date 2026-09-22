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

module.exports = { coresPorSlug };
