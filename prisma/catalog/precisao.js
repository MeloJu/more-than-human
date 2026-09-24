// Precisão das habilidades: quanto o golpe erra por ser o golpe que é.
//
// É DERIVADA DO PODER, e não escrita uma a uma. São 473 habilidades com dano
// no catálogo; um campo à mão em cada uma seriam 473 oportunidades de errar e
// nenhuma regra que alguém pudesse conferir depois. A mesma decisão que já
// foi tomada para a escala por atributo e para os atributos de classe.
//
// A REGRA: quanto maior o golpe, mais largo ele é. Um soco rápido encaixa
// sempre; um Getsuga Tenshou é uma onda de energia que a pessoa do outro lado
// tem uma chance de não estar mais ali quando chega.
//
// POR QUE ISSO IMPORTA: até aqui a melhor jogada era sempre "a habilidade de
// maior número que eu consigo pagar", e a única coisa que impedia era o
// cooldown. Com precisão, o golpe grande passa a ser uma APOSTA — e o golpe
// médio confiável passa a ter um caso a favor dele. É a primeira vez que duas
// habilidades ofensivas do mesmo kit competem por algo que não seja o custo.
//
// E como a IA escolhe por dano ESPERADO (poder × precisão), ela também deixa
// de pegar cegamente o maior número.
//
// AS FAIXAS FORAM APERTADAS, e a razão é medida. Na primeira versão só dois
// degraus erravam (88% e 94%), e 508 das 620 habilidades acertavam sempre.
// Com quase tudo certeiro, treinar acurácia não mudava nada: +5 pontos
// rendiam 0,0 ponto percentual de vitória no simulador. O dono do projeto
// escolheu "golpe forte erra mais": fortes entre 80% e 85%, médios entre 90%
// e 94%, e só os fracos e o suporte continuam certeiros. É o que dá à
// acurácia treinada algo para compensar — ver ajusteDeAcerto, que agora SOMA
// à precisão em vez de só cancelar esquiva.
//
// Os cortes saem da distribuição real do poder no catálogo (mediana 21, p75
// 29, p90 35), não de número redondo.

const FAIXAS = [
  // O topo absoluto: os golpes de 40+ (~29 no catálogo). Sem treino, erram
  // um em cada cinco.
  { minimoDePoder: 40, precisao: 80 },
  { minimoDePoder: 30, precisao: 85 },
  // O miolo do kit.
  { minimoDePoder: 20, precisao: 90 },
  { minimoDePoder: 15, precisao: 94 },
];

/**
 * A precisão de uma habilidade, dado o poder e as tags dela.
 *
 * DOMÍNIO É EXCEÇÃO e não podia deixar de ser: o estado que ele instala se
 * chama acerto garantido, e uma abertura de domínio que passa longe
 * contradiria a própria mecânica que ela liga.
 */
function precisaoDe(skill) {
  const tags = Array.isArray(skill.tags) ? skill.tags : [];
  if (tags.includes('dominio')) return 100;
  if (!skill.power || skill.power <= 0) return 100;

  const faixa = FAIXAS.find((f) => skill.power >= f.minimoDePoder);
  return faixa ? faixa.precisao : 100;
}

module.exports = { FAIXAS, precisaoDe };
