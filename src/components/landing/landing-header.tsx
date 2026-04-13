"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
        scrolled && "border-b border-[#EEEEEE] shadow-sm shadow-black/5",
      )}
    >
      <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-3 px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <Gauge className="size-8 shrink-0 text-black" strokeWidth={2} aria-hidden />
          <span className="text-2xl font-black tracking-tighter text-black">
            Copilote
          </span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a
            className="font-medium text-gray-500 transition-opacity hover:opacity-80"
            href="#calculator"
          >
            Calculadora
          </a>
          <a
            className="font-medium text-gray-500 transition-opacity hover:opacity-80"
            href="#recursos"
          >
            Recursos
          </a>
          <a
            className="font-medium text-gray-500 transition-opacity hover:opacity-80"
            href="#depoimentos"
          >
            Depoimentos
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-black px-4 py-2.5 text-center text-sm font-bold text-black transition-all hover:bg-black/5 active:scale-95 sm:px-5 sm:py-3 sm:text-base"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg bg-black px-4 py-2.5 text-center text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 sm:px-7 sm:py-3.5 sm:text-base"
          >
            <span className="hidden sm:inline">Criar conta grátis</span>
            <span className="sm:hidden">Criar conta</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
