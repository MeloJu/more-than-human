// Monta a folha de contato: uma página onde cada personagem mostra o retrato
// ATUAL ao lado dos candidatos em alta, e um clique escolhe.
//
// POR QUE UMA PÁGINA, e não uma lista no terminal. A decisão é visual e é
// sobre IDENTIDADE — "esta capa é o Baraggan ou é a capa com quatro Espada?"
// Nenhum filtro de nome responde isso, e descrever 45 personagens por texto
// seria mais lento que olhar. A escolha fica gravada no banco do artifact,
// então eu leio de volta com read_db em vez de alguém me ditar 45 nomes.
//
// As miniaturas vão EMBUTIDAS como data URI porque o sandbox do artifact
// bloqueia imagem de host externo — a CDN da Fandom não carregaria lá.
const fs = require('fs');
const path = require('path');

const raizChars = path.join(__dirname, '..', 'public', 'images', 'characters');

function mimePorExtensao(arq) {
  if (/\.png$/i.test(arq)) return 'image/png';
  if (/\.jpe?g$/i.test(arq)) return 'image/jpeg';
  if (/\.webp$/i.test(arq)) return 'image/webp';
  return null;
}

/** O retrato que está no jogo hoje, para servir de referência de identidade. */
function atualComoDataUri(slug) {
  const dir = path.join(raizChars, slug);
  if (!fs.existsSync(dir)) return null;
  const arq = fs.readdirSync(dir).find((f) => /_default\./.test(f));
  if (!arq) return null;
  const m = mimePorExtensao(arq);
  if (!m) return null;
  const b = fs.readFileSync(path.join(dir, arq));
  // Só entra se for pequeno — o atual É pequeno, é esse o problema.
  if (b.length > 260 * 1024) return null;
  return `data:${m};base64,` + b.toString('base64');
}

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main() {
  const folha = require('./retratos-candidatos.json');
  const comCandidato = folha.filter((f) => f.candidatos.length > 0);

  const dados = comCandidato.map((f) => ({
    slug: f.slug,
    nome: f.nome,
    atual: f.atual,
    atualThumb: atualComoDataUri(f.slug),
    candidatos: f.candidatos.map((c) => ({
      arquivo: c.arquivo,
      w: c.w,
      h: c.h,
      thumb: c.thumb,
      urlCheia: c.urlCheia,
    })),
  }));

  const semCandidato = folha.filter((f) => f.candidatos.length === 0).map((f) => f.nome);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Retratos em alta</title>
<style>
  :root { color-scheme: dark; --bg:#0a0a0f; --sup:#16161f; --sup2:#1d1d28; --bd:#2a2a38;
          --fg:#f4f4f5; --mut:#a1a1aa; --ac:#ff6b1a; --ok:#4ade80; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family:'Inter Tight',ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  .wrap { max-width:1180px; margin:0 auto; padding:24px 16px 80px; }
  h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:0 0 6px; }
  .sub { color:var(--mut); font-size:14px; margin:0 0 4px; line-height:1.5; }
  .barra { position:sticky; top:0; z-index:10; background:rgba(10,10,15,.94);
           backdrop-filter:blur(8px); border-bottom:1px solid var(--bd);
           padding:12px 16px calc(12px + env(safe-area-inset-top,0px)); margin:0 -16px 20px;
           display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .cont { font-size:13px; font-weight:700; color:var(--ac); font-variant-numeric:tabular-nums; }
  .pess { display:flex; flex-direction:column; gap:10px; padding:16px 0 20px; border-bottom:1px solid var(--bd); }
  .cab { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
  .nome { font-size:17px; font-weight:800; }
  .meta { font-size:12px; color:var(--mut); }
  .linha { display:flex; gap:14px; align-items:flex-start; overflow-x:auto; padding-bottom:6px; }
  .atual { flex:0 0 118px; }
  .atual img { width:118px; aspect-ratio:2/3; object-fit:cover; object-position:top;
               border-radius:2px 10px 2px 10px; border:1px solid var(--bd); display:block; filter:saturate(.7); }
  .rot { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
         color:var(--mut); margin-top:6px; }
  .cands { display:flex; gap:12px; flex-wrap:wrap; }
  .c { flex:0 0 118px; cursor:pointer; background:none; border:0; padding:0; text-align:left;
       font:inherit; color:inherit; }
  .c img { width:118px; aspect-ratio:2/3; object-fit:cover; object-position:top;
           border-radius:2px 10px 2px 10px; border:2px solid var(--bd); display:block;
           transition:border-color .12s, transform .12s; }
  .c:hover img { border-color:rgba(255,107,26,.6); transform:translateY(-2px); }
  .c[aria-pressed="true"] img { border-color:var(--ok); }
  .c .dim { font-size:11px; color:var(--mut); margin-top:5px; font-variant-numeric:tabular-nums; }
  .c .arq { font-size:10px; color:#52525b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .c[aria-pressed="true"] .dim { color:var(--ok); font-weight:700; }
  .nenhum { flex:0 0 118px; height:177px; display:flex; align-items:center; justify-content:center;
            text-align:center; font-size:12px; color:var(--mut); background:var(--sup);
            border:2px dashed var(--bd); border-radius:2px 10px 2px 10px; cursor:pointer;
            font-family:inherit; }
  .nenhum[aria-pressed="true"] { border-color:#f87171; color:#f87171; border-style:solid; }
  .aviso { background:var(--sup); border:1px solid var(--bd); border-left:3px solid var(--ac);
           border-radius:2px 10px 2px 10px; padding:14px 16px; margin:0 0 22px; font-size:13px;
           color:var(--mut); line-height:1.55; }
  .aviso b { color:var(--fg); }
  .sem { font-size:13px; color:var(--mut); line-height:1.6; }
  .est { font-size:12px; color:var(--mut); }
  @media (max-width:520px) { .linha { gap:10px; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="barra">
    <span class="cont" id="cont">0 de ${dados.length}</span>
    <span class="est" id="est">carregando…</span>
  </div>

  <h1>Retratos em alta — escolha por personagem</h1>
  <p class="sub">O primeiro da esquerda é o que está no jogo hoje. Clique no candidato que for a melhor
  arte <b>daquele personagem</b>.</p>

  <div class="aviso">
    <b>O que olhar:</b> resolução aqui é a parte fácil — todos os candidatos passam de 500px.
    O que precisa do seu olho é <b>identidade</b>: boa parte vem de capa de capítulo, e capa
    costuma ter vários personagens. Numa sondagem, Baraggan e Zommari caíram no mesmo arquivo
    porque era uma capa com quatro Espada. Se nenhum servir, marque <b>nenhuma serve</b> — é
    uma resposta útil, não uma falha.
  </div>

  <div id="lista"></div>

  ${semCandidato.length ? `<p class="sem"><b>Sem candidato em alta na wiki (${semCandidato.length}):</b><br>${escapar(semCandidato.join(' · '))}</p>` : ''}
</div>

<script>
const DADOS = ${JSON.stringify(dados)};
let db = null;
const escolhas = {};

function pintar() {
  const n = Object.keys(escolhas).length;
  document.getElementById('cont').textContent = n + ' de ' + DADOS.length;
}

function montar() {
  const lista = document.getElementById('lista');
  for (const p of DADOS) {
    const sec = document.createElement('section');
    sec.className = 'pess';

    const cab = document.createElement('div');
    cab.className = 'cab';
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = p.nome;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = 'hoje: ' + p.atual + 'px de largura';
    cab.append(nome, meta);

    const linha = document.createElement('div');
    linha.className = 'linha';

    if (p.atualThumb) {
      const at = document.createElement('div');
      at.className = 'atual';
      const im = document.createElement('img');
      im.src = p.atualThumb;
      im.alt = '';
      const r = document.createElement('div');
      r.className = 'rot';
      r.textContent = 'atual';
      at.append(im, r);
      linha.append(at);
    }

    const cands = document.createElement('div');
    cands.className = 'cands';

    const botoes = [];
    function marcar(valor) {
      for (const b of botoes) b.setAttribute('aria-pressed', String(b.dataset.valor === valor));
      escolhas[p.slug] = valor;
      pintar();
      if (db) {
        const escolhido = p.candidatos.find((c) => c.arquivo === valor);
        db.doc('escolhas/' + p.slug).set({
          slug: p.slug,
          nome: p.nome,
          arquivo: valor,
          url: escolhido ? escolhido.urlCheia : null,
          w: escolhido ? escolhido.w : null,
          h: escolhido ? escolhido.h : null,
        }).catch(() => {});
      }
    }

    for (const c of p.candidatos) {
      const b = document.createElement('button');
      b.className = 'c';
      b.type = 'button';
      b.dataset.valor = c.arquivo;
      b.setAttribute('aria-pressed', 'false');
      const im = document.createElement('img');
      im.src = c.thumb;
      im.alt = '';
      const d = document.createElement('div');
      d.className = 'dim';
      d.textContent = c.w + '×' + c.h;
      const a = document.createElement('div');
      a.className = 'arq';
      a.textContent = c.arquivo;
      a.title = c.arquivo;
      b.append(im, d, a);
      b.addEventListener('click', () => marcar(c.arquivo));
      botoes.push(b);
      cands.append(b);
    }

    const nen = document.createElement('button');
    nen.className = 'nenhum';
    nen.type = 'button';
    nen.dataset.valor = '__nenhuma__';
    nen.setAttribute('aria-pressed', 'false');
    nen.textContent = 'nenhuma serve';
    nen.addEventListener('click', () => marcar('__nenhuma__'));
    botoes.push(nen);
    cands.append(nen);

    linha.append(cands);
    sec.append(cab, linha);
    lista.append(sec);
  }
  pintar();
}

montar();

(async () => {
  const est = document.getElementById('est');
  try {
    db = await window.claude.use('db');
  } catch (e) {
    db = null;
  }
  if (!db) {
    est.textContent = 'as escolhas não estão sendo gravadas nesta visualização';
    return;
  }
  est.textContent = 'escolhas gravadas automaticamente';
  try {
    const snap = await db.collection('escolhas').get();
    const docs = snap && snap.docs ? snap.docs : [];
    for (const d of docs) {
      const v = typeof d.data === 'function' ? d.data() : d;
      if (!v || !v.slug) continue;
      escolhas[v.slug] = v.arquivo;
      const sec = [...document.querySelectorAll('.pess')].find(
        (s) => s.querySelector('.nome') && DADOS.find((p) => p.nome === s.querySelector('.nome').textContent && p.slug === v.slug)
      );
      if (sec) {
        for (const b of sec.querySelectorAll('[data-valor]')) {
          b.setAttribute('aria-pressed', String(b.dataset.valor === v.arquivo));
        }
      }
    }
    pintar();
  } catch (e) {
    /* coleção vazia na primeira abertura */
  }
})();
</script>
</body>
</html>`;

  const destino = path.join(__dirname, '..', 'design', 'retratos-em-alta.html');
  fs.writeFileSync(destino, html);
  const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  console.log(`${dados.length} personagens com candidato, ${dados.reduce((s, d) => s + d.candidatos.length, 0)} imagens`);
  console.log(`${semCandidato.length} sem candidato`);
  console.log(`Folha: ${path.relative(process.cwd(), destino)} (${mb} MB)`);
}

main();
