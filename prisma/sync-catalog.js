/**
 * Sincroniza o catálogo (modo história e loja) sem tocar em dado de jogador.
 *
 * Por que existe: o `seed.js` é destrutivo — apaga usuários, batalhas e
 * progresso antes de repovoar. Isso serve para banco novo, mas é inviável
 * assim que existir um jogador de verdade: adicionar um equipamento novo não
 * pode custar a conta de todo mundo.
 *
 * Este script só faz upsert, usando as chaves naturais do schema
 * (Equipment.name, Skill.name+category, StoryChapter.slug,
 * StoryStage.chapterId+order). Rodar duas vezes seguidas tem o mesmo efeito
 * de rodar uma: a segunda execução não reporta nenhuma mudança.
 *
 * Nunca escreve em User, UserCharacter, Battle, UserEquipment,
 * UserStoryProgress nem em nenhuma outra tabela de jogador.
 *
 * NÃO REMOVE NADA, e isso é deliberado: tirar um item do catálogo aqui não o
 * apaga do banco. Um Equipment já comprado tem UserEquipment apontando pra
 * ele — apagar quebraria o inventário de quem pagou. Para aposentar um item,
 * o caminho é deixar de vendê-lo (algo como um campo `available`), não
 * deletar a linha.
 *
 *   node prisma/sync-catalog.js --dry-run   # mostra o que mudaria
 *   node prisma/sync-catalog.js             # aplica
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const storyCatalog = require('./catalog/story');
const atributosNovos = require('./catalog/atributos-novos');
const precisaoCatalog = require('./catalog/precisao');
const tagsFaltantes = require('./catalog/tags-faltantes');
const renomeacaoCanonica = require('./catalog/renomeacao-canonica');
const mecanicasDeDano = require('./catalog/mecanicas-de-dano');
const storyJujutsu = require('./catalog/story-jujutsu');
const equipmentCatalog = require('./catalog/equipment');
const ladderCatalog = require('./catalog/skill-ladders');
const characterCatalog = require('./catalog/characters');
const kitCatalog = require('./catalog/kits');
const scalingCatalog = require('./catalog/skill-scaling');
const summonerCatalog = require('./catalog/summoners');
const signatureCatalog = require('./catalog/signatures');
const jujutsuCatalog = require('./catalog/jujutsu');
const supportCatalog = require('./catalog/supports');
const transformationCatalog = require('./catalog/transformations');
const traitCatalog = require('./catalog/traits');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Serializa com as chaves de objeto ordenadas.
 *
 * Necessário porque colunas Json viram `jsonb` no Postgres, e jsonb não
 * preserva a ordem das chaves: `{type, target}` volta do banco como
 * `{target, type}`. Comparar com JSON.stringify direto acusaria diferença em
 * toda skill com efeitos, em toda execução — o sync passaria a mentir que há
 * algo pra atualizar quando não há.
 */
function canonico(valor) {
  if (valor === null || valor === undefined) return 'null';
  if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']';
  if (typeof valor === 'object') {
    if (valor instanceof Date) return JSON.stringify(valor);
    const chaves = Object.keys(valor).sort();
    return '{' + chaves.map((k) => JSON.stringify(k) + ':' + canonico(valor[k])).join(',') + '}';
  }
  return JSON.stringify(valor);
}

/** Campos que o catálogo controla — o resto da linha no banco não é tocado. */
function diff(existing, desired) {
  if (!existing) return { acao: 'criar', campos: Object.keys(desired) };
  const campos = Object.keys(desired).filter((k) => {
    const a = existing[k];
    const b = desired[k];
    if (a instanceof Date || b instanceof Date) return false;
    return canonico(a) !== canonico(b);
  });
  return campos.length ? { acao: 'atualizar', campos } : { acao: 'igual', campos: [] };
}

const relatorio = { criados: [], atualizados: [], iguais: 0 };

function registra(tipo, nome, d) {
  if (d.acao === 'igual') relatorio.iguais += 1;
  else if (d.acao === 'criar') relatorio.criados.push(`${tipo}: ${nome}`);
  else relatorio.atualizados.push(`${tipo}: ${nome} (${d.campos.join(', ')})`);
}

// TAGS PRESERVAM O QUE JÁ ESTÁ NO BANCO E NÃO VEM DESTE CATÁLOGO.
//
// Sem isto, esta função resetava `tags` para a lista literal do arquivo toda
// vez que rodava — apagando qualquer tag que syncTagsFaltantes tivesse
// acrescentado numa passagem anterior. O dado final ficava certo porque
// syncTagsFaltantes roda por último no pipeline e reaplicava a tag na mesma
// execução, mas todo dry-run reportava as duas mudanças em oscilação
// perpétua — "tira a tag" aqui, "põe a tag" lá —, e o resumo do sync nunca
// fechava em "catálogo já está em dia" por causa disso.
function comTagsPreservadas(atual, tags) {
  const extras = Array.isArray(atual?.tags) ? atual.tags.filter((t) => !tags.includes(t)) : [];
  return [...tags, ...extras];
}

