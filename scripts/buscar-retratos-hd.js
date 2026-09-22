// Procura candidatos a retrato em ALTA para os personagens cuja arte atual é
// thumbnail de infobox, e monta a folha de contato para revisão humana.
//
// POR QUE PRECISA DE REVISÃO HUMANA, e não é preguiça de filtrar melhor.
//
// Medido: 45 dos 62 retratos têm menos de 600px de largura, e a mediana do
// elenco é 230px — thumbnail de infobox. O `buscar-artes.js` já pede
// `iiurlwidth=1200`; o MediaWiki simplesmente não faz upscale, então o que
// está pequeno está pequeno na fonte.
//
// A galeria das mesmas wikis TEM imagem em formato retrato entre 760 e
// 1200px. Só que boa parte é CAPA DE CAPÍTULO, e capa não é retrato: numa
// amostra de 8, Baraggan e Zommari caíram no MESMO arquivo (270Cover.png),
// porque é uma capa com vários Espada. Resolução boa, identidade duvidosa —
// o mesmo problema que já derrubou a busca de ícone por artigo.
//
// Nenhum filtro de nome resolve "esta capa tem quatro personagens". Então o
// script não escolhe: ele junta candidatos e entrega uma FOLHA DE CONTATO
// onde a escolha leva um clique por personagem, em vez de uma caçada
// arquivo a arquivo.
//
// USO DA ARTE: mesma decisão registrada em app/lib/creditos.ts — projeto
// educativo, sem fim comercial, crédito visível em /creditos e no rodapé.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UA = 'animebattler-educational/1.0 (projeto de estudo; creditos em /creditos)';

/** Largura do recorte na folha de contato. O julgamento é de identidade,
 *  não de nitidez, então miniatura basta — e mantém a página leve. */
const LARGURA_MINIATURA = 220;

/** Abaixo disto o retrato atual é considerado fraco e entra na revisão. */
const LARGURA_FRACA = 99999;

/** Candidatos oferecidos por personagem. Mais que isto vira cansaço, não escolha. */
const MAX_CANDIDATOS = 8;

function curlJson(url) {
  try {
    return JSON.parse(execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, url], { maxBuffer: 20e6 }).toString());
  } catch {
    return null;
  }
}

function curlBuffer(url) {
  try {
    const tmp = path.join(__dirname, '.retrato-tmp');
    execFileSync('curl', ['-s', '--max-time', '40', '-A', UA, '-o', tmp, url], { maxBuffer: 60e6 });
    if (!fs.existsSync(tmp)) return null;
    const b = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    return b.length > 1200 ? b : null;
  } catch {
    return null;
  }
}

/** Dimensão pelos bytes, sem lib: PNG no IHDR, JPEG no SOF, WebP nos chunks. */
function dimensao(b) {
  if (b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8X') return [1 + ((b[24] | (b[25] << 8) | (b[26] << 16)) & 0xffffff), 1 + ((b[27] | (b[28] << 8) | (b[29] << 16)) & 0xffffff)];
    if (f === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (f === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length - 9) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)];
      o += 2 + b.readUInt16BE(o + 2);
    }
  }
  return null;
}

