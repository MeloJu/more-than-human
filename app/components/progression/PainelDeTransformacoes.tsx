import type { Transformation, TransformationTrigger } from '@prisma/client'

/**
 * Como cada gatilho dispara, em palavras.
 *
 * É a informação que o jogador NUNCA teve. Só as de gatilho manual apareciam,
 * como botão dentro da batalha; as automáticas simplesmente aconteciam — ou
 * não — sem nada dizendo em que condição. Uma forma que liga sozinha aos 35%
 * de vida é estratégia se você sabe, e sorte se não sabe.
 */
const GATILHO: Record<TransformationTrigger, string> = {
  MANUAL: 'Você ativa quando quiser',
  LOW_HP: 'Dispara sozinha com a vida baixa',
  ON_DAMAGE_TAKEN: 'Dispara ao levar dano',
  ENERGY_CHARGE: 'Dispara com a energia cheia',
}

function pct(v: number): string | null {
  if (v === 0) return null
  const n = Math.round(v * 100)
  return `${n > 0 ? '+' : ''}${n}%`
}

export function PainelDeTransformacoes({
  transformacoes,
  nivel,
}: {
  transformacoes: Transformation[]
  nivel: number
}) {
  if (transformacoes.length === 0) {
    return <p className="text-sm opacity-60">Esse personagem ainda não tem transformações.</p>
  }

  return (
    <ul className="space-y-2">
      {transformacoes.map((t) => {
        const liberada = nivel >= t.levelRequirement
        const modificadores = [
          ['ATQ', pct(t.attackModifier)],
          ['DEF', pct(t.defenseModifier)],
          ['VEL', pct(t.speedModifier)],
          ['EN', pct(t.energyModifier)],
        ].filter((m): m is [string, string] => m[1] !== null)

        return (
          <li
            key={t.id}
            className={`rounded-md border border-border p-3 ${liberada ? '' : 'opacity-50'}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{t.name}</span>
              <span className="text-xs shrink-0 tabular-nums opacity-60">
                {liberada ? 'liberada' : `nível ${t.levelRequirement}`}
              </span>
            </div>

            <div className="text-xs opacity-70 mt-1">
              {GATILHO[t.triggerType]}
              {/* Se gasta ou não a rodada é a informação que mais muda como se
                  joga a forma: uma que não gasta pode ser liberada no meio da
                  troca, outra custa um turno inteiro apanhando. */}
              {t.consumesTurn ? ' · gasta a rodada' : ' · não gasta a rodada'}
              {(t.activationCost > 0 || t.activationStaminaCost > 0) &&
                ` · liberar custa ${[
                  t.activationCost > 0 ? `${t.activationCost} de energia` : null,
                  t.activationStaminaCost > 0 ? `${t.activationStaminaCost} de stamina` : null,
                ]
                  .filter(Boolean)
                  .join(' e ')}`}
            </div>

            {modificadores.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1.5 tabular-nums">
                {modificadores.map(([rotulo, valor]) => (
                  <span key={rotulo}>
                    <span className="opacity-55">{rotulo} </span>
                    <span className={valor.startsWith('-') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                      {valor}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {(t.drainPerTurn > 0 || t.drainStaminaPerTurn > 0 || t.drainHpPerTurn > 0) && (
              <div className="text-xs mt-1.5 text-amber-600 dark:text-amber-400">
                Custo por rodada:{' '}
                {[
                  t.drainPerTurn > 0 ? `${t.drainPerTurn} de energia` : null,
                  t.drainStaminaPerTurn > 0 ? `${t.drainStaminaPerTurn} de stamina` : null,
                  t.drainHpPerTurn > 0 ? `${t.drainHpPerTurn} de vida` : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
                {' — sem energia ou stamina para pagar, a forma cai'}
                {t.drainHpPerTurn > 0 && ', e ela cai antes de a vida te matar'}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