/**
 * Mesmo princípio de comTagsPreservadas, para EFFECTS: dedup por `type`
 * (a mesma chave que syncMecanicasDeDano já usa), não por igualdade exata do
 * objeto — um DEBUFF do catálogo e um STUN acrescentado depois não são "o
 * mesmo efeito com valores diferentes", são efeitos DIFERENTES que coexistem
 * no array. Sem isto, syncSummoners sobrescrevia effects com o literal do
 * catálogo de assinatura a cada sync, apagando qualquer mecânica acrescentada
 * depois por mecanicas-de-dano.js — a mesma classe de oscilação perpétua que
 * comTagsPreservadas já resolveu para tags, agora achada em effects.
 */
function comEfeitosPreservados(atual, efeitos) {
  const tiposConhecidos = new Set(efeitos.map((e) => e.type));
  const extras = Array.isArray(atual?.effects) ? atual.effects.filter((e) => !tiposConhecidos.has(e.type)) : [];
  return [...efeitos, ...extras];
}

/**
 * Renomeia habilidades para o nome que a obra usa, sem tocar em mecânica.
 * Ver prisma/catalog/renomeacao-canonica.js para a fonte de cada uma.
 *
 * RODA ANTES DE syncKits(), e a ordem é obrigatória: kits.js já referencia o
 * nome NOVO, então se a skill ainda não tiver sido renomeada neste ponto do
 * pipeline, syncKits() não encontra a habilidade e quebra a sincronização
 * inteira.
 */
async function syncRenomeacoesCanonicas() {
  for (const r of renomeacaoCanonica.renomeacoes) {
    const jaRenomeada = await prisma.skill.findUnique({
      where: { name_category: { name: r.nomeNovo, category: r.categoria } },
      select: { id: true },
    });
    if (jaRenomeada) {
      relatorio.iguais += 1;
      continue;
    }

    const atual = await prisma.skill.findUnique({
      where: { name_category: { name: r.nomeAntigo, category: r.categoria } },
      select: { id: true },
    });
    if (!atual) {
      console.log(`  (aviso) habilidade a renomear não existe neste banco: ${r.nomeAntigo}`);
      continue;
    }

    registra('renomeação', `${r.nomeAntigo} -> ${r.nomeNovo}`, { acao: 'atualizar', campos: ['name'] });
    if (!DRY_RUN) {
      await prisma.skill.update({ where: { id: atual.id }, data: { name: r.nomeNovo } });
    }
  }
}

/**
 * Acrescenta EXECUTE/PIERCE/COMBO_STUN a habilidades existentes.
 * Ver prisma/catalog/mecanicas-de-dano.js para a razão de cada uma.
 *
 * ACRESCENTA AO ARRAY, nunca substitui — mesmo princípio do
 * comTagsPreservadas: uma skill que já carregue aquele tipo de efeito não
 * ganha duplicata.
 */
async function syncMecanicasDeDano() {
  for (const def of mecanicasDeDano.aplicacoes) {
    const sk = await prisma.skill.findUnique({
      where: { name_category: { name: def.nomeDaSkill, category: def.categoria } },
      select: { id: true, name: true, effects: true },
    });
    if (!sk) {
      console.log(`  (aviso) habilidade para mecânica de dano não existe neste banco: ${def.nomeDaSkill}`);
      continue;
    }

    const atuais = Array.isArray(sk.effects) ? sk.effects : [];
    if (atuais.some((e) => e.type === def.efeitoNovo.type)) {
      relatorio.iguais += 1;
      continue;
    }

    registra('mecânica', `${sk.name} +${def.efeitoNovo.type}`, { acao: 'atualizar', campos: ['effects'] });
    if (!DRY_RUN) {
      await prisma.skill.update({ where: { id: sk.id }, data: { effects: [...atuais, def.efeitoNovo] } });
    }
  }
}

async function syncEquipmentSkills(animeId) {
  const idPorNome = {};

  for (const def of equipmentCatalog.equipmentSkills) {
    const atual = await prisma.skill.findUnique({
      where: { name_category: { name: def.name, category: def.category } },
    });
    const desejado = {
      name: def.name,
      category: def.category,
      power: def.power,
      energyCost: def.energyCost,
      cooldown: def.cooldown,
      tags: comTagsPreservadas(atual, def.tags),
      effects: def.effects,
    };
    registra('skill', def.name, diff(atual, desejado));

    if (!DRY_RUN) {
      const row = await prisma.skill.upsert({
        where: { name_category: { name: def.name, category: def.category } },
        create: desejado,
        update: desejado,
      });
      idPorNome[def.name] = row.id;
    } else if (atual) {
      idPorNome[def.name] = atual.id;
    }
  }

  void animeId;
  return idPorNome;
}

