// Escadas de habilidade liberadas por nível, por afiliação.
//
// POR QUE EXISTE: os 21 shinigami recebiam a escada de kidō (15 habilidades
// de nível 1 a 45) e todos os outros 28 personagens ficavam com as 4 do kit
// inicial, para sempre. Medido no simulador, isso fazia o MESMO estágio da
// história dar 98% de vitória com Ichigo e 26% com Vegeta — a escolha de
// personagem pesava mais que qualquer outra variável do jogo, sem aviso
// nenhum ao jogador. Sem paridade aqui, nenhum balanceamento de estágio pode
// estar certo para os dois.
//
// Cada escada tem identidade MECÂNICA própria, não só nomes diferentes: é o
// que faz escolher um saiyajin ser diferente de escolher um Quincy, em vez de
// só trocar a arte. O vocabulário de efeitos é o que o motor já entende
// (BUFF, DEBUFF, DOT, STUN, COUNTER, SHIELD, HEAL, LIFESTEAL).
//
// CUIDADO COM NOME: três entradas daqui foram renomeadas porque colidiam com
// golpes de assinatura que já existiam no nível 1 de Uryu, Grimmjow e
// Ulquiorra. Colisão de nome não é cosmética — a escada reescreveria os
// números da habilidade e a empurraria para um nível alto, tirando do
// personagem o golpe que o define. O sync tem uma trava para isso, mas nome
// novo é sempre mais seguro que confiar na trava.
//
// A curva de números espelha a do kidō de propósito, para que o balanceamento
// continue previsível: dano 8 → 16 → 26 → 29 → 34 → 37, energia de 9 a 35,
// cooldown de 1 a 5.
//
// OS NÍVEIS DE LIBERAÇÃO SAEM DA ECONOMIA DE XP, não de gosto. A primeira
// versão desta escada ia até o nível 40. A história inteira paga 1880 XP e a
// curva de nível é 50·L·(L−1), o que põe quem terminou a história no nível 7 —
// então metade da escada era conteúdo que ninguém jamais veria. Com a história
// recurvada para 9100 XP o arco termina no nível 14, e esta curva agora vai só
// até o 16 — logo acima do teto do kit próprio (prisma/catalog/kits.js, que
// fecha no 14), de modo que as duas se intercalam ao longo do jogo. Se a recompensa de batalha contra IA passar a escalar
// com o nível, o teto sobe e as DUAS curvas se esticam juntas.

// CADA ESCADA DECLARA scalingStat quando a categoria não basta. Ki e ninjutsu
// já vêm de KI/NINJUTSU, que a regra por categoria resolve. Quincy, Espada,
// Karakura e a metahumana usam categoria OTHER, e sem declaração explícita a
// regra caía na classe do dono — que numa escada COMPARTILHADA não existe:
// Chad (TANQUE) e Orihime (SUPORTE) dividem Karakura, o empate caía em ataque,
// e as rejeições da Orihime passavam a escalar do atributo que ela menos tem.

