/**
 * Funções puras de domínio financeiro para corridas, gastos e metas.
 * Sem efeitos colaterais; interpretação de datas via componentes UTC de `Date`,
 * alinhado a timestamps armazenados em UTC no backend.
 */

/** Plataformas suportadas (espelha o enum do banco). */
export type Platform = "uber" | "99" | "indrive" | "particular";

/** Categorias de gasto (espelha o enum do banco). */
export type ExpenseCategory =
  | "fuel"
  | "maintenance"
  | "insurance"
  | "fine"
  | "other";

/** Dados de veículo necessários para custo por corrida (valores numéricos já convertidos). */
export type Vehicle = {
  /**
   * Consumo médio: km/l se `powertrain` for combustão; km/kWh se for elétrico
   * (omitido ou `combustion` = combustão).
   */
  fuelConsumption: number;
  /**
   * Preço por unidade de energia: R$/l (combustão) ou R$/kWh (elétrico).
   */
  fuelPrice: number;
  /** Depreciação estimada em R$/km. */
  depreciationPerKm: number;
  /** `electric` altera a interpretação de consumo/preço (unidades acima). */
  powertrain?: "combustion" | "electric";
};

/** Corrida para cálculos (valores numéricos já convertidos). */
export type Ride = {
  grossAmount: number;
  distanceKm: number;
  startedAt: Date;
  durationMinutes: number | null;
  platform: Platform;
};

/** Gasto para agregações (valores numéricos já convertidos). */
export type Expense = {
  category: ExpenseCategory;
  amount: number;
  occurredAt: Date;
};

/** Meta mensal (valores numéricos já convertidos). */
export type Goal = {
  monthlyTarget: number;
  month: number;
  year: number;
};

/** Lucro líquido por turno: manhã, tarde, noite (pós-18h) e madrugada. */
export type ScoreByShift = {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
};

/** Progresso da meta no mês de referência da meta. */
export type GoalProgress = {
  totalEarned: number;
  percentage: number;
  /** Data estimada para atingir a meta no ritmo atual; `null` se não for possível estimar. */
  projectedCompletion: Date | null;
  /** Média de lucro líquido por dia com corrida no mês (dias únicos com ao menos uma corrida). */
  dailyAverage: number;
};

/** Resumo agregado por plataforma. */
export type PlatformSummary = {
  platform: Platform;
  totalGross: number;
  rideCount: number;
  totalNetProfit: number;
  profitPerHour: number;
};