async function syncEquipment(animeId, skillIdPorNome) {
  for (const { grantedSkillName, ...def } of equipmentCatalog.equipment) {
    const grantedSkillId = grantedSkillName ? skillIdPorNome[grantedSkillName] ?? null : null;

    // Num dry-run a skill nova ainda não existe, então o id vem nulo e a
    // comparação apontaria uma diferença falsa. Só é checado de verdade na
    // aplicação.
    if (!DRY_RUN && grantedSkillName && !grantedSkillId) {
      throw new Error(`Equipamento "${def.name}" referencia skill inexistente: ${grantedSkillName}`);
    }

    const desejado = {
      name: def.name,
      description: def.description,
      slot: def.slot,
      rarity: def.rarity,
      price: def.price,
      requiredLevel: def.requiredLevel ?? 1,
      flatHpBonus: def.flatHpBonus ?? 0,
      flatAttackBonus: def.flatAttackBonus ?? 0,
      flatDefenseBonus: def.flatDefenseBonus ?? 0,
      flatSpeedBonus: def.flatSpeedBonus ?? 0,
      animeId,
      grantedSkillId,
    };

    const atual = await prisma.equipment.findUnique({ where: { name: def.name } });
    registra('equipamento', def.name, diff(atual, DRY_RUN && !atual ? { ...desejado, grantedSkillId: undefined } : desejado));

    if (!DRY_RUN) {
      await prisma.equipment.upsert({ where: { name: def.name }, create: desejado, update: desejado });
    }
  }
}

/**
 * Sincroniza UM arco de história. Recebe o arco como parâmetro em vez de ler
 * um capítulo fixo, porque o jogo passou a ter mais de um: Soul Society
 * (Bleach) e Incidente de Shibuya (Jujutsu Kaisen). A tela de história já
 * iterava capítulos desde sempre; era só o catálogo que era de arco único.
 */
async function syncStory(animeId, arco) {
  const cap = arco.chapter;
  const desejadoCap = {
    animeId,
    slug: cap.slug,
    title: cap.title,
    description: cap.description,
    order: cap.order,
  };
  const capAtual = await prisma.storyChapter.findUnique({ where: { slug: cap.slug } });
  registra('capítulo', cap.title, diff(capAtual, desejadoCap));

  let chapterId = capAtual?.id;
  if (!DRY_RUN) {
    const row = await prisma.storyChapter.upsert({
      where: { slug: cap.slug },
      create: desejadoCap,
      update: desejadoCap,
    });
    chapterId = row.id;
  }
  if (!chapterId) {
    console.log('  (capítulo ainda não existe — estágios seriam criados junto)');
    return;
  }

  for (const [i, { enemyCharacterName, enemyMonsterName, ...stage }] of arco.stages.entries()) {
    const order = i + 1;

    // Inimigo vem por nome no catálogo; aqui vira id. Se o personagem não
    // existir neste banco, é melhor falhar alto do que gravar um estágio
    // impossível de jogar.
    let enemyCharacterId = null;
    let enemyMonsterId = null;
    if (enemyCharacterName) {
      const c = await prisma.character.findFirst({ where: { name: enemyCharacterName }, select: { id: true } });
      if (!c) throw new Error(`Estágio "${stage.title}" referencia personagem inexistente: ${enemyCharacterName}`);
      enemyCharacterId = c.id;
    }
    if (enemyMonsterName) {
      const m = await prisma.monster.findUnique({ where: { name: enemyMonsterName }, select: { id: true } });
      if (!m) throw new Error(`Estágio "${stage.title}" referencia monstro inexistente: ${enemyMonsterName}`);
      enemyMonsterId = m.id;
    }

    const desejado = { ...stage, chapterId, order, enemyCharacterId, enemyMonsterId };
    const atual = await prisma.storyStage.findUnique({
      where: { chapterId_order: { chapterId, order } },
    });
    registra('estágio', `${order}. ${stage.title}`, diff(atual, desejado));

    if (!DRY_RUN) {
      await prisma.storyStage.upsert({
        where: { chapterId_order: { chapterId, order } },
        create: desejado,
        update: desejado,
      });
    }
  }
}

/**
 * Escadas de habilidade por afiliação.
 *
 * Só os shinigami tinham progressão de habilidade (a escada de kidō, 15
 * entradas até o nível 45). Os outros 28 personagens ficavam com as 4 do kit
 * inicial para sempre — o que fazia o mesmo estágio dar 98% de vitória com um
 * e 26% com outro. Ver prisma/catalog/skill-ladders.js.
 *
 * Como o resto do sync, só faz upsert. Se um personagem mudar de afiliação, as
 * habilidades da escada antiga permanecem: apagá-las tiraria do jogador algo
 * que ele já podia equipar.
 */