/** Ki — dano bruto e auto-buff. Cara em energia, recompensa quem sobrevive. */
const ki = {
  anime: 'dragon-ball-z',
  affiliation: 'Saiyan',
  skills: [
    { name: 'Rajada de Ki', category: 'KI', power: 8, energyCost: 9, cooldown: 1, tags: ['ki'], effects: [], level: 1 },
    { name: 'Golpe Duplo de Ki', category: 'KI', power: 13, energyCost: 13, cooldown: 1, tags: ['ki'], effects: [], level: 2 },
    { name: 'Concentração de Ki', category: 'KI', power: 0, energyCost: 12, cooldown: 3, tags: ['ki', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 14, duration: 2 }], level: 3 },
    { name: 'Onda de Choque', category: 'KI', power: 17, energyCost: 18, cooldown: 2, tags: ['ki'], effects: [], level: 4 },
    { name: 'Aura Ardente', category: 'KI', power: 0, energyCost: 16, cooldown: 3, tags: ['ki', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'speed', magnitude: 18, duration: 2 }], level: 5 },
    { name: 'Barreira de Ki', category: 'KI', power: 3, energyCost: 19, cooldown: 2, tags: ['ki', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 26, duration: 2 }], level: 6 },
    { name: 'Investida Fulminante', category: 'KI', power: 26, energyCost: 25, cooldown: 3, tags: ['ki'], effects: [], level: 8 },
    { name: 'Explosão de Aura', category: 'KI', power: 22, energyCost: 24, cooldown: 3, tags: ['ki'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 16, duration: 2 }], level: 9 },
    { name: 'Feixe Perfurante', category: 'KI', power: 29, energyCost: 28, cooldown: 4, tags: ['ki', 'beam'], effects: [], level: 11 },
    { name: 'Fúria Crescente', category: 'KI', power: 0, energyCost: 29, cooldown: 4, tags: ['ki', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 26, duration: 3 }, { type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 14, duration: 3 }], level: 13 },
    { name: 'Canhão de Energia', category: 'KI', power: 34, energyCost: 32, cooldown: 5, tags: ['ki', 'beam'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 22, duration: 2 }], level: 14 },
    { name: 'Estouro Final', category: 'KI', power: 37, energyCost: 35, cooldown: 5, tags: ['ki', 'ultimate'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 11, duration: 3 }], level: 16 },
  ],
}

/** Ninjutsu — controle: atordoar, atrasar e queimar. Dano mediano, muita negação. */
const ninjutsu = {
  anime: 'naruto',
  affiliation: 'Leaf',
  skills: [
    { name: 'Shuriken Certeira', category: 'NINJUTSU', power: 8, energyCost: 9, cooldown: 1, tags: ['ninja'], effects: [], level: 1 },
    { name: 'Armadilha de Arame', category: 'NINJUTSU', power: 0, energyCost: 10, cooldown: 1, tags: ['ninja', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 8, duration: 2 }], level: 2 },
    { name: 'Golpe do Clone', category: 'NINJUTSU', power: 14, energyCost: 14, cooldown: 2, tags: ['ninja'], effects: [], level: 3 },
    { name: 'Estilo Fogo: Chama Breve', category: 'NINJUTSU', power: 12, energyCost: 15, cooldown: 2, tags: ['ninja', 'fire'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 6, duration: 2 }], level: 4 },
    { name: 'Paralisia de Sombra', category: 'NINJUTSU', power: 4, energyCost: 22, cooldown: 3, tags: ['ninja', 'stun'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }], level: 5 },
    { name: 'Barreira de Selo', category: 'NINJUTSU', power: 2, energyCost: 19, cooldown: 2, tags: ['ninja', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 26, duration: 2 }], level: 6 },
    { name: 'Estilo Raio: Corrente', category: 'NINJUTSU', power: 25, energyCost: 24, cooldown: 3, tags: ['ninja', 'lightning'], effects: [], level: 8 },
    { name: 'Névoa Ocultante', category: 'NINJUTSU', power: 0, energyCost: 20, cooldown: 3, tags: ['ninja', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 20, duration: 3 }], level: 9 },
    { name: 'Enxame de Clones', category: 'NINJUTSU', power: 28, energyCost: 27, cooldown: 4, tags: ['ninja'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 14, duration: 2 }], level: 11 },
    { name: 'Prisão de Selos', category: 'NINJUTSU', power: 6, energyCost: 29, cooldown: 4, tags: ['ninja', 'stun'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 2 }], level: 13 },
    { name: 'Estilo Fogo: Grande Labareda', category: 'NINJUTSU', power: 33, energyCost: 32, cooldown: 5, tags: ['ninja', 'fire'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 11, duration: 3 }], level: 14 },
    { name: 'Técnica Proibida', category: 'NINJUTSU', power: 37, energyCost: 35, cooldown: 5, tags: ['ninja', 'ultimate'], effects: [{ type: 'DEBUFF', target: 'SELF', stat: 'defense', magnitude: 12, duration: 2 }], level: 16 },
  ],
}

