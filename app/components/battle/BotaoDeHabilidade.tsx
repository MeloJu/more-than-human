'use client'

import { useFormStatus } from 'react-dom'
import { custaStamina, energyCostFor } from '@/app/lib/battle/engine'
import { descreverEfeitosDaHabilidade } from '@/app/lib/battle/presentation'
import { IconeDeHabilidade } from './IconeDeHabilidade'
import type { CombatantState, SkillDef } from '@/app/lib/battle/types'

/**
 * Botão de usar uma habilidade na batalha.
 *
 * Três coisas que faltavam:
 *
 * 1. RETORNO AO CLICAR. A rodada é resolvida no servidor, então entre o clique
 *    e a tela nova havia um silêncio em que nada indicava que algo estava
 *    acontecendo. useFormStatus dá o estado real do envio — não é uma
 *    animação decorativa, é a requisição de fato em curso.
 *
 * 2. DE QUAL BARRA sai o custo. Habilidade puramente defensiva é paga com
 *    stamina, e sem a cor separando as duas a reserva defensiva era invisível.
 *
 * 3. O MOTIVO de estar indisponível. Antes o botão só ficava apagado, e "em
 *    recarga" e "sem energia" pediam decisões opostas: uma se resolve
 *    esperando, a outra não.
 */
export function BotaoDeHabilidade({ skill, combatente }: { skill: SkillDef; combatente: CombatantState }) {
  const daStamina = custaStamina(skill)
  const custo = energyCostFor(combatente, skill.energyCost)
  const recargaRestante = combatente.cooldowns[skill.id] ?? 0
  const reserva = daStamina ? combatente.currentStamina ?? 0 : combatente.currentEnergy

  const motivo =
    recargaRestante > 0
      ? `${recargaRestante} ${recargaRestante === 1 ? 'rodada' : 'rodadas'} de recarga`
      : reserva < custo
        ? `sem ${daStamina ? 'stamina' : 'energia'}`
        : null

  return <Interior skill={skill} custo={custo} daStamina={daStamina} motivo={motivo} />
}

function Interior({
  skill,
  custo,
  daStamina,
  motivo,
}: {
  skill: SkillDef
  custo: number
  daStamina: boolean
  motivo: string | null
}) {
  // useFormStatus enxerga só o <form> ancestral, então precisa viver num filho.
  const { pending } = useFormStatus()
  const bloqueado = motivo !== null

  return (
    <button
      type="submit"
      disabled={bloqueado || pending}
      className={`w-full h-full rounded-md px-3 py-2 text-sm border text-left transition-all ${
        bloqueado
          ? 'border-border opacity-40 cursor-not-allowed'
          : 'border-border hover:bg-surface-raised hover:border-accent/50'
      } ${pending ? 'scale-[0.97] border-accent bg-accent/10' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        {/* O ícone vem do que a habilidade FAZ, não de arte por golpe — ver
            IconeDeHabilidade para por que raspar frame de anime não funciona
            para 620 habilidades. `currentColor` o deixa herdar a cor do
            botão, inclusive quando ele está apagado por indisponibilidade. */}
        <span className="flex items-center gap-1.5 min-w-0">
          <IconeDeHabilidade
            nome={skill.name}
            efeitos={skill.effects}
            tags={skill.tags}
            categoria={skill.category}
            size={16}
            className="shrink-0 opacity-70 self-center"
          />
          <span className="font-medium truncate">{skill.name}</span>
        </span>
        <span className={`text-xs shrink-0 tabular-nums ${daStamina ? 'text-amber-600 dark:text-amber-400' : 'text-spirit'}`}>
          {custo} {daStamina ? 'ST' : 'EN'}
        </span>
      </div>

      {/* Na batalha a precisão é decisão, não referência: é o que separa
          "aposto no golpe grande" de "garanto o médio". Sem ela na tela, o
          jogador só descobre que o golpe podia errar quando erra. */}
      {(skill.precision ?? 100) < 100 && (
        <div className="text-xs mt-0.5 text-amber-600 dark:text-amber-400">{skill.precision}% de precisão</div>
      )}

      {skill.effects.length > 0 && (
        <div className="text-xs opacity-60 mt-0.5">{descreverEfeitosDaHabilidade(skill).join(' · ')}</div>
      )}

      {motivo && <div className="text-xs opacity-70 mt-0.5">{motivo}</div>}
      {pending && <div className="text-xs text-accent mt-0.5">resolvendo…</div>}
    </button>
  )
}
