// Catalogo da loja. Fonte unica: consumido pelo seed (destrutivo) e pelo
// sync-catalog (idempotente).
//
// As skills concedidas sao referenciadas por NOME em `grantedSkillName`, para
// que o dado nao dependa de id gerado.

const equipmentSkills = [
  { name: 'Dark Repulser: Estocada de Cristal', category: 'OTHER', power: 30, energyCost: 22, cooldown: 3, tags: ['equipment', 'espada'], effects: [{ type: 'PIERCE', target: 'SELF', magnitude: 30 }] },
  { name: 'Getsuga Tenshō (Zangetsu)', category: 'OTHER', power: 32, energyCost: 24, cooldown: 3, tags: ['equipment', 'ultimate'], effects: [] },
  { name: 'Senbonzakura: Chire', category: 'OTHER', power: 30, energyCost: 26, cooldown: 3, tags: ['equipment', 'multi'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 3 }] },
  { name: 'Kyōka Suigetsu: Hipnose Completa', category: 'OTHER', power: 0, energyCost: 22, cooldown: 4, tags: ['equipment', 'illusion'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 30, duration: 3 }, { type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 25, duration: 3 }] },
  { name: 'Shinsō: Estocada Estendida', category: 'OTHER', power: 26, energyCost: 18, cooldown: 2, tags: ['equipment', 'pierce'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 18, duration: 2 }] },
  { name: 'Sode no Shirayuki: Tsukishiro', category: 'OTHER', power: 24, energyCost: 20, cooldown: 3, tags: ['equipment', 'ice'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }] },
  { name: 'Zabimaru: Hikōtsu', category: 'OTHER', power: 22, energyCost: 16, cooldown: 2, tags: ['equipment', 'whip'], effects: [] },
  { name: 'Wabisuke: Peso da Culpa', category: 'OTHER', power: 12, energyCost: 14, cooldown: 3, tags: ['equipment', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 25, duration: 3 }] },
  { name: 'Máscara Hollow: Rugido', category: 'OTHER', power: 0, energyCost: 20, cooldown: 4, tags: ['equipment', 'hollow'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 35, duration: 2 }, { type: 'DEBUFF', target: 'SELF', stat: 'defense', magnitude: 10, duration: 2 }] },
  { name: 'Luvas de Kidō: Descarga', category: 'HADO', power: 20, energyCost: 12, cooldown: 2, tags: ['equipment', 'kido'], effects: [] },
  { name: 'Ginto: Barreira Quincy', category: 'OTHER', power: 0, energyCost: 16, cooldown: 3, tags: ['equipment', 'quincy'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 45, duration: 3 }] },
];

