// Procura arte de anime para servir de ícone às habilidades CANÔNICAS.
//
// Complementa app/components/battle/IconeDeHabilidade.tsx, que desenha o
// ícone a partir do efeito e cobre 100% do catálogo. Este script cobre só a
// minoria famosa — Getsuga Tenshō, Kamehameha, Rasengan — onde existe arte de
// verdade e vale mais que um símbolo.
//
// USO DA ARTE: mesma decisão já registrada em app/lib/creditos.ts — projeto
// educativo, sem fim comercial, crédito visível em /creditos e no rodapé de
// toda página.
//
// ============================================================================
// PROCURA NO NAMESPACE DE ARQUIVO, NÃO NO DE ARTIGO. Esta é a coisa toda.
// ============================================================================
//
// A primeira versão buscava ARTIGO pelo nome da habilidade e pegava a
// primeira imagem da página achada. Medido em 40 nomes: 2 exatos, 2 por raiz,
// 31 duvidosos, 5 sem nada. E os duvidosos eram lixo — "Análise de Padrão"
// caiu em "Brion Markov (Earth-16)", "Arrow of Fear" num título de capítulo.
// O motivo é que a busca de artigo SEMPRE devolve algo: sem página para a
// técnica, ela cai no personagem, no capítulo, em qualquer coisa parecida.
//
// Buscar no namespace 6 (File:) inverte isso. O nome do arquivo na wiki
// costuma CONTER o nome da técnica — "583Getsuga Jujisho.png",
// "142Byakuya's Bankai, Senbonzakura Kageyoshi.png", "Kamehameha.jpg" — então
// dá para EXIGIR que contenha, e descartar o resto. O filtro deixou de ser
// um palpite sobre relevância e virou uma verificação.
//
// Medido em 14 nomes canônicos, com a wiki certa de cada universo: 14 de 14,
// todos com o nome da técnica dentro do nome do arquivo.
//
// O QUE ISSO NÃO RESOLVE: os 29% de nomes que são invenção do jogo ("Aura
// Ardente", "Armadilha de Arame"). Nenhuma wiki vai ter, porque não existem
// em obra nenhuma — e o filtro de nome os rejeita em silêncio, que é o
// comportamento certo. Eles ficam com o ícone derivado do efeito.
//
// DUAS ARMADILHAS herdadas de buscar-artes.js, que já custaram uma rodada
// cada:
//
//   1. DOWNLOAD POR CURL, não pelo fetch do Node: o CDN da Fandom devolve 403
//      para o fetch e 200 para o curl, com o mesmo User-Agent.
//   2. .gif É CENA, não pose — fora. Ícone precisa de quadro parado.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UA = 'animebattler-educational/1.0 (projeto de estudo; creditos em /creditos)';

/** Onde procurar cada universo. Slug do Anime -> subdomínio da Fandom. */
const WIKI_POR_ANIME = {
  bleach: 'bleach',
  naruto: 'naruto',
  'dragon-ball-z': 'dragonball',
  'jujutsu-kaisen': 'jujutsu-kaisen',
  'marvel-universe': 'marvel',
  'dc-universe': 'dc',
  pokemon: 'pokemon',
  'solo-leveling': 'solo-leveling',
  cartoon: 'looneytunes',
};

/**
 * Tamanho do ícone. O CDN da Fandom redimensiona no servidor via
 * /scale-to-width-down/<px>, então não é preciso processar imagem aqui —
 * nenhuma dependência nova, e o que trafega já vem pequeno.
 */
const LARGURA = 256;

function curlJson(url) {
  try {
    return JSON.parse(execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, url], { maxBuffer: 20e6 }).toString());
  } catch {
    return null;
  }
}

/** Sem acento, sem pontuação, minúsculo e SEM ESPAÇO: para conter-comparar. */
function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** A raiz canônica: o que vem antes do primeiro ':' de "Zangetsu: Corte X". */
function raizDe(nome) {
  const corte = nome.indexOf(':');
  return (corte === -1 ? nome : nome.slice(0, corte)).trim();
}

