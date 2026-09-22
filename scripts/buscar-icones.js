// VEREDITO: ESTA ABORDAGEM NÃO FUNCIONA. Não refaça.
//
// O script continua aqui porque é a EVIDÊNCIA de por que o ícone das
// habilidades passou a ser desenhado a partir do efeito, e não raspado da
// internet como os retratos dos personagens. Rodado sobre 40 nomes do
// catálogo, devolveu:
//
//     exato      2      título da wiki é o próprio nome da habilidade
//     raiz       2      bateu com a raiz canônica antes do ':'
//     duvidoso  31      achou página, com outro nome
//     sem        5      nada
//
// E "duvidoso" é lixo, não meio-certo: "Análise de Padrão" caiu em
// "Brion Markov (Earth-16)", "Arrow of Fear" num título de capítulo,
// "Absorver e Retornar" em "Descorrer". Uns poucos acertam (Ashisogi Jizō
// Spores -> Ashisogi Jizō), mas revisar 427 linhas à mão é exatamente o
// trabalho que automatizar deveria evitar.
//
// A CAUSA É ESTRUTURAL, não de afinação. Personagem tem UMA página canônica
// com infobox — por isso buscar-artes.js funciona. Habilidade não tem. E 29%
// dos nomes deste catálogo são invenção do jogo ("Aura Ardente", "Armadilha
// de Arame"): nenhuma wiki terá, porque não existem em obra nenhuma.
//
// O que ficou no lugar: app/components/battle/IconeDeHabilidade.tsx.
//
// --------------------------------------------------------------------------
//
// Procura, nos wikis de fã, uma imagem que sirva de ÍCONE para cada
// habilidade. Irmão de buscar-artes.js, e reusa as armadilhas que aquele já
// pagou caro para descobrir (curl em vez do fetch do Node, filtrar antes de
// cortar, título ≠ nome).
//
// USO DA ARTE: mesma decisão já registrada em app/lib/creditos.ts — projeto
// educativo, sem fim comercial, com crédito visível em /creditos e no rodapé
// de toda página.
//
// ESTE SCRIPT NÃO BAIXA NADA. Ele só produz o relatório de o-que-acharia,
// com um nível de confiança por habilidade, para revisão antes de 400
// downloads entrarem no repositório. Baixar é uma segunda passagem, e só
// depois de alguém olhar este relatório.
//
// POR QUE A CONFIANÇA IMPORTA MAIS QUE A TAXA DE ACERTO. Uma sondagem em 16
// nomes achou página para 15. Só que "achou" não é "acertou": a busca por
// "Hakka no Togame" — técnica do Hitsugaya — caiu na página da RUKIA, e
// "Kyōka Suigetsu" caiu na do Aizen. Pegar a primeira imagem de cada acerto
// espalharia ícone errado pelo jogo, errado de um jeito difícil de notar
// depois. Por isso cada linha do relatório diz COMO chegou lá.
//
// A ESTRATÉGIA DA RAIZ. A maioria dos nomes do catálogo tem a forma
// "<coisa canônica>: <movimento inventado>" — "Zangetsu: Corte Ascendente",
// "Tobiume: Faísca". O que existe na wiki é a raiz, não o nome inteiro.
// Buscar pela raiz acerta muito mais, e tem um efeito colateral desejável:
// todas as técnicas de Zangetsu dividem o mesmo ícone, o que faz a grade de
// ações ficar mais legível, não menos.
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

function curlJson(url) {
  try {
    const out = execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, url], { maxBuffer: 20e6 });
    return JSON.parse(out.toString());
  } catch {
    return null;
  }
}

/**
 * A raiz canônica do nome: o que vem antes do primeiro ':'.
 *
 * "Zangetsu: Corte Ascendente" -> "Zangetsu"
 * "Getsuga Tenshō"             -> "Getsuga Tenshō"  (sem ':' , o nome inteiro)
 */
