// Kit próprio de cada personagem, escalonado por nível.
//
// POR QUE EXISTE: o kit de assinatura de TODO personagem estava inteiramente
// no nível 1 — mínimo e máximo iguais a 1, para os 49. A individualidade era
// entregue nos primeiros segundos e nunca mais crescia: o Tensa Zangetsu do
// Ichigo, o golpe mais forte que ele tem, estava disponível na primeira
// batalha. Dali em diante só se desbloqueava escada compartilhada, então no
// fim do jogo o personagem era quase todo técnica genérica.
//
// COMO A ORDEM FOI DECIDIDA: por INVESTIMENTO (energia + cooldown*6), e não
// por poder. Ordenar por poder erraria com personagens de utilidade — o Full
// Reject da Orihime tem poder 0 por ser rejeição pura, e cairia no nível 1
// apesar de ser o ultimate dela. Custo e cooldown identificam o ultimate
// mesmo quando ele não causa dano.
//
// DE ONDE VÊM OS NÍVEIS: da economia de XP, não de gosto. A curva de nível é
// 50·L·(L−1), e a história recurvada paga 9100 XP no total, o que termina o
// arco no nível 14. Portões acima disso seriam conteúdo morto. A primeira
// versão desta curva ia a 30; era inalcançável e foi descartada.
//
// A curva é 1/1/1/5/9/14. Os TRÊS primeiros ficam no nível 1 de propósito:
// 3 dos 49 personagens têm kit de só 3 golpes, e travar 1 de 3 não escalona
// identidade — apaga. Medido: com o terceiro golpe travado no nível 4, o
// Vegeta caía para 1% de vitória no estágio 2, pior que os 26% originais que
// motivaram este trabalho todo. Quem tem kit grande é quem realmente
// escalona, que é o desenho certo — kit grande é justamente quem tem mais
// identidade para distribuir ao longo do jogo.
//
// Esta curva e a economia de XP são a MESMA decisão. Esticar uma sem a outra
// desalinha as duas: mais XP por batalha permite portões mais altos, menos
// XP transforma os portões de cima em conteúdo que ninguém vê.
//
// ATENÇÃO: diferente da escada de afiliação (skill-ladders.js), o sync deste
// arquivo PODE aumentar o requiredLevel de um vínculo existente — é o
// objetivo dele. A trava de nunca-piorar vale para a escada, não para o kit.

