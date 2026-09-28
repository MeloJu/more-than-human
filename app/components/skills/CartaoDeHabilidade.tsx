import { descreverEfeitosDaHabilidade } from '@/app/lib/battle/presentation'
import { custaStamina } from '@/app/lib/battle/engine'
import type { ScalingStat, SkillDef } from '@/app/lib/battle/types'

const ESCALA_LABEL: Record<ScalingStat, string> = {
  attack: 'Ataque',
  defense: 'Defesa',
  speed: 'Velocidade',
  energy: 'Energia',
}

export const CATEGORIA_LABEL: Record<string, string> = {
  NINJUTSU: 'Ninjutsu',
  GENJUTSU: 'Genjutsu',
  TAIJUTSU: 'Taijutsu',
  HADO: 'Hadō',
  BAKUDO: 'Bakudō',
  KIDO: 'Kidō',
  KI: 'Ki',
  OTHER: 'Técnica',
}

/**
 * Cartão de uma habilidade, com tudo que decide se vale usá-la.
 *
 * O que se via antes, na batalha, era só o nome, o custo de energia e os
 * efeitos. Faltavam três coisas, e duas delas são mecânicas que existem e o
 * jogador não tinha como perceber:
 *
 * - de QUAL BARRA sai o custo. Habilidade puramente defensiva é paga com
 *   stamina, e sem dizer isso a reserva defensiva era invisível;
 * - de QUAL ATRIBUTO ela escala. Kidō escala de energia e taijutsu de ataque,
 *   e é isso que faz um build híbrido significar alguma coisa;
 * - o poder e o cooldown, que decidem a rotação.
 *
 * O ícone tem lugar reservado e cai numa inicial enquanto não existe arte —
 * o mesmo tratamento do retrato de personagem sem imagem.
 */
export function CartaoDeHabilidade({
  skill,
  categoria,
  icone,
  requiredLevel,
}: {
  skill: SkillDef
  categoria?: string
  icone?: string | null
  requiredLevel?: number
}) {
  const daStamina = custaStamina(skill)

  return (
    <div className="rounded-md border border-border p-3 flex gap-3 h-full">
      <div
        className="h-9 w-9 shrink-0 rounded-md bg-background-alt grid place-content-center text-base select-none"
        aria-hidden
      >
        {icone || skill.name.charAt(0)}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium leading-tight">{skill.name}</span>
          {requiredLevel !== undefined && requiredLevel > 1 && (
            <span className="text-xs opacity-50 shrink-0">nv {requiredLevel}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {skill.power > 0 && (
            <span>
              <span className="opacity-60">Poder </span>
              <span className="font-medium tabular-nums">{skill.power}</span>
            </span>
          )}
          {/* Custo do NÍVEL 1: na luta ele cresce com o nível, junto com a
              reserva (ver energyCostFor). O title diz isso a quem passar o
              mouse, sem poluir o cartão. */}
          <span
            className={daStamina ? 'text-amber-600 dark:text-amber-400' : 'text-spirit'}
            title="Custo no nível 1. Cresce com o nível, na mesma proporção da reserva."
          >
            <span className="opacity-70">{daStamina ? 'Stamina ' : 'Energia '}</span>
            <span className="font-medium tabular-nums">{skill.energyCost}</span>
          </span>
          {skill.cooldown > 0 && (
            <span>
              <span className="opacity-60">Recarga </span>
              <span className="font-medium tabular-nums">{skill.cooldown}</span>
            </span>
          )}
          {/* Só aparece quando é MENOR que 100. Escrever "100% de precisão" em
              quase todo cartão seria ruído: a informação útil é justamente a
              habilidade que pode falhar, e ela precisa se destacar. */}
          {(skill.precision ?? 100) < 100 && (
            <span className="text-amber-600 dark:text-amber-400">
              <span className="opacity-70">Precisão </span>
              <span className="font-medium tabular-nums">{skill.precision}%</span>
            </span>
          )}
          {skill.power > 0 && (
            <span className="opacity-60">escala de {ESCALA_LABEL[skill.scalingStat]}</span>
          )}
        </div>

        {skill.effects.length > 0 && (
          <div className="text-xs opacity-70">{descreverEfeitosDaHabilidade(skill).join(' · ')}</div>
        )}

        {categoria && (
          <div className="text-[0.68rem] uppercase tracking-wide opacity-40">
            {CATEGORIA_LABEL[categoria] ?? categoria}
          </div>
        )}
      </div>
    </div>
  )
}
