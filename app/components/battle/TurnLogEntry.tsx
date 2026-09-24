import { describeEffect } from '@/app/lib/battle/presentation'
import type { TurnResult } from '@/app/lib/battle/types'

const NATUREZA_DO_CHOQUE: Record<string, string> = {
  beam: 'feixes',
  espada: 'aços',
  fisico: 'punhos',
  hado: 'encantamentos',
  cero: 'ceros',
}

/**
 * Como o golpe é narrado, por intensidade.
 *
 * POR QUE ISSO EXISTE: o log inteiro era "Fulano usou X e causou 7 de dano." e
 * "Fulano usou X e causou 68 de dano." — a mesma frase, com o número trocado.
 * Numa luta de doze rodadas isso vira uma coluna de texto idêntico em que a
 * única informação está num algarismo, e ler o combate exige comparar números
 * de cabeça em vez de simplesmente ler.
 *
 * A intensidade vem do MOTOR (campo `severidade`), calculada sobre a vida
 * máxima do alvo. Tem que ser assim: 30 de dano é um arranhão num tanque de
 * 250 e quase um terço de um conjurador de 110, e a mesma frase para os dois
 * seria mentira.
 *
 * É DETERMINÍSTICO de propósito — nada de sortear sinônimo. O histórico é
 * renderizado no servidor a cada visita, e um verbo sorteado mudaria o texto
 * de um turno que já aconteceu toda vez que a página recarregasse.
 */
const VERBO: Record<NonNullable<TurnResult['severidade']>, string> = {
  raspao: 'raspou em',
  solido: 'acertou',
  pesado: 'acertou em cheio',
  devastador: 'arrebentou',
}

const VERBO_CRITICO: Record<NonNullable<TurnResult['severidade']>, string> = {
  raspao: 'achou a brecha e raspou em',
  solido: 'encontrou a abertura e acertou',
  pesado: 'achou o ponto exato e acertou em cheio',
  devastador: 'não deu chance e arrebentou',
}

/**
 * Fala de personagem ao usar a skill — lida de Skill.fala. Existe porque
 * Deadpool e Patolino pedem isso: a graça do kit deles está na frase, não só
 * no efeito. Opcional e silencioso pra quem não tem.
 *
 * Vinha de Skill.description até a descrição virar a EXPLICAÇÃO do tooltip
 * das ações; os dois papéis não cabem no mesmo texto, e a fala ganhou coluna
 * própria. Ver a migração 20260924120000_fala_da_habilidade.
 */