const equipment = [
  // --- ARMA ---
  { name: 'Asauchi', description: 'A lâmina sem nome que todo shinigami recebe na Academia. Ainda não conhece você.', slot: 'ARMA', rarity: 'COMUM', price: 50, requiredLevel: 1, flatAttackBonus: 3, flatSpeedBonus: 1 },
  { name: 'Katana da Academia', description: 'Aço de treino, marcado por mil cortes de prática. Serve, e é só o que precisa por enquanto.', slot: 'ARMA', rarity: 'COMUM', price: 75, requiredLevel: 1, flatAttackBonus: 4, flatHpBonus: 5 },
  { name: 'Wabisuke', description: 'A lâmina torta de Izuru Kira. Cada golpe dobra o peso do que ela corta — e a culpa de quem a empunha.', slot: 'ARMA', rarity: 'RARO', price: 260, requiredLevel: 3, flatAttackBonus: 7, grantedSkillName: 'Wabisuke: Peso da Culpa' },
  { name: 'Zabimaru', description: 'A serpente-babuíno de Renji Abarai. Se estende em segmentos e morde de onde o inimigo não espera.', slot: 'ARMA', rarity: 'RARO', price: 300, requiredLevel: 4, flatAttackBonus: 9, flatSpeedBonus: 2, grantedSkillName: 'Zabimaru: Hikōtsu' },
  { name: 'Sode no Shirayuki', description: 'A zanpakutō de gelo mais bela da Soul Society. Rukia a empunha como quem pede desculpas.', slot: 'ARMA', rarity: 'EPICO', price: 480, requiredLevel: 6, flatAttackBonus: 11, flatSpeedBonus: 4, grantedSkillName: 'Sode no Shirayuki: Tsukishiro' },
  { name: 'Shinsō', description: 'A lâmina de Gin Ichimaru se estica antes de você registrar o movimento. Como o sorriso dele.', slot: 'ARMA', rarity: 'EPICO', price: 520, requiredLevel: 7, flatAttackBonus: 12, flatSpeedBonus: 6, grantedSkillName: 'Shinsō: Estocada Estendida' },
  { name: 'Senbonzakura', description: 'Mil pétalas de lâmina. Byakuya Kuchiki não levanta a voz porque a espada dele já fala alto.', slot: 'ARMA', rarity: 'EPICO', price: 560, requiredLevel: 8, flatAttackBonus: 14, flatDefenseBonus: 3, grantedSkillName: 'Senbonzakura: Chire' },
  { name: 'Zangetsu', description: 'A lâmina enorme e sem guarda de Ichigo. Corta o próprio destino junto com o inimigo.', slot: 'ARMA', rarity: 'LENDARIO', price: 900, requiredLevel: 10, flatAttackBonus: 18, flatHpBonus: 20, grantedSkillName: 'Getsuga Tenshō (Zangetsu)' },
  { name: 'Kyōka Suigetsu', description: 'Hipnose completa. No instante em que você a vê ser liberada, já é tarde demais.', slot: 'ARMA', rarity: 'LENDARIO', price: 1000, requiredLevel: 12, flatAttackBonus: 15, flatSpeedBonus: 8, grantedSkillName: 'Kyōka Suigetsu: Hipnose Completa' },

  // --- TRAJE ---
  { name: 'Uniforme da Academia', description: 'Azul e branco, engomado. Você ainda não sangrou nele.', slot: 'TRAJE', rarity: 'COMUM', price: 40, requiredLevel: 1, flatDefenseBonus: 3, flatHpBonus: 8 },
  { name: 'Shihakushō', description: 'O kimono negro de batalha do Gotei 13. Simples porque não precisa ser mais que isso.', slot: 'TRAJE', rarity: 'COMUM', price: 85, requiredLevel: 2, flatDefenseBonus: 5, flatHpBonus: 15 },
  { name: 'Manto Quincy', description: 'Branco impecável, costurado para refletir reiatsu. Os Quincy nunca tiveram bom gosto discreto.', slot: 'TRAJE', rarity: 'RARO', price: 300, requiredLevel: 5, flatDefenseBonus: 9, flatHpBonus: 25, flatSpeedBonus: 2 },
  { name: 'Haori de Capitão', description: 'O manto branco sobre o shihakushō. O número nas costas diz quem você é antes de você falar.', slot: 'TRAJE', rarity: 'EPICO', price: 500, requiredLevel: 8, flatDefenseBonus: 14, flatHpBonus: 40 },
  { name: 'Haori do Capitão-Comandante', description: 'Mil anos no comando do Gotei 13 deixam marca no tecido. Yamamoto nunca precisou de armadura.', slot: 'TRAJE', rarity: 'LENDARIO', price: 950, requiredLevel: 12, flatDefenseBonus: 20, flatHpBonus: 70, flatAttackBonus: 5 },

  // --- ACESSÓRIO ---
  { name: 'Tekkō de Ferro', description: 'Protetores de antebraço surrados. Aparam o que a espada não alcança.', slot: 'ACESSORIO', rarity: 'COMUM', price: 35, requiredLevel: 1, flatDefenseBonus: 4 },
  { name: 'Sandálias de Combate', description: 'Waraji reforçadas. Shunpo não perdoa calçado ruim.', slot: 'ACESSORIO', rarity: 'COMUM', price: 45, requiredLevel: 1, flatSpeedBonus: 5 },
  { name: 'Distintivo de Shinigami Substituto', description: 'A caveira vermelha que separa a alma do corpo. Prova que você não deveria estar aqui — e está.', slot: 'ACESSORIO', rarity: 'RARO', price: 220, requiredLevel: 3, flatHpBonus: 20, flatAttackBonus: 4 },
  { name: 'Luvas de Kidō', description: 'Costuradas com fio de reiryoku. Estabilizam o encantamento que sua boca ainda tropeça em recitar.', slot: 'ACESSORIO', rarity: 'RARO', price: 260, requiredLevel: 4, flatSpeedBonus: 3, grantedSkillName: 'Luvas de Kidō: Descarga' },
  { name: 'Ginto Quincy', description: 'Tubos de prata com reiryoku condensado. Um Quincy nunca entra em campo sem eles.', slot: 'ACESSORIO', rarity: 'RARO', price: 280, requiredLevel: 5, flatDefenseBonus: 6, grantedSkillName: 'Ginto: Barreira Quincy' },
  { name: 'Fragmento de Máscara Hollow', description: 'Osso branco, listra vermelha. Vestir isso é deixar o que mora dentro de você atender a porta.', slot: 'ACESSORIO', rarity: 'EPICO', price: 540, requiredLevel: 7, flatAttackBonus: 12, flatHpBonus: -10, grantedSkillName: 'Máscara Hollow: Rugido' },

  // --- FORA DA LOJA: drop de raid e forja (naLoja: false) ---
  // Drop do Grimmjow, garantido na primeira vitória na Sexta Torre.
  { name: 'Garra da Pantera', description: 'Arrancada da Resurrección de Grimmjow. Ainda quer rasgar alguma coisa.', slot: 'ACESSORIO', rarity: 'EPICO', price: 0, requiredLevel: 14, flatAttackBonus: 10, flatSpeedBonus: 6, naLoja: false },
  // Da forja da Lisbeth.
  { name: 'Couraça de Hierro', description: 'Forjada com garras e núcleo de Hollow. Tem a mesma teimosia da pele deles.', slot: 'TRAJE', rarity: 'EPICO', price: 0, requiredLevel: 12, flatDefenseBonus: 13, flatHpBonus: 35, naLoja: false },
  { name: 'Dark Repulser', description: 'A espada de cristal que a Lisbeth forjou para o Kirito. Leve, e corta o que parecia duro demais.', slot: 'ARMA', rarity: 'LENDARIO', price: 0, requiredLevel: 16, flatAttackBonus: 17, flatSpeedBonus: 5, flatDefenseBonus: 4, grantedSkillName: 'Dark Repulser: Estocada de Cristal', naLoja: false },
];

module.exports = { equipmentSkills, equipment };
