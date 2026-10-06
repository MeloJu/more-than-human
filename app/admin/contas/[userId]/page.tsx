import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/app/lib/admin/guard'
import { contaParaAdmin, modoDaLuta } from '@/app/lib/admin/queries'
import { darItem, darMoedas, darPontos, encerrarLuta } from '@/app/lib/admin/actions'
import { situacaoDoResgate } from '@/app/lib/login/diario'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { AvisoDoAdmin, haQuanto } from '../../comum'

export const metadata = { title: 'Conta · Admin · More Than Human' }

const campo = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm'

/** Uma conta vista pelo admin: personagens, mochila, lutas e os comandos. */
export default async function ContaAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  await requireAdmin()
  const { userId } = await params
  const { ok, error } = await searchParams
  const dados = await contaParaAdmin(userId)
  if (!dados) notFound()
  const { conta, lutas, itens } = dados
  const agora = new Date()
  const diaria = situacaoDoResgate(conta.ultimoResgate, conta.sequenciaDiaria, agora)

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 lg:py-8 space-y-7">
      <div className="space-y-1.5">
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← Admin
        </Link>
        <h1 className="font-titulo italic font-extrabold uppercase text-4xl leading-none">
          {conta.username}
          {conta.role === 'ADMIN' && <span className="ml-3 align-middle text-sm not-italic text-amber-300">ADMIN</span>}
        </h1>
        <p className="text-sm text-muted">
          {conta.email} · conta criada {haQuanto(conta.createdAt, agora)} · {conta.coins.toLocaleString('pt-BR')} moedas · recompensa diária{' '}
          {diaria.resgatadoHoje ? `resgatada hoje (dia ${diaria.dia})` : `no dia ${diaria.dia}`}
        </p>
      </div>

      <AvisoDoAdmin ok={ok} error={error} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6 min-w-0">
          <section className="space-y-3 min-w-0">
            <TituloDeSecao>Personagens</TituloDeSecao>
            <PainelChanfrado>
              <ul className="divide-y divide-border">
                {conta.characters.map((uc) => (
                  <li key={uc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {uc.nickname} <span className="font-normal text-muted">· {uc.character.name}</span>
                        {uc.id === conta.selectedCharacterId && <span className="ml-2 text-[10px] font-bold text-accent">EM USO</span>}
                      </div>
                      <div className="text-xs text-muted tabular-nums">
                        nível {uc.level} · {uc.experience} XP · {uc.pointsAvailable} ponto(s) livre(s) · {uc.pvpWins} vitória(s) no PvP · criado{' '}
                        {haQuanto(uc.createdAt, agora)}
                      </div>
                    </div>
                    <form action={darPontos.bind(null, conta.id, uc.id)} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`pontos-${uc.id}`}>
                        Pontos para {uc.nickname}
                      </label>
                      <input id={`pontos-${uc.id}`} name="quantidade" type="number" min={1} max={20} defaultValue={1} className={`${campo} w-20`} />
                      <button type="submit" className="btn-ghost px-3 py-2 text-xs whitespace-nowrap">
                        Dar pontos
                      </button>
                    </form>
                  </li>
                ))}
                {conta.characters.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nenhum personagem criado.</li>}
              </ul>
            </PainelChanfrado>
          </section>

          <section className="space-y-3 min-w-0">
            <TituloDeSecao>Últimas lutas</TituloDeSecao>
            <PainelChanfrado>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {lutas.map((b) => {
                      const souHost = b.userId === conta.id
                      const venceu = b.outcome === (souHost ? 'PLAYER_WIN' : 'ENEMY_WIN')
                      const contra = b.opponentUserId
                        ? souHost
                          ? b.opponentUser?.username
                          : 'host'
                        : b.enemyCharacter?.name ?? b.enemyMonster?.name ?? '?'
                      return (
                        <tr key={b.id}>
                          <td className="px-4 py-2 text-muted whitespace-nowrap">{haQuanto(b.updatedAt, agora)}</td>
                          <td className="px-3 py-2">{modoDaLuta(b)}</td>
                          <td className="px-3 py-2">
                            {b.playerCharacter.nickname} <span className="text-muted">contra {contra}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {b.status === 'ACTIVE' ? (
                              <span className="text-amber-300">em aberto · rodada {b.turnNumber}</span>
                            ) : b.outcome === 'DRAW' ? (
                              <span className="text-muted">empate</span>
                            ) : venceu ? (
                              <span className="text-green-300">vitória</span>
                            ) : (
                              <span className="text-red-300">derrota</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {b.status === 'ACTIVE' && (
                              <form action={encerrarLuta.bind(null, b.id)}>
                                <input type="hidden" name="voltar" value={`/admin/contas/${conta.id}`} />
                                <button type="submit" className="text-xs font-semibold text-red-300 hover:underline">
                                  Encerrar
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {lutas.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-muted">Nenhuma luta ainda.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </PainelChanfrado>
          </section>
        </div>

        <div className="space-y-6 min-w-0">
          <section className="space-y-3 min-w-0">
            <TituloDeSecao>Comandos</TituloDeSecao>
            <PainelChanfrado>
              <div className="p-4 space-y-5">
                <form action={darMoedas.bind(null, conta.id)} className="space-y-2">
                  <div className="text-sm font-semibold">Moedas</div>
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor="moedas-quantidade">
                      Quantidade de moedas
                    </label>
                    <input id="moedas-quantidade" name="quantidade" type="number" min={-100000} max={100000} required placeholder="500 ou -500" className={campo} />
                    <button type="submit" className="btn-ghost px-3 py-2 text-xs whitespace-nowrap">
                      Aplicar
                    </button>
                  </div>
                  <label className="sr-only" htmlFor="moedas-motivo">
                    Motivo
                  </label>
                  <input id="moedas-motivo" name="motivo" maxLength={200} placeholder="Motivo (fica no registro)" className={campo} />
                  <p className="text-xs text-muted">Negativo tira. Nunca deixa o saldo abaixo de zero.</p>
                </form>

                <form action={darItem.bind(null, conta.id)} className="space-y-2 border-t border-border pt-4">
                  <div className="text-sm font-semibold">Item</div>
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor="item-id">
                      Item
                    </label>
                    <select id="item-id" name="itemId" required className={campo}>
                      {itens.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor="item-quantidade">
                      Quantidade
                    </label>
                    <input id="item-quantidade" name="quantidade" type="number" min={1} max={99} defaultValue={1} className={`${campo} w-20`} />
                  </div>
                  <label className="sr-only" htmlFor="item-motivo">
                    Motivo
                  </label>
                  <input id="item-motivo" name="motivo" maxLength={200} placeholder="Motivo (fica no registro)" className={campo} />
                  <button type="submit" className="btn-ghost px-3 py-2 text-xs">
                    Dar item
                  </button>
                </form>
              </div>
            </PainelChanfrado>
          </section>

          <section className="space-y-3 min-w-0">
            <TituloDeSecao>Mochila</TituloDeSecao>
            <PainelChanfrado>
              <ul className="p-4 space-y-1.5 text-sm">
                {conta.itens.map((i) => (
                  <li key={i.item.nome} className="flex items-baseline gap-2">
                    <span aria-hidden className="font-kanji text-accent">
                      {i.item.marca}
                    </span>
                    <span className="flex-1">{i.item.nome}</span>
                    <span className="tabular-nums text-muted">×{i.quantidade}</span>
                  </li>
                ))}
                {conta.itens.length === 0 && <li className="text-muted">Mochila vazia.</li>}
              </ul>
            </PainelChanfrado>
          </section>
        </div>
      </div>
    </main>
  )
}
