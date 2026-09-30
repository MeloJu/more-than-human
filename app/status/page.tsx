import Link from 'next/link'
import { prisma } from '@/app/lib/prisma'
import { bonusDeAtributos } from '@/app/lib/progression/atributos'
import { requireUser } from '@/app/lib/session'
import { equipSkill, redistribuirAtributos, salvarTime, unequipSkill, unlockSkillNode } from '@/app/lib/progression/actions'
import { MontagemDoTime } from '@/app/components/progression/MontagemDoTime'
import { TAMANHO_DO_TIME, comandoDoGolpe, defDeInvocacao, pokemonDoKit, timeDoTreinador } from '@/app/lib/battle/invocacoes'
import { custoDaRedistribuicao, pontosAlocados } from '@/app/lib/progression/redistribuicao'
import { getLoadoutSlotCount } from '@/app/lib/progression/constants'
import { computeFighterStats, sumStatBonuses } from '@/app/lib/battle/engine'
import { getEquipmentBonus } from '@/app/lib/equipment/queries'
import { getEligiblePlayerSkills, getTreeBonus, toSkillDef } from '@/app/lib/battle/queries'
import { MontagemDoLoadout } from '@/app/components/progression/MontagemDoLoadout'
import { getEquippedSkillRows, getSelectedCharacter, getSkillTree, getUnlockedNodeIds } from '@/app/lib/progression/queries'
import { XP_PER_LEVEL } from '@/app/lib/battle/constants'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { PainelDeAtributos } from '@/app/components/progression/PainelDeAtributos'
import { PainelDeTransformacoes } from '@/app/components/progression/PainelDeTransformacoes'
import { AbasDaSecao } from '@/app/components/AbasDaSecao'
import { ABAS_DO_PERSONAGEM } from '@/app/lib/navegacao'