async function syncSkillLadders() {
  // 1. As linhas de Skill em si, chaveadas por (name, category).
  const idPorNome = {};
  for (const def of ladderCatalog.allSkills()) {
    const { _level, ...skill } = def;
    void _level;
    const atual = await prisma.skill.findUnique({
      where: { name_category: { name: skill.name, category: skill.category } },
    });
    const skillFinal = { ...skill, tags: comTagsPreservadas(atual, skill.tags) };
    registra('skill', skill.name, diff(atual, skillFinal));
    if (!DRY_RUN) {
      const row = await prisma.skill.upsert({
        where: { name_category: { name: skill.name, category: skill.category } },
        create: skillFinal,
        update: skillFinal,
      });
      idPorNome[skill.name] = row.id;
    } else if (atual) {
      idPorNome[skill.name] = atual.id;
    }
  }

  // 2. Ligar cada escada aos personagens da afiliação alvo.
  for (const ladder of ladderCatalog.ladders) {
    for (const alvo of ladderCatalog.targetsOf(ladder)) {
      const anime = await prisma.anime.findUnique({ where: { slug: alvo.anime }, select: { id: true } });
      if (!anime) throw new Error(`Escada referencia anime inexistente: ${alvo.anime}`);
      const afiliacao = await prisma.affiliation.findUnique({
        where: { animeId_name: { animeId: anime.id, name: alvo.affiliation } },
        select: { id: true },
      });
      if (!afiliacao) throw new Error(`Escada referencia afiliação inexistente: ${alvo.affiliation}`);

      const personagens = await prisma.character.findMany({
        where: { affiliationId: afiliacao.id },
        select: { id: true, name: true },
      });

      for (const c of personagens) {
        for (const def of ladder.skills) {
          const skillId = idPorNome[def.name];
          if (!skillId) {
            if (DRY_RUN) continue; // a skill ainda não existe numa simulação
            throw new Error(`Skill da escada sem id: ${def.name}`);
          }
          const desejado = { characterId: c.id, skillId, requiredLevel: def.level, learnedByDefault: false };
          const atual = await prisma.characterSkill.findUnique({
            where: { characterId_skillId: { characterId: c.id, skillId } },
          });

          // TRAVA: a escada nunca PIORA um vínculo que já existe. Se o
          // personagem já tem essa habilidade no kit inicial, ou já a libera
          // num nível mais baixo, fica como está.
          //
          // Sem isso, uma escada que reuse um nome de golpe de assinatura
          // empurraria esse golpe para um nível alto e o tiraria do
          // personagem — silenciosamente, sem erro nenhum. Aconteceu de
          // verdade ao escrever estas escadas, com três nomes.
          const pioraria = atual && (atual.learnedByDefault || atual.requiredLevel <= def.level);
          if (pioraria) {
            relatorio.iguais += 1;
            continue;
          }

          registra('escada', `${c.name} · ${def.name} (nv ${def.level})`, diff(atual, desejado));
          if (!DRY_RUN) {
            await prisma.characterSkill.upsert({
              where: { characterId_skillId: { characterId: c.id, skillId } },
              create: desejado,
              update: { requiredLevel: def.level },
            });
          }
        }
      }
    }
  }
}

/**
 * Classe e stats base dos personagens.
 *
 * Os stats variavam 1,88x entre o mais forte e a mais fraca, sem custo nem
 * desbloqueio separando os dois — ou seja, havia uma escolha certa e várias
 * erradas. Ver prisma/catalog/characters.js para como os números saíram.
 */
async function syncCharacters() {
  // Animes e afiliações que só existem por causa dos personagens novos.
  for (const a of characterCatalog.novosAnimes) {
    const atual = await prisma.anime.findUnique({ where: { slug: a.slug } });
    registra('anime', a.name, diff(atual, { name: a.name, slug: a.slug }));
    let animeId = atual?.id;
    if (!DRY_RUN) {
      const row = await prisma.anime.upsert({
        where: { slug: a.slug },
        create: { name: a.name, slug: a.slug },
        update: { name: a.name },
      });
      animeId = row.id;
    }
    if (!animeId) continue;
    for (const nome of a.affiliations) {
      const atualAf = await prisma.affiliation.findUnique({
        where: { animeId_name: { animeId, name: nome } },
      });
      registra('afiliação', `${a.name} · ${nome}`, diff(atualAf, { animeId, name: nome }));
      if (!DRY_RUN && !atualAf) await prisma.affiliation.create({ data: { animeId, name: nome } });
    }
  }

  // Classe e stats dos que já existem, casados por nome.
  for (const c of characterCatalog.characters) {
    const atual = await prisma.character.findFirst({ where: { name: c.name } });
    if (!atual) {
      console.log(`  (aviso) personagem do catálogo não existe neste banco: ${c.name}`);
      continue;
    }
    const desejado = {
      class: c.class, hp: c.hp, attack: c.attack,
      defense: c.defense, speed: c.speed, energy: c.energy, stamina: c.stamina,
      // Acuracia, agilidade e inteligencia vem da CLASSE, nao do personagem
      // — ver prisma/catalog/atributos-novos.js.
      ...atributosNovos.atributosDe(c.name, c.class),
    };
    registra('personagem', c.name, diff(atual, desejado));
    if (!DRY_RUN) await prisma.character.update({ where: { id: atual.id }, data: desejado });
  }

  // Personagens novos.
  for (const c of characterCatalog.novosPersonagens) {
    const atual = await prisma.character.findUnique({ where: { slug: c.slug } });
    const anime = await prisma.anime.findUnique({ where: { slug: c.anime }, select: { id: true } });
    if (!anime) {
      if (DRY_RUN) { registra('personagem', c.name, { acao: 'criar', campos: ['novo'] }); continue; }
      throw new Error(`Personagem novo referencia anime inexistente: ${c.anime}`);
    }
    const af = await prisma.affiliation.findUnique({
      where: { animeId_name: { animeId: anime.id, name: c.affiliation } },
      select: { id: true },
    });
    const desejado = {
      name: c.name, slug: c.slug, animeId: anime.id, affiliationId: af?.id ?? null,
      class: c.class, hp: c.hp, attack: c.attack, defense: c.defense, speed: c.speed, energy: c.energy, stamina: c.stamina,
      ...atributosNovos.atributosDe(c.name, c.class),
    };
    registra('personagem', c.name, diff(atual, desejado));
    if (!DRY_RUN) {
      await prisma.character.upsert({ where: { slug: c.slug }, create: desejado, update: desejado });
    }
  }
}