/** Quincy — precisão e proteção. Dano confiável, cooldown baixo, muito escudo. */
const quincy = {
  anime: 'bleach',
  affiliation: 'Quincy',
  scalingStat: 'ENERGY', // reishi é reserva espiritual, não músculo
  skills: [
    { name: 'Flecha de Reishi', category: 'OTHER', power: 9, energyCost: 9, cooldown: 1, tags: ['quincy'], effects: [], level: 1 },
    { name: 'Tiro Rápido', category: 'OTHER', power: 12, energyCost: 12, cooldown: 1, tags: ['quincy'], effects: [], level: 2 },
    { name: 'Ginto: Fagulha', category: 'OTHER', power: 14, energyCost: 14, cooldown: 2, tags: ['quincy'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 5, duration: 2 }], level: 3 },
    { name: 'Passo do Vento', category: 'OTHER', power: 0, energyCost: 13, cooldown: 3, tags: ['quincy', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'speed', magnitude: 16, duration: 2 }], level: 4 },
    { name: 'Salva de Flechas', category: 'OTHER', power: 18, energyCost: 18, cooldown: 2, tags: ['quincy'], effects: [], level: 5 },
    { name: 'Endurecimento de Reishi', category: 'OTHER', power: 0, energyCost: 19, cooldown: 2, tags: ['quincy', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 28, duration: 2 }], level: 6 },
    { name: 'Tiro Perfurante', category: 'OTHER', power: 26, energyCost: 24, cooldown: 3, tags: ['quincy'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 14, duration: 2 }], level: 8 },
    { name: 'Ginto: Corrente de Prata', category: 'OTHER', power: 8, energyCost: 22, cooldown: 3, tags: ['quincy', 'stun'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }], level: 9 },
    { name: 'Chuva de Reishi', category: 'OTHER', power: 29, energyCost: 28, cooldown: 4, tags: ['quincy'], effects: [], level: 11 },
    { name: 'Blut Arterie', category: 'OTHER', power: 0, energyCost: 27, cooldown: 4, tags: ['quincy', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 24, duration: 3 }], level: 13 },
    { name: 'Flecha Absoluta', category: 'OTHER', power: 34, energyCost: 32, cooldown: 5, tags: ['quincy'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 20, duration: 2 }], level: 14 },
  ],
}

/** Hollow — sustentação: rouba vida e se regenera. Vence o longo prazo. */
const hollow = {
  anime: 'bleach',
  affiliation: 'Espada',
  scalingStat: 'ENERGY', // cero e hierro saem de reiatsu
  skills: [
    { name: 'Garra Corrosiva', category: 'OTHER', power: 9, energyCost: 9, cooldown: 1, tags: ['hollow'], effects: [], level: 1 },
    { name: 'Mordida Voraz', category: 'OTHER', power: 12, energyCost: 13, cooldown: 1, tags: ['hollow', 'lifesteal'], effects: [{ type: 'LIFESTEAL', target: 'SELF', magnitude: 15 }], level: 2 },
    { name: 'Pele de Hierro', category: 'OTHER', power: 0, energyCost: 12, cooldown: 3, tags: ['hollow', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 18, duration: 2 }], level: 3 },
    { name: 'Cero Menor', category: 'OTHER', power: 17, energyCost: 17, cooldown: 2, tags: ['hollow'], effects: [], level: 4 },
    { name: 'Regeneração Instantânea', category: 'OTHER', power: 0, energyCost: 18, cooldown: 4, tags: ['hollow', 'heal'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 30 }], level: 5 },
    { name: 'Sonído Cortante', category: 'OTHER', power: 15, energyCost: 16, cooldown: 2, tags: ['hollow'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 12, duration: 2 }], level: 6 },
    { name: 'Cero', category: 'OTHER', power: 26, energyCost: 25, cooldown: 3, tags: ['hollow'], effects: [], level: 8 },
    { name: 'Devorar Alma', category: 'OTHER', power: 20, energyCost: 24, cooldown: 3, tags: ['hollow', 'lifesteal'], effects: [{ type: 'LIFESTEAL', target: 'SELF', magnitude: 30 }], level: 9 },
    { name: 'Bala Encadeada', category: 'OTHER', power: 29, energyCost: 27, cooldown: 4, tags: ['hollow'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 8, duration: 2 }], level: 11 },
    { name: 'Carne Reconstituída', category: 'OTHER', power: 0, energyCost: 28, cooldown: 4, tags: ['hollow', 'heal'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 55 }], level: 13 },
    { name: 'Cero Concentrado', category: 'OTHER', power: 34, energyCost: 32, cooldown: 5, tags: ['hollow'], effects: [{ type: 'LIFESTEAL', target: 'SELF', magnitude: 20 }], level: 14 },
    { name: 'Cero Devastador', category: 'OTHER', power: 38, energyCost: 35, cooldown: 5, tags: ['hollow', 'ultimate'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 11, duration: 3 }], level: 16 },
  ],
}

