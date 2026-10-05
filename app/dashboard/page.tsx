import Link from 'next/link'
import Image from 'next/image'
import { bonusDeAtributos } from '@/app/lib/progression/atributos'
import { requireUser } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { getDashboardUser, getEquippedSkillRows } from '@/app/lib/progression/queries'
import { getTreeBonus, toSkillDef } from '@/app/lib/battle/queries'
import { getEquipmentBonus, getEquippedBySlot, SLOT_ORDER, SLOT_LABEL } from '@/app/lib/equipment/queries'
import { getStoryChapters } from '@/app/lib/story/queries'
import { computeFighterStats, custaStamina, sumStatBonuses } from '@/app/lib/battle/engine'
import { XP_PER_LEVEL } from '@/app/lib/battle/constants'
import { VITORIAS_PAGAS_POR_DIA, recompensaDaVitoria, vitoriasContraIaHoje } from '@/app/lib/battle/recompensa'
import { raidPorSlug } from '@/app/lib/raid/catalogo'
import type { Reserva } from '@/app/lib/raid/andares'
import type { Contrato } from '@/app/lib/raid/montagem'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import { PainelChanfrado, TagDeCusto, TituloDeSecao } from '@/app/components/battle/Moldura'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'
import { DIAS_DA_SEQUENCIA, MOEDAS_DO_DIA, recompensaDoDia, situacaoDoResgate, venceuHoje } from '@/app/lib/login/diario'
import { resgatarRecompensaDiaria } from '@/app/lib/login/actions'
import { resolveErrorMessage } from '@/app/lib/error-messages'
import { missoesDeHoje } from '@/app/lib/missoes/queries'
import { resgatarMissao } from '@/app/lib/missoes/actions'
import { BONUS_DAS_TRES } from '@/app/lib/missoes/catalogo'

const ERROS_DA_CENTRAL: Record<string, string> = {
  ja_resgatado: 'A recompensa de hoje já foi resgatada. Volte amanhã.',
  sem_vitoria_hoje: 'Vença uma luta hoje, em qualquer modo, para resgatar a recompensa.',
  missao_invalida: 'Essa missão não é uma das de hoje.',
  missao_resgatada: 'Essa missão já foi resgatada.',
  missao_incompleta: 'Essa missão ainda não foi cumprida.',
}

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

/**
 * A Central: a primeira tela depois do login.
 *
 * Antes o dashboard repetia o que Status já mostra (atributos e um retrato de
 * 112px) e deixava a pergunta que importa sem resposta: o que eu faço agora?
 * Agora a tela é isso, em ordem de urgência — a raid parada no meio da torre,
 * o próximo estágio da história, as vitórias de treino que ainda pagam hoje —
 * e ao lado o personagem na mesma carta da luta. Desenho aprovado no canvas
 * "Telas de Entrada".
 *
 * UM BOTÃO PRINCIPAL: o da coisa mais urgente. Os outros são fantasma — ver a
 * regra 5 do sistema de design.
 */
