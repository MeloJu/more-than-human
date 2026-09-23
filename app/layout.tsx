import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono, Kaushan_Script, Yuji_Syuku } from "next/font/google";
import "./globals.css";
import AppNav from "./components/AppNav";
import { Footer } from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
  As três fontes do visual de batalha, cada uma com UM papel:

  - Pincel (Kaushan Script): título do confronto e a marca. É a que dá o
    "letreiro de anime" — traço de pincel inclinado. Só em texto curto e
    grande; em corpo de texto ela fica ilegível.
  - Título (Barlow Condensed): cabeçalho de seção, em caixa alta. Condensada
    para caber "HISTÓRICO" e "AÇÕES" sem roubar largura dos painéis.
    latin-ext porque é o subset que traz Ç, Õ e Ó.
  - Kanji (Yuji Syuku): caligrafia japonesa em pincel, para o 対戦 do centro.
    preload desligado: fonte CJK é enorme, e sem preload o navegador baixa só
    as faixas de unicode que a página de fato usa — aqui, dois caracteres.

  O corpo continua em Geist. Legibilidade de número de dano e de custo não é
  lugar para personalidade.
*/
const pincel = Kaushan_Script({
  variable: "--fonte-pincel",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const titulo = Barlow_Condensed({
  variable: "--fonte-titulo",
  weight: ["600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
});

const kanji = Yuji_Syuku({
  variable: "--fonte-kanji",
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: "Anime Battler",
  description: "Jogo de batalha por turnos com personagens de anime e quadrinhos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pincel.variable} ${titulo.variable} ${kanji.variable} antialiased`}
      >
        <AppNav />
        <div className="min-h-[calc(100vh-56px)]">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
