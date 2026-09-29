import Link from "next/link";
import { BookOpen, House, ShoppingBag, Swords, UserRound } from "lucide-react";
import { getCurrentUser } from "@/app/lib/session";
import { logoutAction } from "@/app/lib/auth-actions";
import { getCoins } from "@/app/lib/equipment/queries";
import { SECOES_LOGADO, SECOES_VISITANTE } from "@/app/lib/navegacao";
import { BarraDoCelular, NavLink } from "./NavLink";

/** Ícone de cada seção na barra de baixo do celular, pelo href da seção. */
const ICONES = {
  "/dashboard": <House className="h-5 w-5" />,
  "/battle": <Swords className="h-5 w-5" />,
  "/story": <BookOpen className="h-5 w-5" />,
  "/status": <UserRound className="h-5 w-5" />,
  "/shop": <ShoppingBag className="h-5 w-5" />,
};

export default async function AppNav() {
  const user = await getCurrentUser();
  const authed = !!user;
  // Carteira sempre visível: as moedas só ganham sentido quando o jogador vê
  // o saldo subir ao terminar um estágio.
  const coins = user ? await getCoins(user.id) : 0;
  const secoes = authed ? SECOES_LOGADO : SECOES_VISITANTE;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-2.5 shrink-0">
            <span
              className="flex h-9 w-9 items-center justify-center bg-accent text-background"
              style={{ borderRadius: "2px 10px 2px 10px" }}
            >
              <Swords className="h-5 w-5" />
            </span>
            {/* Marca em traço de pincel, a mesma fonte do título do confronto. */}
            <span className="font-pincel text-2xl leading-none hidden sm:block drop-shadow-[0_2px_8px_rgba(255,107,26,.25)]">
              More Than Human
            </span>
          </Link>

          {/* No celular a lista vai para a barra de baixo (BarraDoCelular). O
              Catálogo, que não cabe lá, fica aqui em cima. */}
          <div className="hidden md:flex items-center gap-6">
            {secoes.map((s) => (
              <NavLink key={s.href} secao={s} />
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/characters" className="nav-link md:hidden">
              Catálogo
            </Link>
            {authed && <span className="coin-badge">◆ {coins}</span>}
            {authed ? (
              <form action={logoutAction}>
                <button type="submit" className="nav-link">
                  Sair
                </button>
              </form>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Entrar
                </Link>
                <Link href="/register" className="btn-primary px-3 py-1.5 text-sm">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      {authed && <BarraDoCelular secoes={SECOES_LOGADO} icones={ICONES} />}
    </>
  );
}
