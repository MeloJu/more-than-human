// Habilidades que SAÍRAM do kit de um personagem.
//
// O sync só acrescenta, de propósito (ver o cabeçalho de sync-catalog.js), e
// tirar uma habilidade do catálogo de origem não a tira do banco: o vínculo
// personagem↔habilidade continuaria lá. Esta lista é o único jeito de
// aposentar um vínculo, e cada linha diz por quê.
//
// Só o VÍNCULO sai (CharacterSkill, que é catálogo). A habilidade continua
// existindo, e nenhum dado de jogador é tocado: quem a tinha equipada deixa
// de vê-la na batalha, porque a batalha só carrega o que ainda está no kit
// (ver getEquippedSkills em app/lib/battle/queries.ts).
//
// Sem `character`, a habilidade sai do kit de TODO mundo que a tinha.

const aposentadas = [
  // ---- Duplicavam uma forma que já existe ----
  // O dono do projeto decidiu: a forma fica, a habilidade sai.
  { skill: 'Máscara Hollow', category: 'OTHER', character: 'Ichigo Kurosaki' },
  { skill: 'Shunkō', category: 'OTHER', character: 'Yoruichi Shihoin' },
  { skill: 'Hōgyoku: Evolução', category: 'OTHER', character: 'Sosuke Aizen' },
  { skill: 'Zanka no Tachi: Ativação', category: 'OTHER', character: 'Yamamoto Genryūsai' },
  { skill: 'Unstoppable Rage', category: 'KI', character: 'Broly' },
  // Letzt Stil é a forma do Ryuken; saiu da escada Quincy compartilhada.
  { skill: 'Letzt Stil', category: 'OTHER' },

  // ---- Viraram forma (ver o fim de transformations.js) ----
  { skill: 'Kaioken', category: 'KI', character: 'Goku' },
  { skill: 'Nine-Tails Chakra Cloak', category: 'NINJUTSU', character: 'Naruto Uzumaki' },
  { skill: 'Sharingan Insight', category: 'GENJUTSU', character: 'Sasuke Uchiha' },
  { skill: 'Corpo Espiritual Instantâneo', category: 'OTHER', character: 'Mahito' },
  { skill: 'Remover o Tapa-Olho', category: 'OTHER', character: 'Kenpachi Zaraki' },
];

module.exports = { aposentadas };
