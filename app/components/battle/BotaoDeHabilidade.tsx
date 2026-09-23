'use client'

import { useFormStatus } from 'react-dom'
import { custaStamina, energyCostFor } from '@/app/lib/battle/engine'
import { descreverEfeitosDaHabilidade } from '@/app/lib/battle/presentation'
import { IconeDeHabilidade } from './IconeDeHabilidade'
import { TagDeCusto } from './Moldura'
import type { CombatantState, SkillDef } from '@/app/lib/battle/types'

/**
 * Botão de usar uma habilidade na batalha, no estilo do mockup de referência:
 * ícone numa moldura à esquerda, nome, custo recortado no canto, e uma linha
 * curta do que o golpe faz.
 *
 * Três coisas que ele precisa dizer, e que um botão comum não dizia:
 *
 * 1. RETORNO AO CLICAR. A rodada é resolvida no servidor, então entre o clique
 *    e a tela nova havia um silêncio. useFormStatus dá o estado real do envio —
 *    não é animação decorativa, é a requisição de fato em curso.
 *
 * 2. DE QUAL BARRA sai o custo. Habilidade puramente defensiva é paga com
 *    stamina, e sem a cor separando as duas a reserva defensiva era invisível.
 *    Por isso a borda inteira de uma ação de stamina já vem âmbar.
 *
 * 3. O MOTIVO de estar indisponível. "Em recarga" e "sem energia" pedem
 *    decisões opostas: uma se resolve esperando, a outra não.
 *
 * O TOOLTIP explica o golpe inteiro — descrição, todos os efeitos, precisão,
 * recarga. Ele abre mesmo com a ação bloqueada: é justamente aí que o jogador
 * mais quer saber o que está perdendo. E ele NUNCA abre vazio: as habilidades
 * assinatura (Getsuga Tenshō, Mugetsu) ainda não têm `description` no banco,
 * e para essas o tooltip mostra os efeitos em vez de uma caixa em branco.
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
  const efeitos = skill.effects.length > 0 ? descreverEfeitosDaHabilidade(skill) : []
  const precisao = skill.precision ?? 100
  const resumo = efeitos.join(' · ')

  return (
    <button
      type="submit"
      disabled={bloqueado || pending}
      aria-describedby={`dica-${skill.id}`}
      className={`group relative w-full h-full min-h-[68px] px-3 py-2.5 text-left border bg-background/60 transition-all ${
        bloqueado ? 'opacity-45 cursor-not-allowed' : 'hover:bg-surface-raised'
      } ${pending ? 'scale-[0.97]' : ''}`}
      style={{
        borderRadius: '2px 10px 2px 10px',
        borderColor: pending
          ? 'var(--accent)'
          : daStamina
            ? 'color-mix(in srgb, #fbbf24 50%, var(--border))'
            : 'color-mix(in srgb, var(--spirit) 22%, var(--border))',
      }}
    >
      <div className="flex gap-3 items-center">
        <span
          className="shrink-0 grid place-items-center w-11 h-11 overflow-hidden bg-background"
          style={{
            border: '1px solid color-mix(in srgb, var(--foreground) 14%, transparent)',
            borderRadius: '3px',
            color: bloqueado ? 'var(--muted)' : daStamina ? '#fbbf24' : 'var(--foreground)',
          }}
        >
          <IconeDeHabilidade
            nome={skill.name}
            efeitos={skill.effects}
            tags={skill.tags}
            categoria={skill.category}
            size={22}
            tamanhoArte={44}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm leading-snug">{skill.name}</span>
            <TagDeCusto tipo={daStamina ? 'st' : 'en'}>
              {custo} {daStamina ? 'ST' : 'EN'}
            </TagDeCusto>
          </span>

          {/* Na batalha a precisão é decisão, não referência: é o que separa
              "aposto no golpe grande" de "garanto o médio". */}
          {precisao < 100 && <span className="block text-xs mt-0.5 text-amber-400">{precisao}% de precisão</span>}
          {resumo && <span className="block text-xs text-muted mt-0.5 truncate">{resumo}</span>}
          {motivo && <span className="block text-xs text-red-400/90 mt-0.5">{motivo}</span>}
          {pending && <span className="block text-xs text-accent mt-0.5">resolvendo…</span>}
        </span>
      </div>

      <Dica id={`dica-${skill.id}`} skill={skill} efeitos={efeitos} precisao={precisao} motivo={motivo} />
    </button>
  )
}

