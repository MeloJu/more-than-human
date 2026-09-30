import { createInitialState, heroi, resolveRound, vilao } from '@/app/lib/battle/engine'
import { acaoDaIa, alvoDaIa } from '@/app/lib/battle/ai'
import { invocacoesEmCampo } from '@/app/lib/battle/invocacoes'
import { MAX_ROUNDS } from '@/app/lib/battle/constants'
import type { BaseStats, Outcome, SkillDef, TransformationDef } from '@/app/lib/battle/types'

/**
 * Simulador de batalha para testar BALANCEAMENTO, não o motor.
 *
 * Existe porque escolher o nível de um estágio era chute: a única forma de
 * saber se estava justo era abrir o navegador e jogar, uma partida por vez,
 * com o resultado dependendo de sorte de crítico. Isso torna qualquer ajuste
 * de número caro e não-reproduzível.
 *
 * Roda sem banco: `resolveRound` já recebe a função aleatória por parâmetro e
 * `pickAiSkill` é pura, então a batalha inteira é computável em memória.
 *
 * O JOGADOR É PILOTADO PELA PRÓPRIA IA. Isso é proposital e tem um
 * significado preciso: a IA nunca desperdiça energia nem tenta skill em
 * cooldown, mas também não guarda o contra-ataque para o momento certo nem
 * segura o buff. Ou seja, a taxa de vitória medida aqui é um PISO — um humano
 * atento joga melhor. Uma luta que a simulação perde de lavada é
 * inquestionavelmente injusta; uma que ela ganha raspando é jogável.
 */

/** PRNG determinístico (mulberry32) — mesma semente, mesma batalha, sempre. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Combatente = {
  stats: BaseStats
  skills: SkillDef[]
  /**
   * Desconto de custo de energia vindo de traço passivo. Opcional para os
   * casos sintéticos, mas necessário para medir personagem com traço: sem
   * isto o simulador diria que os Seis Olhos não mudam nada, quando na
   * batalha real eles mudam.
   */
  energyCostModifier?: number
  /** Nível do combatente: decide o custo das habilidades (ver energyCostFor). Ausente vale 1. */
  nivel?: number
  /** Formas disponíveis. A IA decide quando liberar, como na batalha de verdade. */
  formas?: Record<string, TransformationDef>
}

export type ResultadoSimulacao = {
  outcome: Outcome
  rodadas: number
  hpJogador: number
  hpInimigo: number
}

export function simulateBattle(jogador: Combatente, inimigo: Combatente, seed: number): ResultadoSimulacao {
  const rand = seededRandom(seed)
  let state = createInitialState(
    jogador.stats,
    inimigo.stats,
    { player: jogador.energyCostModifier ?? 0, enemy: inimigo.energyCostModifier ?? 0 },
    { player: jogador.nivel ?? 1, enemy: inimigo.nivel ?? 1 }
  )
  const formasJogador = jogador.formas ?? {}
  const formasInimigo = inimigo.formas ?? {}

  const jogadorPorId = Object.fromEntries(jogador.skills.map((s) => [s.id, s]))
  const inimigoPorId = Object.fromEntries(inimigo.skills.map((s) => [s.id, s]))

  let rodadas = 0
  while (state.outcome === null && rodadas < MAX_ROUNDS) {
    // Os dois lados decidem pela mesma função da batalha de verdade — com o
    // campo de invocações de cada um e o alvo sorteado entre quem está de pé
    // do outro lado, como rodadaContraIa faz. Sem invocação em campo os dois
    // lados têm um só lutador, alvoDaIa não sorteia nada e a simulação sai
    // igual à de antes.
    const comAlvo = (acao: ReturnType<typeof acaoDaIa>, alvo: number | undefined) =>
      acao.kind === 'ATTACK' && alvo !== undefined ? { ...acao, alvo } : acao
    const alvoDoJogador = alvoDaIa(state.inimigos, rand)
    const alvoDoInimigo = alvoDaIa(state.aliados, rand)
    const r = resolveRound(
      state,
      {
        aliadas: [
          comAlvo(
            acaoDaIa(heroi(state), jogador.skills, vilao(state), formasJogador, {
              skillsDoOponente: inimigo.skills,
              rand,
              campo: invocacoesEmCampo(state.aliados, 0),
            }),
            alvoDoJogador
          ),
        ],
        inimigas: [
          comAlvo(
            acaoDaIa(vilao(state), inimigo.skills, heroi(state), formasInimigo, {
              skillsDoOponente: jogador.skills,
              rand,
              campo: invocacoesEmCampo(state.inimigos, 0),
            }),
            alvoDoInimigo
          ),
        ],
      },
      {
        playerSkills: jogadorPorId,
        enemySkills: inimigoPorId,
        playerTransformations: formasJogador,
        enemyTransformations: formasInimigo,
      },
      rand
    )
    state = r.state
    rodadas += 1
  }

  // Mesmo desempate por HP que persistRound aplica ao estourar MAX_ROUNDS.
  let outcome = state.outcome
  if (outcome === null) {
    const pj = heroi(state).currentHp / heroi(state).maxHp
    const pi = vilao(state).currentHp / vilao(state).maxHp
    outcome = Math.abs(pj - pi) < 0.001 ? 'DRAW' : pj > pi ? 'PLAYER_WIN' : 'ENEMY_WIN'
  }

  return { outcome, rodadas, hpJogador: heroi(state).currentHp, hpInimigo: vilao(state).currentHp }
}

/** Fração de vitórias do jogador em `amostras` batalhas de sementes distintas. */
export function winRate(jogador: Combatente, inimigo: Combatente, amostras = 200): number {
  let vitorias = 0
  for (let s = 0; s < amostras; s++) {
    if (simulateBattle(jogador, inimigo, s + 1).outcome === 'PLAYER_WIN') vitorias += 1
  }
  return vitorias / amostras
}

/** Média de rodadas até o fim — mede se a luta é longa demais ou rápida demais. */
export function mediaRodadas(jogador: Combatente, inimigo: Combatente, amostras = 200): number {
  let total = 0
  for (let s = 0; s < amostras; s++) total += simulateBattle(jogador, inimigo, s + 1).rodadas
  return total / amostras
}
