import type { Prisma } from '@prisma/client'

/** "há 3 h", "há 2 dias": a idade de uma coisa, curta, para as tabelas do admin. */
export function haQuanto(quando: Date, agora: Date): string {
  const min = Math.max(0, Math.round((agora.getTime() - quando.getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}

/** Uma linha do registro em português, a partir da ação e do detalhe gravados. */
export function descreverAcao(acao: string, detalhe: Prisma.JsonValue): string {
  const d = (detalhe ?? {}) as Record<string, unknown>
  const porque = typeof d.motivo === 'string' && d.motivo ? ` — "${d.motivo}"` : ''
  switch (acao) {
    case 'dar_moedas':
      return `${Number(d.quantidade) >= 0 ? 'deu' : 'tirou'} ${Math.abs(Number(d.quantidade))} moedas${porque}`
    case 'dar_item':
      return `deu ${d.quantidade}× ${d.item}${porque}`
    case 'dar_pontos':
      return `deu ${d.quantidade} ponto(s) de atributo${porque}`
    case 'encerrar_luta':
      return `encerrou uma luta${d.pvp ? ' de PvP' : ''}${porque}`
    case 'limpar_fila_pvp':
      return `limpou a fila do PvP (${d.removidos ?? 0} na fila)`
    default:
      return acao
  }
}

const MENSAGENS_OK: Record<string, string> = {
  moedas: 'Moedas atualizadas.',
  item: 'Item entregue.',
  pontos: 'Pontos entregues.',
  luta: 'Luta encerrada como empate.',
  fila: 'Fila do PvP limpa.',
}

const MENSAGENS_ERRO: Record<string, string> = {
  quantidade: 'Quantidade fora do limite (moedas até 100.000, itens até 99, pontos até 20).',
  saldo: 'A conta não tem moedas suficientes para tirar esse valor.',
  item: 'Esse item não existe no catálogo.',
  personagem: 'Esse personagem não é desta conta.',
  luta: 'Essa luta já tinha acabado.',
}

/** A faixa de resultado depois de um comando (?ok= ou ?error=). */
export function AvisoDoAdmin({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
        {MENSAGENS_ERRO[error] ?? 'O comando não foi aplicado.'}
      </div>
    )
  }
  if (ok) {
    return (
      <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-300">
        {MENSAGENS_OK[ok] ?? 'Feito.'}
      </div>
    )
  }
  return null
}