const kits = [
  { character: "Aaroniero Arruruerie", skills: [
    { skill: "Soul Devour", category: "OTHER", level: 1 },
    { skill: "Absorbed Mass", category: "OTHER", level: 1 },
    { skill: "Cauldron Shield", category: "OTHER", level: 1 },
    { skill: "Nejibana no Kioku: Twin Cauldron", category: "OTHER", level: 5 },
  ] },
  { character: "As Nödt", skills: [
    { skill: "Arrow of Fear", category: "OTHER", level: 1 },
    { skill: "Predator's Patience", category: "OTHER", level: 1 },
    { skill: "Paralyzing Screech", category: "OTHER", level: 1 },
    { skill: "Angstroem: Terror Incarnate", category: "OTHER", level: 5 },
  ] },
  { character: "Baraggan Luisenbarn", skills: [
    { skill: "Golpe do Trono", category: "OTHER", level: 1 },
    { skill: "Decaying Touch", category: "OTHER", level: 1 },
    { skill: "King's Authority", category: "OTHER", level: 1 },
    { skill: "Respira: Decay", category: "OTHER", level: 5 },
  ] },
  { character: "Batman", skills: [
    { skill: "Batarang Volley", category: "OTHER", level: 1 },
    { skill: "Detective Analysis", category: "OTHER", level: 1 },
    { skill: "Smoke Bomb Escape", category: "OTHER", level: 1 },
    { skill: "Grapple Counter", category: "OTHER", level: 5 },
  ] },
  { character: "Bazz-B", skills: [
    { skill: "Scorching Strike", category: "OTHER", level: 1 },
    { skill: "Burner Finger", category: "OTHER", level: 1 },
    { skill: "Heat Wave", category: "OTHER", level: 1 },
    { skill: "Burner Finger 1: Max", category: "OTHER", level: 5 },
  ] },
  { character: "Broly", skills: [
    { skill: "Rampage Smash", category: "KI", level: 1 },
    { skill: "Wrathful Roar", category: "KI", level: 1 },
  ] },
  { character: "Byakuya Kuchiki", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Shukumei", category: "OTHER", level: 1 },
    { skill: "Senbonzakura", category: "OTHER", level: 1 },
    { skill: "Orgulho dos Kuchiki", category: "OTHER", level: 5 },
    { skill: "Senbonzakura Kageyoshi", category: "OTHER", level: 9 },
  ] },
  { character: "Chad", skills: [
    { skill: "El Directo", category: "OTHER", level: 1 },
    { skill: "Iron Resolve", category: "OTHER", level: 1 },
    { skill: "Brazo Derecho del Gigante: Carga", category: "OTHER", level: 1 },
    { skill: "Brazo Izquierda del Diablo: Guard", category: "OTHER", level: 5 },
  ] },
  { character: "Coyote Starrk", skills: [
    { skill: "Cero Metralleta", category: "OTHER", level: 1 },
    { skill: "Pack Tactics", category: "OTHER", level: 1 },
    { skill: "Lone Wolf's Focus", category: "OTHER", level: 1 },
    { skill: "Los Lobos", category: "OTHER", level: 5 },
  ] },
  { character: "Daredevil", skills: [
    { skill: "Billy Club Strike", category: "OTHER", level: 1 },
    { skill: "Radar Sense", category: "OTHER", level: 1 },
    { skill: "Counter Strike", category: "OTHER", level: 1 },
    { skill: "Adrenaline Surge", category: "OTHER", level: 5 },
  ] },
  { character: "Emma Frost", skills: [
    { skill: "Psychic Blast", category: "OTHER", level: 1 },
    { skill: "Diamond Form Counter", category: "OTHER", level: 1 },
    { skill: "Diamond Skin", category: "OTHER", level: 1 },
    { skill: "Mental Domination", category: "OTHER", level: 5 },
  ] },
  { character: "Gin Ichimaru", skills: [
    { skill: "Shinsō: Investida", category: "OTHER", level: 1 },
    { skill: "Sorriso Enganoso", category: "OTHER", level: 1 },
    { skill: "Farsa Calculada", category: "OTHER", level: 1 },
    { skill: "Kamishini no Yari", category: "OTHER", level: 5 },
  ] },
  { character: "Goku", skills: [
    { skill: "Power Up", category: "KI", level: 1 },
    { skill: "Instant Transmission Counter", category: "KI", level: 1 },
    { skill: "Kamehameha", category: "KI", level: 1 },
  ] },
  { character: "Grimmjow Jaegerjaquez", skills: [
    { skill: "Reckless Assault", category: "OTHER", level: 1 },
    { skill: "Desgarrón", category: "OTHER", level: 1 },
    { skill: "Predator's Instinct", category: "OTHER", level: 1 },
    { skill: "Gran Rey Cero", category: "OTHER", level: 5 },
  ] },
  { character: "Ichigo Kurosaki", skills: [
    { skill: "Hadō #31: Shakkahō", category: "HADO", level: 1 },
    { skill: "Getsuga Jūjishō", category: "OTHER", level: 1 },
    { skill: "Zangetsu Parry", category: "OTHER", level: 1 },
    { skill: "Bankai Focus", category: "OTHER", level: 5 },
    { skill: "Getsuga Tenshō", category: "OTHER", level: 9 },
    { skill: "Tensa Zangetsu: Final Getsuga", category: "OTHER", level: 14 },
  ] },
  { character: "Izuru Kira", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Wabisuke: Peso Redobrado", category: "OTHER", level: 1 },
    { skill: "Golpe do Desespero", category: "OTHER", level: 1 },
    { skill: "Máscara de Indiferença", category: "OTHER", level: 5 },
  ] },
  { character: "Jean Grey", skills: [
    { skill: "Telekinetic Slam", category: "OTHER", level: 1 },
    { skill: "Mind Link Weaken", category: "OTHER", level: 1 },
    { skill: "Phoenix Rebirth", category: "OTHER", level: 1 },
    { skill: "Phoenix Surge", category: "OTHER", level: 5 },
  ] },
  { character: "Jūshirō Ukitake", skills: [
    { skill: "Sōgyo no Kotowari: Twin Blade", category: "OTHER", level: 1 },
    { skill: "Dual Strike Barrage", category: "OTHER", level: 1 },
    { skill: "Twin Blade Guard", category: "OTHER", level: 1 },
    { skill: "Resilient Spirit", category: "OTHER", level: 5 },
  ] },
  { character: "Kaname Tosen", skills: [
    { skill: "Suzumushi: Grito", category: "OTHER", level: 1 },
    { skill: "Blind Justice", category: "OTHER", level: 1 },
    { skill: "Righteous Guard", category: "OTHER", level: 1 },
    { skill: "Suzumushi Tsuishiki: Enma Kōrogi", category: "OTHER", level: 5 },
  ] },
  { character: "Kenpachi Zaraki", skills: [
    { skill: "Fio Cego", category: "OTHER", level: 1 },
    { skill: "Teimosia de Kenpachi", category: "OTHER", level: 1 },
    { skill: "Pressão Assassina", category: "OTHER", level: 1 },
    { skill: "Nozarashi", category: "OTHER", level: 9 },
  ] },
  { character: "Kisuke Urahara", skills: [
    { skill: "Benihime: Crimson Strike", category: "OTHER", level: 1 },
    { skill: "Shopkeeper's Trick", category: "OTHER", level: 1 },
    { skill: "Benihime: Muralha Carmesim", category: "OTHER", level: 1 },
    { skill: "Calculated Counter", category: "OTHER", level: 5 },
  ] },
  { character: "Mayuri Kurotsuchi", skills: [
    { skill: "Ashisogi Jizō Spores", category: "OTHER", level: 1 },
    { skill: "Cobaia Descartável", category: "OTHER", level: 1 },
    { skill: "Corpo Descartável", category: "OTHER", level: 1 },
    { skill: "Konjiki Ashisogi Jizō", category: "OTHER", level: 5 },
  ] },
  { character: "Momo Hinamori", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Tobiume: Plum Blossom Fire", category: "OTHER", level: 1 },
    { skill: "Kido Focus", category: "OTHER", level: 1 },
    { skill: "Hadō #63: Raikōhō", category: "HADO", level: 5 },
  ] },
  { character: "Naruto Uzumaki", skills: [
    { skill: "Shadow Clone Barrage", category: "NINJUTSU", level: 1 },
    { skill: "Rasengan", category: "NINJUTSU", level: 1 },
    { skill: "Uzumaki Barrier", category: "NINJUTSU", level: 1 },
  ] },
  { character: "Nnoitra Gilga", skills: [
    { skill: "Bloodlust", category: "OTHER", level: 1 },
    { skill: "Santa Teresa: Scythe Slash", category: "OTHER", level: 1 },
    { skill: "Arrogant Pressure", category: "OTHER", level: 1 },
    { skill: "Gran Caída", category: "OTHER", level: 5 },
  ] },
  { character: "Orihime Inoue", skills: [
    { skill: "Tsubaki: Koten Zanshun", category: "OTHER", level: 1 },
    { skill: "Encouraging Words", category: "OTHER", level: 1 },
    { skill: "Santen Kesshun", category: "OTHER", level: 1 },
    { skill: "Sōten Kisshun", category: "OTHER", level: 5 },
    { skill: "Dance of the Heavens: Full Reject", category: "OTHER", level: 9 },
  ] },
  { character: "Rangiku Matsumoto", skills: [
    { skill: "Haineko: Ash Slash", category: "OTHER", level: 1 },
    { skill: "Flashy Confidence", category: "OTHER", level: 1 },
    { skill: "Growl, Haineko", category: "OTHER", level: 1 },
    { skill: "Ash Veil", category: "OTHER", level: 5 },
  ] },
  { character: "Renji Abarai", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Zabimaru: Chicotada", category: "OTHER", level: 1 },
    { skill: "Determinação de Superar", category: "OTHER", level: 1 },
    { skill: "Lealdade Inabalável", category: "OTHER", level: 5 },
    { skill: "Hihio Zabimaru", category: "OTHER", level: 9 },
  ] },
  { character: "Retsu Unohana", skills: [
    { skill: "Calm Composure", category: "OTHER", level: 1 },
    { skill: "Minazuki: Mist Balm", category: "OTHER", level: 1 },
    { skill: "Healing Touch", category: "OTHER", level: 1 },
    { skill: "Glimpse of the True Blade", category: "OTHER", level: 5 },
  ] },
  { character: "Rukia Kuchiki", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Bakudō #1: Sai", category: "BAKUDO", level: 1 },
    { skill: "Hadō #33: Sōkatsui", category: "HADO", level: 1 },
    { skill: "Sode no Shirayuki: Some Snow", category: "OTHER", level: 5 },
    { skill: "Dance of the White Moon", category: "OTHER", level: 9 },
    { skill: "Bakudō #61: Rikujōkōrō", category: "BAKUDO", level: 14 },
  ] },
  { character: "Ryuken Ishida", skills: [
    { skill: "Precision Shot", category: "OTHER", level: 1 },
    { skill: "Cold Calculation", category: "OTHER", level: 1 },
    { skill: "Silver Arrow Barrage", category: "OTHER", level: 1 },
    { skill: "Doctor's Composure", category: "OTHER", level: 5 },
  ] },
  { character: "Sajin Komamura", skills: [
    { skill: "Tenken Strike", category: "OTHER", level: 1 },
    { skill: "Iron Wall", category: "OTHER", level: 1 },
    { skill: "Guardian's Resolve", category: "OTHER", level: 1 },
    { skill: "Kokujō Tengen Myōō", category: "OTHER", level: 5 },
  ] },
  { character: "Sasuke Uchiha", skills: [
    { skill: "Fire Style: Fireball", category: "NINJUTSU", level: 1 },
    { skill: "Chidori", category: "NINJUTSU", level: 1 },
    { skill: "Amaterasu", category: "NINJUTSU", level: 5 },
  ] },
  { character: "Shunsui Kyōraku", skills: [
    { skill: "Katen Kyōkotsu: Twin Strike", category: "OTHER", level: 1 },
    { skill: "Flower Wind Rondo", category: "OTHER", level: 1 },
    { skill: "Lazy Confidence", category: "OTHER", level: 1 },
    { skill: "Bushōgoma", category: "OTHER", level: 5 },
  ] },
  { character: "Sosuke Aizen", skills: [
    { skill: "Kyōka Suigetsu: Complete Hypnosis", category: "OTHER", level: 1 },
    { skill: "Ilusão de Fragilidade", category: "OTHER", level: 1 },
    { skill: "Tudo Conforme o Plano", category: "OTHER", level: 1 },
    { skill: "Hadō #90: Kurohitsugi", category: "HADO", level: 5 },
  ] },
  { character: "Superman", skills: [
    { skill: "Super Strength Slam", category: "OTHER", level: 1 },
    { skill: "Heat Vision", category: "OTHER", level: 1 },
    { skill: "Kryptonian Resolve", category: "OTHER", level: 1 },
    { skill: "Unbreakable", category: "OTHER", level: 5 },
  ] },
  { character: "Suì-Fēng", skills: [
    { skill: "Suzumebachi Sting", category: "OTHER", level: 1 },
    { skill: "Assassin's Debuff", category: "OTHER", level: 1 },
    { skill: "Nigeki Kessatsu: Death Sting", category: "OTHER", level: 1 },
    { skill: "Shunkō Assault", category: "OTHER", level: 5 },
  ] },
  { character: "Szayelaporro Granz", skills: [
    { skill: "Fornicarás: Toxic Spore", category: "OTHER", level: 1 },
    { skill: "Analytical Mind", category: "OTHER", level: 1 },
    { skill: "Self-Regeneration", category: "OTHER", level: 1 },
    { skill: "Gabriel: Resurrection Experiment", category: "OTHER", level: 5 },
  ] },
  { character: "Tia Harribel", skills: [
    { skill: "Ola Azul", category: "OTHER", level: 1 },
    { skill: "Tidal Focus", category: "OTHER", level: 1 },
    { skill: "Glacial Barrier", category: "OTHER", level: 1 },
    { skill: "Tiburón: Sawing Sharks", category: "OTHER", level: 5 },
  ] },
  { character: "Toshiro Hitsugaya", skills: [
    { skill: "Hadō #4: Byakurai", category: "HADO", level: 1 },
    { skill: "Hyōrinmaru: Ice Blade", category: "OTHER", level: 1 },
    { skill: "Sōten ni Zase", category: "OTHER", level: 1 },
    { skill: "Frost Armor", category: "OTHER", level: 5 },
    { skill: "Hyōten Hyakkasō", category: "OTHER", level: 9 },
  ] },
  { character: "Ulquiorra Cifer", skills: [
    { skill: "Lanza del Relámpago", category: "OTHER", level: 1 },
    { skill: "Emotionless Precision", category: "OTHER", level: 1 },
    { skill: "Hierro Skin", category: "OTHER", level: 1 },
    { skill: "Cero Oscuras", category: "OTHER", level: 5 },
  ] },
  { character: "Uryu Ishida", skills: [
    { skill: "Seele Schneider", category: "OTHER", level: 1 },
    { skill: "Hirenkyaku Shot", category: "OTHER", level: 1 },
    { skill: "Quincy Focus", category: "OTHER", level: 1 },
    { skill: "Blut Vene", category: "OTHER", level: 5 },
    { skill: "Ginrei Kojaku: Licht Regen", category: "OTHER", level: 9 },
  ] },
  { character: "Vegeta", skills: [
    { skill: "Saiyan Onslaught", category: "KI", level: 1 },
    { skill: "Prince's Pride", category: "KI", level: 1 },
    { skill: "Galick Gun", category: "KI", level: 1 },
  ] },
  { character: "Wonder Woman", skills: [
    { skill: "Sword Strike", category: "OTHER", level: 1 },
    { skill: "Lasso of Truth", category: "OTHER", level: 1 },
    { skill: "Amazonian Fury", category: "OTHER", level: 1 },
    { skill: "Bracelets of Submission", category: "OTHER", level: 5 },
  ] },
  { character: "Yamamoto Genryūsai", skills: [
    { skill: "Ryūjin Jakka: Flame Strike", category: "OTHER", level: 1 },
    { skill: "Hadō #96: Ittō Kasō", category: "HADO", level: 1 },
    { skill: "Zanka no Tachi: Cremation", category: "OTHER", level: 5 },
  ] },
  { character: "Yammy Llargo", skills: [
    { skill: "Crushing Blow", category: "OTHER", level: 1 },
    { skill: "Gigantic Fist", category: "OTHER", level: 1 },
    { skill: "Overwhelming Size", category: "OTHER", level: 1 },
    { skill: "Ira: Rampage", category: "OTHER", level: 5 },
  ] },
  { character: "Yhwach", skills: [
    { skill: "The Almighty's Strike", category: "OTHER", level: 1 },
    { skill: "Der Sarg: Distortion", category: "OTHER", level: 1 },
    { skill: "The Almighty's Foresight", category: "OTHER", level: 1 },
    { skill: "Auswählen: Absolute Judgment", category: "OTHER", level: 5 },
  ] },
  { character: "Yoruichi Shihoin", skills: [
    { skill: "Shunpo: Investida", category: "OTHER", level: 1 },
    { skill: "Vital Point Strike", category: "OTHER", level: 1 },
    { skill: "Goddess of Flash", category: "OTHER", level: 1 },
    { skill: "Utsusemi", category: "OTHER", level: 5 },
  ] },
  { character: "Zommari Rureaux", skills: [
    { skill: "Brujería: Multi-Strike", category: "OTHER", level: 1 },
    { skill: "Binding Gaze", category: "OTHER", level: 1 },
    { skill: "All-Seeing Focus", category: "OTHER", level: 1 },
    { skill: "Amor: Paralysis", category: "OTHER", level: 5 },
  ] },
];

module.exports = { kits };
