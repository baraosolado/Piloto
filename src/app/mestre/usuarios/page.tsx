import { MestreUsuariosClient } from "@/components/mestre/mestre-usuarios-client";

export default function MestreUsuariosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Utilizadores
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 md:text-base">
          Ative ou desative contas, personifique para ver a app como o motorista.
          Ações de banimento encerram sessões existentes desse utilizador.
        </p>
      </div>
      <MestreUsuariosClient />
    </div>
  );
}