function raizDe(nome) {
  const corte = nome.indexOf(':');
  return (corte === -1 ? nome : nome.slice(0, corte)).trim();
}

/** Sem acento e em minúscula, para comparar título de wiki com nome local. */
function normalizar(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Serve como ícone? Fora banner de wiki, selo, e .gif (cena, não pose). */
function ehIcone(titulo) {
  const t = titulo.replace(/^File:/, '');
  if (!/\.(png|jpe?g)$/i.test(t)) return false;
  return !/site-|wiki-|favicon|badge|logo|spoiler|placeholder|no[_ ]image/i.test(t);
}

function buscar(wiki, termo) {
  const base = `https://${wiki}.fandom.com/api.php`;
  const r = curlJson(
    `${base}?action=query&list=search&srsearch=${encodeURIComponent(termo)}&srlimit=3&format=json`
  );
  return r?.query?.search?.map((s) => s.title) ?? [];
}

function imagensDe(wiki, titulo) {
  const base = `https://${wiki}.fandom.com/api.php`;
  const r = curlJson(
    `${base}?action=query&titles=${encodeURIComponent(titulo)}&prop=images&imlimit=60&format=json`
  );
  const pages = r?.query?.pages ?? {};
  const lista = Object.values(pages)[0]?.images ?? [];
  return lista.map((i) => i.title).filter(ehIcone);
}

/**
 * Classifica o quanto dá para confiar no que foi achado.
 *
 * - `exato`    o título da wiki é o próprio nome da habilidade
 * - `raiz`     bateu com a raiz canônica antes do ':'
 * - `duvidoso` achou página, mas com outro nome — costuma ser a página do
 *              PERSONAGEM em vez da técnica. Serve, mas exige olho humano.
 * - `sem`      nada encontrado
 */
function classificar(nome, tituloAchado) {
  if (!tituloAchado) return 'sem';
  const t = normalizar(tituloAchado);
  if (t === normalizar(nome)) return 'exato';
  if (t === normalizar(raizDe(nome))) return 'raiz';
  return 'duvidoso';
}

function main() {
  const alvos = require('./icones-alvos.json');
  const somente = process.argv[2] ? Number(process.argv[2]) : null;
  const lista = somente ? alvos.slice(0, somente) : alvos;

  const relatorio = [];
  let i = 0;
  for (const alvo of lista) {
    i++;
    const wiki = WIKI_POR_ANIME[alvo.anime];
    if (!wiki) {
      relatorio.push({ ...alvo, confianca: 'sem', motivo: `sem wiki mapeado para ${alvo.anime}` });
      continue;
    }

    const raiz = raizDe(alvo.name);
    // A raiz primeiro: é ela que costuma existir como página. O nome inteiro
    // só é tentado quando não tem ':' (aí raiz === nome) ou quando a raiz
    // não achou nada.
    let candidatos = buscar(wiki, raiz);
    if (candidatos.length === 0 && raiz !== alvo.name) candidatos = buscar(wiki, alvo.name);

    const titulo = candidatos[0] ?? null;
    const confianca = classificar(alvo.name, titulo);
    const imgs = titulo ? imagensDe(wiki, titulo) : [];

    relatorio.push({
      ...alvo,
      raiz,
      wiki,
      titulo,
      confianca,
      imagens: imgs.length,
      primeira: imgs[0] ?? null,
    });

    process.stderr.write(`\r${i}/${lista.length}  ${confianca.padEnd(9)} ${alvo.name.slice(0, 40)}          `);
  }

  const destino = path.join(__dirname, 'icones-relatorio.json');
  fs.writeFileSync(destino, JSON.stringify(relatorio, null, 2));

  const por = {};
  for (const r of relatorio) por[r.confianca] = (por[r.confianca] ?? 0) + 1;
  console.error('\n\nConfiança:', por);
  console.error(`Relatório em ${path.relative(process.cwd(), destino)}`);
  console.error('\nNada foi baixado. Revise o relatório antes da passagem de download.');
}

main();
