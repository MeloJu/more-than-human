// Deriva a cor de destaque de cada personagem DA PROPRIA ARTE dele.
//
// POR QUE NAO E UMA LISTA ESCRITA A MAO. Sao 62 personagens, e escolher 62
// cores no olho e 62 decisoes de design que ninguem revisou — e que ficariam
// desatualizadas na hora que a arte mudasse. Lendo da imagem, a cor
// ACOMPANHA a arte: trocou o retrato, a cor se ajusta sozinha.
//
// E o resultado e o certo pelo motivo certo: o Ichigo da laranja porque o
// cabelo e o reiatsu dele SAO laranja, nao porque alguem digitou #ff6b1a.
// Hitsugaya da azul-gelo pelo mesmo caminho.
//
// O QUE NAO FUNCIONA: media simples de pixel. Media de qualquer imagem
// colorida tende para um marrom acinzentado, porque as cores se cancelam.
// O que funciona e HISTOGRAMA DE MATIZ ponderado por saturacao — a pergunta
// util nao e "qual a cor media" e sim "qual matiz domina entre os pixels
// que tem cor de verdade".
//
// TRES EXCLUSOES, todas por experiencia com o proprio elenco:
//
//   1. Pixel quase preto ou quase branco nao tem matiz confiavel: roupa
//      preta de shinigami e fundo branco de render entrariam como ruido.
//   2. Pixel dessaturado idem — cinza nao e uma cor de destaque.
//   3. A faixa de PELE e descartada: quase todo retrato tem rosto e maos,
//      e sem isto metade do elenco sairia com o mesmo laranja-claro.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const charsDir = path.join(__dirname, '..', 'public', 'images', 'characters');

/** Faixa de matiz da pele em graus. Ver exclusao 3 no cabecalho. */
const PELE_MIN = 10;
const PELE_MAX = 45;

function rgbParaHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslParaHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return (
    '#' +
    rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
  );
}

