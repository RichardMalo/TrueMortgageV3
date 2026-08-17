import gsap from 'gsap';
import { AppState, Inputs, ScheduleResult } from './types.js';
import { getCurrencySymbol } from './charts.js';
import { getCalculationsInputs } from './form.js';
import { trapFocus } from './modals.js';
import { generateReportHtml, loadHtml2Pdf } from './pdf.js';
import { t, currentLanguage } from './i18n.js';

export const setupShareFunctionality = (
  state: AppState,
  els: {
    inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>;
    results: Record<string, Element | null>;
  },
  calculate: () => void,
  getLatestSchedules: () => { actualData: ScheduleResult; baseData: ScheduleResult }
) => {
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (!shareBtn || !shareModal || !closeModalBtn) return;

  let cleanupShareTrap: (() => void) | null = null;

  const closeShare = () => {
    shareModal.classList.remove('active');
    cleanupShareTrap?.();
    cleanupShareTrap = null;
  };

  shareBtn.addEventListener('click', () => {
    calculate(); // Sync latest form adjustments
    shareModal.classList.add('active');
    gsap.fromTo(
      '#shareModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    cleanupShareTrap = trapFocus(shareModal, shareBtn, closeShare);
  });

  closeModalBtn.addEventListener('click', closeShare);

  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
      closeShare();
    }
  });

  // Check navigator share capability
  const nativeBtn = document.getElementById('nativeShareOption');
  if (nativeBtn) {
    if (!navigator.canShare) {
      nativeBtn.style.opacity = '0.5';
      const descEl = nativeBtn.querySelector('.option-desc');
      if (descEl) descEl.textContent = 'Not supported in this browser';
    }
  }
  const getInputs = (): Inputs => {
    return getCalculationsInputs(state.currentMode, els.inputs, state.termRates);
  };

  const generatePdfBlobOrSave = async (
    statusEl: HTMLElement | null,
    action: 'save' | 'blob'
  ): Promise<{ blob?: Blob; filename: string; modeName: string } | null> => {
    const isMortgage = state.currentMode === 'mortgage';
    const inputs = getInputs();
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent =
        action === 'save' ? t('Generating PDF... Please wait.') : t('Preparing file to share...');
    }

    const { actualData, baseData } = getLatestSchedules();
    const reportHtml = generateReportHtml(inputs, isMortgage, actualData, baseData);
    const modeName = isMortgage ? 'Mortgage' : 'CreditCard';
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `Debt_Strategy_Report_${modeName}_${localDate}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
    tempContainer.style.opacity = '0';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.innerHTML = reportHtml;
    document.body.appendChild(tempContainer);

    try {
      const html2pdf = await loadHtml2Pdf();
      const worker = html2pdf()
        .from(tempContainer.firstElementChild || tempContainer)
        .set(opt);

      if (action === 'save') {
        await worker.save();
        return { filename, modeName };
      } else {
        const blob = await worker.output('blob');
        return { blob, filename, modeName };
      }
    } catch (err: unknown) {
      console.error(err);
      if (statusEl) statusEl.textContent = t('Error generating PDF.');
      return null;
    } finally {
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const getReportSummaryText = (formatMarkdown: boolean): string => {
    const isMortgage = state.currentMode === 'mortgage';
    const isFr = currentLanguage() === 'fr';

    let modeText: string;
    if (isFr) {
      modeText = isMortgage ? 'Hypothèque' : 'Carte de crédit';
    } else {
      modeText = isMortgage ? 'Mortgage' : 'Credit Card';
    }

    const sym = getCurrencySymbol();
    const balance = els.results.mortgageDisplay?.textContent || `${sym}0`;
    const payoff = els.results.paidOffIn?.textContent || '0';
    const saved = els.results.saved?.textContent || `${sym}0`;
    const actualLifetime = els.results.actualLifetimePaidValue?.textContent || `${sym}0`;

    if (formatMarkdown) {
      return (
        (isFr
          ? `*Rapport du Moteur d'élimination de la dette*\n\n`
          : `*Debt Elimination Engine Report*\n\n`) +
        (isFr ? `*Type :* ${modeText}\n` : `*Type:* ${modeText}\n`) +
        (isFr ? `*Dette d'origine :* ${balance}\n` : `*Original Debt:* ${balance}\n`) +
        (isFr
          ? `*Délai de remboursement réel :* ${payoff}\n`
          : `*Actual Payoff Time:* ${payoff}\n`) +
        (isFr ? `*Intérêts économisés :* ${saved}\n` : `*Interest Saved:* ${saved}\n`) +
        (isFr
          ? `*Total payé :* ${actualLifetime}\n\n`
          : `*Total Lifetime Paid:* ${actualLifetime}\n\n`) +
        (isFr
          ? `Calculé avec le Moteur d'élimination de la dette. Optimisez votre stratégie !`
          : `Calculated using the Debt Elimination Engine. Optimize your strategy!`)
      );
    } else {
      return (
        (isFr
          ? `Rapport du Moteur d'élimination de la dette\n\n`
          : `Debt Elimination Engine Report\n\n`) +
        (isFr ? `Type : ${modeText}\n` : `Type: ${modeText}\n`) +
        (isFr ? `Dette d'origine : ${balance}\n` : `Original Debt: ${balance}\n`) +
        (isFr ? `Délai de remboursement réel : ${payoff}\n` : `Actual Payoff Time: ${payoff}\n`) +
        (isFr ? `Intérêts économisés : ${saved}\n` : `Interest Saved: ${saved}\n`) +
        (isFr
          ? `Total payé : ${actualLifetime}\n\n`
          : `Total Lifetime Paid: ${actualLifetime}\n\n`) +
        (isFr
          ? `Calculé avec le Moteur d'élimination de la dette.`
          : `Calculated using the Debt Elimination Engine.`)
      );
    }
  };

  const downloadPdfBtn = document.getElementById('downloadPdfOption');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('shareStatus');
      generatePdfBlobOrSave(statusEl, 'save')
        .then((res) => {
          if (res && statusEl) {
            statusEl.textContent = t('PDF downloaded successfully!');
            setTimeout(() => {
              statusEl.style.display = 'none';
            }, 3000);
          }
        })
        .catch((err) => {
          console.error('Download PDF failed:', err);
          if (statusEl) statusEl.textContent = t('Error generating PDF.');
        });
    });
  }

  const nativeShareBtn = document.getElementById('nativeShareOption');
  if (nativeShareBtn) {
    nativeShareBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('shareStatus');
      generatePdfBlobOrSave(statusEl, 'blob')
        .then((res) => {
          if (!res || !res.blob) return;
          const file = new File([res.blob], res.filename, { type: 'application/pdf' });
          const isFr = currentLanguage() === 'fr';
          let canShareFiles = false;
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              canShareFiles = true;
            }
          } catch {
            canShareFiles = false;
          }
          if (canShareFiles) {
            if (statusEl) statusEl.textContent = t('Opening share sheet...');
            navigator
              .share({
                files: [file],
                title: isFr
                  ? `Mon rapport d'élimination de la dette (${res.modeName})`
                  : `My ${res.modeName} Debt Elimination Report`,
                text: t(
                  'Check out my customized debt strategy report generated by Debt Elimination Engine.'
                )
              })
              .then(() => {
                if (statusEl) {
                  statusEl.textContent = t('Strategy shared successfully!');
                  setTimeout(() => {
                    statusEl.style.display = 'none';
                  }, 3000);
                }
              })
              .catch((err: unknown) => {
                console.log('Share failed:', err);
                if (statusEl) {
                  statusEl.textContent = t('Sharing canceled.');
                  setTimeout(() => {
                    statusEl.style.display = 'none';
                  }, 2000);
                }
              });
          } else {
            const url = URL.createObjectURL(res.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = res.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (statusEl) {
              statusEl.textContent = t('PDF downloaded successfully!');
              setTimeout(() => {
                statusEl.style.display = 'none';
              }, 3000);
            }
          }
        })
        .catch((err) => {
          console.error('Native share failed:', err);
          if (statusEl) statusEl.textContent = t('Error generating PDF.');
        });
    });
  }

  const whatsappBtn = document.getElementById('whatsappOption');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const text = getReportSummaryText(true);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  const copyTextBtn = document.getElementById('copyTextOption');
  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', () => {
      const text = getReportSummaryText(false);
      const statusEl = document.getElementById('shareStatus');
      if (statusEl) {
        statusEl.style.display = 'block';
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            if (statusEl) {
              statusEl.textContent = t('Summary text copied to clipboard!');
              setTimeout(() => {
                statusEl.style.display = 'none';
              }, 3000);
            }
          })
          .catch((err: unknown) => {
            console.error(err);
            if (statusEl) statusEl.textContent = t('Failed to copy text.');
          });
      } else {
        // Fallback for older browsers, webviews, and insecure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const successful = document.execCommand('copy');
          if (statusEl) {
            statusEl.textContent = successful
              ? t('Summary text copied to clipboard!')
              : t('Failed to copy text.');
            setTimeout(() => {
              statusEl.style.display = 'none';
            }, 3000);
          }
        } catch (copyErr) {
          console.error(copyErr);
          if (statusEl) statusEl.textContent = t('Failed to copy text.');
        }
        document.body.removeChild(textarea);
      }
    });
  }
};
