import Link from "next/link";
import { Swords } from "lucide-react";
import { getCurrentUser } from "@/app/lib/session";
import { logoutAction } from "@/app/lib/auth-actions";
import { getCoins } from "@/app/lib/equipment/queries";
import { NavLink } from "./NavLink";

export default async function AppNav() {
  const user = await getCurrentUser();
  const authed = !!user;
  // Carteira sempre visível: as moedas só ganham sentido quando o jogador vê
  // o saldo subir ao terminar um estágio.
  const coins = user ? await getCoins(user.id) : 0;

  const links = [
    { href: "/", label: "Início" },
    ...(authed ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(authed ? [{ href: "/select", label: "Personagens" }] : []),
    { href: "/characters", label: "Catálogo" },
    { href: "/skills", label: "Habilidades" },
    ...(authed ? [{ href: "/story", label: "História" }] : []),
    { href: "/battle", label: "Batalha" },
    ...(authed ? [{ href: "/battle/pvp", label: "PvP" }] : []),
    ...(authed ? [{ href: "/equipment", label: "Equipamento" }] : []),
    ...(authed ? [{ href: "/treino", label: "Treino" }] : []),
    ...(authed ? [{ href: "/shop", label: "Loja" }] : []),
    ...(authed ? [{ href: "/status", label: "Status" }] : []),
    ...(!authed ? [{ href: "/login", label: "Entrar" }, { href: "/register", label: "Criar conta" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
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

        <div className="flex items-center gap-4 overflow-x-auto">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {authed && <span className="coin-badge">◆ {coins}</span>}
          {authed && (
            <form action={logoutAction}>
              <button type="submit" className="nav-link">
                Sair
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