const STATUS_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Personagem não encontrado.',
  invalid_node: 'Nó inválido para esse personagem.',
  insufficient_points: 'Pontos insuficientes.',
  missing_prerequisite: 'Pré-requisito ainda não desbloqueado.',
  invalid_skill: 'Essa skill não está disponível pra equipar.',
  invalid_slot: 'Slot de loadout inválido.',
  invalid_attribute: 'Atributo inválido.',
  nothing_to_redistribute: 'Não há pontos investidos para redistribuir.',
  insufficient_coins: 'Moedas insuficientes para redistribuir.',
  time_invalido: 'Esse time não vale: escolha de 1 a 6 Pokémon que o seu nível já libera.',
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redistribuido?: string }>
}) {
  const { error, redistribuido } = await searchParams
  const errorMessage = resolveErrorMessage(STATUS_ERROR_MESSAGES, error, 'Ocorreu um erro.')

  const user = await requireUser()

  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Status</h1>
        <div className="card p-6 space-y-3">
          <p className="opacity-70">Você precisa selecionar um personagem primeiro.</p>
          <Link href="/select" className="btn-primary inline-block rounded-md px-4 py-2 text-sm">Selecionar Personagem</Link>
        </div>
      </main>
    )
  }

  const [nodes, unlockedIds, treeBonus, equipmentBonus, eligibleSkills, equippedRows] = await Promise.all([
    getSkillTree(selected.characterId),
    getUnlockedNodeIds(selected.id),
    getTreeBonus(selected.id),
    getEquipmentBonus(selected.id),
    getEligiblePlayerSkills(selected.id, selected.characterId, selected.level),
    getEquippedSkillRows(selected.id),
  ])
  // Todas, não só as liberadas: ver a forma que ainda falta é o que dá razão
  // para continuar subindo de nível.
  const transformacoes = await prisma.transformation.findMany({
    where: { characterId: selected.characterId },
    orderBy: { levelRequirement: 'asc' },
  })

  const conta = await prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } })
  const investidos = pontosAlocados(selected)
  const custoRedistribuir = custoDaRedistribuicao(selected.redistribuicoes)

  const effectiveStats = computeFighterStats(selected.character, selected.level, sumStatBonuses(treeBonus, equipmentBonus, bonusDeAtributos(selected)))
  const xpForNextLevel = selected.level * XP_PER_LEVEL
  const slotCount = getLoadoutSlotCount(selected.level)

  // TREINADOR (o Red): no lugar do loadout de golpes, o time. Todos os
  // Pokémon do kit aparecem, os trancados com o nível que libera.
  const ehTreinador = pokemonDoKit(Object.values(eligibleSkills)).length > 0
  const pokemonDoTreinador = ehTreinador
    ? await prisma.characterSkill
        .findMany({ where: { characterId: selected.characterId }, include: { skill: true } })
        .then((linhas) => {
          const porPokemon = new Map<string, { nivel: number; golpes: string[] }>()
          for (const l of linhas) {
            const id = comandoDoGolpe(toSkillDef(l.skill))
            const def = id ? defDeInvocacao(id) : undefined
            if (!def || def.evoluiDe) continue
            const atual = porPokemon.get(def.id) ?? { nivel: l.requiredLevel, golpes: [] }
            atual.nivel = Math.min(atual.nivel, l.requiredLevel)
            atual.golpes.push(l.skill.name.replace(`${def.nome}: `, ''))
            porPokemon.set(def.id, atual)
          }
          return [...porPokemon.entries()]
            .map(([id, p]) => {
              const def = defDeInvocacao(id)!
              return { id, nome: def.nome, cor: def.cor, marca: def.marca, nivel: p.nivel, liberado: p.nivel <= selected.level, golpes: p.golpes, ordem: def.ordemNoTime ?? 0 }
            })
            .sort((a, b) => a.ordem - b.ordem)
        })
    : []
  const timeAtual = ehTreinador ? timeDoTreinador(Object.values(eligibleSkills), selected.timeDeInvocacao) : []

  const equippedBySlot = new Map(equippedRows.map((r) => [r.slot, r]))
  const equippedSkillIds = new Set(equippedRows.map((r) => r.skillId))
  const unequippedEligible = Object.values(eligibleSkills).filter((s) => !equippedSkillIds.has(s.id))

  const nodesByTier = new Map<number, typeof nodes>()
  for (const node of nodes) {
    const list = nodesByTier.get(node.tier) ?? []
    list.push(node)
    nodesByTier.set(node.tier, list)
  }
  const tiers = Array.from(nodesByTier.keys()).sort((a, b) => a - b)

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <AbasDaSecao abas={ABAS_DO_PERSONAGEM} className="mb-6" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Status — {selected.nickname}</h1>
        <div className="text-sm opacity-70">
          Pontos disponíveis: <span className="font-semibold">{selected.pointsAvailable}</span>
        </div>
      </div>

      {redistribuido && !errorMessage && (
        <div className="rounded-md border border-green-600/40 bg-green-500/10 px-4 py-2 text-sm">
          Pontos devolvidos. Invista de novo abaixo.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}

      <div className="card p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold">Atributos</h2>
          {selected.pointsAvailable > 0 && (
            <span className="text-sm text-accent font-medium">
              {selected.pointsAvailable} ponto{selected.pointsAvailable > 1 ? 's' : ''} para investir
            </span>
          )}
        </div>
        <div className="text-sm opacity-70">
          Nível {selected.level} · EXP {selected.experience} / {xpForNextLevel}
        </div>
        <PainelDeAtributos
          stats={effectiveStats}
          pontosDisponiveis={selected.pointsAvailable}
          alocado={{
            hp: selected.allocHp,
            attack: selected.allocAttack,
            defense: selected.allocDefense,
            speed: selected.allocSpeed,
            energy: selected.allocEnergy,
            stamina: selected.allocStamina,
            accuracy: selected.allocAccuracy,
            agility: selected.allocAgility,
            intelligence: selected.allocIntelligence,
          }}
        />
        {selected.pointsAvailable === 0 && (
          <p className="text-xs opacity-50">Você ganha um ponto a cada nível. Passe de nível para investir.</p>
        )}

        {/* A confirmação é o próprio <details>: abrir já é o primeiro clique,
            e o botão de dentro é o segundo. A página não tem diálogo de
            confirmação, e redistribuir sem querer desfaz a build inteira. */}
        {investidos > 0 && (
          <details className="border-t border-border pt-3 text-sm">
            <summary className="cursor-pointer select-none opacity-80 hover:opacity-100">
              Redistribuir pontos ({investidos} investido{investidos > 1 ? 's' : ''})
            </summary>
            <div className="mt-2 space-y-2">
              <p className="opacity-70">
                Devolve todos os {investidos} pontos — os de nível e os de treino — para você investir de novo.{' '}
                {custoRedistribuir === 0
                  ? 'A primeira redistribuição deste personagem é de graça.'
                  : `Custa ${custoRedistribuir} moedas (você tem ${conta?.coins ?? 0}).`}
              </p>
              <form action={redistribuirAtributos}>
                <button
                  type="submit"
                  disabled={custoRedistribuir > (conta?.coins ?? 0)}
                  className="btn-primary rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {custoRedistribuir === 0 ? 'Confirmar redistribuição grátis' : `Confirmar por ${custoRedistribuir} moedas`}
                </button>
              </form>
            </div>
          </details>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h2 className="font-semibold">Transformações</h2>
        <PainelDeTransformacoes transformacoes={transformacoes} nivel={selected.level} />
      </div>

      {ehTreinador ? (
        <div className="card p-4">
          <MontagemDoTime
            pokemon={pokemonDoTreinador}
            escolhidos={timeAtual}
            tamanho={TAMANHO_DO_TIME}
            salvar={salvarTime.bind(null, selected.id)}
          />
        </div>
      ) : (
      <div className="card p-4">
        <MontagemDoLoadout
          espacos={slotCount}
          equipadas={Array.from({ length: slotCount }, (_, slot) => {
            const row = equippedBySlot.get(slot)
            // A ficha da lista de elegíveis vem marcada com a forma que a
            // habilidade exige; a linha crua do banco é só o fallback.
            return row ? eligibleSkills[row.skillId] ?? toSkillDef(row.skill) : null
          })}
          disponiveis={unequippedEligible}
          equipar={Array.from({ length: slotCount }, (_, slot) => equipSkill.bind(null, selected.id, slot))}
          tirar={Array.from({ length: slotCount }, (_, slot) => unequipSkill.bind(null, selected.id, slot))}
        />
      </div>
      )}

      {nodes.length === 0 && <div className="card p-6 opacity-70">Esse personagem ainda não tem árvore de habilidades.</div>}

      {tiers.map((tier) => (
        <div key={tier} className="card p-4 space-y-3">
          <h2 className="font-semibold">Tier {tier}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodesByTier.get(tier)!.map((node) => {
              const isUnlocked = unlockedIds.has(node.id)
              const prereqsMet = node.prerequisites.every((p) => unlockedIds.has(p.id))
              const canUnlock = !isUnlocked && prereqsMet && selected.pointsAvailable >= node.pointCost
              return (
                <div key={node.id} className={`rounded-md border p-3 ${isUnlocked ? 'border-accent/40 bg-accent/5' : 'border-border'}`}>
                  <div className="font-medium">{node.name}</div>
                  {node.description && <div className="text-xs opacity-70 mt-0.5">{node.description}</div>}
                  {node.skill && <div className="text-xs opacity-70 mt-0.5">Desbloqueia: {node.skill.name}</div>}
                  <div className="text-xs opacity-60 mt-1">Custo: {node.pointCost} ponto{node.pointCost !== 1 ? 's' : ''}</div>
                  {isUnlocked ? (
                    <div className="text-xs text-accent mt-2 font-medium">Desbloqueado</div>
                  ) : (
                    <form action={unlockSkillNode.bind(null, selected.id, node.id)} className="mt-2">
                      <button
                        type="submit"
                        disabled={!canUnlock}
                        className={`rounded-md px-3 py-1.5 text-xs border ${canUnlock ? 'border-border hover:bg-surface-raised' : 'border-border opacity-40 cursor-not-allowed'}`}
                      >
                        {prereqsMet ? 'Desbloquear' : 'Pré-requisito bloqueado'}
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </main>
  )
}
