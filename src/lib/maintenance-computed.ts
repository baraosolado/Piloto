/** Status de alerta conforme % do intervalo desde o último serviço. */
export type MaintenanceAlertStatus = "ok" | "warning" | "overdue";

export type MaintenanceDerived = {
  nextServiceKm: number;
  kmSinceLastService: number | null;
  /** `kmSinceLastService / intervalKm` (0–1+); `null` sem odômetro atual. */
  percentageDue: number | null;
  status: MaintenanceAlertStatus;
  /** `nextServiceKm - currentOdometer`; negativo = km além do previsto. */
  kmUntilDue: number | null;
};

export function computeMaintenanceDerived(
  currentOdometer: number | null | undefined,
  lastServiceKm: number,
  intervalKm: number,
): MaintenanceDerived {
  const nextServiceKm = lastServiceKm + intervalKm;
  if (
    currentOdometer === null ||
    currentOdometer === undefined ||
    intervalKm <= 0
  ) {
    return {
      nextServiceKm,
      kmSinceLastService: null,
      percentageDue: null,
      status: "ok",
      kmUntilDue: null,
    };
  }

  const kmSinceLastService = currentOdometer - lastServiceKm;
  const percentageDue = kmSinceLastService / intervalKm;
  let status: MaintenanceAlertStatus;
  if (percentageDue >= 1) status = "overdue";
  else if (percentageDue >= 0.8) status = "warning";
  else status = "ok";

  const kmUntilDue = nextServiceKm - currentOdometer;

  return {
    nextServiceKm,
    kmSinceLastService,
    percentageDue,
    status,
    kmUntilDue,
  };
}

export function sumProvisionPerKm(
  items: { estimatedCost: number | null; intervalKm: number }[],
): number {
  let s = 0;
  for (const it of items) {
    if (it.intervalKm <= 0) continue;
    const c = it.estimatedCost;
    if (c === null || c <= 0) continue;
    s += c / it.intervalKm;
  }
  return s;
}
