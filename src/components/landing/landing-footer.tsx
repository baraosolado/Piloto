import Link from "next/link";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-zinc-50 px-6 py-12">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 md:grid-cols-2 lg:flex lg:justify-between">
        <div className="flex flex-col gap-4">
          <div className="text-xl font-black text-black">Copilote</div>
          <p className="max-w-xs text-sm tracking-tight text-gray-500">
            Performance financeira para motoristas de aplicativo.
          </p>
          <p className="text-sm tracking-tight text-gray-400">
            © {year} Copilote.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold tracking-widest text-black uppercase">
              Produto
            </span>
            <span className="text-sm text-gray-400">Blog (em breve)</span>
            <span className="text-sm text-gray-400">Suporte (em breve)</span>
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold tracking-widest text-black uppercase">
              Legal
            </span>
            <Link
              href="/termos"
              className="text-sm text-gray-500 transition-colors hover:text-[#006d33]"
            >
              Termos de uso
            </Link>
            <Link
              href="/privacidade"
              className="text-sm text-gray-500 transition-colors hover:text-[#006d33]"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