function shiftFromHourUtc(hour: number): keyof ScoreByShift {
  if (hour >= 0 && hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Turno da corrida pela hora UTC de `startedAt` (mesma regra de {@link calculateEfficiencyScore}). */
export function shiftKeyFromRideStartedAt(startedAt: Date): keyof ScoreByShift {
  return shiftFromHourUtc(startedAt.getUTCHours());
}

/** Índice de coluna Seg–Dom (0=seg, 6=dom) a partir de `getUTCDay()` (0=dom … 6=sáb). */
export function utcDayToMondayFirstIndex(utcDay: number): number {
  return utcDay === 0 ? 6 : utcDay - 1;
}

function isRideInGoalMonth(ride: Ride, goal: Goal): boolean {
  const d = ride.startedAt;
  return d.getUTCFullYear() === goal.year && d.getUTCMonth() + 1 === goal.month;
}

function uniqueUtcDays(dates: Date[]): number {
  const keys = new Set<string>();
  for (const d of dates) {
    keys.add(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return keys.size;
}

function addUtcDays(base: Date, days: number): Date {
  const t = base.getTime() + days * 86_400_000;
  return new Date(t);
}

/**
 * Custo **estimado** da corrida ao lançar: energia (km ÷ consumo × preço por unidade) + depreciação por km.
 * Unidade de consumo/preço depende de {@link Vehicle.powertrain} (l ou kWh).
 * Útil na prévia da corrida e em comparativos **por viagem**. No fechamento do mês, o combustível
 * real deve vir dos gastos (`fuel`); para não contar duas vezes, use {@link calculateRideCostForPnlAggregate}.
 *
 * @param distanceKm Distância percorrida em km.
 * @param vehicle Parâmetros do veículo.
 * @returns Custo em R$. `NaN` se `distanceKm` ou `fuelConsumption` forem inválidos (≤ 0).
 */
export function calculateRideCost(
  distanceKm: number,
  vehicle: Vehicle,
): number {
  if (distanceKm <= 0 || vehicle.fuelConsumption <= 0) {
    return Number.NaN;
  }
  const fuelLiters = distanceKm / vehicle.fuelConsumption;
  const fuelCost = fuelLiters * vehicle.fuelPrice;
  const depreciation = distanceKm * vehicle.depreciationPerKm;
  return fuelCost + depreciation;
}

/**
 * Custo por corrida usado no **lucro do período** (dashboard, gráfico diário, metas agregadas,
 * inteligência, relatório): só depreciação por km. O combustível entra pelos **gastos reais**
 * (categoria `fuel`), evitando dupla contagem com a estimativa de {@link calculateRideCost}.
 */
export function calculateRideCostForPnlAggregate(
  distanceKm: number,
  vehicle: Vehicle,
): number {
  if (distanceKm <= 0 || !Number.isFinite(distanceKm)) {
    return Number.NaN;
  }
  const dep = distanceKm * vehicle.depreciationPerKm;
  return Number.isFinite(dep) ? dep : Number.NaN;
}

/**
 * Lucro líquido da corrida: valor bruto menos custo total.
 *
 * @param grossAmount Valor bruto recebido (R$).
 * @param rideCost Custo total da corrida (R$), tipicamente de {@link calculateRideCost}.
 * @returns Lucro líquido em R$.
 */
export function calculateRideProfit(
  grossAmount: number,
  rideCost: number,
): number {
  return grossAmount - rideCost;
}

/**
 * Custo médio por km rodado no período: total de gastos em combustível ÷ soma dos km das corridas.
 *
 * @param expenses Lista de gastos (usa apenas `category === "fuel"`).
 * @param rides Lista de corridas (soma `distanceKm`).
 * @returns Custo médio em R$/km. `0` se não houver km rodados.
 */
export function calculateCostPerKm(
  expenses: Expense[],
  rides: Ride[],
): number {
  const totalFuel = expenses
    .filter((e) => e.category === "fuel")
    .reduce((s, e) => s + e.amount, 0);
  const totalKm = rides.reduce((s, r) => s + r.distanceKm, 0);
  if (totalKm <= 0) return 0;
  return totalFuel / totalKm;
}

/**
 * Score de eficiência por turno: soma do lucro líquido no turno ÷ soma das horas trabalhadas no turno.
 * Turnos (hora UTC de `startedAt`): madrugada [0,6) → `night`, manhã [6,12) → `morning`,
 * tarde [12,18) → `afternoon`, noite [18,24) → `evening`.
 * Corridas sem `durationMinutes` não entram nas horas nem no lucro do turno.
 *
 * @param rides Corridas do período analisado.
 * @param expenses Paridade com a API pública; reservado para extensões (não utilizado).
 * @param vehicle Veículo para custo e lucro por corrida.
 * @returns Lucro líquido por hora (R$/h) em cada turno; `0` quando não houver horas no turno.
 */
export function calculateEfficiencyScore(
  rides: Ride[],
  expenses: Expense[],
  vehicle: Vehicle,
): ScoreByShift {
  void expenses;
  const profitByShift: Record<keyof ScoreByShift, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };
  const hoursByShift: Record<keyof ScoreByShift, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  for (const ride of rides) {
    const mins = ride.durationMinutes;
    if (mins === null || mins <= 0) continue;

    const cost = calculateRideCostForPnlAggregate(ride.distanceKm, vehicle);
    if (Number.isNaN(cost)) continue;
    const profit = calculateRideProfit(ride.grossAmount, cost);
    const hours = mins / 60;
    const shift = shiftFromHourUtc(ride.startedAt.getUTCHours());
    profitByShift[shift] += profit;
    hoursByShift[shift] += hours;
  }

  const score = (shift: keyof ScoreByShift): number => {
    const h = hoursByShift[shift];
    if (h <= 0) return 0;
    return profitByShift[shift] / h;
  };

  return {
    morning: score("morning"),
    afternoon: score("afternoon"),
    evening: score("evening"),
    night: score("night"),
  };
}

/**
 * Progresso da meta mensal: lucro líquido acumulado no mês/ano da meta, percentual,
 * média diária (por dias únicos com corrida) e data projetada de conclusão.
 *
 * @param goal Meta do mês (`month` 1–12).
 * @param rides Corridas; filtradas pelo mês/ano de `goal` (via UTC).
 * @param expenses Paridade com a API pública; reservado (não altera `totalEarned`).
 * @param vehicle Veículo para custo e lucro por corrida.
 * @returns `projectedCompletion` é a última corrida se a meta já foi atingida; caso contrário,
 *          estimativa somando dias necessários à última corrida com base em `dailyAverage`;
 *          `null` se não houver como projetar.
 */
export function calculateMonthlyGoalProgress(
  goal: Goal,
  rides: Ride[],
  expenses: Expense[],
  vehicle: Vehicle,
): GoalProgress {
  void expenses;
  const inMonth = rides.filter((r) => isRideInGoalMonth(r, goal));

  let totalEarned = 0;
  const rideDates: Date[] = [];
  let latestRide = 0;

  for (const ride of inMonth) {
    const cost = calculateRideCostForPnlAggregate(ride.distanceKm, vehicle);
    if (Number.isNaN(cost)) continue;
    totalEarned += calculateRideProfit(ride.grossAmount, cost);
    rideDates.push(ride.startedAt);
    const t = ride.startedAt.getTime();
    if (t > latestRide) latestRide = t;
  }

  const target = goal.monthlyTarget;
  const percentage = target > 0 ? (totalEarned / target) * 100 : 0;
  const distinctDays = rideDates.length > 0 ? uniqueUtcDays(rideDates) : 0;
  const dailyAverage =
    distinctDays > 0 ? totalEarned / distinctDays : 0;

  let projectedCompletion: Date | null = null;
  if (totalEarned >= target && rideDates.length > 0) {
    projectedCompletion = new Date(latestRide);
  } else if (
    dailyAverage > 0 &&
    totalEarned < target &&
    rideDates.length > 0
  ) {
    const remaining = target - totalEarned;
    const daysNeeded = Math.ceil(remaining / dailyAverage);
    projectedCompletion = addUtcDays(new Date(latestRide), daysNeeded);
  }

  return {
    totalEarned,
    percentage,
    projectedCompletion,
    dailyAverage,
  };
}

/**
 * Agrega corridas por plataforma: faturamento bruto, quantidade, lucro líquido e lucro por hora.
 * Corridas sem duração não contribuem para horas no denominador de `profitPerHour`.
 * Sempre retorna as quatro plataformas; contagens zeradas se não houver corridas.
 *
 * @param rides Corridas do período.
 * @param expenses Paridade com a API pública; reservado (não utilizado).
 * @param vehicle Veículo para custo e lucro por corrida.
 */
export function groupRidesByPlatform(
  rides: Ride[],
  expenses: Expense[],
  vehicle: Vehicle,
): PlatformSummary[] {
  void expenses;
  const platforms: Platform[] = ["uber", "99", "indrive", "particular"];
  const byPlatform = new Map<
    Platform,
    { gross: number; count: number; net: number; minutes: number }
  >();

  for (const p of platforms) {
    byPlatform.set(p, { gross: 0, count: 0, net: 0, minutes: 0 });
  }

  for (const ride of rides) {
    const bucket = byPlatform.get(ride.platform);
    if (!bucket) continue;

    bucket.gross += ride.grossAmount;
    bucket.count += 1;

    const cost = calculateRideCostForPnlAggregate(ride.distanceKm, vehicle);
    if (!Number.isNaN(cost)) {
      bucket.net += calculateRideProfit(ride.grossAmount, cost);
    }
    if (ride.durationMinutes !== null && ride.durationMinutes > 0) {
      bucket.minutes += ride.durationMinutes;
    }
  }

  return platforms.map((platform) => {
    const b = byPlatform.get(platform)!;
    const hours = b.minutes / 60;
    const profitPerHour = hours > 0 ? b.net / hours : 0;
    return {
      platform,
      totalGross: b.gross,
      rideCount: b.count,
      totalNetProfit: b.net,
      profitPerHour,
    };
  });
}