async function corDaArte(arquivo) {
  // 64x96 basta: a pergunta e sobre a paleta, nao sobre detalhe. E manter
  // pequeno deixa a varredura dos 62 quase instantanea.
  const { data, info } = await sharp(arquivo)
    .resize(64, 96, { fit: 'cover', position: 'top' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const baldes = new Array(36).fill(0);
  const somaS = new Array(36).fill(0);
  const somaL = new Array(36).fill(0);
  let considerados = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const [h, s, l] = rgbParaHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.16 || l > 0.9) continue;
    if (s < 0.28) continue;
    if (h >= PELE_MIN && h <= PELE_MAX && s < 0.62) continue;

    const b = Math.floor(h / 10) % 36;
    // Ponderado por saturacao: um vermelho vivo conta mais que um
    // rosado apagado, mesmo que existam mais pixels do segundo.
    const peso = s;
    baldes[b] += peso;
    somaS[b] += s * peso;
    somaL[b] += l * peso;
    considerados++;
  }

  if (considerados < 40) return null;

  // AS TRES MATIZES MAIS FORTES, nao so a primeira.
  //
  // A dominante acerta a maioria, mas nao todas: Deadpool saiu amarelo (o
  // vermelho dele perde para o fundo em alguns retratos) e Batman saiu azul.
  // Guardar as alternativas transforma a correcao em um clique na folha de
  // revisao, em vez de alguem digitar hex a mao.
  const ordem = baldes
    .map((peso, i) => ({ i, peso }))
    .filter((x) => x.peso > 0)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 3);
  if (ordem.length === 0) return null;

  const paleta = ordem.map((x) => {
    const hh = x.i * 10 + 5;
    const ss = somaS[x.i] / baldes[x.i];
    const ll = somaL[x.i] / baldes[x.i];
    return {
      hex: hslParaHex(hh, Math.min(0.92, Math.max(0.55, ss * 1.25)), Math.min(0.66, Math.max(0.5, ll * 1.15))),
      h: Math.round(hh),
      forca: Math.round((x.peso / baldes.reduce((a, b) => a + b, 0)) * 100),
    };
  });

  const melhor = ordem[0].i;

  // A COR SECUNDARIA: a matiz mais forte que esteja a 60 graus ou mais da
  // primaria. NAO e a segunda do ranking — essa costuma ser a vizinha da
  // primeira (Deadpool: amarelo, amarelo, amarelo), e uma segunda cor igual
  // a primeira nao serve para nada.
  //
  // Ela existe para o confronto: quando os dois lados tem primarias quase
  // iguais (Ichigo e Jean Grey, laranja e amarelo a 10 graus), o adversario
  // troca para a secundaria DELE, tirada da propria arte — a Jean Grey vira
  // o roxo do cosmos da Fenix, em vez de um ciano generico sem relacao
  // nenhuma com ela.
  const totalPeso = baldes.reduce((a, b) => a + b, 0);
  const distancia = (a, b) => {
    const d = Math.abs(a - b) % 36;
    return Math.min(d, 36 - d) * 10;
  };
  let secundaria = null;
  for (let i = 0; i < 36; i++) {
    if (baldes[i] < totalPeso * 0.04) continue;
    if (distancia(i, melhor) < 60) continue;
    if (secundaria === null || baldes[i] > baldes[secundaria]) secundaria = i;
  }
  let secHex = null;
  if (secundaria !== null) {
    const ss = somaS[secundaria] / baldes[secundaria];
    const ll = somaL[secundaria] / baldes[secundaria];
    secHex = hslParaHex(secundaria * 10 + 5, Math.min(0.92, Math.max(0.55, ss * 1.25)), Math.min(0.66, Math.max(0.5, ll * 1.15)));
  }

  const h = melhor * 10 + 5;
  const s = somaS[melhor] / baldes[melhor];
  const l = somaL[melhor] / baldes[melhor];

  // NORMALIZA PARA SERVIR DE DESTAQUE. A cor crua da arte pode ser escura
  // demais ou lavada demais para ler sobre o fundo #0a0a0f do tema. Puxar
  // saturacao e luminosidade para uma faixa fixa e o que faz 62 cores
  // diferentes conviverem na mesma tela sem uma sumir e outra gritar.
  const sFinal = Math.min(0.92, Math.max(0.55, s * 1.25));
  const lFinal = Math.min(0.66, Math.max(0.5, l * 1.15));
  return { hex: hslParaHex(h, sFinal, lFinal), h: Math.round(h), paleta: paleta, secundaria: secHex };
}

async function main() {
  const alvos = require('./artes-alvos.json');
  const saida = {};
  const linhas = [];

  for (const alvo of alvos) {
    const dir = path.join(charsDir, alvo.slug);
    if (!fs.existsSync(dir)) continue;
    const arq = fs.readdirSync(dir).find((f) => /_default\./.test(f));
    if (!arq) continue;

    try {
      const cor = await corDaArte(path.join(dir, arq));
      if (!cor) { linhas.push([alvo.nome, '(sem cor confiavel)', '']); continue; }
      saida[alvo.slug] = { cor: cor.hex, secundaria: cor.secundaria, paleta: cor.paleta };
      linhas.push([alvo.nome, cor.hex, 'secundaria ' + (cor.secundaria || '(nenhuma)')]);
    } catch (e) {
      linhas.push([alvo.nome, '(erro)', String(e.message).slice(0, 40)]);
    }
  }

  const destino = path.join(__dirname, 'cores-derivadas.json');
  fs.writeFileSync(destino, JSON.stringify(saida, null, 2));

  for (const [nome, hex, extra] of linhas) {
    console.log('  ' + nome.padEnd(24).slice(0, 24) + hex.padEnd(12) + extra);
  }
  console.log('\n' + Object.keys(saida).length + ' cores derivadas -> ' + path.relative(process.cwd(), destino));
}

main();