/**
 * Kit próprio de cada personagem, escalonado por nível.
 *
 * DIFERENÇA CRÍTICA PARA syncSkillLadders: aqui o sync PODE aumentar o
 * requiredLevel de um vínculo existente. É o objetivo do arquivo — todo kit
 * de assinatura estava inteiramente no nível 1, então a identidade do
 * personagem era entregue de uma vez na primeira batalha e nunca mais
 * crescia. A trava de nunca-piorar da escada existe para proteger o kit;
 * aplicá-la aqui impediria justamente a mudança que se quer.
 *
 * Não é destrutivo para quem já joga: getEligiblePlayerSkills recalcula a
 * elegibilidade a partir do nível a cada batalha, então quem já passou do
 * portão continua com a habilidade.
 */
async function syncKits() {
  for (const kit of kitCatalog.kits) {
    const c = await prisma.character.findFirst({
      where: { name: kit.character },
      select: { id: true, name: true },
    });
    if (!c) throw new Error(`Kit referencia personagem inexistente: ${kit.character}`);

    for (const def of kit.skills) {
      const skill = await prisma.skill.findUnique({
        where: { name_category: { name: def.skill, category: def.category } },
        select: { id: true },
      });
      if (!skill) throw new Error(`Kit referencia habilidade inexistente: ${def.skill} (${def.category})`);

      const atual = await prisma.characterSkill.findUnique({
        where: { characterId_skillId: { characterId: c.id, skillId: skill.id } },
      });
      const desejado = {
        characterId: c.id,
        skillId: skill.id,
        requiredLevel: def.level,
        learnedByDefault: def.level === 1,
      };

      registra('kit', `${c.name} · ${def.skill} (nv ${def.level})`, diff(atual, desejado));
      if (!DRY_RUN) {
        await prisma.characterSkill.upsert({
          where: { characterId_skillId: { characterId: c.id, skillId: skill.id } },
          create: desejado,
          update: { requiredLevel: def.level, learnedByDefault: def.level === 1 },
        });
      }
    }
  }
}

/**
 * Atributo de escala de cada habilidade. Ver prisma/catalog/skill-scaling.js
 * para o raciocínio; aqui só se aplica a regra.
 *
 * Roda por ÚLTIMO de propósito: a regra do kit depende da classe do dono, e
 * a classe é escrita por syncCharacters. Rodar antes leria classe velha.
 */
async function syncSkillScaling() {
  const skills = await prisma.skill.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      scalingStat: true,
      characterLinks: { select: { character: { select: { class: true } } } },
    },
  });

  // Escada declarada vence a regra por classe: escada é compartilhada, então
  // "a classe do dono" não é uma pergunta com resposta.
  const statDaEscada = {};
  for (const ladder of ladderCatalog.ladders) {
    if (!ladder.scalingStat) continue;
    for (const sk of ladder.skills) statDaEscada[sk.name] = ladder.scalingStat;
  }

  for (const sk of skills) {
    const classes = sk.characterLinks.map((l) => l.character.class);
    // Assinatura (um dono) decide pela classe. Técnica compartilhada decide
    // pelo tema: categoria, ou a escada declarada quando a categoria é OTHER
    // e portanto não distingue nada.
    const desejado =
      classes.length === 1
        ? scalingCatalog.scalingStatDe(sk.category, classes)
        : scalingCatalog.porCategoria[sk.category] ||
          statDaEscada[sk.name] ||
          scalingCatalog.scalingStatDe(sk.category, classes);
    if (sk.scalingStat === desejado) {
      relatorio.iguais += 1;
      continue;
    }
    registra('escala', `${sk.name} (${sk.category}) ${sk.scalingStat} -> ${desejado}`, { acao: 'atualizar', campos: ['scalingStat'] });
    if (!DRY_RUN) {
      await prisma.skill.update({ where: { id: sk.id }, data: { scalingStat: desejado } });
    }
  }
}

/**
 * Acrescenta tags que faltavam em habilidades antigas. Ver
 * prisma/catalog/tags-faltantes.js para o motivo.
 *
 * ACRESCENTA, nao substitui: a habilidade pode ter ganhado tags por outro
 * caminho, e apagá-las seria trocar dado ausente por dado errado.
 */
