export interface LumpSumItem {
  id: string;
  amount: number;
  paymentNumber: number;
}

export interface Inputs {
  homePrice: number;
  downPayment: number;
  ccBalance: number;
  province: string;
  ccMinPercent?: number;
  ccMinPrincipalPct?: number;
  ccMinFlat?: number;
  annualRate: number;
  amortizationYears: number;
  termYears: number;
  compounding: 'semi' | 'monthly';
  frequency: 'monthly' | 'semi-monthly' | 'bi-weekly' | 'accelerated-bi-weekly' | 'weekly';
  usePiti: boolean;
  /** Annual Property Tax in dollars ($/Year) */
  taxRate: number;
  /** Annual Home Insurance in dollars ($/Year) */
  insRate: number;
  /** Monthly HOA fees in dollars ($/Month) */
  hoaRate: number;
  pmiRate: number;
  useOppCost: boolean;
  investRate: number;
  extraPayment: number;
  startDate: string;
  rateShockEnabled: boolean;
  termRates: Record<number, number>;
  lumpSum?: number;
  lumpSums?: LumpSumItem[];
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
  /** Whether the debt was fully paid off within max periods limit */
  paidOff?: boolean;
}

export interface ScheduleResult {
  schedule: ScheduleRow[];
  summary: ScheduleSummary;
}

export interface ProfileInputs {
  homePrice: string;
  downPayment: string;
  ccBalance: string;
  province: string;
  ccMinPercent?: string;
  ccMinPrincipalPct?: string;
  ccMinFlat?: string;
  rate: string;
  amortization: string;
  term: string;
  compounding: string;
  frequency: string;
  pitiToggle: boolean;
  tax: string;
  ins: string;
  hoa: string;
  pmi: string;
  oppCostToggle: boolean;
  investRate: string;
  extra: string;
  date: string;
  rateShockToggle: boolean;
  mortgageRate: string;
  mortgageExtra: string;
  ccRate: string;
  ccExtra: string;
  lumpSum?: string;
  lumpSums?: LumpSumItem[];
  [key: string]: string | boolean | LumpSumItem[] | undefined;
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
  inputs: ProfileInputs;
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
  currentTargetYears?: number;
  hiddenCards?: string[];
  fullWidthCards?: string[];
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

export interface AppElements {
  form: HTMLFormElement | null;
  inputs: {
    homePrice: HTMLInputElement | null;
    downPayment: HTMLInputElement | null;
    ccBalance: HTMLInputElement | null;
    province: HTMLSelectElement | null;
    ccMinPercent?: HTMLInputElement | null;
    ccMinPrincipalPct?: HTMLInputElement | null;
    ccMinFlat?: HTMLInputElement | null;
    rate: HTMLInputElement | null;
    amortization: HTMLInputElement | null;
    term: HTMLInputElement | null;
    compounding: HTMLSelectElement | null;
    countrySelect: HTMLSelectElement | null;
    frequency: HTMLSelectElement | null;
    pitiToggle: HTMLInputElement | null;
    tax: HTMLInputElement | null;
    ins: HTMLInputElement | null;
    hoa: HTMLInputElement | null;
    pmi: HTMLInputElement | null;
    oppCostToggle: HTMLInputElement | null;
    investRate: HTMLInputElement | null;
    extra: HTMLInputElement | null;
    date: HTMLInputElement | null;
    rateShockToggle: HTMLInputElement | null;
    lumpSum: HTMLInputElement | null;
  };
  results: {
    mortgageDisplay: HTMLElement | null;
    vampireDrain: HTMLElement | null;
    monthly: HTMLElement | null;
    breakdown: HTMLElement | null;
    termBalance: HTMLElement | null;
    paidOffIn: HTMLElement | null;
    saved: HTMLElement | null;
    svgInnerPrincipal: HTMLElement | null;
    svgInnerMarkup: HTMLElement | null;
    outPrincipalVal: HTMLElement | null;
    outMarkupVal: HTMLElement | null;
    actualLifetimePaidValue: HTMLElement | null;
    concentricStack: Element | null;
  };
  containers: {
    pitiSection: HTMLElement | null;
    oppCostSection: HTMLElement | null;
    comparison: HTMLElement | null;
    error: HTMLElement | null;
    escrowTh: HTMLElement | null;
    oppCost: HTMLElement | null;
    ltv: HTMLElement | null;
    rateShockSection: HTMLElement | null;
    rateShockTimeline: HTMLElement | null;
    milestoneCard: HTMLElement | null;
    milestoneTimeline: HTMLElement | null;
    lumpSumsContainer?: HTMLElement | null;
  };
  modeSwitch: HTMLInputElement | null;
  masterBtns: NodeListOf<Element>;
}
