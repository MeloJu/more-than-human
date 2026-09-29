import Link from 'next/link'
import { Check, Crown, Skull } from 'lucide-react'
import { prisma } from '@/app/lib/prisma'
import { requireUser } from '@/app/lib/session'
import { battleErrorMessage } from '@/app/lib/battle/presentation'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { VAGAS_DE_CONTRATO, precoDoContrato } from '@/app/lib/battle/party'
import { MercadoDeContratos } from '@/app/components/raid/MercadoDeContratos'
import { RAIDS, raidPorSlug } from '@/app/lib/raid/catalogo'
import { recompensaDaRaid, type Reserva } from '@/app/lib/raid/andares'
import { desistirDaRaid, entrarNaRaid, seguirNaRaid } from '@/app/lib/raid/actions'
import type { Contrato } from '@/app/lib/raid/montagem'

/**
 * A raid: arcos em andares, com a party contratada no mercado.
 *
 * Antes era uma lista de monstros avulsos, um por tier. Virou dungeon — os
 * andares em sequência, sem recuperar vida entre eles — porque monstro por
 * monstro não pedia preparo nenhum: perdia-se uma luta e começava-se outra.
 */
export default async function BattleRaidPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const errorMessage = battleErrorMessage(error)

  const user = await requireUser()

  const selected = await getSelectedCharacter(user.id)

  if (!selected) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Raid</h1>
        <div className="card p-6 space-y-3">
          <p className="opacity-70">Você precisa selecionar um personagem antes de entrar na raid.</p>
          <Link href="/select" className="btn-primary inline-block rounded-md px-4 py-2 text-sm">Selecionar Personagem</Link>
        </div>
      </main>
    )
  }

  const [incursao, lutaAntiga, conta, elenco] = await Promise.all([
    prisma.raidRun.findFirst({
      where: { userCharacterId: selected.id, status: 'ATIVA' },
      include: { battles: { where: { status: 'ACTIVE' }, select: { id: true } } },
    }),
    // Luta de raid do formato antigo (um monstro avulso) que ainda não
    // terminou. Continua jogável até o fim; só não se começa mais nenhuma.
    prisma.battle.findFirst({
      where: {
        userId: user.id,
        playerCharacterId: selected.id,
        status: 'ACTIVE',
        enemyMonsterId: { not: null },
        raidRunId: null,
        storyStageId: null,
      },
      select: { id: true },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    // O mercado: o elenco inteiro menos o próprio personagem.
    prisma.character.findMany({
      where: { id: { not: selected.characterId } },
      select: { id: true, name: true, imageUrl: true, class: true, corDestaque: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const contrataveis = elenco.map((c) => ({
    id: c.id,
    nome: c.name,
    imageUrl: c.imageUrl,
    classe: c.class ? c.class.charAt(0) + c.class.slice(1).toLowerCase() : 'Lutador',
    cor: c.corDestaque,
  }))

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Raid</h1>
        <p className="text-sm text-muted mt-1">
          Andares em sequência, com um chefe no fim. A vida e a energia não voltam entre os andares: quem cai,
          continua caído.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="card p-4">
        <div className="font-semibold">{selected.nickname}</div>
        <div className="text-sm opacity-70">{selected.character.name} · Nível {selected.level}</div>
      </div>

      {lutaAntiga && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Você tem uma luta de raid do formato antigo em andamento.</p>
          <Link href={`/battle/ai/${lutaAntiga.id}`} className="btn-ghost px-4 py-2 text-sm">
            Terminar essa luta
          </Link>
        </div>
      )}

      {incursao ? (
        <Incursao
          id={incursao.id}
          slug={incursao.raid}
          andar={incursao.andar}
          lutaEmCurso={incursao.battles[0]?.id}
          contratados={incursao.contratados as unknown as Contrato[]}
          reservas={incursao.reservas as unknown as Reserva[] | null}
          elenco={elenco}
          apelido={selected.nickname}
        />
      ) : (
        RAIDS.map((raid) => {
          const liberada = selected.level >= raid.nivelMinimo
          return (
            <div key={raid.slug} className="card p-4 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{raid.nome}</h2>
                <span className="text-xs opacity-60">
                  A partir do nível {raid.nivelMinimo} · +{recompensaDaRaid(selected.level)} moedas ao vencer
                </span>
              </div>
              <p className="text-sm opacity-80">{raid.descricao}</p>
              <ListaDeAndares slug={raid.slug} atual={-1} />

              {liberada ? (
                // UM FORMULÁRIO SÓ: a party escolhida no mercado e a entrada na
                // raid são a mesma decisão.
                <form className="space-y-4">
                  <MercadoDeContratos
                    contrataveis={contrataveis}
                    vagas={VAGAS_DE_CONTRATO}
                    precoPorContrato={precoDoContrato(selected.level)}
                    moedas={conta?.coins ?? 0}
                    nivel={selected.level}
                  />
                  <button
                    type="submit"
                    formAction={entrarNaRaid.bind(null, selected.id, raid.slug)}
                    className="btn-primary w-full rounded-md px-4 py-2 text-sm"
                  >
                    Entrar em {raid.nome}
                  </button>
                </form>
              ) : (
                <div className="rounded-md border border-border px-3 py-2 text-sm opacity-70 text-center">
                  Liberada no nível {raid.nivelMinimo}
                </div>
              )}
            </div>
          )
        })
      )}
    </main>
  )
}

/** Os andares de uma raid, marcando os já vencidos e o atual. */
function ListaDeAndares({ slug, atual }: { slug: string; atual: number }) {
  const raid = raidPorSlug(slug)
  if (!raid) return null
  return (
    <ol className="space-y-1.5">
      {raid.andares.map((a, i) => {
        const vencido = atual > i
        const aqui = atual === i
        return (
          <li
            key={a.nome}
            className={`flex gap-3 rounded-md border px-3 py-2 text-sm ${aqui ? 'border-accent' : 'border-border'} ${vencido ? 'opacity-60' : ''}`}
          >
            <span className="w-5 shrink-0 text-center tabular-nums opacity-70">
              {vencido ? <Check className="h-4 w-4 inline" /> : a.chefe ? <Crown className="h-4 w-4 inline text-amber-400" /> : i + 1}
            </span>
            <span>
              <span className="font-medium">{a.nome}</span>
              <span className="block opacity-70">{a.descricao}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** A incursão em andamento: onde a party está e como ela chega ao próximo andar. */
function Incursao({
  id,
  slug,
  andar,
  lutaEmCurso,
  contratados,
  reservas,
  elenco,
  apelido,
}: {
  id: string
  slug: string
  andar: number
  lutaEmCurso?: string
  contratados: Contrato[]
  reservas: Reserva[] | null
  elenco: { id: string; name: string }[]
  apelido: string
}) {
  const raid = raidPorSlug(slug)
  if (!raid) return null
  const proximo = raid.andares[andar]
  const nomes = [apelido, ...contratados.map((c) => elenco.find((e) => e.id === c.characterId)?.name ?? 'Contratado')]

  return (
    <div className="card p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{raid.nome}</h2>
        <span className="text-sm opacity-70">
          Andar {andar + 1} de {raid.andares.length}
        </span>
      </div>

      {/* Como a party está: é isso que ela leva para o próximo andar. */}
      {reservas && (
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-widest opacity-60">A party agora</div>
          <div className="flex flex-wrap gap-2">
            {reservas.map((r, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm ${r.hp <= 0 ? 'opacity-50' : ''}`}
              >
                {r.hp <= 0 && <Skull className="h-3.5 w-3.5" />}
                {nomes[i]} · <span className="tabular-nums">{r.hp} HP</span> ·{' '}
                <span className="tabular-nums">{r.energia} EN</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ListaDeAndares slug={slug} atual={andar} />

      <div className="flex flex-wrap gap-2">
        {lutaEmCurso ? (
          <Link href={`/battle/ai/${lutaEmCurso}`} className="btn-primary px-4 py-2 text-sm">
            Voltar à luta
          </Link>
        ) : (
          proximo && (
            <form action={seguirNaRaid.bind(null, id)}>
              <button type="submit" className="btn-primary px-4 py-2 text-sm">
                Subir para o andar {andar + 1}: {proximo.nome}
              </button>
            </form>
          )
        )}
        {/* Confirmação em dois passos, sem JavaScript: um clique à toa não
            pode jogar fora os contratos já pagos. */}
        <details className="group">
          <summary className="btn-ghost px-4 py-2 text-sm cursor-pointer list-none">Desistir da raid</summary>
          <form action={desistirDaRaid.bind(null, id)} className="mt-2 space-y-2 rounded-md border border-border p-3">
            <p className="text-sm opacity-80">A incursão acaba aqui, e os contratos não são devolvidos.</p>
            <button type="submit" className="rounded-md border border-red-500/50 px-3 py-1.5 text-sm text-red-400">
              Desistir mesmo assim
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