/**
 * O que aparece ao passar o mouse (ou focar pelo teclado).
 *
 * Fica ACIMA do botão, com `pointer-events-none`: não pode roubar o clique
 * do botão de cima, nem ficar preso aberto quando o cursor atravessa por ele.
 */
function Dica({
  id,
  skill,
  efeitos,
  precisao,
  motivo,
}: {
  id: string
  skill: SkillDef
  efeitos: string[]
  precisao: number
  motivo: string | null
}) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute left-0 right-0 bottom-[calc(100%+8px)] z-50 block px-3.5 py-3 text-left opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid color-mix(in srgb, var(--foreground) 16%, transparent)',
        borderRadius: '2px 10px 2px 10px',
        boxShadow: '0 16px 40px rgba(0,0,0,.7)',
      }}
    >
      <span className="block font-bold text-sm">{skill.name}</span>
      {skill.description && <span className="block text-xs text-foreground/80 leading-relaxed mt-1">{skill.description}</span>}

      {efeitos.length > 0 ? (
        <span className="flex flex-wrap gap-1.5 mt-2">
          {efeitos.map((e) => (
            <span key={e} className="text-[11px] px-1.5 py-0.5 bg-background/70 border border-border" style={{ borderRadius: 2 }}>
              {e}
            </span>
          ))}
        </span>
      ) : (
        !skill.description && <span className="block text-xs text-muted mt-1">Golpe direto, sem efeito adicional.</span>
      )}

      <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] text-muted tabular-nums">
        {skill.power > 0 && <span>Poder {skill.power}</span>}
        <span className={precisao < 100 ? 'text-amber-400' : undefined}>Precisão {precisao}%</span>
        {skill.cooldown > 0 && <span>Recarga {skill.cooldown}</span>}
      </span>

      {motivo && <span className="block text-xs font-semibold text-red-400 mt-1.5">Indisponível: {motivo}.</span>}
    </span>
  )
}

/**
 * O ataque básico, no mesmo formato das habilidades.
 *
 * Era um botão cru, desenhado na própria página, e por isso ficava de fora de
 * qualquer ajuste visual feito nas outras ações — a primeira da grade era a
 * única com outra cara. Aqui ele é só mais uma ação: sem custo, sem recarga,
 * sempre disponível.
 */
export function BotaoDeAtaqueBasico() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full h-full min-h-[68px] px-3 py-2.5 text-left border bg-background/60 hover:bg-surface-raised transition-all ${
        pending ? 'scale-[0.97]' : ''
      }`}
      style={{
        borderRadius: '2px 10px 2px 10px',
        borderColor: pending ? 'var(--accent)' : 'color-mix(in srgb, var(--foreground) 16%, var(--border))',
      }}
    >
      <div className="flex gap-3 items-center">
        <span
          className="shrink-0 grid place-items-center w-11 h-11 bg-background"
          style={{ border: '1px solid color-mix(in srgb, var(--foreground) 14%, transparent)', borderRadius: 3 }}
        >
          <IconeDeHabilidade efeitos={[]} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold text-sm leading-snug">Ataque Básico</span>
            <TagDeCusto tipo="livre">—</TagDeCusto>
          </span>
          <span className="block text-xs text-muted mt-0.5">{pending ? 'resolvendo…' : 'sem custo'}</span>
        </span>
      </div>
    </button>
  )
}
