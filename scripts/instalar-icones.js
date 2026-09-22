// Baixa a arte listada por buscar-icones.js e instala em
// public/images/skills/, junto com o manifesto que a tela lê.
//
// FORMATO DETECTADO PELOS BYTES, não pela extensão da URL: a CDN da Fandom
// devolve WebP mesmo quando a URL termina em .png, e salvar WebP com nome
// .png é mentira que quebra na frente. Mesma armadilha de instalar-artes.js.
//
// O MANIFESTO É CHAVEADO PELO NOME DA HABILIDADE, não por id. O id muda a
// cada seed do zero; o nome é o que o catálogo trata como identidade (é a
// chave de renomeacao-canonica.js e de mecanicas-de-dano.js). Assim a arte
// sobrevive a um banco recriado.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UA = 'animebattler-educational/1.0 (projeto de estudo; creditos em /creditos)';
const destino = path.join(__dirname, '..', 'public', 'images', 'skills');
const manifesto = path.join(__dirname, '..', 'app', 'lib', 'battle', 'arte-de-habilidade.json');

function formatoReal(b) {
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 0, 3) === 'GIF') return 'gif';
  return null;
}

/** Nome de arquivo previsível a partir do nome da habilidade. */
function slugDe(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const achados = require('./icones-encontrados.json');
  fs.mkdirSync(destino, { recursive: true });

  const mapa = {};
  let ok = 0;
  let i = 0;

  for (const a of achados) {
    i++;
    process.stderr.write(`\r${i}/${achados.length}  ok: ${ok}   ${a.name.slice(0, 36).padEnd(36)}`);
    // IDEMPOTENTE: o que ja esta no disco entra no manifesto sem baixar de
    // novo. Duas razoes - nao repetir 127 requisicoes a cada execucao, e nao
    // provocar o 403 de rate-limit do CDN. Sem isto, uma segunda passagem
    // REGREDIA o manifesto: os downloads que o rate-limit derrubava saiam da
    // lista mesmo com o arquivo ja no disco (104 viraram 92 assim).
    const jaTem = ['webp', 'png', 'jpg']
      .map((e) => `${slugDe(a.name)}.${e}`)
      .find((n) => fs.existsSync(path.join(destino, n)));
    if (jaTem) {
      mapa[a.name] = `/images/skills/${jaTem}`;
      ok++;
      continue;
    }

    const tmp = path.join(destino, '.tmp');
    try {
      execFileSync('curl', ['-s', '--max-time', '40', '-A', UA, '-o', tmp, a.url], { maxBuffer: 60e6 });
    } catch {
      continue;
    }
    if (!fs.existsSync(tmp)) continue;

    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    const fmt = formatoReal(buf);
    // .gif é cena em movimento, não quadro parado: não serve de ícone.
    if (!fmt || fmt === 'gif') continue;
    // Resposta de erro da CDN chega como HTML minúsculo; corta por tamanho.
    if (buf.length < 1500) continue;

    const nomeArq = `${slugDe(a.name)}.${fmt}`;
    fs.writeFileSync(path.join(destino, nomeArq), buf);
    mapa[a.name] = `/images/skills/${nomeArq}`;
    ok++;
  }

  fs.writeFileSync(manifesto, JSON.stringify(mapa, null, 2));
  console.error(`\n\n${ok} ícones instalados em public/images/skills/`);
  console.error(`Manifesto em ${path.relative(process.cwd(), manifesto)} (${Object.keys(mapa).length} habilidades)`);
}

main();