function mime(b) {
  if (b.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * A query string NÃO pode ser descartada: a URL termina em
 * `?cb=...&path-prefix=en` e o path-prefix é obrigatório — sem ele o CDN
 * responde 404. Mesma armadilha já paga em buscar-icones.js.
 */
function urlEscalada(urlOriginal, largura) {
  const corte = urlOriginal.indexOf('?');
  const caminho = corte === -1 ? urlOriginal : urlOriginal.slice(0, corte);
  const query = corte === -1 ? '' : urlOriginal.slice(corte);
  if (!caminho.includes('/revision/')) return urlOriginal;
  return caminho.replace(/\/revision\/latest.*$/, `/revision/latest/scale-to-width-down/${largura}`) + query;
}

/**
 * `redirects=1` NAO E OPCIONAL. Metade dos titulos do catalogo aponta para
 * uma pagina de REDIRECIONAMENTO na wiki — "Baraggan Luisenbarn" redireciona
 * para "Baraggan Louisenbairn". Sem seguir o redirect, `prop=images` devolve
 * as imagens da pagina de redirect, que sao nenhuma, e o personagem sai como
 * "sem candidato" quando na verdade tem galeria inteira.
 */
/**
 * Qualificadores que trazem ARTE em vez de cena.
 *
 * Buscar so o nome do personagem no namespace de arquivo devolve as cenas em
 * que ele aparece. Buscar "<nome> render" ou "<nome> fullbody" devolve o
 * material de ficha. Medido em 4 personagens: Aizen passou a achar
 * "Aizen Anime Fullbody" (1050x1500) e "RoS Aizen" (1347x1847), Gojo achou
 * "Satoru Gojo (Volume 4)" (1400x1924) — nenhum deles aparecia varrendo so
 * a galeria.
 */
const QUALIFICADORES = ['render', 'fullbody', 'profile', 'artwork', 'wallpaper', 'visual'];

function porQualificador(wiki, nome) {
  const achados = [];
  for (const q of QUALIFICADORES) {
    const r = curlJson(
      `https://${wiki}.fandom.com/api.php?action=query&list=search` +
        `&srsearch=${encodeURIComponent(nome + ' ' + q)}&srnamespace=6&srlimit=5&format=json`
    );
    for (const x of r?.query?.search ?? []) {
      if (/\.(png|jpe?g)$/i.test(x.title)) achados.push(x.title);
    }
  }
  return achados;
}

/**
 * DeviantArt, pelo RSS publico — sem login, sem chave, sem navegador.
 *
 * POR QUE ELE E OUTRA CATEGORIA, e nao so "mais uma fonte": o que vem daqui
 * e FAN ART. Tem um autor individual, com nome, que detem o direito da obra
 * dele — diferente de screenshot de anime, que e da produtora e entra no
 * credito por franquia que app/lib/creditos.ts ja faz.
 *
 * Por isso cada candidato guarda `autor` e `pagina`: se alguma dessas artes
 * for para o jogo, o credito tem de ser por ARTISTA, nao por obra, e isso e
 * mudanca no modelo de credito — decisao do dono do projeto, nao minha.
 *
 * (Pinterest nao entra: devolve so parede de login, testado. E mesmo com
 * conta, precisaria de navegador dirigido com credencial de terceiro.)
 */
function porDeviantArt(nome) {
  const achados = [];
  for (const q of ['render', 'fanart']) {
    let xml = '';
    try {
      xml = execFileSync('curl', ['-s', '--max-time', '30', '-A', UA,
        `https://backend.deviantart.com/rss.xml?q=${encodeURIComponent(nome + ' ' + q)}&type=deviation`,
      ], { maxBuffer: 20e6 }).toString();
    } catch { continue; }

    for (const item of xml.split('<item>').slice(1, 12)) {
      const titulo = (item.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const mc = item.match(/<media:content\s+url="([^"]+)"[^>]*?width="(\d+)"[^>]*?height="(\d+)"/);
      if (!mc) continue;
      const [, url, w, h] = mc;
      const autor = (item.match(/<media:credit role="author"[^>]*>([^<h][^<]*)<\/media:credit>/) || [])[1] || '';
      const pagina = (item.match(/<link>([^<]*)<\/link>/) || [])[1] || '';
      achados.push({
        titulo: titulo, w: Number(w), h: Number(h), url: url,
        fonte: 'deviantart', autor: autor, pagina: pagina,
      });
    }
  }
  return achados;
}

function imagensDaPagina(wiki, titulo) {
  const r = curlJson(
    `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(titulo)}` +
      `&prop=images&imlimit=60&redirects=1&format=json`
  );
  const p = Object.values(r?.query?.pages ?? {})[0];
  if (!p || p.missing !== undefined) return [];
  return (p.images ?? [])
    .map((x) => x.title)
    .filter((t) => /\.(png|jpe?g)$/i.test(t) && !/site-|wiki-|badge|logo|favicon|spoiler/i.test(t));
}

/**
 * Quando o titulo do catalogo nao existe na wiki, procura o certo.
 *
 * "As Nodt" nao existe; a pagina e "As Nodt" com trema. Trocar a mao os 62
 * seria manutencao eterna — a busca resolve, e so e usada quando o titulo
 * direto falha, entao nao gasta requisicao a toa.
 */
function tituloReal(wiki, titulo) {
  const r = curlJson(
    `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(titulo)}&redirects=1&format=json`
  );
  const p = Object.values(r?.query?.pages ?? {})[0];
  if (p && p.missing === undefined) return titulo;

  const b = curlJson(
    `https://${wiki}.fandom.com/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(titulo)}&srnamespace=0&srlimit=1&format=json`
  );
  return b?.query?.search?.[0]?.title ?? titulo;
}

/**
 * O ARQUIVO PRECISA CARREGAR O NOME DO PERSONAGEM. Sem isto, nada presta.
 *
 * A busca por qualificador ("<nome> render") casa com qualquer arquivo cuja
 * PAGINA mencione aquelas palavras, nao com arquivos nomeados a partir do
 * personagem. Medido: a busca por Baraggan devolveu "Yukio Anime
 * Fullbody.png" e a de As Nodt devolveu "Sui-Feng Hell Artwork.png" — arte
 * boa, personagem errado. E exatamente o erro que ja tinha derrubado a busca
 * de icone por artigo.
 *
 * A regra: algum token do nome com 4+ letras precisa aparecer no nome do
 * arquivo. Quatro e o piso porque "As" (de As Nodt) casaria com meio
 * catalogo. O preco e perder um candidato bom aqui e ali — "As Anime
 * Fullbody.png" e do As Nodt e sera rejeitado — e vale pagar: candidato
 * perdido a galeria ainda cobre, candidato ERRADO vai pro jogo sem ninguem
 * notar.
 */
/** Sem acento, minusculo, so letras/numeros e espaco. */
function normalizar(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Igual, porem sem espaco nenhum: para o teste de "contem". */
function colado(s) {
  return normalizar(s).replace(/ /g, '');
}

function pareceSerDele(nomeArquivo, nomePersonagem) {
  const arq = colado(nomeArquivo);
  const tokens = normalizar(nomePersonagem)
    .split(' ')
    .filter((t) => t.length >= 4);
  if (tokens.length === 0) {
    // Nome inteiro curto (raro): exige o nome colado.
    return arq.includes(colado(nomePersonagem));
  }
  return tokens.some((t) => arq.includes(t));
}

/** Consulta tamanho e url em lote — 40 títulos por chamada é o limite prático. */
function detalhes(wiki, titulos) {
  const saida = [];
  for (let k = 0; k < titulos.length; k += 40) {
    const lote = titulos.slice(k, k + 40).join('|');
    const r = curlJson(
      `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(lote)}&prop=imageinfo&iiprop=size|url&format=json`
    );
    for (const pg of Object.values(r?.query?.pages ?? {})) {
      const i = pg.imageinfo?.[0];
      if (i?.width) saida.push({ titulo: pg.title, w: i.width, h: i.height, url: i.url });
    }
  }
  return saida;
}

/**
 * Ordena por quão provável é ser um retrato útil.
 *
 * Proporção vertical primeiro (retrato de personagem é mais alto que largo),
 * largura depois. Não é verificação — é ordem de apresentação, para o melhor
 * palpite chegar primeiro na folha.
 */
/**
 * Nomes que quase sempre sao retrato do personagem SOZINHO.
 *
 * Saiu da amostra: as wikis de Bleach nomeiam a arte de corpo inteiro como
 * "<Nome> Anime Fullbody.png", a oficial do autor como "KUBO<Nome>.png" e o
 * recorte de rosto como "...Profile.png". Sao exatamente o que "Cover.png"
 * NAO e — capa de capitulo costuma ter varios personagens, e foi o que fez
 * Baraggan e Zommari caírem no mesmo arquivo na primeira sondagem.
 */
/**
 * O QUE SEPARA ARTE DE PERSONAGEM DE CENA DE MANGA.
 *
 * A primeira versao varria so a galeria da pagina, e galeria de wiki de manga
 * e quase toda CENA: "117Ichigo catches.png", "261Nnoitra confronts.png" —
 * numero de capitulo seguido de um verbo. Sao imagens legitimas e em boa
 * resolucao, mas mostram acao, nao o personagem.
 *
 * Os nomes abaixo saem de amostragem real nas wikis:
 *
 *   ANIME FULLBODY   arte oficial de corpo inteiro, o alvo ideal
 *   RoS / BBS        renders dos jogos (Rebirth of Souls, Brave Souls):
 *                    personagem limpo, sem fundo de cena
 *   CURSED CLASH     mesmo caso, do lado de Jujutsu Kaisen
 *   KUBO             ilustracao do proprio autor
 *   CHARAPIC         "character picture" — retrato de ficha do anime
 *   INFOBOX          o retrato que a propria wiki elegeu como canonico
 *   VOLUME N         capa de volume em JJK costuma ser o personagem sozinho
 *
 * E o que costuma ser cena ou gente demais: verbo de acao, "vs", "Cover",
 * "Battle". Cover leva penalidade forte porque foi ele que fez Baraggan e
 * Zommari cairem no mesmo arquivo na primeira sondagem.
 */
const MUITO_BOM = /anime fullbody|RoS |BBS |cursed clash|KUBO|charapic|infobox|character art|key visual|render/i;
const BOM = /profile|artwork|concept|fullbody|volume \d|full|portrait|visual/i;
const CENA = /vs\.?|cover|volume \d+ cover|battle|arrives?|appears?|confronts?|catches|meets?|learns?|attacks?|defeats?|gather|destroyed|wields|removes|fires|uses/i;

function ranquear(cands, nomeAlvo) {
  return cands
    .filter((c) => c.w >= 500 && c.h > c.w * 1.05)
    .map((c) => {
      const nome = c.titulo.replace(/^File:/, '');
      const prop = c.h / c.w;
      let nota = 0;
      if (MUITO_BOM.test(nome)) nota += 160;
      else if (BOM.test(nome)) nota += 90;
      if (CENA.test(nome)) nota -= 70;
      // O nome do arquivo carregar o nome do personagem vale mais que
      // qualquer outro sinal: e o que separa "Aizen Anime Fullbody" de
      // "Yukio Anime Fullbody" numa busca por Aizen.
      if (nomeAlvo && !pareceSerDele(nome, nomeAlvo)) nota -= 200;
      // Proporcao de retrato de corpo: entre 1.2 e 1.9 e o que o card usa.
      if (prop >= 1.2 && prop <= 1.9) nota += 30;
      nota += Math.min(25, c.w / 80);
      return Object.assign({}, c, { nota });
    })
    .sort((a, b) => b.nota - a.nota);
}

function larguraAtual(slug) {
  const dir = path.join(__dirname, '..', 'public', 'images', 'characters', slug);
  if (!fs.existsSync(dir)) return 0;
  const arq = fs.readdirSync(dir).find((f) => /_default\./.test(f));
  if (!arq) return 0;
  const d = dimensao(fs.readFileSync(path.join(dir, arq)));
  return d?.[0] ?? 0;
}

function main() {
  const alvos = require('./artes-alvos.json');
  const limite = process.argv[2] ? Number(process.argv[2]) : null;

  const fracos = alvos
    .map((a) => Object.assign({}, a, { atual: larguraAtual(a.slug) }))
    .filter((a) => a.atual > 0 && a.atual < LARGURA_FRACA);

  const lista = limite ? fracos.slice(0, limite) : fracos;
  console.error(`${fracos.length} personagens abaixo de ${LARGURA_FRACA}px; processando ${lista.length}\n`);

  const folha = [];
  let i = 0;
  for (const alvo of lista) {
    i++;
    process.stderr.write(`\r${i}/${lista.length}  ${alvo.nome.slice(0, 32).padEnd(32)}`);

    // A galeria primeiro: é onde mora a arte grande. A página do personagem
    // entra junto porque nem toda wiki tem galeria separada.
    const titulo = tituloReal(alvo.wiki, alvo.titulo);
    // Qualificador PRIMEIRO: e de onde vem a arte de ficha. A galeria entra
    // depois, como rede — ela tem volume, mas e majoritariamente cena.
    const titulos = [
      ...porQualificador(alvo.wiki, alvo.nome),
      ...imagensDaPagina(alvo.wiki, titulo + '/Image Gallery'),
      ...imagensDaPagina(alvo.wiki, titulo),
    ];
    // ORDENA, NAO DESCARTA. O nome do arquivo carregar o nome do personagem e
    // sinal forte, nao prova: "As Anime Fullbody.png" E do As Nodt e nao
    // contem "nodt". Descartar por isso tirou As Nodt e Baraggan da folha
    // inteira. Como a escolha final e humana, o que serve e trazer o provavel
    // PRIMEIRO e deixar o resto disponivel embaixo.
    const unicos = Array.from(new Set(titulos));
    if (unicos.length === 0) { folha.push({ ...alvo, candidatos: [] }); continue; }

    // Wiki e DeviantArt entram na MESMA lista e disputam pelo mesmo criterio.
    // O da wiki tende a ganhar por ser arte oficial; o do DeviantArt cobre
    // justamente quem a wiki so tem em cena.
    const daWiki = detalhes(alvo.wiki, unicos).map((c) => Object.assign({}, c, { fonte: 'wiki' }));
    const daDA = porDeviantArt(alvo.nome);
    const ranqueados = ranquear(daWiki.concat(daDA), alvo.nome).slice(0, MAX_CANDIDATOS);

    const candidatos = [];
    for (const c of ranqueados) {
      const b = curlBuffer(c.fonte === 'deviantart' ? c.url : urlEscalada(c.url, LARGURA_MINIATURA));
      if (!b) continue;
      const m = mime(b);
      if (!m) continue;
      candidatos.push({
        arquivo: c.titulo.replace(/^File:/, ''),
        w: c.w,
        h: c.h,
        // A miniatura vai embutida: a folha precisa abrir sem depender da CDN.
        thumb: `data:${m};base64,` + b.toString('base64'),
        fonte: c.fonte ?? 'wiki',
        autor: c.autor ?? null,
        pagina: c.pagina ?? null,
        urlCheia: c.fonte === 'deviantart' ? c.url : urlEscalada(c.url, 1280),
      });
    }
    folha.push({ slug: alvo.slug, nome: alvo.nome, wiki: alvo.wiki, atual: alvo.atual, candidatos });
  }

  const destino = path.join(__dirname, 'retratos-candidatos.json');
  fs.writeFileSync(destino, JSON.stringify(folha, null, 2));
  const com = folha.filter((f) => f.candidatos.length > 0).length;
  const total = folha.reduce((s, f) => s + f.candidatos.length, 0);
  console.error(`\n\n${com} de ${folha.length} personagens com candidato (${total} imagens)`);
  console.error(`Folha de contato: ${path.relative(process.cwd(), destino)}`);
}

main();
