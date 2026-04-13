/**
 * Valores e regras comerciais do Premium exibidos na UI.
 * Os preços cobrados vêm dos Price IDs configurados no Stripe — mantenha alinhado.
 */

/** Mensalidade após o período de teste (R$). */
export const PREMIUM_MONTHLY_BRL = 12.9;

/**
 * Plano anual com desconto (12 meses em uma cobrança), após o trial.
 * Ex.: ~16% abaixo de 12 × mensal (R$ 154,80).
 */
export const PREMIUM_YEARLY_BRL = 129.9;

/** Dias de teste antes da primeira cobrança (mensal ou anual). */
export const PREMIUM_TRIAL_DAYS = 7;

export function formatPremiumBrl(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function premiumMonthlyFullYearBrl(): number {
  return Math.round(PREMIUM_MONTHLY_BRL * 12 * 100) / 100;
}

/** Economia aproximada do plano anual vs 12 mensalidades cheias. */
export function premiumYearlySavingsVsMonthlyBrl(): number {
  return Math.round((premiumMonthlyFullYearBrl() - PREMIUM_YEARLY_BRL) * 100) / 100;
}
