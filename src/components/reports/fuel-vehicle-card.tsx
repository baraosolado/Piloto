import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDecimal1, formatInt } from "@/lib/format-reports";
import { cn } from "@/lib/utils";

type MaintItem = {
  nome: string;
  status: "ok" | "warning" | "overdue";
  badgeLabel: string;
  kmFaltam: number | null;
};

function statusBadgeClass(s: MaintItem["status"]) {
  switch (s) {
    case "ok":
      return "border-0 bg-[#E1F5EE] text-[#085041] hover:bg-[#E1F5EE]";
    case "warning":
      return "border-0 bg-[#FAEEDA] text-[#633806] hover:bg-[#FAEEDA]";
    default:
      return "border-0 bg-[#FCEBEB] text-[#791F1F] hover:bg-[#FCEBEB]";
  }
}

type Props = {
  abastecimentos: {
    totalLitros: number;
    totalGasto: number;
    precoMedioLitro: number;
    quantidade: number;
  };
  eficienciaVeiculo: {
    consumoRealKmL: number | null;
    custoKmCombustivel: number;
    custoKmTotal: number;
    depreciacaoKm: number;
  };
  manutencao: {
    itens: MaintItem[];
    provisaoPorKm: number;
    gastoMes: number;
  };
};

export function FuelVehicleCard(p: Props) {
  return (
    <div className="rounded-lg border border-[#eeeeee] bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-black">
        Combustível e veículo
      </h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-[#eeeeee]">
        <div className="space-y-2 text-sm lg:pr-6">
          <Stat label="Total litros" value={`${formatDecimal1(p.abastecimentos.totalLitros)} L`} />
          <Stat label="Total gasto" value={formatBRL(p.abastecimentos.totalGasto)} />
          <Stat
            label="Preço médio/L"
            value={formatBRL(p.abastecimentos.precoMedioLitro)}
          />
          <Stat
            label="Qtd abastec."
            value={`${formatInt(p.abastecimentos.quantidade)} vezes`}
          />
        </div>
        <div className="space-y-2 text-sm lg:px-6">
          <Stat
            label="Consumo real"
            value={
              p.eficienciaVeiculo.consumoRealKmL != null
                ? `${formatDecimal1(p.eficienciaVeiculo.consumoRealKmL)} km/l`
                : "—"
            }
          />
          <Stat
            label="Custo/km real"
            value={formatBRL(p.eficienciaVeiculo.custoKmCombustivel)}
          />
          <Stat
            label="Custo/km total"
            value={formatBRL(p.eficienciaVeiculo.custoKmTotal)}
          />
          <Stat
            label="Depreciação/km"
            value={formatBRL(p.eficienciaVeiculo.depreciacaoKm)}
          />
        </div>
        <div className="space-y-4 text-sm lg:pl-6">
          {p.manutencao.itens.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum item de manutenção cadastrado.
            </p>
          ) : (
            p.manutencao.itens.map((it) => (
              <div key={it.nome} className="space-y-1 border-b border-[#f0f0f0] pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.nome}:</span>
                  <Badge className={cn("text-xs", statusBadgeClass(it.status))}>
                    {it.badgeLabel}
                  </Badge>
                </div>
                {it.kmFaltam != null ? (
                  <div className="flex justify-between gap-2 pl-0.5">
                    <span className="text-muted-foreground">Faltam</span>
                    <span className="tabular-nums font-medium">
                      {formatInt(Math.round(it.kmFaltam))} km
                    </span>
                  </div>
                ) : null}
              </div>
            ))
          )}
          <Stat
            label="Provisão/km"
            value={formatBRL(p.manutencao.provisaoPorKm)}
          />
          <Stat
            label="Gasto manutenção"
            value={formatBRL(p.manutencao.gastoMes)}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold tabular-nums text-black">
        {value}
      </span>
    </div>
  );
}
