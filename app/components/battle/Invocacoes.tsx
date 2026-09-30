import { Heart } from 'lucide-react'
import { PainelChanfrado, chanfro } from './Moldura'
import { StatBar } from './StatBar'
import { StatusBadges } from './StatusBadges'
import { defDeInvocacao, emCampo, invocacaoDoGolpe, type DefDeInvocacao } from '@/app/lib/battle/invocacoes'
import type { CombatantState, SkillDef } from '@/app/lib/battle/types'

/**
 * Os grupos de invocação de um dono: os que o kit dele chama e os que já
 * estiveram em campo. O kit sozinho não basta para o inimigo, cujo arsenal a
 * tela não carrega; o campo sozinho esconderia as orbes até a primeira
 * chamada, que é justo quando o jogador quer saber quantas cabem.
 */
export function gruposDoDono(time: CombatantState[], dono: number, skills: SkillDef[] = []): DefDeInvocacao[] {
  const porGrupo = new Map<string, DefDeInvocacao>()
  for (const s of skills) {
    const def = invocacaoDoGolpe(s)?.def
    if (def && !porGrupo.has(def.grupo)) porGrupo.set(def.grupo, def)
  }
  for (const c of time) {
    if (c.invocacao?.dono !== dono) continue
    const def = defDeInvocacao(c.invocacao.def)
    if (def && !porGrupo.has(def.grupo)) porGrupo.set(def.grupo, def)
  }
  return [...porGrupo.values()]
}

/**
 * As orbes: quantas invocações de cada grupo o dono tem em campo, do teto
 * que cabe. Acesa é uma em campo; apagada, uma vaga. Na cor e com o kanji de
 * cada grupo — as maldições do Geto são roxas (呪), o dragão é celeste (竜).
 *
 * Existem para a decisão da rodada: chamar mais uma ou soltar o Uzumaki
 * depende de quantas já estão ali, e contar faixas na tela é lento.
 */
export function OrbesDeInvocacao({ grupos, time, dono }: { grupos: DefDeInvocacao[]; time: CombatantState[]; dono: number }) {
  if (grupos.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {grupos.map((def) => {
        // Cada orbe acesa na cor de QUEM está em campo: no grupo das sombras
        // do Jin-Woo, Igris é vermelho e Beru é verde-água.
        const emCampoDoGrupo = time
          .filter((c) => c.invocacao?.dono === dono && emCampo(c) && defDeInvocacao(c.invocacao.def)?.grupo === def.grupo)
          .map((c) => defDeInvocacao(c.invocacao?.def ?? '') ?? def)
        const acesas = emCampoDoGrupo.length
        const rotulo = `${def.nomeDoGrupo ?? def.nome}: ${acesas} de ${def.limiteDoGrupo} em campo`
        // O kanji do grupo é o de quem está em campo agora (o 象 do Max
        // Elephant, não o 輪 do Mahoraga que só está no kit).
        const marca = emCampoDoGrupo[0] ?? def
        return (
          <span key={def.grupo} className="inline-flex items-center gap-1.5" title={rotulo} aria-label={rotulo} role="img">
            <span aria-hidden className="font-kanji text-sm leading-none" style={{ color: marca.cor, textShadow: `0 0 8px ${marca.cor}` }}>
              {marca.marca}
            </span>
            {Array.from({ length: def.limiteDoGrupo }, (_, i) => {
              const acesa = i < acesas
              const cor = emCampoDoGrupo[i]?.cor ?? def.cor
              return (
                <span
                  key={i}
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full transition-all duration-300"
                  style={
                    acesa
                      ? {
                          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${cor} 45%, color-mix(in srgb, ${cor} 60%, #000) 100%)`,
                          boxShadow: `0 0 8px ${cor}`,
                        }
                      : { border: `1.5px solid color-mix(in srgb, ${def.cor} 55%, transparent)`, background: 'rgba(10,10,15,.6)' }
                  }
                />
              )
            })}
          </span>
        )
      })}
    </div>
  )
}

/**
 * Uma invocação em campo, em faixa curta: o kanji do grupo no lugar do
 * retrato, o nome, de quem ela é e a vida. Menor que a faixa de um aliado — ela
 * joga sozinha e some quando cai, então o que importa é quanto aguenta.
 */
export function FaixaDeInvocacao({ combatente, dono }: { combatente: CombatantState; dono: string }) {
  const def = combatente.invocacao ? defDeInvocacao(combatente.invocacao.def) : undefined
  if (!def) return null

  return (
    <PainelChanfrado cor={def.cor} tinta corte={8}>
      <div className="flex items-center gap-3 px-3 py-2">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center font-kanji text-xl"
          style={{
            clipPath: chanfro(6),
            color: '#fff',
            background: `radial-gradient(circle at 40% 35%, color-mix(in srgb, ${def.cor} 70%, #fff), color-mix(in srgb, ${def.cor} 55%, #0a0a0f))`,
            textShadow: `0 0 10px ${def.cor}`,
          }}
        >
          {def.marca}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{combatente.nome ?? def.nome}</span>
            <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wider text-muted">
              {def.guarda ? `guarda ${dono}` : `de ${dono}`}
            </span>
          </div>
          <StatBar
            label="HP"
            icone={<Heart className="h-3 w-3 fill-red-500 text-red-500" />}
            current={combatente.currentHp}
            max={combatente.maxHp}
            colorClass="bg-green-500"
            vida
          />
          {/* Só com efeito: a faixa já aparece e some com a invocação, então
              reservar a linha vazia (como a carta grande faz) só a engordaria. */}
          {combatente.statusEffects.length > 0 && <StatusBadges effects={combatente.statusEffects} />}
        </div>
      </div>
    </PainelChanfrado>
  )
}
