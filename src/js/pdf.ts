import { Inputs, ScheduleResult, ScheduleRow } from './types.js';
import { formatCurrency } from './charts.js';
import { escapeHtml } from './ui.js';
import { t, currentLanguage } from './i18n.js';
import type { Html2PdfFactory } from 'html2pdf.js';

let html2pdfInstance: Html2PdfFactory | null = null;

export const loadHtml2Pdf = async (): Promise<Html2PdfFactory | null> => {
  if (!html2pdfInstance) {
    const module = await import('html2pdf.js');
    html2pdfInstance = (module.default || module) as unknown as Html2PdfFactory;
  }
  return html2pdfInstance;
};

export const generateReportHtml = (
  inputs: Inputs,
  isMortgage: boolean,
  actualData: ScheduleResult,
  baseData: ScheduleResult
): string => {
  const isFr = currentLanguage() === 'fr';
  const reportDate = new Date().toLocaleString(isFr ? 'fr-CA' : undefined);

  const startingPrincipal = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;
  const balanceVal = formatCurrency(startingPrincipal);

  const isPayoffFinite = Number.isFinite(actualData.summary.periodsToPayoff);
  const periodsPerYr = actualData.summary.periodsPerYear || 12;
  const yrs_paid = isPayoffFinite
    ? Math.floor(actualData.summary.periodsToPayoff / periodsPerYr)
    : 0;
  const rem_paid = isPayoffFinite ? actualData.summary.periodsToPayoff % periodsPerYr : 0;

  let payoffVal = isFr ? 'Non remboursé' : 'Unpaid';
  if (isPayoffFinite) {
    const yrsLabel = isFr ? (yrs_paid > 1 ? 'ans' : 'an') : yrs_paid > 1 ? 'Years' : 'Year';
    let frequencyLabel: string;
    if (isFr) {
      frequencyLabel =
        isMortgage && inputs.frequency !== 'monthly'
          ? rem_paid > 1
            ? 'périodes'
            : 'période'
          : 'mois';
    } else {
      frequencyLabel =
        isMortgage && inputs.frequency !== 'monthly'
          ? rem_paid > 1
            ? 'Periods'
            : 'Period'
          : rem_paid > 1
            ? 'Months'
            : 'Month';
    }
    payoffVal = `${yrs_paid} ${yrsLabel}, ${rem_paid} ${frequencyLabel}`;
  }

  const savedVal = formatCurrency(
    baseData.summary.totalInterest - actualData.summary.totalInterest
  );
  const actualLifetimeVal = formatCurrency(actualData.summary.totalInterest + startingPrincipal);
  const dailyVampireVal = isMortgage
    ? 'N/A'
    : formatCurrency(inputs.ccBalance * (inputs.annualRate / 100 / 365));

  const termPer = Math.ceil(inputs.termYears * actualData.summary.periodsPerYear);
  const termBalanceVal = isMortgage
    ? formatCurrency(
        termPer < actualData.schedule.length
          ? actualData.schedule[Math.max(0, termPer - 1)]!.balance
          : 0
      )
    : 'N/A';

  // Sanitizing variables prior to HTML string interpolation
  const balance = escapeHtml(balanceVal);
  const payoff = escapeHtml(payoffVal);
  const saved = escapeHtml(savedVal);
  const actualLifetime = escapeHtml(actualLifetimeVal);
  const dailyVampire = escapeHtml(dailyVampireVal);
  const termBalance = escapeHtml(termBalanceVal);
  const rate = escapeHtml(inputs.annualRate + '%');

  let strategyParams = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${t('Interest Rate:')}</span><strong>${rate}</strong>
    </div>
  `;

  if (isMortgage) {
    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Home Price:')}</span><strong>${escapeHtml(formatCurrency(inputs.homePrice))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Down Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.downPayment))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Amortization Period:')}</span><strong>${escapeHtml(String(inputs.amortizationYears))} ${isFr ? 'ans' : 'Yrs'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Payment Frequency:')}</span><strong>${escapeHtml(t(inputs.frequency))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Extra Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/${isFr ? 'pér' : 'pd'}</strong>
      </div>
    `;
    if (inputs.rateShockEnabled && inputs.termRates) {
      const termYrs = inputs.termYears || 0;
      const amortYrs = inputs.amortizationYears || 0;
      if (termYrs > 0 && amortYrs > 0) {
        const years: number[] = [];
        for (let y = termYrs; y < amortYrs; y += termYrs) {
          years.push(y);
        }
        const shockRatesList = years
          .map((y) => {
            const rateVal =
              inputs.termRates[y] !== undefined ? inputs.termRates[y] : inputs.annualRate;
            return isFr ? `An ${y} : ${rateVal.toFixed(2)}%` : `Yr ${y}: ${rateVal.toFixed(2)}%`;
          })
          .join(', ');

        strategyParams += `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${t('Refinance Shock Rates:')}</span><strong style="max-width: 60%; text-align: right; word-wrap: break-word;">${escapeHtml(shockRatesList)}</strong>
          </div>
        `;
      }
    }
  } else {
    let minRuleText: string;
    if (inputs.province === 'QC') {
      minRuleText = isFr ? 'Québec préréglé (5 %)' : 'Quebec Preset (5%)';
    } else if (inputs.province === 'CUSTOM') {
      minRuleText = isFr
        ? `Personnalisé (${inputs.ccMinPercent} % / Int + ${inputs.ccMinPrincipalPct} % / ${inputs.ccMinFlat} $)`
        : `Custom (${inputs.ccMinPercent}% / Int + ${inputs.ccMinPrincipalPct}% / $${inputs.ccMinFlat})`;
    } else {
      minRuleText = isFr ? 'Ontario préréglé (3 %)' : 'Ontario Preset (3%)';
    }

    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Starting Balance:')}</span><strong>${escapeHtml(formatCurrency(inputs.ccBalance))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Min. Payment Rule:')}</span><strong>${escapeHtml(minRuleText)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Monthly Surplus Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/${isFr ? 'Mois' : 'Month'}</strong>
      </div>
    `;
  }

  const tableRows = actualData.schedule
    .slice(0, 12)
    .map((row: ScheduleRow) => {
      const eTd =
        inputs.usePiti && isMortgage
          ? `<td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.escrow))}</td>`
          : '';
      return `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(row.dateLabel)}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; font-weight: 700 !important; background: none !important;"><strong>${escapeHtml(formatCurrency(row.payment))}</strong></td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.principal))}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.interest))}</td>
        ${eTd}
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.extra))}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; font-weight: 700 !important; background: none !important;"><strong>${escapeHtml(formatCurrency(row.balance))}</strong></td>
      </tr>
    `;
    })
    .join('');

  return `
    <div class="pdf-report" style="width: 170mm; background: white; color: #1e293b; font-family: 'Inter', sans-serif; padding: 20px;">
      <style>
        .pdf-report table th, .pdf-report table td {
          padding: 6px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          font-size: 9px !important;
          color: #334155 !important;
          background: none !important;
        }
        .pdf-report table th {
          font-weight: 700 !important;
          color: #475569 !important;
          background: #f8fafc !important;
        }
      </style>
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0;">${t('DEBT ELIMINATION REPORT')}</h1>
          <p style="color: #64748b; font-size: 11px; margin: 5px 0 0 0;">${t('Generated by Debt Elimination Engine • ')}${escapeHtml(reportDate)}</p>
        </div>
        <div style="text-align: right;">
          <span style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 5px 12px; border-radius: 12px; font-weight: 700; font-size: 12px; text-transform: uppercase;">
            ${t(isMortgage ? 'Mortgage Plan' : 'Credit Card Plan')}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">${t('Starting Debt Volume')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b;">${balance}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">${t('Actual Payoff Timeline')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${payoff}</div>
        </div>
      </div>
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 5px;">${t('Interest Capital Saved')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #059669;">${saved}</div>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 5px;">${t('Total Lifetime Cost')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${actualLifetime}</div>
        </div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('PLAN PARAMETERS')}</h3>
          <div style="font-size: 11px; color: #475569;">
            ${strategyParams}
          </div>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('METRIC SUMMARY')}</h3>
          <div style="font-size: 11px; color: #475569;">
            ${
              isMortgage
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Refinancing Term Balance:')}</span><strong>${termBalance}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Compounding Style:')}</span><strong>${t(inputs.compounding === 'semi' ? 'Canadian Semi-Annual' : 'US Monthly')}</strong>
              </div>
              ${
                actualData.summary.lttResult
                  ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>${t('Net Land Transfer Tax (Closing):')}</span><strong style="color: #059669;">${formatCurrency(actualData.summary.lttResult.totalLtt)}</strong>
                </div>
              `
                  : ''
              }
            `
                : `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Daily Fee to the Bank:')}</span><strong>${dailyVampire}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Compounding Method:')}</span><strong>${t(inputs.ccCompounding === 'daily' ? 'Daily Compounding' : 'Simple Interest')}</strong>
              </div>
            `
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>${t('Opportunity Cost Plan:')}</span><strong>${t(inputs.useOppCost ? 'Enabled' : 'Disabled')}${inputs.useOppCost ? ` (${escapeHtml(String(inputs.investRate))}%)` : ''}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>${t('Taxes & Escrow Plan:')}</span><strong>${t(inputs.usePiti ? 'Active' : 'Inactive')}</strong>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('AMORTIZATION LEDGER (FIRST 12 CYCLES)')}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Period / Date')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Gross Payment')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Principal Part')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Interest Part')}</th>
              ${inputs.usePiti && isMortgage ? `<th style="padding: 6px; font-weight: 700; color: #475569;">${t('Escrow Part')}</th>` : ''}
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Extra Part')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Outstanding Balance')}</th>
            </tr>
          </thead>
          <tbody style="color: #475569;">
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 9px; color: #94a3b8;">
        ${t('This plan is an algorithmic projection and does not constitute formal financial advice. Secure your financial future through disciplined strategy.')}
      </div>
    </div>
  `;
};
