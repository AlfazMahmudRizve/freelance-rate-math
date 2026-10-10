# freelance-rate-math

[![npm version](https://img.shields.io/npm/v/freelance-rate-math.svg?style=flat-square)](https://www.npmjs.com/package/freelance-rate-math)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Interactive Calculator](https://img.shields.io/badge/Interactive_Calculator-FastTools.me-1B4520?style=flat-square)](https://fasttools.me/freelance-rate-calculator)

A zero-dependency, pure TypeScript minor-unit integer math library for **freelance hourly/day rate modeling**, **reverse take-home netting**, self-employment tax adjustments, and contractor capacity planning.

> **Interactive Workbench**: Model your freelance rates with real-time tax and expense sliders on the [FastTools Freelance Rate Calculator](https://fasttools.me/freelance-rate-calculator).

---

## Features

- **Zero External Dependencies**: Pure TypeScript, zero runtime overhead (<4KB bundle).
- **Target Net to Hourly Rate (Reverse Netting)**: Calculate the exact hourly, day, sprint, and monthly retainer rates required to hit an annual take-home income target after taxes and overhead.
- **Hourly Rate to Take-Home Pay (Forward)**: Break down gross billing projections into estimated tax reserves, overhead coverage, and true net bank deposits.
- **Capacity Modeling**: Accurately accounts for billable utilization hours, unpaid vacation, sick leave, public holidays, and bench time.
- **Dual ESM & CommonJS**: Full compatibility with Node.js and browser environments.

---

## Installation

```bash
npm install freelance-rate-math
# or
yarn add freelance-rate-math
# or
pnpm add freelance-rate-math
```

---

## Quick Start

```typescript
import { calculateFreelanceRates } from 'freelance-rate-math';

// Want $100,000 take-home pay, working 25 billable hrs/week with 6 weeks off?
const result = calculateFreelanceRates({
  currency: 'USD',
  mode: 'target_to_rate',
  targetNetIncome: 100000,
  hourlyRate: 0,
  billableHoursPerWeek: 25,
  weeksOff: 6,
  annualExpenses: 12000,
  taxRatePct: 30, // Federal + State + 15.3% SE tax buffer
  profitBufferPct: 10 // Retirement / cushion reserve
});

console.log(result.hourlyRate);          // $156 / hr
console.log(result.dayRate);             // $1,248 / day (8h)
console.log(result.grossAnnual);         // $179,400 gross billings required
console.log(result.annualBillableHours); // 1,150 billable hours / year
console.log(result.w2ParityMultiplier);  // 1.79x (Contractor rate vs W2)
```

---

## Interactive Web Utility

Model custom tax brackets, currency switches, and client rate tiers:

👉 **[FastTools Freelance Rate & Invoice Calculator](https://fasttools.me/freelance-rate-calculator)**

---

## License

MIT © [Alfaz Mahmud Rizve](https://whoisalfaz.me) • Part of [FastTools](https://fasttools.me)
