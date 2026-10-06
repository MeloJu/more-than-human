import Link from 'next/link'
import { requireAdmin } from '@/app/lib/admin/guard'
import { contasRecentes, lutasEmAberto, modoDaLuta, registroDeAdmin, visaoGeral } from '@/app/lib/admin/queries'
import { encerrarLuta, limparFilaPvp } from '@/app/lib/admin/actions'
import { PainelChanfrado, TituloDeSecao } from '@/app/components/battle/Moldura'
import { AvisoDoAdmin, descreverAcao, haQuanto } from './comum'

export const metadata = { title: 'Admin · More Than Human' }

/**
 * A ÁREA DE ADMIN: o estado do jogo agora e os comandos para destravar
 * jogador. Só para conta ADMIN (ver requireAdmin); para os outros, 404.
 *
 * Mostra o que mora no banco — contas, personagens, lutas. Como a VM está
 * (memória, CPU, requisições) é pergunta do monitoramento, não desta tela.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin()
  const { ok, error } = await searchParams
  const [geral, contas, abertas, registro] = await Promise.all([visaoGeral(), contasRecentes(), lutasEmAberto(), registroDeAdmin()])
  const agora = new Date()

  const numeros: [string, string | number, string?][] = [
    ['Contas', geral.contas, `+${geral.contasNaSemana} na semana`],
    ['Personagens criados', geral.personagens],
    ['Lutas hoje', geral.lutasHoje, Object.entries(geral.porModo).map(([m, n]) => `${m} ${n}`).join(' · ') || 'nenhuma'],
    ['Lutas em aberto', geral.lutasAbertas, `${geral.raidsAtivas} raid${geral.raidsAtivas === 1 ? '' : 's'} em andamento`],
    ['Fila do PvP', geral.filaPvp],
    ['Resgates hoje', geral.resgatesDiarios, `${geral.missoesHoje} missão(ões)`],
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 lg:py-8 space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="kicker">Admin</div>
          <h1 className="font-titulo italic font-extrabold uppercase text-4xl leading-none">O jogo agora</h1>
        </div>
        <span aria-hidden className="font-kanji text-4xl leading-none text-accent opacity-90">管理</span>
      </div>

      <AvisoDoAdmin ok={ok} error={error} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {numeros.map(([rotulo, valor, detalhe]) => (
          <div key={rotulo} className="card px-4 py-3 space-y-0.5">
            <div className="text-xs text-muted">{rotulo}</div>
            <div className="text-2xl font-bold tabular-nums">{valor}</div>
            {detalhe && <div className="text-xs text-muted truncate">{detalhe}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-3 min-w-0">
          <TituloDeSecao>Contas recentes</TituloDeSecao>
          <PainelChanfrado>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Conta</th>
                    <th className="px-3 py-2.5 font-medium">Em uso</th>
                    <th className="px-3 py-2.5 font-medium text-right">Pers.</th>
                    <th className="px-3 py-2.5 font-medium text-right">Moedas</th>
                    <th className="px-4 py-2.5 font-medium text-right">Criada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contas.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[.03]">
                      <td className="px-4 py-2">
                        <Link href={`/admin/contas/${c.id}`} className="font-semibold text-accent hover:underline">
                          {c.username}
                        </Link>
                        {c.role === 'ADMIN' && <span className="ml-2 text-[10px] font-bold text-amber-300">ADMIN</span>}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {c.selectedCharacter ? `${c.selectedCharacter.nickname} · ${c.selectedCharacter.character.name} · nv ${c.selectedCharacter.level}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{c._count.characters}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.coins.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2 text-right text-muted whitespace-nowrap">{haQuanto(c.createdAt, agora)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PainelChanfrado>
        </section>

        <section className="space-y-3 min-w-0">
          <TituloDeSecao>Personagens mais escolhidos</TituloDeSecao>
          <PainelChanfrado>
            <ol className="p-4 space-y-2">
              {geral.maisEscolhidos.map((m, i) => (
                <li key={m.nome} className="flex items-baseline gap-3 text-sm">
                  <span className="w-5 text-right text-xs text-muted tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate">
                    {m.nome} <span className="text-xs text-muted">{m.universo}</span>
                  </span>
                  <span className="font-bold tabular-nums">{m.quantidade}</span>
                </li>
              ))}
              {geral.maisEscolhidos.length === 0 && <li className="text-sm text-muted">Nenhum personagem criado ainda.</li>}
            </ol>
          </PainelChanfrado>
        </section>
      </div>

      <section className="space-y-3">
        <TituloDeSecao
          direita={
            <form action={limparFilaPvp}>
              <button type="submit" disabled={geral.filaPvp === 0} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">
                Limpar a fila do PvP ({geral.filaPvp})
              </button>
            </form>
          }
        >
          Lutas em aberto
        </TituloDeSecao>
        <p className="text-sm text-muted">
          A mais parada primeiro. Encerrar vira empate, sem pagar nada: serve para a luta abandonada que prende o jogador.
        </p>
        <PainelChanfrado>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Parada há</th>
                  <th className="px-3 py-2.5 font-medium">Modo</th>
                  <th className="px-3 py-2.5 font-medium">Quem</th>
                  <th className="px-3 py-2.5 font-medium text-right">Rodada</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abertas.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums">{haQuanto(b.updatedAt, agora)}</td>
                    <td className="px-3 py-2">{modoDaLuta(b)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/contas/${b.user.id}`} className="text-accent hover:underline">
                        {b.user.username}
                      </Link>
                      <span className="text-muted"> · {b.playerCharacter.nickname}</span>
                      {b.opponentUser && <span className="text-muted"> contra {b.opponentUser.username}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{b.turnNumber}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={encerrarLuta.bind(null, b.id)}>
                        <input type="hidden" name="voltar" value="/admin" />
                        <button type="submit" className="text-xs font-semibold text-red-300 hover:underline">
                          Encerrar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {abertas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-muted">
                      Nenhuma luta em aberto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PainelChanfrado>
      </section>

      <section className="space-y-3">
        <TituloDeSecao>Registro</TituloDeSecao>
        <PainelChanfrado>
          <ul className="divide-y divide-border text-sm">
            {registro.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2">
                <span className="text-xs text-muted tabular-nums whitespace-nowrap">{haQuanto(r.createdAt, agora)}</span>
                <span className="font-semibold">{r.admin.username}</span>
                <span className="text-muted">{descreverAcao(r.acao, r.detalhe)}</span>
              </li>
            ))}
            {registro.length === 0 && <li className="px-4 py-3 text-muted">Nenhuma ação de admin ainda.</li>}
          </ul>
        </PainelChanfrado>
      </section>
    </main>
  )
}
