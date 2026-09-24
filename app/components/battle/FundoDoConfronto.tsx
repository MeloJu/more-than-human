/**
 * O fundo da cena: a tela dividida ao meio pela cor de cada lado.
 *
 * É o que mais faz a batalha parecer DAQUELE confronto, e não de qualquer um:
 * sem ele, a cor só existia dentro dos cards, e o resto da página era o mesmo
 * breu para toda luta. Aqui o lado do jogador acende na cor dele e o do
 * adversário na do adversário, com riscos de velocidade em sentidos opostos —
 * as duas forças empurrando para o centro, que é onde fica o 対戦.
 *
 * SÓ LUZ, SEM ARTE. O fundo ilustrado do mockup (a pintura do personagem
 * atrás de cada lado) depende de escolher uma arte por personagem, e o dono
 * do projeto quer fazer essa escolha antes. Este componente é a base em que
 * aquela arte vai entrar depois.
 *
 * `fixed` e `-z-10`: fica atrás de tudo, inclusive da barra de navegação que
 * é translúcida, e não rola com a página — a cena não muda de cor quando se
 * desce até as ações.
 */
export function FundoDoConfronto({ corJogador, corInimigo }: { corJogador: string; corInimigo: string }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 58% 80% at 0% 38%, color-mix(in srgb, ${corJogador} 30%, transparent), transparent 72%), radial-gradient(ellipse 58% 80% at 100% 38%, color-mix(in srgb, ${corInimigo} 30%, transparent), transparent 72%)`,
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-1/2 opacity-[0.09]"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${corJogador} 0 2px, transparent 2px 16px)`,
          maskImage: 'linear-gradient(to right, black 10%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to right, black 10%, transparent 90%)',
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2 opacity-[0.09]"
        style={{
          backgroundImage: `repeating-linear-gradient(65deg, ${corInimigo} 0 2px, transparent 2px 16px)`,
          maskImage: 'linear-gradient(to left, black 10%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to left, black 10%, transparent 90%)',
        }}
      />
    </div>
  )
}
