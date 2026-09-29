import Link from 'next/link'
import Image from 'next/image'
import { Skull } from 'lucide-react'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { VAGAS_DE_CONTRATO, precoDoContrato } from '@/app/lib/battle/party'
import { SEM_BONUS, computeFighterStats } from '@/app/lib/battle/engine'
import { fichaDoJogador } from '@/app/lib/battle/montagem'
import { MercadoDeContratos } from '@/app/components/raid/MercadoDeContratos'
import { TorreDaRaid } from '@/app/components/raid/TorreDaRaid'
import { TituloDeSecao } from '@/app/components/battle/Moldura'
import { CharacterMonogram } from '@/app/components/CharacterImage'
import { RAIDS, raidPorSlug, type Raid } from '@/app/lib/raid/catalogo'
import { recompensaDaRaid, type Reserva } from '@/app/lib/raid/andares'
import { desistirDaRaid, entrarNaRaid, seguirNaRaid } from '@/app/lib/raid/actions'
import type { Contrato } from '@/app/lib/raid/montagem'
import FOCO_DOS_RETRATOS from '@/app/lib/battle/foco-dos-retratos.json'

const FOCO = FOCO_DOS_RETRATOS as Record<string, string>

/**
 * A raid: arcos em andares, com a party contratada no mercado.
 *
 * A torre fica à esquerda, de baixo para cima (ver TorreDaRaid). À direita,
 * durante a incursão, a party como ela vai entrar no próximo andar e o botão
 * de subir; antes dela, o mercado de contratos e o botão de entrar. Desenho
 * aprovado no canvas "Telas de Entrada".
 */
