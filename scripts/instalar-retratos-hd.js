// Instala os retratos escolhidos na folha de contato, em 1280px de largura.
//
// A LARGURA SAI DO CÓDIGO, não de "quanto maior melhor". FighterCard declara
// `sizes="(max-width: 1024px) 100vw, 320px"`: no desktop o card pede 320px,
// no celular pede a viewport inteira. Num telefone de 430px com DPR 3 isso é
// ~1290px — daí o alvo. Full HD seria 6x o tamanho de exibição no desktop,
// peso sem ganho visível, e o next/image já gera as variantes menores.
//
// O QUE ESTAVA ERRADO ANTES: 45 dos 62 retratos tinham menos de 600px, com
// mediana de 230px. Não era bug do buscador — ele já pedia iiurlwidth=1200,
// e o MediaWiki não faz upscale. A arte de infobox da wiki é pequena na
// origem, ponto. A folha de contato foi como se achou substituta com
// identidade conferida por gente, já que "capa de capítulo em alta" quase
// sempre tem vários personagens.
//
// SÓ INSTALA O QUE FOI ESCOLHIDO. "__nenhuma__" significa que o retrato
// atual já serve — essa é a resposta do dono do projeto, não uma falha, e
// sobrescrever seria desfazer uma decisão dele.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UA = 'animebattler-educational/1.0 (projeto de estudo; creditos em /creditos)';
const escolhasDir = path.join(__dirname, 'escolhas-retratos', 'escolhas');
const charsDir = path.join(__dirname, '..', 'public', 'images', 'characters');

function formatoReal(b) {
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 0, 3) === 'GIF') return 'gif';
  return null;
}

function main() {
  const arquivos = fs.readdirSync(escolhasDir).filter((f) => f.endsWith('.json'));
  const escolhidos = [];
  const mantidos = [];

  for (const f of arquivos) {
    const doc = JSON.parse(fs.readFileSync(path.join(escolhasDir, f), 'utf8'));
    const d = doc.data ?? doc;
    if (!d.url || d.arquivo === '__nenhuma__') { mantidos.push(d.nome); continue; }
    escolhidos.push(d);
  }

  console.error(`${escolhidos.length} para instalar, ${mantidos.length} mantidos como estão\n`);

  let ok = 0;
  const falhas = [];
  let i = 0;
  for (const e of escolhidos) {
    i++;
    process.stderr.write(`\r${i}/${escolhidos.length}  ok: ${ok}   ${e.nome.slice(0, 30).padEnd(30)}`);

    const tmp = path.join(charsDir, '.retrato-tmp');
    try {
      execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', tmp, e.url], { maxBuffer: 80e6 });
    } catch {
      falhas.push(e.nome + ' (curl)');
      continue;
    }
    if (!fs.existsSync(tmp)) { falhas.push(e.nome + ' (sem arquivo)'); continue; }

    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    // Formato pelos BYTES: a CDN devolve WebP mesmo com URL terminando em
    // .png, e salvar WebP com nome .png é mentira que quebra na frente.
    const fmt = formatoReal(buf);
    if (!fmt || fmt === 'gif' || buf.length < 4000) { falhas.push(e.nome + ' (formato/tamanho)'); continue; }

    const pasta = path.join(charsDir, e.slug);
    fs.mkdirSync(pasta, { recursive: true });

    // O _default antigo sai: ele é justamente o thumbnail que estamos
    // substituindo. O git guarda a versão anterior, então nada se perde.
    for (const antigo of fs.readdirSync(pasta)) {
      if (/_default\./.test(antigo)) fs.unlinkSync(path.join(pasta, antigo));
    }
    fs.writeFileSync(path.join(pasta, `${e.slug}_default.${fmt}`), buf);
    ok++;
  }

  console.error(`\n\n${ok} retratos instalados em 1280px`);
  if (falhas.length) console.error(`falharam (${falhas.length}): ${falhas.join(', ')}`);
  console.error('\nRodar `npm run catalog:sync` para o banco apontar para os arquivos novos.');
}

main();