/** Karakura — suporte: cura, escudo e contra-ataque. Sobrevive e devolve. */
const karakura = {
  anime: 'bleach',
  affiliation: 'Karakura Town',
  scalingStat: 'ENERGY', // as rejeições da Orihime dominam esta escada
  skills: [
    { name: 'Soco Reforçado', category: 'TAIJUTSU', power: 9, energyCost: 9, cooldown: 1, tags: ['humano'], effects: [], level: 1 },
    { name: 'Guarda Firme', category: 'TAIJUTSU', power: 0, energyCost: 11, cooldown: 2, tags: ['humano', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 18, duration: 2 }], level: 2 },
    { name: 'Rejeição Menor', category: 'OTHER', power: 0, energyCost: 14, cooldown: 3, tags: ['humano', 'heal'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 26 }], level: 3 },
    { name: 'Golpe de Braço Direito', category: 'TAIJUTSU', power: 17, energyCost: 17, cooldown: 2, tags: ['humano'], effects: [], level: 4 },
    { name: 'Escudo Triplo', category: 'OTHER', power: 0, energyCost: 18, cooldown: 3, tags: ['humano', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 32, duration: 3 }], level: 5 },
    { name: 'Postura de Contra-ataque', category: 'TAIJUTSU', power: 0, energyCost: 17, cooldown: 4, tags: ['humano', 'counter'], effects: [{ type: 'COUNTER', target: 'SELF', magnitude: 45, duration: 2 }], level: 6 },
    { name: 'Punho do Gigante', category: 'TAIJUTSU', power: 26, energyCost: 24, cooldown: 3, tags: ['humano'], effects: [], level: 8 },
    { name: 'Rejeição do Destino', category: 'OTHER', power: 0, energyCost: 26, cooldown: 4, tags: ['humano', 'heal'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 50 }], level: 9 },
    { name: 'Investida Devastadora', category: 'TAIJUTSU', power: 29, energyCost: 28, cooldown: 4, tags: ['humano'], effects: [], level: 11 },
    { name: 'Barreira Impenetrável', category: 'OTHER', power: 4, energyCost: 29, cooldown: 4, tags: ['humano', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 46, duration: 3 }], level: 13 },
    { name: 'Braço Esquerdo do Diabo', category: 'TAIJUTSU', power: 34, energyCost: 32, cooldown: 5, tags: ['humano'], effects: [{ type: 'LIFESTEAL', target: 'SELF', magnitude: 18 }], level: 14 },
    { name: 'Recusa Absoluta', category: 'OTHER', power: 0, energyCost: 34, cooldown: 5, tags: ['humano', 'ultimate'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 80 }, { type: 'COUNTER', target: 'SELF', magnitude: 60, duration: 2 }], level: 16 },
  ],
}

/**
 * Metahumano — DC e Marvel juntos, de propósito: são 6 personagens no total
 * espalhados por 3 afiliações, e uma escada inteira para o único personagem
 * dos Vingadores seria desproporcional ao uso. Identidade: controle mental e
 * resistência.
 */