export default async function BattleRaidPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const errorMessage = battleErrorMessage(error)

  const user = await requireUser()
  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="font-titulo italic font-extrabold uppercase text-3xl mb-4">Raid</h1>
        <div className="card p-6 space-y-3">
          <p className="text-muted">Você precisa escolher um personagem antes de entrar na raid.</p>
          <Link href="/select" className="btn-primary inline-block px-4 py-2 text-sm">
            Escolher personagem
          </Link>
        </div>
      </main>
    )
  }

  const [incursao, lutaAntiga, conta] = await Promise.all([
    prisma.raidRun.findFirst({
      where: { userCharacterId: selected.id, status: 'ATIVA' },
      include: { battles: { where: { status: 'ACTIVE' }, select: { id: true } } },
    }),
    // Luta de raid do formato antigo (um monstro avulso) que ainda não
    // terminou. Continua jogável até o fim; só não se começa mais nenhuma.
    prisma.battle.findFirst({
      where: { userId: user.id, playerCharacterId: selected.id, status: 'ACTIVE', enemyMonsterId: { not: null }, raidRunId: null, storyStageId: null },
      select: { id: true },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
  ])

  const raid = (incursao && raidPorSlug(incursao.raid)) || RAIDS[0]
  const nomeDoChefe = raid.andares.map((a) => a.inimigos[0]).find((i) => i && 'personagem' in i)
  const chefe = nomeDoChefe && 'personagem' in nomeDoChefe
    ? await prisma.character.findFirst({ where: { name: nomeDoChefe.personagem }, select: { imageUrl: true } })
    : null

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="kicker">
            Raid · {raid.regiao} · {incursao ? 'em andamento' : `a partir do nível ${raid.nivelMinimo}`}
          </div>
          <h1 className="font-titulo italic font-extrabold uppercase text-5xl leading-none">{raid.nome}</h1>
        </div>
        <span aria-hidden className="font-kanji text-5xl leading-none text-accent opacity-90 whitespace-nowrap shrink-0">
          塔
        </span>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{errorMessage}</div>
      )}

      {lutaAntiga && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Você tem uma luta de raid do formato antigo em andamento.</p>
          <Link href={`/battle/ai/${lutaAntiga.id}`} className="btn-ghost px-4 py-2 text-sm">
            Terminar essa luta
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <TorreDaRaid raid={raid} andarAtual={incursao?.andar ?? 0} emAndamento={!!incursao} arteDoChefe={chefe?.imageUrl ?? null} />

        {/* No celular, durante a incursão, a party e o botão de subir vêm antes
            da torre: subir é a decisão da tela, e ela ficava lá no fim. */}
        <div className={`space-y-5 ${incursao ? 'order-first lg:order-none' : ''}`}>
          {incursao ? (
            <Incursao
              id={incursao.id}
              raid={raid}
              andar={incursao.andar}
              lutaEmCurso={incursao.battles[0]?.id}
              contratados={incursao.contratados as unknown as Contrato[]}
              reservas={incursao.reservas as unknown as Reserva[] | null}
              jogador={selected}
            />
          ) : selected.level >= raid.nivelMinimo ? (
            <Entrada raid={raid} selected={selected} moedas={conta?.coins ?? 0} />
          ) : (
            <div className="card p-5 space-y-2">
              <p className="font-semibold">Liberada no nível {raid.nivelMinimo}</p>
              <p className="text-sm text-muted">
                {selected.nickname} está no nível {selected.level}. Treine contra a IA e avance na história para chegar lá.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

type Selecionado = NonNullable<Awaited<ReturnType<typeof getSelectedCharacter>>>

/** Antes de começar: o mercado de contratos e o botão de entrar. */
async function Entrada({ raid, selected, moedas }: { raid: Raid; selected: Selecionado; moedas: number }) {
  const elenco = await prisma.character.findMany({
    where: { id: { not: selected.characterId } },
    select: { id: true, name: true, imageUrl: true, class: true, corDestaque: true },
    orderBy: { name: 'asc' },
  })
  const contrataveis = elenco.map((c) => ({
    id: c.id,
    nome: c.name,
    imageUrl: c.imageUrl,
    classe: c.class ? c.class.charAt(0) + c.class.slice(1).toLowerCase() : 'Lutador',
    cor: c.corDestaque,
  }))

  return (
    // UM FORMULÁRIO SÓ: a party escolhida no mercado e a entrada na raid são
    // a mesma decisão.
    <form className="space-y-4">
      <MercadoDeContratos
        contrataveis={contrataveis}
        vagas={VAGAS_DE_CONTRATO}
        precoPorContrato={precoDoContrato(selected.level)}
        moedas={moedas}
        nivel={selected.level}
        compacto
      />
      <div className="card p-4 space-y-3">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Vencer a raid paga</span>
          <span className="font-bold text-amber-400 tabular-nums">◆ {recompensaDaRaid(selected.level)}</span>
        </div>
        <button type="submit" formAction={entrarNaRaid.bind(null, selected.id, raid.slug)} className="btn-primary w-full px-4 py-3 text-[15px]">
          Entrar em {raid.nome}
        </button>
      </div>
    </form>
  )
}

/** Durante a incursão: a party como vai entrar no próximo andar, e a decisão. */
async function Incursao({
  id,
  raid,
  andar,
  lutaEmCurso,
  contratados,
  reservas,
  jogador,
}: {
  id: string
  raid: Raid
  andar: number
  lutaEmCurso?: string
  contratados: Contrato[]
  reservas: Reserva[] | null
  jogador: Selecionado
}) {
  const proximo = raid.andares[andar]
  // A vida máxima de cada um, para a barra: a do jogador pela mesma conta da
  // luta (fichaDoJogador), a dos contratados pelo nível do contrato.
  const [ficha, personagens] = await Promise.all([
    fichaDoJogador(jogador),
    prisma.character.findMany({ where: { id: { in: contratados.map((c) => c.characterId) } } }),
  ])
  const membros = [
    { nome: jogador.nickname, papel: '', imagem: jogador.character.imageUrl, cor: jogador.character.corDestaque, vidaMaxima: ficha.base.hp },
    ...contratados.map((c) => {
      const p = personagens.find((x) => x.id === c.characterId)
      return {
        nome: p?.name.split(' ')[0] ?? 'Contratado',
        papel: 'contratado',
        imagem: p?.imageUrl ?? null,
        cor: p?.corDestaque ?? null,
        vidaMaxima: p ? computeFighterStats(p, c.nivel, SEM_BONUS).hp : 1,
      }
    }),
  ]

  return (
    <>
      <div className="space-y-2">
        <TituloDeSecao>A party agora</TituloDeSecao>
        <p className="text-[13px] text-muted">É assim que ela entra no próximo andar. Nada volta entre eles.</p>
      </div>

      <div className="space-y-2.5">
        {membros.map((m, i) => {
          const r = reservas?.[i]
          const vida = r ? r.hp : m.vidaMaxima
          const caido = vida <= 0
          const fracao = m.vidaMaxima > 0 ? vida / m.vidaMaxima : 0
          const cor = m.cor ?? 'var(--accent)'
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2.5 border ${caido ? 'opacity-55' : ''} ${i === 0 ? '' : 'border-border bg-surface'}`}
              style={{
                borderRadius: '2px 10px 2px 10px',
                ...(i === 0
                  ? { borderColor: `color-mix(in srgb, ${cor} 55%, transparent)`, background: `linear-gradient(100deg, color-mix(in srgb, ${cor} 14%, transparent), var(--surface) 60%)` }
                  : {}),
              }}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden" style={{ borderRadius: '2px 8px 2px 8px' }}>
                {m.imagem ? (
                  <Image src={m.imagem} alt="" fill className="object-cover" style={{ objectPosition: FOCO[m.imagem] ?? '50% 10%' }} sizes="44px" />
                ) : (
                  <CharacterMonogram name={m.nome} />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex justify-between gap-2 text-[13px]">
                  <span className="font-semibold truncate">
                    {m.nome}
                    {m.papel && <span className="font-normal text-muted"> · {m.papel}</span>}
                  </span>
                  {caido ? (
                    <span className="font-semibold text-red-400 inline-flex items-center gap-1">
                      <Skull className="h-3.5 w-3.5" /> Caído
                    </span>
                  ) : (
                    <span className="tabular-nums">
                      {vida} / {m.vidaMaxima}
                    </span>
                  )}
                </div>
                <div className="h-1.5 bg-black/45">
                  {!caido && (
                    <div className="h-full" style={{ width: `${Math.min(100, fracao * 100)}%`, background: fracao > 0.5 ? '#22c55e' : fracao > 0.2 ? '#f59e0b' : '#ef4444' }} />
                  )}
                </div>
                <div className="text-[11px] text-muted">
                  {caido ? 'Só volta com ressurreição' : r ? <span className="text-spirit tabular-nums">{r.energia} de energia</span> : 'Entra inteiro'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Vencer a raid paga</span>
          <span className="font-bold text-amber-400 tabular-nums">◆ {recompensaDaRaid(jogador.level)}</span>
        </div>
        {lutaEmCurso ? (
          <Link href={`/battle/ai/${lutaEmCurso}`} className="btn-primary block w-full px-4 py-3 text-center text-[15px]">
            Voltar à luta
          </Link>
        ) : (
          proximo && (
            <form action={seguirNaRaid.bind(null, id)}>
              <button type="submit" className="btn-primary w-full px-4 py-3 text-[15px]">
                Subir para o andar {andar + 1}
              </button>
            </form>
          )
        )}
        {/* Confirmação em dois passos, sem JavaScript: um clique à toa não pode
            jogar fora os contratos já pagos. */}
        <details className="group">
          <summary className="btn-ghost block w-full cursor-pointer list-none px-4 py-2.5 text-center text-[13px] text-muted">
            Desistir da raid
          </summary>
          <form action={desistirDaRaid.bind(null, id)} className="mt-2 space-y-2 border border-border p-3" style={{ borderRadius: '2px 10px 2px 10px' }}>
            <p className="text-sm text-muted">A incursão acaba aqui, e os contratos não são devolvidos.</p>
            <button type="submit" className="border border-red-500/50 px-3 py-1.5 text-sm text-red-400" style={{ borderRadius: '2px 8px 2px 8px' }}>
              Desistir mesmo assim
            </button>
          </form>
        </details>
      </div>
    </>
  )
}
