import { Milestone, AppElements } from './types.js';
import { escapeHtml } from './ui.js';

/**
 * Renders calculated milestones into the scrollable timeline card in the DOM.
 * Preserves the current timeline scroll offset.
 *
 * @param els - Centralized DOM elements mapping object.
 * @param milestones - Array of Milestone metadata objects.
 */
export const renderMilestonesUI = (els: AppElements, milestones: Milestone[]) => {
  const container = els.containers.milestoneTimeline;
  if (!container) return;

  const currentScrollLeft = container.scrollLeft;

  if (milestones.length === 0) {
    container.innerHTML =
      '<div style="padding: 20px; font-weight: 600; opacity: 0.7; text-align: center; width: 100%;">No milestone data available yet. Please complete calculation.</div>';
    return;
  }

  let html = '';
  milestones.forEach((m) => {
    const badgeClass = m.isBaseline ? 'roadmap-node-badge baseline' : 'roadmap-node-badge';
    const badgeLabel = escapeHtml(m.badge || 'BASELINE SCHEDULE');
    const escId = escapeHtml(m.id);

    html += `
      <div class="roadmap-node squishy-interactive" id="node-${escId}">
        <div class="roadmap-node-header">
          <span class="${badgeClass}">${badgeLabel}</span>
          <span style="font-size: 0.72rem; opacity: 0.6; font-weight: 700;">${escapeHtml(m.period)}</span>
        </div>
        <h4 class="roadmap-node-title">${escapeHtml(m.title)}</h4>
        <div class="roadmap-node-date">${escapeHtml(m.date)}</div>
        <div class="roadmap-node-desc">${escapeHtml(m.desc)}</div>
        <div class="roadmap-node-sowhat">${escapeHtml(m.sowhat)}</div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.scrollLeft = currentScrollLeft;
};
