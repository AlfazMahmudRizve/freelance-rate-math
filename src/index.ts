// Type definitions
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  minorUnit: number;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", minorUnit: 100 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", minorUnit: 100 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", minorUnit: 100 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", minorUnit: 100 },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", minorUnit: 100 },
};

export type CalculationMode = "target_to_rate" | "rate_to_takehome";

export interface FreelanceCalculatorInputs {
  currency: CurrencyCode;
  mode: CalculationMode;
  targetNetIncome: number;      // In currency units (e.g. 100000)
  hourlyRate: number;           // In currency units (e.g. 95)
  billableHoursPerWeek: number; // e.g. 25
  weeksOff: number;             // e.g. 6 (vacation + sick + holidays + bench)
  annualExpenses: number;       // In currency units (e.g. 12000)
  taxRatePct: number;           // e.g. 30 (covers federal + state + 15.3% SE tax)
  profitBufferPct: number;      // e.g. 10 (cushion / retirement contribution)
}

export interface FreelanceCalculationResult {
  // Capacity Metrics
  workingWeeks: number;
  annualBillableHours: number;

  // Rate Matrix (in currency units, 2 decimals)
  hourlyRate: number;
  dayRate: number;              // 8 hours standard
  sprintDayRate: number;        // 1.15x for short-term/urgent contracts
  weeklyInvoiced: number;
  monthlyInvoiced: number;
  monthlyRetainer20h: number;   // 20 hrs/mo with 10% volume incentive

  // Annual Financials
  grossAnnual: number;
  taxAmount: number;
  profitAmount: number;
  expensesAmount: number;
  netAnnual: number;
  netMonthly: number;

  // Efficiency & Parity
  effectiveHourlyNet: number;   // Real bank deposit per billable hour
  retentionRatePct: number;     // Net / Gross percentage
  w2ParityMultiplier: number;   // Gross / Net ratio (e.g. 1.78x)
}


// Calculation engine


/**
 * Pure integer minor-unit calculation engine for Freelance Rate & Invoice Netting.
 * Operates on integer cents and basis points to eliminate IEEE 754 precision drift.
 */