const metahumano = {
  anime: null, // aplicada a várias afiliações, ver `aplicaA`
  affiliation: null,
  scalingStat: 'ATTACK', // super-força e combate físico, não conjuração
  aplicaA: [
    { anime: 'dc-universe', affiliation: 'Justice League' },
    { anime: 'marvel-universe', affiliation: 'Avengers' },
    { anime: 'marvel-universe', affiliation: 'X-Men' },
  ],
  skills: [
    { name: 'Golpe Calculado', category: 'OTHER', power: 9, energyCost: 9, cooldown: 1, tags: ['meta'], effects: [], level: 1 },
    { name: 'Leitura de Movimento', category: 'OTHER', power: 0, energyCost: 11, cooldown: 2, tags: ['meta', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 10, duration: 2 }], level: 2 },
    { name: 'Rajada Psíquica', category: 'OTHER', power: 14, energyCost: 14, cooldown: 2, tags: ['meta'], effects: [], level: 3 },
    { name: 'Postura Defensiva', category: 'OTHER', power: 0, energyCost: 13, cooldown: 3, tags: ['meta', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 20, duration: 2 }], level: 4 },
    { name: 'Interferência Mental', category: 'OTHER', power: 6, energyCost: 20, cooldown: 3, tags: ['meta', 'stun'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 1 }], level: 5 },
    { name: 'Campo de Força', category: 'OTHER', power: 0, energyCost: 19, cooldown: 2, tags: ['meta', 'shield'], effects: [{ type: 'SHIELD', target: 'SELF', magnitude: 27, duration: 2 }], level: 6 },
    { name: 'Impacto Concentrado', category: 'OTHER', power: 26, energyCost: 25, cooldown: 3, tags: ['meta'], effects: [], level: 8 },
    { name: 'Domínio da Vontade', category: 'OTHER', power: 0, energyCost: 23, cooldown: 3, tags: ['meta', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 22, duration: 3 }], level: 9 },
    { name: 'Onda Telecinética', category: 'OTHER', power: 29, energyCost: 28, cooldown: 4, tags: ['meta'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'speed', magnitude: 15, duration: 2 }], level: 11 },
    { name: 'Colapso Mental', category: 'OTHER', power: 8, energyCost: 29, cooldown: 4, tags: ['meta', 'stun'], effects: [{ type: 'STUN', target: 'ENEMY', magnitude: 1, duration: 2 }], level: 13 },
    { name: 'Fúria Contida', category: 'OTHER', power: 34, energyCost: 32, cooldown: 5, tags: ['meta'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 20, duration: 2 }], level: 14 },
    { name: 'Limite Rompido', category: 'OTHER', power: 37, energyCost: 35, cooldown: 5, tags: ['meta', 'ultimate'], effects: [{ type: 'DOT', target: 'ENEMY', magnitude: 10, duration: 3 }], level: 16 },
  ],
}

/**
 * Fundamentos de combate — a escada de quem não tem tradição própria.
 *
 * POR QUE EXISTE: as escadas são por afiliação, e quatro afiliações nunca
 * ganharam uma — Feiticeiros e Maldições (Jujutsu Kaisen), Treinadores
 * (Pokémon) e Caçadores (Solo Leveling). O efeito foi medido e é grosseiro:
 * o Gojo tinha 5 habilidades no total e UMA no nível 1, contra 25 do Ichigo
 * e 6 no nível 1. Personagem novo entrava no jogo praticamente sem arsenal.
 *
 * Eu tinha registrado esse buraco quando os três invocadores entraram, e
 * depois construí o elenco inteiro de Jujutsu com o mesmo defeito sem ligar
 * uma coisa à outra. Esta escada é a correção.
 *
 * SÃO OS UNIVERSAIS: chute, guarda, esquiva, finta, contra-ataque. Nada aqui
 * pertence a uma obra específica de propósito, porque a intenção é que
 * qualquer lutador saiba isso. Hoje vai só para as quatro afiliações sem
 * escada; estendê-la a TODO o elenco é o passo seguinte e precisa de uma
 * passagem de balanceamento própria, já que somaria 12 habilidades a 60
 * personagens de uma vez.
 *
 * ESCALA MISTA, e é o ponto: os golpes de corpo são categoria TAIJUTSU, que a
 * regra de skill-scaling.js liga a ATAQUE; os de técnica são OTHER e a escada
 * os declara em ENERGIA. Assim um ATACANTE rende nos chutes e um CONJURADOR
 * rende nas técnicas, em vez de a escada favorecer um arquétipo só.
 *
 * Dois no nível 1 de propósito: com um só, o turno seguinte ao golgo grande
 * vira ataque básico — o mesmo critério medido em signatures.js.
 */
