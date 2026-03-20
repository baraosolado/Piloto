/** Escape de célula CSV (RFC 4180). */
export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvLine(cells: string[]): string {
  return `${cells.map(csvCell).join(",")}\r\n`;
}