export default async function CentralPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; resgatado?: string; bonus?: string }>
}) {
  const { error, resgatado, bonus } = await searchParams
  const errorMessage = resolveErrorMessage(ERROS_DA_CENTRAL, error, 'Não deu para resgatar agora.')
  const user = await requireUser()
  const data = await getDashboardUser(user.id)

  if (!data?.selectedCharacter) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <PainelChanfrado>
          <div className="p-8 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="kicker">Central</div>
              <h1 className="font-titulo italic font-extrabold uppercase text-3xl">Nenhum personagem selecionado</h1>
              <p className="text-muted">Escolha um dos seus personagens para continuar.</p>
            </div>
            <Link className="btn-primary px-4 py-2 text-sm" href="/select">
              Escolher personagem
            </Link>
          </div>
        </PainelChanfrado>
      </main>
    )
  }

  const uc = data.selectedCharacter
  const cor = uc.character.corDestaque ?? 'var(--accent)'

  const [treeBonus, equipmentBonus, capitulos, vitoriasHoje, incursao, equipadas, vestidos, conta, jaVenceuHoje, missoes] = await Promise.all([
    getTreeBonus(uc.id),
    getEquipmentBonus(uc.id),
    getStoryChapters(uc.id),
    vitoriasContraIaHoje(uc.id),
    prisma.raidRun.findFirst({
      where: { userCharacterId: uc.id, status: 'ATIVA' },
      include: { battles: { where: { status: 'ACTIVE' }, select: { id: true } } },
    }),
    getEquippedSkillRows(uc.id),
    getEquippedBySlot(uc.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { ultimoResgate: true, sequenciaDiaria: true } }),
    venceuHoje(user.id),
    missoesDeHoje(user.id),
  ])
  // Mesma composição usada em /status e no combate: o número da tela bate com
  // o da luta.
  const base = computeFighterStats(uc.character, uc.level, sumStatBonuses(treeBonus, equipmentBonus, bonusDeAtributos(uc)))
  const xpDoNivel = uc.level * XP_PER_LEVEL

  // A raid em andamento, com a party como está agora.
  const raid = incursao ? raidPorSlug(incursao.raid) : undefined
  const andar = raid && incursao ? raid.andares[incursao.andar] : undefined
  const contratados = (incursao?.contratados as unknown as Contrato[] | undefined) ?? []
  const reservas = (incursao?.reservas as unknown as Reserva[] | null) ?? null
  const nomesDosContratados = contratados.length
    ? await prisma.character.findMany({ where: { id: { in: contratados.map((c) => c.characterId) } }, select: { id: true, name: true } })
    : []
  const party = [uc.nickname, ...contratados.map((c) => nomesDosContratados.find((n) => n.id === c.characterId)?.name.split(' ')[0] ?? 'Aliado')]

  // O próximo estágio da história: o primeiro liberado e ainda não vencido.
  const capituloAtual = capitulos.find((c) => c.stages.some((s) => !s.completed && !s.locked))
  const proximoEstagio = capituloAtual?.stages.find((s) => !s.completed && !s.locked)

  const restamHoje = Math.max(0, VITORIAS_PAGAS_POR_DIA - vitoriasHoje)
  const premio = recompensaDaVitoria(uc.level)

  // Qual card leva o botão principal: o mais urgente.
  const urgente: 'raid' | 'historia' | 'treino' = incursao ? 'raid' : proximoEstagio ? 'historia' : 'treino'
  const principal = 'btn-primary px-5 py-2.5 text-sm'
  const fantasma = 'btn-ghost px-4 py-2.5 text-sm'

  // A recompensa diária: a sequência de 7 dias, liberada pela primeira
  // vitória do dia (ver app/lib/login/diario.ts).
  const diaria = situacaoDoResgate(conta.ultimoResgate, conta.sequenciaDiaria)
  const premioDoDia = recompensaDoDia(diaria.dia)
  const podeResgatar = !diaria.resgatadoHoje && jaVenceuHoje
  const diaResgatado = Number(resgatado)
  const acabouDeResgatar = Number.isInteger(diaResgatado) && diaResgatado >= 1 && diaResgatado <= DIAS_DA_SEQUENCIA
    ? recompensaDoDia(diaResgatado)
    : null

  const loadout = [...equipadas].sort((a, b) => a.slot - b.slot).map((r) => toSkillDef(r.skill))

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 lg:py-8">
      <div className="grid gap-7 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ===== O personagem ===== */}
        <div className="space-y-4">
          <PainelChanfrado cor={cor} brilho tinta espessura={2} className="h-[300px] lg:h-[560px]">
            <div className="relative h-full">
              <div className="absolute overflow-hidden bg-background-alt" style={{ inset: 2, clipPath: 'polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px)' }}>
                {uc.character.imageUrl ? (
                  <Image
                    src={uc.character.imageUrl}
                    alt={uc.character.name}
                    fill
                    className="object-cover"
                    style={{ objectPosition: FOCO[uc.character.imageUrl] ?? '50% 20%' }}
                    sizes="(max-width: 1024px) 100vw, 400px"
                    priority
                  />
                ) : (
                  <CharacterMonogram name={uc.character.name} />
                )}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(10,10,15,.94) 0%, rgba(10,10,15,.72) 30%, rgba(10,10,15,.25) 52%, transparent 66%), linear-gradient(to top, color-mix(in srgb, ${cor} 38%, transparent) 0%, transparent 45%)`,
                  }}
                />
              </div>
              <span
                className="absolute top-3 right-3 px-3 py-0.5 text-sm font-titulo italic font-bold text-background"
                style={{ background: cor, clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', boxShadow: `0 0 12px ${cor}` }}
              >
                Lv{uc.level}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="h-6 w-1 shrink-0" style={{ background: cor, boxShadow: `0 0 10px ${cor}` }} />
                  <h1
                    className="text-2xl font-bold tracking-tight leading-none"
                    style={{ textShadow: `0 0 18px color-mix(in srgb, ${cor} 75%, transparent), 0 2px 4px rgba(0,0,0,.9)` }}
                  >
                    {uc.nickname}
                  </h1>
                </div>
                <div className="text-sm text-zinc-300">{uc.character.name}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <span>Nível {uc.level + 1} em</span>
                    <span className="font-semibold tabular-nums">
                      {uc.experience} / {xpDoNivel} XP
                    </span>
                  </div>
                  <div className="h-[7px] bg-black/45">
                    <div className="h-full bg-accent" style={{ width: `${Math.min(100, (uc.experience / xpDoNivel) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uc.pointsAvailable > 0 && (
                    <Link
                      href="/status"
                      className="text-xs font-bold px-2.5 py-1 text-accent border border-accent/55 bg-background/60"
                      style={{ borderRadius: '2px 7px 2px 7px' }}
                    >
                      {uc.pointsAvailable} ponto{uc.pointsAvailable > 1 ? 's' : ''} para investir
                    </Link>
                  )}
                  <Link
                    href="/select"
                    className="text-xs font-semibold px-2.5 py-1 text-zinc-300 border border-white/20 bg-background/60 hover:border-accent"
                    style={{ borderRadius: '2px 7px 2px 7px' }}
                  >
                    Trocar de personagem
                  </Link>
                </div>
              </div>
            </div>
          </PainelChanfrado>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['Vida', base.hp, ''],
              ['ATQ', base.attack, ''],
              ['DEF', base.defense, ''],
              ['VEL', base.speed, ''],
              ['Energia', base.energy, 'text-spirit'],
              ['Stamina', base.stamina, 'text-amber-400'],
            ].map(([rotulo, valor, classe]) => (
              <div key={rotulo} className="card px-3 py-2 flex justify-between text-[13px]">
                <span className="text-muted">{rotulo}</span>
                <span className={`font-bold tabular-nums ${classe}`}>{valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== O que fazer agora ===== */}
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="kicker">Central</div>
              <h2 className="font-titulo italic font-extrabold uppercase text-4xl leading-none">Continue de onde parou</h2>
            </div>
            <span aria-hidden className="font-kanji text-4xl leading-none text-accent opacity-90 whitespace-nowrap shrink-0">本陣</span>
          </div>

          {incursao && raid && andar ? (
            <PainelChanfrado cor="#2d3ad2" brilho>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="kicker" style={{ color: '#93a0ff' }}>Raid em andamento</span>
                  <span className="text-xs font-semibold px-2 py-0.5 text-red-300 border border-red-500/50" style={{ borderRadius: '2px 6px 2px 6px' }}>
                    Andar {incursao.andar + 1} de {raid.andares.length}
                    {andar.chefe ? ' · chefe' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="font-titulo italic font-extrabold uppercase text-3xl leading-none">
                    {raid.nome} · {andar.nome}
                  </div>
                  <p className="text-sm text-muted">{andar.descricao}</p>
                </div>
                {reservas && (
                  <div className="flex flex-wrap gap-2">
                    {reservas.map((r, i) => (
                      <span key={i} className={`card-raised px-2.5 py-1 text-[13px] tabular-nums ${r.hp <= 0 ? 'opacity-50' : ''}`}>
                        {party[i]} · <span className={r.hp <= 0 ? 'text-red-400' : 'text-green-400'}>{r.hp <= 0 ? 'caído' : `${r.hp} HP`}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2.5">
                  <Link href={incursao.battles[0] ? `/battle/ai/${incursao.battles[0].id}` : '/battle/raid'} className={principal}>
                    {incursao.battles[0] ? 'Voltar à luta' : `Subir para o andar ${incursao.andar + 1}`}
                  </Link>
                  <Link href="/battle/raid" className={fantasma}>
                    Ver a torre
                  </Link>
                </div>
              </div>
            </PainelChanfrado>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <PainelChanfrado>
              <div className="p-5 space-y-3 h-full flex flex-col">
                <div className="kicker">{capituloAtual ? `História · ${capituloAtual.title}` : 'História'}</div>
                {proximoEstagio && capituloAtual ? (
                  <>
                    <div className="space-y-1">
                      <div className="text-lg font-bold">
                        {String(proximoEstagio.order).padStart(2, '0')} · {proximoEstagio.title}
                      </div>
                      <p className="text-sm text-muted">
                        Contra {proximoEstagio.enemyCharacter?.name ?? proximoEstagio.enemyMonster?.name ?? 'um adversário'}, nível{' '}
                        {proximoEstagio.enemyLevel}.
                      </p>
                    </div>
                    <div className="flex gap-1" aria-label={`${capituloAtual.completedCount} de ${capituloAtual.stages.length} estágios vencidos`}>
                      {capituloAtual.stages.map((s) => (
                        <span key={s.id} className={`h-1 flex-1 ${s.completed ? 'bg-accent' : s.id === proximoEstagio.id ? 'bg-accent/50' : 'bg-border'}`} />
                      ))}
                    </div>
                    <Link href={`/story/${proximoEstagio.id}`} className={`${urgente === 'historia' ? principal : fantasma} self-start mt-auto`}>
                      Jogar o estágio
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted">Todos os arcos liberados foram vencidos.</p>
                )}
              </div>
            </PainelChanfrado>

            <PainelChanfrado>
              <div className="p-5 space-y-3 h-full flex flex-col">
                <div className="kicker">Treino contra a IA</div>
                <div className="space-y-1">
                  <div className="text-lg font-bold">
                    {restamHoje > 0 ? (
                      <>
                        <span className="tabular-nums">{restamHoje}</span> vitória{restamHoje > 1 ? 's' : ''} paga{restamHoje > 1 ? 's' : ''} ainda hoje
                      </>
                    ) : (
                      'O pagamento de hoje acabou'
                    )}
                  </div>
                  <p className="text-sm text-muted">
                    {restamHoje > 0
                      ? `Cada uma rende ${premio.xp} XP e ${premio.moedas} moedas no nível ${uc.level}.`
                      : 'Dá para treinar de graça; o teto volta amanhã.'}
                  </p>
                </div>
                <div className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: VITORIAS_PAGAS_POR_DIA }, (_, i) => (
                    <span
                      key={i}
                      className={`h-5 w-5 ${i < vitoriasHoje ? 'border border-green-400/50 bg-green-400/15' : 'border border-dashed border-zinc-600'}`}
                      style={{ borderRadius: '2px 6px 2px 6px' }}
                    />
                  ))}
                </div>
                <Link href="/battle/ai" className={`${urgente === 'treino' ? principal : fantasma} self-start mt-auto`}>
                  Treinar agora
                </Link>
              </div>
            </PainelChanfrado>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
          )}

          <PainelChanfrado cor={podeResgatar ? '#f2c230' : undefined} brilho={podeResgatar}>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <div className="kicker">Recompensa diária</div>
                  <div className="text-lg font-bold">
                    {diaria.resgatadoHoje
                      ? `Dia ${diaria.dia} resgatado`
                      : `Dia ${diaria.dia}: ${premioDoDia.moedas} moedas${premioDoDia.pontos ? ' e 1 ponto de atributo' : ''}`}
                  </div>
                  <p className="text-sm text-muted">
                    {acabouDeResgatar && diaria.resgatadoHoje
                      ? `+${acabouDeResgatar.moedas} moedas${acabouDeResgatar.pontos ? ' e 1 ponto de atributo para ' + uc.nickname : ''}. Volte amanhã: o dia vira às 21h de Brasília.`
                      : diaria.resgatadoHoje
                        ? 'Volte amanhã para o próximo dia. O dia vira às 21h de Brasília (meia-noite UTC).'
                        : podeResgatar
                          ? 'Você já venceu hoje. Pode resgatar.'
                          : `Vença uma luta hoje, em qualquer modo, para resgatar.${diaria.feitos > 0 ? ` Sua sequência está em ${diaria.feitos} dia${diaria.feitos > 1 ? 's' : ''}; passar o dia sem resgatar zera.` : ''}`}
                  </p>
                </div>
                {podeResgatar && (
                  <form action={resgatarRecompensaDiaria}>
                    <button
                      type="submit"
                      className="px-4 py-2.5 text-sm font-bold border transition-all hover:brightness-125"
                      style={{ borderRadius: '2px 8px 2px 8px', borderColor: '#f2c230', color: '#f2c230', background: 'color-mix(in srgb, #f2c230 10%, transparent)' }}
                    >
                      Resgatar
                    </button>
                  </form>
                )}
              </div>
              <ol className="grid grid-cols-7 gap-1.5" aria-label={`Sequência: ${diaria.feitos} de ${DIAS_DA_SEQUENCIA} dias`}>
                {MOEDAS_DO_DIA.map((moedas, i) => {
                  const dia = i + 1
                  const feito = dia <= diaria.feitos
                  const proximo = !diaria.resgatadoHoje && dia === diaria.dia
                  return (
                    <li
                      key={dia}
                      className={`flex flex-col items-center gap-0.5 px-0.5 py-2 text-center border ${
                        feito
                          ? 'border-green-400/50 bg-green-400/10'
                          : proximo
                            ? 'border-[#f2c230]/70 bg-[#f2c230]/10'
                            : 'border-dashed border-zinc-600'
                      }`}
                      style={{ borderRadius: '2px 8px 2px 8px' }}
                      aria-current={proximo ? 'step' : undefined}
                    >
                      <span className="text-[11px] text-muted">Dia {dia}</span>
                      <span className={`text-sm font-bold tabular-nums ${feito ? 'text-green-300' : ''}`}>{feito ? '✓' : moedas}</span>
                      {dia === DIAS_DA_SEQUENCIA && <span className="text-[10px] leading-tight text-accent">+1 ponto</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          </PainelChanfrado>

          {/* As missões do dia (ver app/lib/missoes/catalogo.ts): três por
              conta, sorteadas pelo dia, medidas nas lutas de hoje. */}
          <PainelChanfrado>
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="kicker">Missões do dia</div>
                <span className="text-xs text-muted">
                  {missoes.todasResgatadas
                    ? `As três feitas: +${BONUS_DAS_TRES.quantidade} ${BONUS_DAS_TRES.nome}${bonus ? ' na mochila' : ''}.`
                    : `Complete as três: +${BONUS_DAS_TRES.quantidade} ${BONUS_DAS_TRES.nome}`}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {missoes.missoes.map((m) => (
                  <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5">
                    <div className="min-w-0 space-y-1.5">
                      <div className={`text-sm font-semibold ${m.resgatada ? 'text-muted line-through decoration-1' : ''}`}>{m.titulo}</div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-[5px] flex-1 max-w-[16rem] bg-black/45" aria-hidden>
                          <div className={`h-full ${m.completa ? 'bg-green-400' : 'bg-accent'}`} style={{ width: `${(m.feito / m.meta) * 100}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted">
                          {m.feito.toLocaleString('pt-BR')} / {m.meta.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    {m.resgatada ? (
                      <span className="text-xs font-semibold text-green-300">✓ +{m.moedas}</span>
                    ) : m.completa ? (
                      <form action={resgatarMissao.bind(null, m.id)}>
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-bold border transition-all hover:brightness-125"
                          style={{ borderRadius: '2px 8px 2px 8px', borderColor: '#f2c230', color: '#f2c230', background: 'color-mix(in srgb, #f2c230 10%, transparent)' }}
                        >
                          Resgatar +{m.moedas}
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs tabular-nums text-muted">+{m.moedas} moedas</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </PainelChanfrado>

          <div className="space-y-3">
            <TituloDeSecao direita={<Link href="/status" className="text-sm font-semibold text-accent">Trocar habilidades</Link>}>
              Leva para a luta
            </TituloDeSecao>
            {loadout.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {loadout.map((s) => (
                  <div key={s.id} className="px-3 py-2.5 border border-accent/40 bg-accent/5 space-y-1.5" style={{ borderRadius: '2px 10px 2px 10px' }}>
                    <div className="text-sm font-semibold leading-tight">{s.name}</div>
                    <TagDeCusto tipo={custaStamina(s) ? 'st' : 'en'}>
                      {s.energyCost} {custaStamina(s) ? 'ST' : 'EN'}
                    </TagDeCusto>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhuma habilidade equipada ainda.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SLOT_ORDER.map((slot) => {
                const item = vestidos.get(slot)
                return (
                  <Link
                    key={slot}
                    href="/equipment"
                    className={`px-3 py-2.5 flex justify-between gap-2 text-[13px] ${item ? 'card' : 'border border-dashed border-zinc-600'}`}
                    style={item ? undefined : { borderRadius: '2px 10px 2px 10px' }}
                  >
                    <span className="text-muted">{SLOT_LABEL[slot]}</span>
                    <span className={item ? 'font-semibold truncate' : 'text-zinc-500'}>{item ? item.equipment.name : 'vazio'}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