/**
 * Curto demais para verificar por conteúdo.
 *
 * "Ki" dentro de um nome de arquivo casa com "Kido", "Kisuke", "Kikoho" e
 * qualquer outra coisa — o filtro deixaria de filtrar. Abaixo deste tamanho a
 * habilidade simplesmente não recebe arte, e fica com o ícone do efeito.
 */
const MINIMO_PARA_CONFIAR = 5;

function buscarArquivo(wiki, termo) {
  const r = curlJson(
    `https://${wiki}.fandom.com/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(termo)}&srnamespace=6&srlimit=6&format=json`
  );
  return (r?.query?.search ?? [])
    .map((x) => x.title.replace(/^File:/, ''))
    .filter((t) => /\.(png|jpe?g)$/i.test(t));
}

/**
 * A URL real do arquivo, já reduzida pelo CDN.
 *
 * A QUERY STRING NÃO PODE SER DESCARTADA. A URL que a API devolve termina em
 * `?cb=<timestamp>&path-prefix=en`, e o `path-prefix` é OBRIGATÓRIO: sem ele
 * o CDN responde 404. A primeira versão inseria o sufixo de escala com um
 * `.replace(/\/revision\/latest.*$/)` que comia a query junto — e 94 dos 128
 * downloads falharam por isso, incluindo Getsuga Tenshō e Mugetsu. O sufixo
 * entra no CAMINHO, antes do `?`.
 */
function urlDoArquivo(wiki, arquivo) {
  const r = curlJson(
    `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent('File:' + arquivo)}` +
      `&prop=imageinfo&iiprop=url|size&format=json`
  );
  const info = Object.values(r?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.url) return null;

  const corte = info.url.indexOf('?');
  const caminho = corte === -1 ? info.url : info.url.slice(0, corte);
  const query = corte === -1 ? '' : info.url.slice(corte);
  if (!caminho.includes('/revision/')) return info.url;

  const escalado = caminho.replace(/\/revision\/latest.*$/, `/revision/latest/scale-to-width-down/${LARGURA}`);
  return escalado + query;
}

/**
 * Escolhe um arquivo cujo NOME contenha o nome da técnica.
 *
 * É esta verificação que separa este script da versão anterior: sem um
 * candidato que contenha o termo, a habilidade não recebe arte — em vez de
 * receber a primeira coisa que a busca devolveu.
 */
function escolher(candidatos, termo) {
  const alvo = normalizar(termo);
  if (alvo.length < MINIMO_PARA_CONFIAR) return null;
  return candidatos.find((c) => normalizar(c).includes(alvo)) ?? null;
}

function main() {
  const alvos = require('./icones-alvos.json');
  const limite = process.argv[2] ? Number(process.argv[2]) : null;
  const lista = limite ? alvos.slice(0, limite) : alvos;

  const achados = [];
  let i = 0;
  for (const alvo of lista) {
    i++;
    const wiki = WIKI_POR_ANIME[alvo.anime];
    process.stderr.write(`\r${i}/${lista.length}  achados: ${achados.length}   ${alvo.name.slice(0, 38).padEnd(38)}`);
    if (!wiki) continue;

    // Nome inteiro primeiro; a raiz só como segunda tentativa, porque ela é
    // mais curta e por isso mais fácil de casar por acidente.
    let arquivo = escolher(buscarArquivo(wiki, alvo.name), alvo.name);
    let via = 'nome';
    const raiz = raizDe(alvo.name);
    if (!arquivo && raiz !== alvo.name) {
      arquivo = escolher(buscarArquivo(wiki, raiz), raiz);
      via = 'raiz';
    }
    if (!arquivo) continue;

    const url = urlDoArquivo(wiki, arquivo);
    if (!url) continue;
    achados.push({ name: alvo.name, anime: alvo.anime, wiki, arquivo, via, url });
  }

  const destino = path.join(__dirname, 'icones-encontrados.json');
  fs.writeFileSync(destino, JSON.stringify(achados, null, 2));
  const porVia = {};
  for (const a of achados) porVia[a.via] = (porVia[a.via] ?? 0) + 1;
  console.error(`\n\n${achados.length} de ${lista.length} habilidades com arte verificada`, porVia);
  console.error(`Lista em ${path.relative(process.cwd(), destino)} — baixar com instalar-icones.js`);
}

main();
