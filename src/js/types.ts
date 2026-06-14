export interface Inputs {
  homePrice: number;
  downPayment: number;
  ccBalance: number;
  province: string;
  annualRate: number;
  amortizationYears: number;
  termYears: number;
  compounding: 'semi' | 'monthly';
  frequency: 'monthly' | 'semi-monthly' | 'bi-weekly' | 'accelerated-bi-weekly';
  usePiti: boolean;
  taxRate: number;
  insRate: number;
  hoaRate: number;
  pmiRate: number;
  useOppCost: boolean;
  investRate: number;
  extraPayment: number;
  startDate: string;
  rateShockEnabled: boolean;
  termRates: Record<number, number>;
}

export interface ScheduleRow {
  period: number;
  year: number;
  calendarYear: number;
  dateLabel: string;
  ltv: number;
  payment: number;
  principal: number;
  interest: number;
  tax: number;
  ins: number;
  hoa: number;
  pmi: number;
  escrow: number;
  extra: number;
  balance: number;
  totalInterest: number;
  totalPrincipal: number;
  totalExtra: number;
  totalEscrow: number;
}

export interface ScheduleSummary {
  periodsToPayoff: number;
  periodsPerYear: number;
  totalInterest: number;
  totalPrincipal: number;
  totalEscrow: number;
}

export interface ScheduleResult {
  schedule: ScheduleRow[];
  summary: ScheduleSummary;
}

export interface Profile {
  id: string;
  name: string;
  currentMode: 'mortgage' | 'cc';
  complexity: 'simple' | 'advanced';
  isDark: boolean;
  termRates: Record<number, number>;
  customizedYears: Record<number, boolean>;
  bankWagesView: 'wages' | 'rent' | 'rent-tax-ins';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: Record<string, any>;
}

export interface AppState {
  isDark: boolean;
  currentMode: 'mortgage' | 'cc';
  complexity: 'simple' | 'advanced';
  termRates: Record<number, number>;
  customizedYears: Record<number, boolean>;
  labelFormat: 'date' | 'period';
  activeProfileId: string | null;
  comparisonProfileId: string | null;
  compareModeActive: boolean;
  profiles: Record<string, Profile>;
  bankWagesView: 'wages' | 'rent' | 'rent-tax-ins';
  chartsOrder?: (string | null)[];
  strategyOrder?: (string | null)[];
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  period: string;
  desc: string;
  sowhat: string;
  badge: string;
  isBaseline: boolean;
}
