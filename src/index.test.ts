import { describe, it, expect } from 'vitest';
import { calculateFreelanceRates } from './index';

describe('freelance-rate-math', () => {
  it('calculates target to hourly rate with tax buffer and overhead', () => {
    const res = calculateFreelanceRates({
      currency: 'USD',
      mode: 'target_to_rate',
      targetNetIncome: 100000,
      hourlyRate: 0,
      billableHoursPerWeek: 25,
      weeksOff: 6,
      annualExpenses: 12000,
      taxRatePct: 30,
      profitBufferPct: 10
    });
    expect(res.annualBillableHours).toBe(1150);
    expect(res.hourlyRate).toBe(155.37);
    expect(res.grossAnnual).toBe(178675.5);
    expect(res.netAnnual).toBeGreaterThan(99000);
  });

  it('calculates rate to take-home pay projection', () => {
    const res = calculateFreelanceRates({
      currency: 'USD',
      mode: 'rate_to_takehome',
      targetNetIncome: 0,
      hourlyRate: 100,
      billableHoursPerWeek: 30,
      weeksOff: 4,
      annualExpenses: 5000,
      taxRatePct: 25,
      profitBufferPct: 10
    });
    expect(res.annualBillableHours).toBe(1440);
    expect(res.grossAnnual).toBe(144000);
    expect(res.netAnnual).toBeGreaterThan(80000);
  });
});