export function calculateFreelanceRates(
  inputs: FreelanceCalculatorInputs
): FreelanceCalculationResult {
  const {
    mode,
    targetNetIncome,
    hourlyRate,
    billableHoursPerWeek,
    weeksOff,
    annualExpenses,
    taxRatePct,
    profitBufferPct,
  } = inputs;

  // 1. Capacity Model
  const safeWeeksOff = Math.max(0, Math.min(51, Math.round(weeksOff || 0)));
  const workingWeeks = 52 - safeWeeksOff;
  const safeWeeklyHours = Math.max(1, Math.min(80, Number(billableHoursPerWeek) || 1));
  const annualBillableHours = Math.max(1, workingWeeks * safeWeeklyHours);

  // 2. Basis Points Conversion
  const safeTaxRatePct = Math.max(0, Math.min(80, Number(taxRatePct) || 0));
  const safeProfitPct = Math.max(0, Math.min(80, Number(profitBufferPct) || 0));
  const taxBps = Math.round(safeTaxRatePct * 100);
  const profitBps = Math.round(safeProfitPct * 100);
  const combinedDeductionBps = Math.min(9500, taxBps + profitBps);

  const expensesCents = Math.max(0, Math.round((annualExpenses || 0) * 100));

  let hourlyRateCents = 0;
  let grossCents = 0;
  let netCents = 0;
  let taxCents = 0;
  let profitCents = 0;

  if (mode === "target_to_rate") {
    // MODE A: Target Net -> Required Gross & Hourly Rate
    netCents = Math.max(0, Math.round((targetNetIncome || 0) * 100));

    // Retention factor: percentage of taxable income retained after tax and profit reserves
    const retentionFactor = (10000 - combinedDeductionBps) / 10000;
    const preTaxProfitNeededCents =
      retentionFactor > 0 ? Math.ceil(netCents / retentionFactor) : netCents;

    // Gross billings required = Pre-tax profit needed + deductible business overhead
    const requiredGrossCents = preTaxProfitNeededCents + expensesCents;

    // Hourly rate in cents (rounded up to nearest cent)
    hourlyRateCents = Math.ceil(requiredGrossCents / annualBillableHours);

    // Recompute actual annualized totals based on the discrete hourly rate
    grossCents = hourlyRateCents * annualBillableHours;
    const taxableBaseCents = Math.max(0, grossCents - expensesCents);
    taxCents = Math.round((taxableBaseCents * taxBps) / 10000);
    profitCents = Math.round((taxableBaseCents * profitBps) / 10000);
  } else {
    // MODE B: Quoted Hourly Rate -> Real Take-Home Pay
    hourlyRateCents = Math.max(0, Math.round((hourlyRate || 0) * 100));
    grossCents = hourlyRateCents * annualBillableHours;

    const taxableBaseCents = Math.max(0, grossCents - expensesCents);
    taxCents = Math.round((taxableBaseCents * taxBps) / 10000);
    profitCents = Math.round((taxableBaseCents * profitBps) / 10000);

    netCents = grossCents - expensesCents - taxCents - profitCents;
  }

  // 3. Rate Matrix Computations
  const dayRateCents = hourlyRateCents * 8;
  const sprintDayRateCents = Math.round(dayRateCents * 1.15); // +15% short-term sprint premium
  const weeklyInvoicedCents = Math.round(grossCents / workingWeeks);
  const monthlyInvoicedCents = Math.round(grossCents / 12);
  const retainer20hCents = Math.round(hourlyRateCents * 20 * 0.9); // 20 hrs with 10% volume incentive

  // 4. Financial Conversions (Cents to Currency Units)
  const hourlyRateFinal = hourlyRateCents / 100;
  const dayRateFinal = dayRateCents / 100;
  const sprintDayRateFinal = sprintDayRateCents / 100;
  const weeklyInvoicedFinal = weeklyInvoicedCents / 100;
  const monthlyInvoicedFinal = monthlyInvoicedCents / 100;
  const retainerFinal = retainer20hCents / 100;

  const grossAnnualFinal = grossCents / 100;
  const taxAmountFinal = taxCents / 100;
  const profitAmountFinal = profitCents / 100;
  const expensesAmountFinal = expensesCents / 100;
  const netAnnualFinal = netCents / 100;
  const netMonthlyFinal = Math.round((netCents / 12)) / 100;

  // 5. Efficiency & Parity
  const effectiveHourlyNetFinal =
    annualBillableHours > 0
      ? Math.round((netCents / annualBillableHours)) / 100
      : 0;

  const retentionRatePct =
    grossCents > 0
      ? Math.round((netCents / grossCents) * 1000) / 10
      : 0;

  const w2ParityMultiplier =
    netCents > 0
      ? Math.round((grossCents / netCents) * 100) / 100
      : 1;

  return {
    workingWeeks,
    annualBillableHours,
    hourlyRate: hourlyRateFinal,
    dayRate: dayRateFinal,
    sprintDayRate: sprintDayRateFinal,
    weeklyInvoiced: weeklyInvoicedFinal,
    monthlyInvoiced: monthlyInvoicedFinal,
    monthlyRetainer20h: retainerFinal,
    grossAnnual: grossAnnualFinal,
    taxAmount: taxAmountFinal,
    profitAmount: profitAmountFinal,
    expensesAmount: expensesAmountFinal,
    netAnnual: netAnnualFinal,
    netMonthly: netMonthlyFinal,
    effectiveHourlyNet: effectiveHourlyNetFinal,
    retentionRatePct,
    w2ParityMultiplier,
  };
}

/**
 * Currency formatter with symbol and thousand separators
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD"
): string {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amount < 0 ? "-" : "";
  return `${sign}${config.symbol}${formatted}`;
}

/**
 * Percentage formatter
 */
export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