async function syncTagsFaltantes() {
  for (const def of tagsFaltantes.tagsFaltantes) {
    const sk = await prisma.skill.findUnique({
      where: { name_category: { name: def.name, category: def.category } },
      select: { id: true, name: true, tags: true },
    });
    if (!sk) {
      console.log(`  (aviso) habilidade do catalogo de tags nao existe neste banco: ${def.name}`);
      continue;
    }

    const atuais = Array.isArray(sk.tags) ? sk.tags : [];
    const faltando = def.tags.filter((t) => !atuais.includes(t));
    if (faltando.length === 0) {
      relatorio.iguais += 1;
      continue;
    }

    registra('tags', `${sk.name} +${faltando.join(', ')}`, { acao: 'atualizar', campos: ['tags'] });
    if (!DRY_RUN) {
      await prisma.skill.update({ where: { id: sk.id }, data: { tags: [...atuais, ...faltando] } });
    }
  }
}

/**
 * Precisao de toda habilidade, derivada do poder dela.
 *
 * Passagem unica sobre a tabela inteira, e nao um campo em cada catalogo, por
 * duas razoes: habilidade entra por seis arquivos diferentes (escadas, kits,
 * assinaturas, invocadores, suportes, equipamento), e a regra e derivada — se
 * ela mudar, tem que mudar para todas de uma vez. Ver prisma/catalog/precisao.js.
 */
async function syncPrecisao() {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, power: true, tags: true, precision: true },
  });

  for (const sk of skills) {
    const desejado = precisaoCatalog.precisaoDe(sk);
    if (sk.precision === desejado) {
      relatorio.iguais += 1;
      continue;
    }
    registra('precisao', `${sk.name} (poder ${sk.power}) ${sk.precision} -> ${desejado}`, {
      acao: 'atualizar',
      campos: ['precision'],
    });
    if (!DRY_RUN) {
      await prisma.skill.update({ where: { id: sk.id }, data: { precision: desejado } });
    }
  }
}

/**
 * Kits dos invocadores. Ver prisma/catalog/summoners.js para o desenho.
 *
 * Diferente de syncKits, este arquivo CRIA as habilidades além de ligá-las:
 * os três invocadores entraram no elenco sem nenhuma, então não há linha de
 * Skill anterior para reaproveitar.
 */
async function syncSummoners() {
  // Invocadores e ampliações de assinatura passam pelo mesmo caminho: os dois
  // CRIAM habilidades além de ligá-las, ao contrário de syncKits, que só
  // re-escalona vínculos que já existem.
  for (const inv of [...summonerCatalog.summoners, ...signatureCatalog.signatures, ...jujutsuCatalog.jujutsuKits, ...supportCatalog.supportKits]) {
    const c = await prisma.character.findFirst({
      where: { name: inv.character },
      select: { id: true, name: true },
    });
    if (!c) throw new Error(`Invocador inexistente no banco: ${inv.character}`);

    for (const def of inv.skills) {
      const { level, ...skillLiteral } = def;
      const atual = await prisma.skill.findUnique({
        where: { name_category: { name: skillLiteral.name, category: skillLiteral.category } },
      });
      // Preserva tag e efeito acrescentados depois (tags-faltantes.js,
      // mecanicas-de-dano.js) em vez de sobrescrever com o literal puro do
      // catálogo de assinatura/invocação — ver comEfeitosPreservados.
      const skill = {
        ...skillLiteral,
        tags: comTagsPreservadas(atual, skillLiteral.tags),
        effects: comEfeitosPreservados(atual, skillLiteral.effects),
      };
      registra('invocacao', skill.name, diff(atual, skill));

      if (DRY_RUN) continue;

      const row = await prisma.skill.upsert({
        where: { name_category: { name: skill.name, category: skill.category } },
        create: skill,
        update: skill,
      });

      const link = { characterId: c.id, skillId: row.id, requiredLevel: level, learnedByDefault: level === 1 };
      const linkAtual = await prisma.characterSkill.findUnique({
        where: { characterId_skillId: { characterId: c.id, skillId: row.id } },
      });
      registra('invocacao', `${c.name} · ${skill.name} (nv ${level})`, diff(linkAtual, link));
      await prisma.characterSkill.upsert({
        where: { characterId_skillId: { characterId: c.id, skillId: row.id } },
        create: link,
        update: { requiredLevel: level, learnedByDefault: level === 1 },
      });
    }
  }
}

/**
 * Liga cada personagem à arte dele, POR CONVENÇÃO em vez de por edição manual.
 *
 * Procura public/images/characters/<slug>/<slug>_default.<ext>. Achou, grava o
 * caminho em imageUrl; não achou, não faz nada.
 *
 * NUNCA APAGA imageUrl existente, e isso importa: o sync roda em produção,
 * onde public/ vem embutido na imagem Docker. Se um dia rodar num ambiente sem
 * os arquivos, limpar o campo tiraria a arte de todo o elenco de uma vez.
 *
 * Existe porque adicionar personagem eram dois passos desconexos — colocar o
 * arquivo e lembrar de escrever o caminho no banco. Os 11 personagens
 * adicionados recentemente ficaram sem arte justamente por isso. Agora basta
 * soltar o arquivo na pasta certa e rodar o sync.
 */
