import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans text-black">
      <div className="mx-auto max-w-[720px] px-6 py-12 md:px-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-black transition-opacity hover:opacity-80"
          >
            Piloto
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#555] underline decoration-[#555]/40 underline-offset-4 transition-colors hover:text-black"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar
          </Link>
        </header>

        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-black">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#555]">Última atualização: {lastUpdated}</p>
        <hr className="my-8 border-0 border-t border-[#ddd]" />

        <div
          className={[
            "legal-prose text-[#333]",
            "[&_a]:text-black [&_a]:underline [&_a]:decoration-black/30 [&_a]:underline-offset-2",
            "[&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-black",
            "[&_h3]:mt-5 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-black",
            "[&_p]:mt-3 [&_p]:text-[15px] [&_p]:leading-[1.8]",
            "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-[15px] [&_ul]:leading-[1.8]",
            "[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ol]:text-[15px] [&_ol]:leading-[1.8]",
            "[&_strong]:font-bold [&_strong]:text-inherit",
            "[&_li]:pl-0.5",
          ].join(" ")}
        >
          {children}
        </div>

        <footer className="mt-16 border-t border-[#ddd] pt-8 text-center text-sm text-[#555]">
          <p>© {year} Piloto.</p>
          <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link
              href="/termos"
              className="text-black underline decoration-black/30 underline-offset-2"
            >
              Termos de uso
            </Link>
            <span aria-hidden className="text-[#ccc]">
              ·
            </span>
            <Link
              href="/privacidade"
              className="text-black underline decoration-black/30 underline-offset-2"
            >
              Política de privacidade
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
