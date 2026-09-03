import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupShareFunctionality, exportScheduleToCsv } from '../src/js/share.js';
import { AppState } from '../src/js/types.js';

describe('Share Functionality (share.ts)', () => {
  let mockState: AppState;
  let mockEls: {
    inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>;
    results: Record<string, Element | null>;
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="shareBtn">Share</button>
      <div id="shareModal" class="modal-overlay">
        <div class="modal-card">
          <button id="closeModalBtn">Close</button>
          <div id="shareStatus"></div>
          <button id="downloadPdfOption">PDF</button>
          <button id="nativeShareOption"><span class="option-desc"></span></button>
          <button id="whatsappOption">WhatsApp</button>
          <button id="copyTextOption">Copy</button>
        </div>
      </div>
    `;

    mockState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'simple',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages'
    };

    mockEls = {
      inputs: {},
      results: {
        mortgageDisplay: document.createElement('div'),
        paidOffIn: document.createElement('div'),
        saved: document.createElement('div'),
        actualLifetimePaidValue: document.createElement('div')
      }
    };
    if (mockEls.results.mortgageDisplay) mockEls.results.mortgageDisplay.textContent = '$400,000';
    if (mockEls.results.paidOffIn) mockEls.results.paidOffIn.textContent = '20 Years';
    if (mockEls.results.saved) mockEls.results.saved.textContent = '$50,000';
    if (mockEls.results.actualLifetimePaidValue)
      mockEls.results.actualLifetimePaidValue.textContent = '$550,000';
  });

  it('should initialize share modal listeners cleanly', () => {
    const calculateSpy = vi.fn();
    const getLatestSchedulesSpy = vi.fn().mockReturnValue({
      actualData: {
        schedule: [],
        summary: {
          paidOff: true,
          periodsToPayoff: 240,
          totalInterest: 100000,
          totalPrincipal: 400000,
          totalEscrow: 0,
          periodsPerYear: 12
        }
      },
      baseData: {
        schedule: [],
        summary: {
          paidOff: true,
          periodsToPayoff: 300,
          totalInterest: 150000,
          totalPrincipal: 400000,
          totalEscrow: 0,
          periodsPerYear: 12
        }
      }
    });

    setupShareFunctionality(mockState, mockEls, calculateSpy, getLatestSchedulesSpy);

    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');

    expect(shareModal?.classList.contains('active')).toBe(false);
    shareBtn?.click();
    expect(calculateSpy).toHaveBeenCalled();
    expect(shareModal?.classList.contains('active')).toBe(true);

    const closeModalBtn = document.getElementById('closeModalBtn');
    closeModalBtn?.click();
    expect(shareModal?.classList.contains('active')).toBe(false);
  });

  it('should handle WhatsApp button click by opening target URL', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    setupShareFunctionality(mockState, mockEls, vi.fn(), vi.fn());

    const whatsappBtn = document.getElementById('whatsappOption');
    whatsappBtn?.click();

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://api.whatsapp.com/send?text='),
      '_blank',
      'noopener,noreferrer'
    );
    windowOpenSpy.mockRestore();
  });

  it('should fallback to execCommand when navigator.clipboard is unavailable', () => {
    setupShareFunctionality(mockState, mockEls, vi.fn(), vi.fn());

    (document as unknown as Record<string, unknown>).execCommand = vi.fn().mockReturnValue(true);
    const execCommandSpy = vi.spyOn(document, 'execCommand');
    const copyTextBtn = document.getElementById('copyTextOption');
    copyTextBtn?.click();

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    const statusEl = document.getElementById('shareStatus');
    expect(statusEl?.textContent).toContain('copied');
    execCommandSpy.mockRestore();
  });

  it('should export schedule to CSV correctly and trigger download', () => {
    const mockSchedule = [
      {
        period: 1,
        year: 1,
        calendarYear: 2026,
        dateLabel: 'Jul 2026',
        ltv: 80,
        payment: 2000,
        principal: 1500,
        interest: 500,
        tax: 0,
        ins: 0,
        hoa: 0,
        pmi: 0,
        escrow: 0,
        extra: 0,
        balance: 398500,
        totalInterest: 500,
        totalPrincipal: 1500,
        totalExtra: 0,
        totalEscrow: 0
      }
    ];

    let createdBlob: Blob | null = null;
    let createdUrl = '';
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlob = blob;
      createdUrl = 'blob:http://localhost/mock-csv';
      return createdUrl;
    });
    URL.revokeObjectURL = vi.fn();

    const linkClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    exportScheduleToCsv(mockSchedule, 'Test_Schedule.csv', false);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl);
    expect(createdBlob).not.toBeNull();

    linkClickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