async function syncCharacterImages() {
  const raiz = path.join(__dirname, '..', 'public', 'images', 'characters');
  if (!fs.existsSync(raiz)) {
    console.log('  (sem public/images/characters neste ambiente — imagens não tocadas)');
    return;
  }

  const personagens = await prisma.character.findMany({ select: { id: true, name: true, slug: true, imageUrl: true } });
  for (const c of personagens) {
    const pasta = path.join(raiz, c.slug);
    if (!fs.existsSync(pasta)) continue;

    const arquivo = fs.readdirSync(pasta).find((f) => f.startsWith(`${c.slug}_default.`) || f.startsWith(`${c.slug.split('-')[0]}_default.`));
    if (!arquivo) continue;

    const url = `/images/characters/${c.slug}/${arquivo}`;
    if (c.imageUrl === url) {
      relatorio.iguais += 1;
      continue;
    }
    registra('imagem', `${c.name} -> ${arquivo}`, diff(c.imageUrl ? { imageUrl: c.imageUrl } : null, { imageUrl: url }));
    if (!DRY_RUN) await prisma.character.update({ where: { id: c.id }, data: { imageUrl: url } });
  }
}

/**
 * Cor de destaque por personagem. Ver prisma/catalog/cores.js.
 *
 * SÓ ESCREVE QUANDO MUDA, como o resto do sync — a coluna é nulável e sem
 * valor a tela cai no --accent do tema, então um personagem que ainda não
 * tem cor não quebra nada, só não fica personalizado.
 */
async function syncCores() {
  const { coresPorSlug } = require('./catalog/cores');
  const personagens = await prisma.character.findMany({ select: { id: true, name: true, slug: true, corDestaque: true } });

  for (const c of personagens) {
    const cor = coresPorSlug[c.slug];
    if (!cor) continue;
    if (c.corDestaque === cor) {
      relatorio.iguais += 1;
      continue;
    }
    registra('cor', `${c.name} -> ${cor}`, diff(c.corDestaque ? { corDestaque: c.corDestaque } : null, { corDestaque: cor }));
    if (!DRY_RUN) await prisma.character.update({ where: { id: c.id }, data: { corDestaque: cor } });
  }
}

/**
 * Transformações. Ver prisma/catalog/transformations.js para os níveis e o
 * porquê do corte pela metade.
 *
 * Transformation não tem constraint única em (characterId, name), então a
 * chave natural é resolvida com findFirst em vez de upsert. Se um dia virar
 * unique no schema, isto vira upsert direto.
 */
async function syncTransformations() {
  for (const def of transformationCatalog.transformations) {
    const c = await prisma.character.findFirst({ where: { name: def.character }, select: { id: true, name: true } });
    if (!c) throw new Error(`Transformação referencia personagem inexistente: ${def.character}`);

    let unlocksSkillId = null;
    if (def.unlocksSkill) {
      const sk = await prisma.skill.findUnique({
        where: { name_category: { name: def.unlocksSkill.name, category: def.unlocksSkill.category } },
        select: { id: true },
      });
      if (!sk) throw new Error(`Transformação "${def.name}" libera habilidade inexistente: ${def.unlocksSkill.name}`);
      unlocksSkillId = sk.id;
    }

    // Campos que o catálogo controla. Os ausentes voltam ao padrão de propósito:
    // uma transformação que perde o dreno no catálogo tem que perder no banco.
    const desejado = {
      characterId: c.id,
      name: def.name,
      levelRequirement: def.levelRequirement,
      energyModifier: def.energyModifier ?? 0,
      attackModifier: def.attackModifier ?? 0,
      defenseModifier: def.defenseModifier ?? 0,
      speedModifier: def.speedModifier ?? 0,
      flatHpBonus: def.flatHpBonus ?? 0,
      flatAttackBonus: def.flatAttackBonus ?? 0,
      flatDefenseBonus: def.flatDefenseBonus ?? 0,
      flatSpeedBonus: def.flatSpeedBonus ?? 0,
      drainPerTurn: def.drainPerTurn ?? 0,
      drainHpPerTurn: def.drainHpPerTurn ?? 0,
      consumesTurn: def.consumesTurn ?? true,
      activationCost: def.activationCost ?? 0,
      triggerType: def.triggerType ?? 'MANUAL',
      triggerPayload: def.triggerPayload ?? null,
      unlocksSkillId,
    };

    const atual = await prisma.transformation.findFirst({ where: { characterId: c.id, name: def.name } });
    registra('transformação', `${c.name} · ${def.name} (nv ${def.levelRequirement})`, diff(atual, desejado));
    if (DRY_RUN) continue;

    if (atual) {
      await prisma.transformation.update({ where: { id: atual.id }, data: desejado });
    } else {
      await prisma.transformation.create({ data: desejado });
    }
  }
}

