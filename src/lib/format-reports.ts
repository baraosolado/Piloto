const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const dec1Fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pctFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatBRL(value: number): string {
  return brlFmt.format(value);
}

export function formatPercent(value: number): string {
  return `${pctFmt.format(value)}%`;
}

export function formatInt(value: number): string {
  return intFmt.format(Math.round(value));
}

export function formatDecimal1(value: number): string {
  return dec1Fmt.format(value);
}

export function formatKm(value: number): string {
  return `${intFmt.format(Math.round(value))} km`;
}

export function formatHoras(value: number): string {
  return `${dec1Fmt.format(value)} h`;
}
