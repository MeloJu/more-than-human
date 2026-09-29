import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/app/lib/session'
import { getSelectedCharacter } from '@/app/lib/progression/queries'
import { VITORIAS_PAGAS_POR_DIA, vitoriasContraIaHoje } from '@/app/lib/battle/recompensa'
import { raidPorSlug, RAIDS } from '@/app/lib/raid/catalogo'

/**
 * As três portas de batalha: treino, raid e PvP.
 *
 * Eram três caixas de texto (duas com texto desatualizado). Agora cada porta
 * é uma carta com arte e a situação de agora — quantas vitórias ainda pagam,
 * em que andar a raid parou. Desenho do canvas "Telas de Entrada".
 *
 * UM BOTÃO PRINCIPAL: a raid em andamento, se houver; senão o treino. As
 * outras portas levam o botão fantasma (regra 5 do sistema de design).
 */
type Porta = {
  href: string
  rotulo: string
  titulo: string
  texto: string
  situacao: React.ReactNode
  acao: string
  arte: string
  foco: string
  cor: string
  corDoRotulo: string
  selo?: string
  principal: boolean
}

export default async function BattlePage() {
  const user = await getCurrentUser()
  const uc = user ? await getSelectedCharacter(user.id) : null

  const [vitoriasHoje, incursao] = uc
    ? await Promise.all([
        vitoriasContraIaHoje(uc.id),
        prisma.raidRun.findFirst({ where: { userCharacterId: uc.id, status: 'ATIVA' }, select: { raid: true, andar: true } }),
      ])
    : [0, null]

  const raid = incursao ? raidPorSlug(incursao.raid) : RAIDS[0]
  const andar = incursao && raid ? raid.andares[incursao.andar] : undefined
  const restam = Math.max(0, VITORIAS_PAGAS_POR_DIA - vitoriasHoje)

  const portas: Porta[] = [
    {
      href: '/battle/ai',
      rotulo: 'Treino',
      titulo: 'Contra a IA',
      texto: 'Um adversário sorteado do elenco, no seu nível. As cinco primeiras vitórias do dia pagam XP e moedas.',
      situacao: uc ? (
        <>
          <span className="font-bold text-green-400 tabular-nums">{restam}</span> de {VITORIAS_PAGAS_POR_DIA} vitórias pagas restam hoje
        </>
      ) : (
        'Escolha um personagem para treinar'
      ),
      acao: 'Lutar',
      arte: '/images/characters/kenpachi-zaraki/kenpachi-zaraki_default.webp',
      foco: '50% 10%',
      cor: '#f50a93',
      corDoRotulo: '#f472b6',
      principal: !incursao,
    },
    {
      href: '/battle/raid',
      rotulo: 'Raid',
      titulo: raid?.nome ?? 'Raid',
      texto: 'Cinco andares sem recuperar vida, com aliados do mercado, até a Sexta Torre.',
      situacao:
        incursao && raid && andar ? (
          <>
            Andar {incursao.andar + 1} de {raid.andares.length} · {andar.nome}
          </>
        ) : (
          <>A partir do nível {raid?.nivelMinimo}</>
        ),
      acao: incursao ? 'Voltar' : 'Ver a torre',
      arte: '/images/characters/grimmjow-jaegerjaquez/grimmjow-jaegerjaquez_default.webp',
      foco: '50% 8%',
      cor: '#2d3ad2',
      corDoRotulo: '#93a0ff',
      selo: incursao ? 'Em andamento' : undefined,
      principal: !!incursao,
    },
    {
      href: '/battle/pvp',
      rotulo: 'PvP',
      titulo: 'Contra jogador',
      texto: 'Rodada simultânea: os dois escolhem ao mesmo tempo, sem ver a escolha do outro.',
      situacao: uc ? `${uc.pvpWins} vitória${uc.pvpWins === 1 ? '' : 's'} no PvP` : 'Escolha um personagem para lutar',
      acao: 'Entrar na fila',
      arte: '/images/characters/ichigo-kurosaki/ichigo-kurosaki_default.webp',
      foco: '50% 0%',
      cor: '#f8b659',
      corDoRotulo: '#fcd34d',
      principal: false,
    },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="kicker">{uc ? `${uc.nickname} · ${uc.character.name} · nível ${uc.level}` : 'Arena'}</div>
          <h1 className="font-titulo italic font-extrabold uppercase text-4xl leading-none">Batalha</h1>
        </div>
        <span aria-hidden className="font-kanji text-4xl leading-none text-accent opacity-90 whitespace-nowrap shrink-0">
          対戦
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {portas.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group relative block h-[520px] lg:h-[600px] transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            style={p.principal ? { filter: `drop-shadow(0 0 14px color-mix(in srgb, ${p.cor} 45%, transparent))` } : undefined}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: p.cor, clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
            />
            <span
              className="absolute overflow-hidden bg-background-alt"
              style={{ inset: 1.5, clipPath: 'polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px)' }}
            >
              <span className="absolute inset-x-0 top-0 h-[62%]">
                <Image
                  src={p.arte}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                  style={{ objectPosition: p.foco }}
                  sizes="(max-width: 768px) 100vw, 420px"
                />
              </span>
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, var(--background-alt) 38%, color-mix(in srgb, var(--background-alt) 40%, transparent) 55%, transparent 70%), linear-gradient(to top, color-mix(in srgb, ${p.cor} 25%, transparent) 0%, transparent 45%)`,
                }}
              />
            </span>
            {p.selo && (
              <span
                className="absolute top-3.5 left-3.5 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-300 border border-red-500/55 bg-background/70"
                style={{ borderRadius: '2px 7px 2px 7px' }}
              >
                {p.selo}
              </span>
            )}
            <span className="absolute inset-x-5 bottom-5 flex flex-col gap-3">
              <span className="kicker" style={{ color: p.corDoRotulo }}>
                {p.rotulo}
              </span>
              <span className="font-titulo italic font-extrabold uppercase text-[34px] leading-none">{p.titulo}</span>
              <span className="text-sm text-muted leading-relaxed">{p.texto}</span>
              <span className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                <span className="text-[13px]">{p.situacao}</span>
                <span className={p.principal ? 'btn-primary px-4 py-2 text-[13px]' : 'btn-ghost px-4 py-2 text-[13px] border-zinc-600'}>{p.acao}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
