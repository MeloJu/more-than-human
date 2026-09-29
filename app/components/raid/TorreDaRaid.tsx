import Image from 'next/image'
import { Check, Crown } from 'lucide-react'
import type { PerfilDeChefe } from '@/app/lib/battle/ai'
import type { Andar, InimigoDoAndar, Raid } from '@/app/lib/raid/catalogo'

/**
 * A raid como uma torre: os andares de baixo para cima, como se sobe.
 *
 * Era uma lista numerada de cima para baixo, igual a qualquer outra lista do
 * site. A torre diz com a forma o que a lista só dizia com números: quanto já
 * se subiu (a linha acesa), onde a party está (o andar aceso) e o que espera
 * no topo (o chefe, com a arte dele). Desenho aprovado no canvas "Telas de
 * Entrada".
 *
 * `andarAtual` é o próximo andar a lutar: os de baixo dele estão vencidos.
 * Antes de a raid começar ele é 0 e nada está vencido.
 */
export function TorreDaRaid({
  raid,
  andarAtual,
  emAndamento,
  arteDoChefe,
}: {
  raid: Raid
  andarAtual: number
  emAndamento: boolean
  arteDoChefe: string | null
}) {
  const total = raid.andares.length
  // Quanto da linha acende: do chão até o andar atual.
  const subido = total > 1 ? (andarAtual / (total - 1)) * 100 : 0
  const andares = raid.andares.map((andar, i) => ({ andar, i })).reverse()

  return (
    <div className="relative flex flex-col gap-3.5 pl-11">
      <div
        aria-hidden
        className="absolute left-[17px] top-10 bottom-10 w-0.5"
        style={{ background: `linear-gradient(to top, var(--accent) 0%, var(--accent) ${subido}%, var(--border) ${subido}%, var(--border) 100%)` }}
      />

      {andares.map(({ andar, i }) => {
        const vencido = i < andarAtual
        const atual = i === andarAtual
        const anterior = raid.andares[i - 1]

        if (andar.chefe) {
          return (
            <div key={andar.nome} className="relative">
              <Marco estado={atual ? 'atual' : vencido ? 'vencido' : 'chefe'} numero={i + 1} />
              <div
                className="relative min-h-[230px]"
                style={atual ? { filter: 'drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 45%, transparent))' } : undefined}
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: atual ? 'var(--accent)' : '#2d3ad2', clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
                />
                <span
                  className="absolute overflow-hidden bg-background-alt"
                  style={{ inset: 1.5, clipPath: 'polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px)' }}
                >
                  {arteDoChefe && (
                    <span className="absolute inset-y-0 right-0 w-full sm:w-[420px]">
                      <Image src={arteDoChefe} alt="" fill className="object-cover opacity-55 grayscale-[.3]" style={{ objectPosition: '50% 12%' }} sizes="420px" />
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(90deg, var(--background-alt) 40%, color-mix(in srgb, var(--background-alt) 55%, transparent) 65%, color-mix(in srgb, var(--background-alt) 20%, transparent) 100%), linear-gradient(to top, rgba(45,58,210,.25), transparent 60%)',
                    }}
                  />
                </span>
                <div className="relative flex min-h-[230px] max-w-[480px] flex-col gap-2 p-6">
                  <span className="kicker text-red-300">Andar {i + 1} · chefe</span>
                  <h3 className="font-titulo italic font-extrabold uppercase text-3xl leading-none">{andar.nome}</h3>
                  <p className="text-sm text-muted leading-relaxed">{descricaoDoChefe(andar)}</p>
                  <span className={`mt-auto text-[13px] ${atual ? 'font-semibold text-accent' : 'text-zinc-500'}`}>
                    {atual ? 'Próximo andar: o chefe' : anterior ? `Trancado até ${anterior.nome} cair` : 'Trancado'}
                  </span>
                </div>
              </div>
            </div>
          )
        }

        if (vencido) {
          return (
            <div key={andar.nome} className="relative">
              <Marco estado="vencido" numero={i + 1} />
              <div className="flex items-center justify-between gap-4 border border-border bg-surface/60 px-5 py-3" style={{ borderRadius: '2px 12px 2px 12px' }}>
                <span className="text-[15px] font-semibold text-muted">{andar.nome}</span>
                <span className="text-xs text-zinc-500">vencido</span>
              </div>
            </div>
          )
        }

        return (
          <div key={andar.nome} className="relative">
            <Marco estado={atual ? 'atual' : 'futuro'} numero={i + 1} />
            <div
              className={`relative flex flex-wrap items-center gap-4 px-5 py-4 ${atual ? '' : 'border border-border bg-surface opacity-70'}`}
              style={atual ? { filter: 'drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 35%, transparent))' } : { borderRadius: '2px 12px 2px 12px' }}
            >
              {atual && (
                <>
                  <span aria-hidden className="absolute inset-0 bg-accent" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }} />
                  <span
                    aria-hidden
                    className="absolute"
                    style={{
                      inset: 1.5,
                      background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 16%, var(--surface)), var(--surface) 55%)',
                      clipPath: 'polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px)',
                    }}
                  />
                </>
              )}
              <div className="relative min-w-[200px] flex-1 space-y-1">
                {atual && <div className="kicker text-accent">{emAndamento ? 'Próximo andar' : 'Primeiro andar'}</div>}
                <div className={`font-bold ${atual ? 'text-lg' : 'text-base'}`}>{andar.nome}</div>
                <p className="text-[13px] text-muted">{andar.descricao}</p>
              </div>
              <div className="relative flex flex-col gap-1.5">
                {andar.inimigos.map((inimigo, k) => (
                  <span key={k} className="border border-zinc-600 px-2.5 py-1 text-xs text-zinc-300" style={{ borderRadius: '2px 7px 2px 7px' }}>
                    <span aria-hidden className="font-kanji text-muted">虚</span> {rotuloDoInimigo(inimigo)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      <span className="kicker pt-1 text-zinc-500">Entrada da raid</span>
    </div>
  )
}

/** O marco na linha da torre: número, visto, andar aceso ou coroa do chefe. */
function Marco({ estado, numero }: { estado: 'vencido' | 'atual' | 'futuro' | 'chefe'; numero: number }) {
  const base = 'absolute -left-11 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center'
  const forma = { borderRadius: '2px 10px 2px 10px' }
  if (estado === 'vencido') {
    return (
      <span className={`${base} border-2 border-accent bg-background text-accent`} style={forma} aria-label={`Andar ${numero}, vencido`}>
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    )
  }
  if (estado === 'chefe') {
    return (
      <span className={`${base} border-2 border-red-500 bg-background text-red-500`} style={forma} aria-label={`Andar ${numero}, chefe`}>
        <Crown className="h-[18px] w-[18px]" />
      </span>
    )
  }
  if (estado === 'atual') {
    return (
      <span
        className={`${base} bg-accent font-titulo italic font-extrabold text-lg text-background motion-safe:animate-[pulsar-marco_2.4s_ease-in-out_infinite]`}
        style={forma}
        aria-label={`Andar ${numero}, o próximo`}
      >
        {numero}
      </span>
    )
  }
  return (
    <span className={`${base} border-2 border-border bg-background font-titulo italic font-extrabold text-lg text-zinc-500`} style={forma}>
      {numero}
    </span>
  )
}

function rotuloDoInimigo(inimigo: InimigoDoAndar): string {
  return 'monstro' in inimigo ? `${inimigo.monstro} · nv ${inimigo.nivel}` : `${inimigo.personagem.split(' ')[0]} · nv ${inimigo.nivel}`
}

/**
 * O que o jogador precisa saber do chefe antes de subir, montado do perfil
 * dele no catálogo — uma raid nova com outro chefe já vem descrita.
 */
function descricaoDoChefe(andar: Andar): string {
  const chefe = andar.inimigos[0]
  if (!chefe || !('personagem' in chefe)) return andar.descricao
  const perfil: PerfilDeChefe = chefe.perfil ?? {}
  const traços = [
    perfil.predador ? 'persegue quem mais bate' : null,
    perfil.golpeCarregado ? `anuncia o ${perfil.golpeCarregado}` : null,
    perfil.faseDois ? `solta a ${perfil.faseDois.forma.replace(/^Resurrección: /, '')} na metade da vida` : null,
  ].filter(Boolean)
  const nome = chefe.personagem
  const base = `${nome}, no nível ${chefe.nivel}.`
  if (traços.length === 0) return base
  const lista = traços.length > 1 ? `${traços.slice(0, -1).join(', ')} e ${traços.at(-1)}` : traços[0]
  return `${base} ${lista!.charAt(0).toUpperCase()}${lista!.slice(1)}.`
}