/** Traços passivos. Ver prisma/catalog/traits.js. */
async function syncTraits() {
  for (const def of traitCatalog.traits) {
    const c = await prisma.character.findFirst({ where: { name: def.character }, select: { id: true, name: true } });
    if (!c) throw new Error(`Traço referencia personagem inexistente: ${def.character}`);

    // Campos ausentes voltam ao padrão: tirar um modificador do catálogo tem
    // que tirá-lo do banco, senão o arquivo deixa de descrever o que está no ar.
    const desejado = {
      characterId: c.id,
      name: def.name,
      description: def.description ?? null,
      levelRequirement: def.levelRequirement ?? 1,
      energyModifier: def.energyModifier ?? 0,
      attackModifier: def.attackModifier ?? 0,
      defenseModifier: def.defenseModifier ?? 0,
      speedModifier: def.speedModifier ?? 0,
      flatHpBonus: def.flatHpBonus ?? 0,
      flatAttackBonus: def.flatAttackBonus ?? 0,
      flatDefenseBonus: def.flatDefenseBonus ?? 0,
      flatSpeedBonus: def.flatSpeedBonus ?? 0,
      energyCostModifier: def.energyCostModifier ?? 0,
      icon: def.icon ?? null,
    };

    const atual = await prisma.trait.findUnique({
      where: { characterId_name: { characterId: c.id, name: def.name } },
    });
    registra('traço', `${c.name} · ${def.name}`, diff(atual, desejado));
    if (!DRY_RUN) {
      await prisma.trait.upsert({
        where: { characterId_name: { characterId: c.id, name: def.name } },
        create: desejado,
        update: desejado,
      });
    }
  }
}

async function main() {
  console.log(DRY_RUN ? '— simulação (nada será gravado) —\n' : '— sincronizando catálogo —\n');

  const bleach = await prisma.anime.findUnique({ where: { slug: 'bleach' } });
  if (!bleach) {
    throw new Error(
      'Anime "bleach" não existe neste banco. Este script sincroniza catálogo sobre uma base já povoada — ' +
        'num banco vazio, rode o seed primeiro.'
    );
  }

  const skillIds = await syncEquipmentSkills(bleach.id);
  await syncEquipment(bleach.id, skillIds);

  // PERSONAGENS ANTES DE HISTÓRIA, e a ordem não é estética.
  //
  // syncCharacters é quem cria anime, afiliação e personagem novos. Um arco
  // de história referencia personagem por NOME e o anime por slug, então
  // sincronizá-lo antes significa procurar coisas que ainda não existem.
  //
  // A primeira versão disto tinha o arco de Jujutsu antes de syncCharacters,
  // com um contorno que pulava o arco quando o anime faltava e prometia
  // pegá-lo "na próxima passada". No banco local o anime já existia de uma
  // execução anterior, então passou; em produção o arco inteiro foi pulado em
  // silêncio, e o jogo subiu com um capítulo só. Contorno em cima de ordem
  // errada esconde o defeito em vez de resolver.
  await syncCharacters();

  await syncStory(bleach.id, storyCatalog);
  const jjk = await prisma.anime.findUnique({ where: { slug: storyJujutsu.chapter.animeSlug } });
  if (!jjk) {
    throw new Error(
      `Anime "${storyJujutsu.chapter.animeSlug}" não existe mesmo depois de syncCharacters. ` +
        'Ele deveria ter sido criado ali — falhar alto aqui é melhor que publicar o jogo sem o arco.'
    );
  }
  await syncStory(jjk.id, storyJujutsu);

  await syncRenomeacoesCanonicas();
  await syncKits();
  await syncSummoners();
  await syncCharacterImages();
  await syncCores();
  await syncTransformations();
  await syncTraits();
  await syncSkillLadders();
  await syncTagsFaltantes();
  await syncSkillScaling();
  // Por ultimo: depende de toda habilidade ja existir com o poder final.
  await syncPrecisao();
  await syncMecanicasDeDano();

  console.log(`sem alteração: ${relatorio.iguais}`);
  if (relatorio.criados.length) {
    console.log(`\ncriar (${relatorio.criados.length}):`);
    relatorio.criados.forEach((l) => console.log('  + ' + l));
  }
  if (relatorio.atualizados.length) {
    console.log(`\natualizar (${relatorio.atualizados.length}):`);
    relatorio.atualizados.forEach((l) => console.log('  ~ ' + l));
  }
  if (!relatorio.criados.length && !relatorio.atualizados.length) {
    console.log('\ncatálogo já está em dia.');
  } else if (DRY_RUN) {
    console.log('\nrode sem --dry-run para aplicar.');
  }

  // Nenhuma tabela de jogador é tocada — dito aqui porque é a garantia que
  // justifica rodar isto em produção.
  console.log('\nnenhum dado de jogador foi lido ou alterado.');
}

main()
  .catch((e) => {
    console.error('\nfalhou:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
