// Calcula, para cada retrato, ONDE enquadrar quando ele é recortado no card.
//
// O PROBLEMA: o card recorta a arte com object-fit: cover, e até aqui sempre
// pelo topo (object-top). Isso funciona para retrato de busto, mas a arte do
// elenco é mista — corpo inteiro, cena, capa — e o personagem fica pequeno e
// fora do centro. O dono do projeto viu isso na primeira tela nova: "as fotos
// não estão muito centralizadas".
//
// A SOLUÇÃO: o sharp tem recorte por ATENÇÃO, que acha a região mais
// saliente da imagem (rosto, cor forte, contraste). O ponto focal que ele
// devolve vira o object-position daquela imagem, gravado num manifesto que o
// card lê pela URL — sem coluna nova no banco, e a arte nova ganha foco só
// rodando este script de novo.
//
// ATENÇÃO ACHA O QUE É SALIENTE, NÃO ONDE ESTÁ A CABEÇA — e em retrato de
// personagem é a cabeça que importa. Medido: na Jean Grey ela caiu em 62% da
// altura, no amarelo da Fênix; no Naruto (arte de corpo inteiro, 1280x3148)
// caiu em 56%, na braçadeira vermelha, e o card mostrou só o tronco. Um teto
// de 45% não bastou: com arte alta assim, o card enxerga só 45% da altura, e
// focar em 41% ainda corta a cabeça.
//
// Então o VERTICAL não vem da atenção: fica perto do topo (teto de 22%), que
// é onde a cabeça está em arte de corpo inteiro, e em busto o recorte é
// pequeno o bastante para o rosto caber de qualquer jeito. Errar para cima
// corta o pé; errar para baixo corta a cabeça. A atenção continua decidindo
// o HORIZONTAL, onde ela ajuda: centra o personagem que está de lado na cena.
//
// Sem dependência nova: sharp já vem com o Next.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..', 'public', 'images', 'characters');
const destino = path.join(__dirname, '..', 'app', 'lib', 'battle', 'foco-dos-retratos.json');

/** Proporção do card (largura x altura), onde o recorte acontece. */
const CAIXA_L = 400;
const CAIXA_A = 440;

/** Teto do foco vertical. Ver o cabeçalho. */
const FOCO_VERTICAL_MAXIMO = 0.22;

/**
 * Converte o ponto focal (fração da imagem) no object-position que o CENTRA
 * na caixa. Não é só "foco% foco%": object-position em porcentagem alinha o
 * ponto X% da imagem com o ponto X% da caixa, que só coincide com centrar
 * quando o foco está no meio.
 */
function posicao(fx, fy, w, h) {
  const escala = Math.max(CAIXA_L / w, CAIXA_A / h);
  const sw = w * escala;
  const sh = h * escala;
  const eixo = (f, s, caixa) => {
    const folga = s - caixa;
    if (folga <= 0.5) return 50;
    const deslocamento = Math.min(Math.max(f * s - caixa / 2, 0), folga);
    return Math.round((deslocamento / folga) * 100);
  };
  return `${eixo(fx, sw, CAIXA_L)}% ${eixo(fy, sh, CAIXA_A)}%`;
}

async function main() {
  const manifesto = {};
  const linhas = [];

  for (const slug of fs.readdirSync(raiz)) {
    const pasta = path.join(raiz, slug);
    if (!fs.statSync(pasta).isDirectory()) continue;

    for (const arq of fs.readdirSync(pasta)) {
      if (!/\.(png|jpe?g|webp)$/i.test(arq)) continue;
      const arquivo = path.join(pasta, arq);
      try {
        const meta = await sharp(arquivo).metadata();
        const { info } = await sharp(arquivo)
          .resize(CAIXA_L, CAIXA_A, { fit: 'cover', position: sharp.strategy.attention })
          .toBuffer({ resolveWithObject: true });

        const fx = info.attentionX / meta.width;
        const fy = Math.min(info.attentionY / meta.height, FOCO_VERTICAL_MAXIMO);
        manifesto[`/images/characters/${slug}/${arq}`] = posicao(fx, fy, meta.width, meta.height);

        if (/_default\./.test(arq)) {
          linhas.push([slug, `${meta.width}x${meta.height}`, manifesto[`/images/characters/${slug}/${arq}`]]);
        }
      } catch (e) {
        linhas.push([slug + '/' + arq, '(erro)', String(e.message).slice(0, 40)]);
      }
    }
  }

  fs.writeFileSync(destino, JSON.stringify(manifesto, null, 2) + '\n');
  for (const [a, b, c] of linhas) console.log('  ' + a.padEnd(26).slice(0, 26) + b.padEnd(12) + c);
  console.log(`\n${Object.keys(manifesto).length} imagens com foco -> ${path.relative(process.cwd(), destino)}`);
}

main();
