import Link from "next/link";
import { Shield, UserCog, Users } from "lucide-react";
import { INTERNAL_ADMIN_BASE_PATH } from "@/lib/internal-admin-path";

export default function MestreHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Visão geral
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base">
          Esta área não aparece para motoristas. Apenas contas com papel{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-semibold text-zinc-800">
            super_admin
          </code>{" "}
          acessam estas rotas; demais utilizadores recebem página inexistente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Users className="size-5" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Utilizadores</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Listar contas, ativar ou desativar acesso e personificar para suporte
            (sessão temporária como o motorista).
          </p>
          <Link
            href={`${INTERNAL_ADMIN_BASE_PATH}/usuarios`}
            className="mt-5 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Gerir utilizadores
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-[#006d33]/15 text-[#006d33]">
            <UserCog className="size-5" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Personificação</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Após personificar, a interface é a mesma app do motorista, com barra
            superior de aviso e botão para encerrar.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Shield className="size-4 text-[#006d33]" aria-hidden />
            Só visível durante personificação ativa
          </div>
        </div>
      </div>
    </div>
  );
}
