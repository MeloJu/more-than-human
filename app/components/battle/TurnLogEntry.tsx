import { describeEffect } from '@/app/lib/battle/presentation'
import { defDeInvocacao } from '@/app/lib/battle/invocacoes'
import type { Postura, TurnResult } from '@/app/lib/battle/types'

/** Como a postura de quem agiu aparece no log — "usou Getsuga Tenshō em Ímpeto". */
const FRASE_DA_POSTURA: Record<Postura, string> = {
  NEUTRA: '',
  ESQUIVA: 'em esquiva',
  APARAR: 'pronto para aparar',
  GUARDA: 'em guarda',
  IMPETO: 'em Ímpeto',
}

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
  nomesAliados,
  nomesInimigos,
}: {
  turn: TurnResult
  playerName: string
  enemyName: string
  falas?: Record<string, string>
  /**
   * Os nomes da party, por posição (ver TurnResult.posicao). O índice 0 é
   * sempre playerName/enemyName; sem a lista, todo mundo de um lado leva o
   * nome do principal, que é o certo no 1x1.
   */
  nomesAliados?: string[]
  nomesInimigos?: string[]
}) {
  const nomeEm = (side: TurnResult['side'], posicao = 0) =>
    side === 'PLAYER'
      ? (posicao > 0 ? nomesAliados?.[posicao] : undefined) ?? playerName
      : (posicao > 0 ? nomesInimigos?.[posicao] : undefined) ?? enemyName
  const actorName = turn.nomeDoAtor ?? nomeEm(turn.side, turn.posicao)
  const alvoName = turn.nomeDoAlvo ?? nomeEm(turn.side === 'PLAYER' ? 'ENEMY' : 'PLAYER', turn.posicaoDoAlvo)

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
  if (turn.kind === 'ITEM') {
    const partes = [
      typeof turn.healed === 'number' && turn.healed > 0 ? `${turn.healed} de vida` : null,
      typeof turn.energiaRecuperada === 'number' && turn.energiaRecuperada > 0 ? `${turn.energiaRecuperada} de energia` : null,
    ].filter(Boolean)
    return (
      <>
        <span className="font-medium">{actorName}</span> bebeu <span className="font-medium text-green-500">{turn.skillName}</span>
        {partes.length > 0 ? <> e recuperou {partes.join(' e ')}</> : <>, mas já estava inteiro</>}.
      </>
    )
  }
  if (turn.kind === 'SUMMON') {
    const def = turn.invocacao ? defDeInvocacao(turn.invocacao) : undefined
    const cor = def?.cor
    if (turn.recolhida) {
      return (
        <>
          <span className="font-medium" style={{ color: cor }}>{turn.skillName}</span> voltou —{' '}
          <span className="font-medium">{actorName}</span> não tinha energia para mantê-la em campo.
        </>
      )
    }
    if (turn.evoluiu) {
      return (
        <>
          <span className="font-medium">{actorName}</span> usou <span className="font-medium">{turn.skillName}</span>:{' '}
          {turn.evoluiu} virou{' '}
          <span className="font-medium" style={{ color: cor }}>
            {def?.nome}
          </span>
          !
        </>
      )
    }
    if (turn.troca) {
      return (
        <>
          <span className="font-medium">{actorName}</span> trocou:{' '}
          {turn.substituida && <>{turn.substituida} volta para a pokébola, e </>}
          <span className="font-medium" style={{ color: cor }}>
            {def?.nome}
          </span>{' '}
          entra em campo.
        </>
      )
    }
    const quantas = turn.invocadas?.length ?? 0
    if (quantas === 0) {
      return (
        <>
          <span className="font-medium">{actorName}</span> usou <span className="font-medium">{turn.skillName}</span>, mas o campo
          já estava cheio.
        </>
      )
    }
    const nome = def?.nome ?? 'invocação'
    return (
      <>
        <span className="font-medium">{actorName}</span> usou <span className="font-medium">{turn.skillName}</span> e chamou{' '}
        <span className="font-medium" style={{ color: cor }}>
          {quantas > 1 ? `${quantas} × ${nome}` : nome}
        </span>{' '}
        para o campo{def?.guarda ? ', de guarda na frente dele' : ''}
        {turn.substituida && <span className="opacity-70"> — {turn.substituida} volta para a sombra</span>}.
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
  if (turn.kind === 'CHARGE') {
    if (turn.cargaPerdida) {
      return (
        <>
          <span className="font-medium">{actorName}</span> foi interrompido e perdeu a carga de{' '}
          <span className="font-medium">{turn.skillName}</span>.
        </>
      )
    }
    // A mira só aparece se foi declarada: sem ela, o golpe vai no primeiro
    // de pé, e dar um nome aqui seria prometer um alvo que não existe.
    return (
      <>
        <span className="font-medium">{actorName}</span> começou a carregar{' '}
        <span className="font-medium text-red-500">{turn.skillName}</span>
        {turn.posicaoDoAlvo !== undefined && (
          <>
            , mirando <span className="font-medium">{alvoName}</span>
          </>
        )}
        .
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
  // "Pikachu usou Pikachu: Choque do Trovão" repete o nome: o golpe de
  // Pokémon traz o dono no nome, e aqui quem age já é ele.
  const nomeDoGolpe = turn.skillName.startsWith(`${actorName}: `) ? turn.skillName.slice(actorName.length + 2) : turn.skillName
  const acertou = typeof turn.damage === 'number' && turn.damage > 0 && !turn.countered
  const verbo = turn.severidade ? (turn.isCrit ? VERBO_CRITICO : VERBO)[turn.severidade] : 'acertou'
  const fala = falas?.[turn.skillName]

  return (
    <>
      {turn.ordem && <span className="opacity-70">Por ordem de {nomeEm(turn.side, turn.donoDaOrdem)}, </span>}
      <span className="font-medium">{actorName}</span> {turn.carregado ? 'soltou' : 'usou'}{' '}
      <span className="font-medium">{nomeDoGolpe}</span>
      {turn.carregado && <span className="text-red-500"> carregado</span>}
      {typeof turn.consumidas === 'number' && turn.consumidas > 0 && (
        <span className="text-violet-400">
          {' '}
          consumindo {turn.consumidas === 1 ? 'uma maldição' : `${turn.consumidas} maldições`}
        </span>
      )}
      {turn.postura && <span className="opacity-70"> {FRASE_DA_POSTURA[turn.postura]}</span>}
      {turn.errou && (turn.esquivou ? <>, mas {alvoName} esquivou</> : <> e o golpe passou longe</>)}
      {turn.countered &&
        (turn.aparou ? (
          <>, mas {alvoName} aparou e revidou{typeof turn.reflectedDamage === 'number' ? ` — ${turn.reflectedDamage} de dano` : ''}</>
        ) : (
          <>, mas foi contra-atacado{typeof turn.reflectedDamage === 'number' ? ` e sofreu ${turn.reflectedDamage} de dano refletido` : ''}</>
        ))}
      {acertou && (
        <>
          {' '}
          e <span className={turn.isCrit ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>{verbo}</span>{' '}
          {alvoName} — <span className="tabular-nums">{turn.damage}</span> de dano
          {turn.isCrit && <span className="text-amber-600 dark:text-amber-400"> (CRÍTICO)</span>}
          {turn.emArea && <span className="opacity-70"> (em área)</span>}
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
          {turn.interceptou && <span className="opacity-70">, que se pôs na frente do dono</span>}
          {turn.adaptou && <span className="text-amber-400"> — a roda gira, e {alvoName} se adapta ao golpe</span>}
          {turn.abatido && <span className="font-medium text-red-500">, e {alvoName} caiu na hora</span>}
        </>
      )}
      {typeof turn.healed === 'number' && turn.healed > 0 && <> e recuperou {turn.healed} de vida</>}
      {turn.effectsApplied && turn.effectsApplied.length > 0 && (
        <> <span className="opacity-70">({turn.effectsApplied.map(describeEffect).join(', ')})</span></>
      )}
      .
      {turn.carregado && <span className="opacity-70"> {actorName} ficou exposto.</span>}
      {fala && <div className="italic opacity-70 text-xs mt-0.5">&ldquo;{fala}&rdquo;</div>}
    </>
  )
}
