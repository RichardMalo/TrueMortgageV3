/**
 * milestones-ui.spec.ts
 *
 * Tests for renderMilestonesUI() in milestones-ui.ts.
 * Covers: empty milestone list, normal rendering of multiple milestones,
 * baseline vs. non-baseline badge classes, scroll position preservation,
 * and null container guard.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderMilestonesUI } from '../src/js/milestones-ui.js';
import type { Milestone, AppElements } from '../src/js/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'ms-1',
  title: 'Halfway Point',
  date: 'Jun 2039',
  period: 'P156',
  desc: '50% of principal cleared.',
  sowhat: 'You now owe less than you started with.',
  badge: 'MILESTONE',
  isBaseline: false,
  ...overrides
});

/** Build a minimal AppElements stub with a real jsdom container element. */
const makeEls = (container: HTMLElement | null): AppElements =>
  ({
    containers: { milestoneTimeline: container }
  }) as unknown as AppElements;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('renderMilestonesUI (milestones-ui.ts)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'milestoneTimelineContainer';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  // ── Guard path ────────────────────────────────────────────────────────────

  it('returns early and does nothing when container is null', () => {
    // Should not throw
    expect(() => renderMilestonesUI(makeEls(null), [])).not.toThrow();
  });

  // ── Empty milestones ──────────────────────────────────────────────────────

  it('renders an empty-state message when milestones array is empty', () => {
    renderMilestonesUI(makeEls(container), []);
    expect(container.innerHTML).toContain('No milestone data available');
  });

  it('empty state message fills the full container (width: 100%)', () => {
    renderMilestonesUI(makeEls(container), []);
    expect(container.innerHTML).toContain('width: 100%');
  });

  // ── Normal rendering ──────────────────────────────────────────────────────

  it('renders one roadmap-node per milestone', () => {
    const milestones = [makeMilestone({ id: 'a' }), makeMilestone({ id: 'b' })];
    renderMilestonesUI(makeEls(container), milestones);
    const nodes = container.querySelectorAll('.roadmap-node');
    expect(nodes).toHaveLength(2);
  });

  it('renders milestone title in a roadmap-node-title element', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ title: 'Zero Debt Day' })]);
    const titleEl = container.querySelector('.roadmap-node-title');
    expect(titleEl?.textContent).toContain('Zero Debt Day');
  });

  it('renders milestone date in a roadmap-node-date element', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ date: 'Jan 2052' })]);
    expect(container.querySelector('.roadmap-node-date')?.textContent).toContain('Jan 2052');
  });

  it('renders milestone description in a roadmap-node-desc element', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ desc: 'Great progress!' })]);
    expect(container.querySelector('.roadmap-node-desc')?.textContent).toContain('Great progress!');
  });

  it('renders sowhat text in a roadmap-node-sowhat element', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ sowhat: 'Net worth impact is huge.' })]);
    expect(container.querySelector('.roadmap-node-sowhat')?.textContent).toContain(
      'Net worth impact is huge.'
    );
  });

  it('attaches a unique id to each roadmap node matching the milestone id', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ id: 'unique-42' })]);
    expect(container.querySelector('#node-unique-42')).not.toBeNull();
  });

  // ── Badge variants ────────────────────────────────────────────────────────

  it('applies baseline badge class when isBaseline is true', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ isBaseline: true, badge: 'BASELINE SCHEDULE' })]);
    const badge = container.querySelector('.roadmap-node-badge');
    expect(badge?.classList.contains('baseline')).toBe(true);
  });

  it('does NOT apply baseline class when isBaseline is false', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ isBaseline: false, badge: 'MILESTONE' })]);
    const badge = container.querySelector('.roadmap-node-badge');
    expect(badge?.classList.contains('baseline')).toBe(false);
  });

  it('uses the provided badge label text', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ badge: 'CUSTOM LABEL' })]);
    const badge = container.querySelector('.roadmap-node-badge');
    expect(badge?.textContent).toContain('CUSTOM LABEL');
  });

  it('falls back to "BASELINE SCHEDULE" if badge is empty string', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ badge: '' })]);
    const badge = container.querySelector('.roadmap-node-badge');
    // empty string is falsy, so the fallback "BASELINE SCHEDULE" is used
    expect(badge?.textContent).toContain('BASELINE SCHEDULE');
  });

  // ── Scroll preservation ───────────────────────────────────────────────────

  it('restores the container scrollLeft after re-rendering', () => {
    // Populate once to have something to scroll into
    renderMilestonesUI(makeEls(container), [makeMilestone()]);
    // Simulate a scroll offset (jsdom allows setting scrollLeft directly)
    Object.defineProperty(container, 'scrollLeft', { writable: true, value: 120 });
    renderMilestonesUI(makeEls(container), [makeMilestone()]);
    // After re-render the scroll position should be restored to 120
    expect(container.scrollLeft).toBe(120);
  });

  // ── Re-render replaces previous content ───────────────────────────────────

  it('replaces previous content on re-render', () => {
    renderMilestonesUI(makeEls(container), [makeMilestone({ id: 'old', title: 'Old' })]);
    renderMilestonesUI(makeEls(container), [makeMilestone({ id: 'new', title: 'New' })]);
    expect(container.querySelectorAll('.roadmap-node')).toHaveLength(1);
    expect(container.querySelector('.roadmap-node-title')?.textContent).toContain('New');
  });
});
