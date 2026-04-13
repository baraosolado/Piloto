import type { Vehicle } from "@/lib/calculations";
import { vehicles } from "@/db/schema";

type VehicleRow = typeof vehicles.$inferSelect;

/**
 * Tipo de propulsão do veículo no banco.
 * - `combustion`: `fuel_consumption` = km/l, `fuel_price` = R$/l
 * - `electric`: `fuel_consumption` = km/kWh, `fuel_price` = R$/kWh
 *
 * A fórmula de custo energético por km em {@link calculateRideCost} é a mesma:
 * (km ÷ consumo_por_unidade) × preço_por_unidade.
 */

export const VEHICLE_POWERTRAINS = ["combustion", "electric"] as const;
export type VehiclePowertrain = (typeof VEHICLE_POWERTRAINS)[number];

export function normalizePowertrain(
  raw: string | null | undefined,
): VehiclePowertrain {
  return raw === "electric" ? "electric" : "combustion";
}

export function consumptionBounds(pt: VehiclePowertrain): {
  min: number;
  max: number;
} {
  return pt === "electric" ? { min: 2, max: 22 } : { min: 3, max: 30 };
}

export function fuelPriceBounds(pt: VehiclePowertrain): {
  min: number;
  max: number;
} {
  return pt === "electric" ? { min: 0.15, max: 4 } : { min: 3, max: 15 };
}

/** Valor gravado quando o utilizador não envia consumo (onboarding / API). */
export function defaultConsumptionStored(pt: VehiclePowertrain): number {
  return pt === "electric" ? 5.5 : 12;
}

/** Prévia no onboarding antes do primeiro registro em Corridas. */
export function previewConsumptionKmPerUnit(pt: VehiclePowertrain): number {
  return defaultConsumptionStored(pt);
}

/** Unidade de consumo cadastrado no veículo (ex.: rótulos de relatório). */
export function consumptionUnitSuffix(
  pt: VehiclePowertrain,
): "km/l" | "km/kWh" {
  return pt === "electric" ? "km/kWh" : "km/l";
}

/**
 * Volume informado em gastos da categoria `fuel` (campo `liters` no banco).
 * Para elétrico, trate como kWh na interface.
 */
export function fuelVolumeUnitShort(pt: VehiclePowertrain): "L" | "kWh" {
  return pt === "electric" ? "kWh" : "L";
}

/** Rótulo da categoria de gasto `fuel` na UI (lista, filtros, formulário). */
export function fuelCategoryUiLabel(pt: VehiclePowertrain): string {
  return pt === "electric" ? "Energia" : "Combustível";
}

export function fuelCategoryUiShort(pt: VehiclePowertrain): string {
  return pt === "electric" ? "Energ." : "Comb.";
}

/**
 * Textos para registro de gastos `fuel` (abastecimento vs recarga).
 * O valor continua no campo `liters` no banco; na UI elétrico mostra kWh.
 */
export function fuelExpenseUi(pt: VehiclePowertrain) {
  const ev = pt === "electric";
  const vol = fuelVolumeUnitShort(pt);
  return {
    categoryLabel: fuelCategoryUiLabel(pt),
    categoryShort: fuelCategoryUiShort(pt),
    volumeFieldLabel: ev ? "kWh recarregados" : "Litros",
    volumeInputSuffix: vol,
    volumeRequiredToast: ev
      ? "Informe a quantidade de kWh recarregados."
      : "Informe os litros abastecidos.",
    costPerVolumeTitle: ev ? "Custo por kWh" : "Custo por litro",
    costPerKmFillTitle: ev
      ? "Custo/km (esta recarga)"
      : "Custo/km (este abastecimento)",
    noPreviousWithOdometer: ev
      ? "Sem recarga anterior com odômetro para comparar."
      : "Sem abastecimento anterior com odômetro para comparar.",
    kmSinceLast: ev
      ? "Km desde a última recarga"
      : "Km desde o último abastecimento",
    apiOdometerRequired: ev
      ? "Odômetro obrigatório para registrar energia."
      : "Odômetro obrigatório para combustível.",
    apiVolumeRequired: ev
      ? "Informe os kWh para registrar energia."
      : "Litros obrigatórios para combustível.",
    costPerKmCardTitle: ev
      ? "Custo/km (energia ÷ km corridas)"
      : "Custo/km (combustível ÷ km corridas)",
    emptyStateHint: ev
      ? "Registre recargas e despesas do carro para ver custo por km e totais."
      : "Registre abastecimentos e despesas do carro para ver custo por km e totais.",
    estimateHint: ev
      ? "Registre recarga e corridas no período para estimar."
      : "Registre abastecimento e corridas no período para estimar.",
    /** Cabeçalho CSV: coluna numérica ainda é `liters` no export. */
    csvVolumeColumn: ev ? "kwh" : "litros",
  };
}

/** Monta o objeto usado em {@link calculateRideCost} a partir da linha `vehicles`. */
export function vehicleFromVehicleRow(
  row: Pick<
    VehicleRow,
    "fuelConsumption" | "fuelPrice" | "depreciationPerKm" | "powertrain"
  >,
): Vehicle {
  return {
    fuelConsumption: Number(row.fuelConsumption),
    fuelPrice: Number(row.fuelPrice),
    depreciationPerKm: Number(row.depreciationPerKm),
    powertrain: normalizePowertrain(row.powertrain),
  };
}