const fundamentos = {
  anime: null,
  affiliation: null,
  scalingStat: 'ENERGY', // vale para as de categoria OTHER; TAIJUTSU vem por categoria
  aplicaA: [
    { anime: 'jujutsu-kaisen', affiliation: 'Feiticeiros' },
    { anime: 'jujutsu-kaisen', affiliation: 'Maldições' },
    { anime: 'pokemon', affiliation: 'Treinadores' },
    { anime: 'solo-leveling', affiliation: 'Caçadores' },
  ],
  skills: [
    { name: 'Chute Baixo', category: 'TAIJUTSU', power: 9, energyCost: 9, cooldown: 1, tags: ['fundamento'], effects: [], level: 1 },
    { name: 'Guarda Firme', category: 'OTHER', power: 0, energyCost: 10, cooldown: 2, tags: ['fundamento', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'defense', magnitude: 18, duration: 2 }], level: 1 },
    { name: 'Cotovelada', category: 'TAIJUTSU', power: 14, energyCost: 13, cooldown: 2, tags: ['fundamento'], effects: [], level: 2 },
    { name: 'Esquiva Lateral', category: 'OTHER', power: 0, energyCost: 12, cooldown: 3, tags: ['fundamento', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'speed', magnitude: 20, duration: 2 }], level: 3 },
    { name: 'Finta', category: 'OTHER', power: 6, energyCost: 15, cooldown: 2, tags: ['fundamento', 'debuff'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'attack', magnitude: 16, duration: 2 }], level: 4 },
    { name: 'Concentração', category: 'OTHER', power: 0, energyCost: 14, cooldown: 3, tags: ['fundamento', 'buff'], effects: [{ type: 'BUFF', target: 'SELF', stat: 'attack', magnitude: 20, duration: 2 }], level: 5 },
    { name: 'Joelhada Ascendente', category: 'TAIJUTSU', power: 24, energyCost: 22, cooldown: 3, tags: ['fundamento'], effects: [], level: 6 },
    { name: 'Golpe de Contra', category: 'OTHER', power: 0, energyCost: 20, cooldown: 3, tags: ['fundamento', 'counter'], effects: [{ type: 'COUNTER', target: 'SELF', magnitude: 45, duration: 1 }], level: 8 },
    { name: 'Sequência de Chutes', category: 'TAIJUTSU', power: 28, energyCost: 26, cooldown: 3, tags: ['fundamento'], effects: [], level: 9 },
    { name: 'Fôlego Renovado', category: 'OTHER', power: 0, energyCost: 22, cooldown: 4, tags: ['fundamento', 'cura'], effects: [{ type: 'HEAL', target: 'SELF', magnitude: 24 }], level: 11 },
    { name: 'Investida Total', category: 'TAIJUTSU', power: 33, energyCost: 30, cooldown: 4, tags: ['fundamento'], effects: [], level: 13 },
    { name: 'Golpe Decisivo', category: 'OTHER', power: 36, energyCost: 34, cooldown: 5, tags: ['fundamento'], effects: [{ type: 'DEBUFF', target: 'ENEMY', stat: 'defense', magnitude: 18, duration: 2 }], level: 15 },
  ],
};

const ladders = [ki, ninjutsu, quincy, hollow, karakura, metahumano, fundamentos]

/** Todas as definições de skill, achatadas — para criar as linhas de Skill. */
function allSkills() {
  return ladders.flatMap((l) => l.skills.map(({ level, ...s }) => ({ ...s, _level: level })))
}

/** Pares (anime, afiliação) que cada escada cobre. */
function targetsOf(ladder) {
  return ladder.aplicaA ?? [{ anime: ladder.anime, affiliation: ladder.affiliation }]
}

module.exports = { ladders, allSkills, targetsOf }