export function TurnLogEntry({
  turn,
  playerName,
  enemyName,
  falas,
}: {
  turn: TurnResult
  playerName: string
  enemyName: string
  falas?: Record<string, string>
}) {
  const actorName = turn.side === 'PLAYER' ? playerName : enemyName
  const alvoName = turn.side === 'PLAYER' ? enemyName : playerName

  if (turn.kind === 'TRANSFORM') {
    return (
      <>
        <span className="font-medium">{actorName}</span> se transformou em <span className="font-medium">{turn.skillName}</span>.
      </>
    )
  }
  if (turn.kind === 'CLASH') {
    // O choque é simultâneo, então não tem "ator": o vencedor é quem venceu, e
    // no empate ninguém venceu. Narrar como se alguém tivesse agido primeiro
    // contradiria a mecânica.
    const natureza = NATUREZA_DO_CHOQUE[turn.clashTag ?? ''] ?? 'golpes'
    if (turn.skillName === 'Choque equilibrado') {
      return (
        <>
          Os {natureza} se encontram e se anulam — <span className="font-medium">ninguém passa</span>.
        </>
      )
    }
    return (
      <>
        Os {natureza} se chocam, e <span className="font-medium">{actorName}</span> vence a disputa.
      </>
    )
  }
  if (turn.kind === 'DOMAIN_OPEN') {
    return (
      <>
        <span className="font-medium">{actorName}</span> expandiu{' '}
        <span className="font-medium">{turn.skillName}</span>. Dentro do domínio, os golpes dele acertam.
      </>
    )
  }
  if (turn.kind === 'DOMAIN_CLASH') {
    if (turn.skillName === 'Domínios anulados') {
      return (
        <>
          Os dois domínios se encontram e <span className="font-medium">colapsam juntos</span>.
        </>
      )
    }
    return (
      <>
        Domínio contra domínio: o de <span className="font-medium">{actorName}</span> prevalece, e o outro desaba.
      </>
    )
  }
  if (turn.kind === 'DOMAIN_FALL') {
    return (
      <>
        <span className="font-medium">{turn.skillName}</span> se fechou —{' '}
        <span className="font-medium">{actorName}</span> não tinha energia para sustentar.
      </>
    )
  }
  if (turn.kind === 'BLOCK') {
    return (
      <>
        <span className="font-medium">{actorName}</span> firmou a guarda
        {typeof turn.guardaGasta === 'number' && turn.guardaGasta > 0 && (
          <span className="opacity-60"> (−{turn.guardaGasta} de stamina)</span>
        )}
        .
      </>
    )
  }
  if (turn.kind === 'GUARD_BREAK') {
    // O ator aqui é quem TEVE a guarda quebrada, não quem quebrou: o evento
    // pertence a quem sofre a consequência, que é perder a rodada seguinte.
    return (
      <>
        <span className="font-medium text-amber-600 dark:text-amber-400">A guarda de {actorName} se partiu</span> sob{' '}
        <span className="font-medium">{turn.skillName}</span> — o golpe entrou inteiro e ele perde a próxima rodada.
      </>
    )
  }
  if (turn.kind === 'REVIVE') {
    return (
      <>
        <span className="font-medium text-green-600 dark:text-green-400">{turn.skillName}</span> volta à luta
        {typeof turn.vidaDeVolta === 'number' && <> com {turn.vidaDeVolta} de vida</>}.
      </>
    )
  }
  if (turn.kind === 'STUNNED') {
    return (
      <>
        <span className="font-medium">{actorName}</span> estava atordoado e perdeu a vez.
      </>
    )
  }
  if (turn.kind === 'DOT_TICK') {
    return (
      <>
        <span className="font-medium">{actorName}</span> sofreu {turn.damage} de dano de <span className="font-medium">{turn.skillName}</span>.
      </>
    )
  }

  // ATTACK ou SUPPORT.
  const acertou = typeof turn.damage === 'number' && turn.damage > 0 && !turn.countered
  const verbo = turn.severidade ? (turn.isCrit ? VERBO_CRITICO : VERBO)[turn.severidade] : 'acertou'
  const fala = falas?.[turn.skillName]

  return (
    <>
      <span className="font-medium">{actorName}</span> usou <span className="font-medium">{turn.skillName}</span>
      {turn.errou && <> e o golpe passou longe</>}
      {turn.countered && (
        <>, mas foi contra-atacado{typeof turn.reflectedDamage === 'number' ? ` e sofreu ${turn.reflectedDamage} de dano refletido` : ''}</>
      )}
      {acertou && (
        <>
          {' '}
          e <span className={turn.isCrit ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>{verbo}</span>{' '}
          {alvoName} — <span className="tabular-nums">{turn.damage}</span> de dano
          {turn.isCrit && <span className="text-amber-600 dark:text-amber-400"> (CRÍTICO)</span>}
          {/* Bloqueado e ignorando-a-defesa são os dois extremos do mesmo eixo,
              e os dois precisam aparecer: sem eles, o mesmo número de dano
              conta histórias diferentes sem avisar qual. */}
          {turn.bloqueado && (
            <span className="opacity-70">
              , aparado pela guarda
              {typeof turn.guardaGasta === 'number' && turn.guardaGasta > 0 && ` (−${turn.guardaGasta} de stamina)`}
            </span>
          )}
          {turn.acertoGarantido && <span className="opacity-70">, ignorando a defesa</span>}
        </>
      )}
      {typeof turn.healed === 'number' && turn.healed > 0 && <> e recuperou {turn.healed} de vida</>}
      {turn.effectsApplied && turn.effectsApplied.length > 0 && (
        <> <span className="opacity-70">({turn.effectsApplied.map(describeEffect).join(', ')})</span></>
      )}
      .
      {fala && <div className="italic opacity-70 text-xs mt-0.5">&ldquo;{fala}&rdquo;</div>}
    </>
  )
}
