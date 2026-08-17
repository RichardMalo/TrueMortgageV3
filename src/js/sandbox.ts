import { AppState, Inputs } from './types.js';
import { saveSettingsToStorage, sanitizeProfile, generateProfileId } from './storage.js';
import { showConfirmModal, showAlertModal, trapFocus, escapeHtml } from './ui.js';
import { t } from './i18n.js';

export const renderSandboxList = (
  state: AppState,
  defaultInputs: Inputs,
  inputsMap: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  onProfileSelect: (_pId: string) => void,
  onRecalculate: () => void
) => {
  const container = document.getElementById('profilesScrollContainer');
  if (!container) return;
  container.innerHTML = '';

  Object.values(state.profiles).forEach((p) => {
    const isSelected = p.id === state.activeProfileId;
    const isCompare = p.id === state.comparisonProfileId && state.compareModeActive;

    const card = document.createElement('div');
    const escId = escapeHtml(p.id);
    const escName = escapeHtml(p.name);
    card.className = `profile-card ${isSelected ? 'active active-' + (p.currentMode || 'mortgage') : ''}`;
    card.setAttribute('data-id', p.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Select Scenario Profile: ${escName}`);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    const isFr = state.language === 'fr';
    const modeLabel =
      p.currentMode === 'cc'
        ? isFr
          ? 'Carte de crédit'
          : 'Credit Card'
        : isFr
          ? 'Hypothèque'
          : 'Mortgage';
    const tagComp =
      p.complexity === 'advanced' ? (isFr ? 'Avancé' : 'Advanced') : isFr ? 'Simple' : 'Simple';
    const cloneTitle = isFr ? 'Cloner le scénario' : 'Clone Scenario';
    const deleteTitle = isFr ? 'Supprimer le scénario' : 'Delete Scenario';
    const renameTitle = isFr ? 'Renommer le scénario' : 'Rename Scenario';
    const compareLabel = isFr ? 'COMPARER' : 'COMPARE';

    card.innerHTML = `
      <div class="profile-card-header">
        <h4 class="profile-card-title" id="title-text-${escId}"></h4>
        <div class="profile-card-actions">
          <button type="button" class="profile-btn rename-btn" title="${renameTitle}" data-id="${escId}" aria-label="${renameTitle} ${escName}">✏️</button>
          <button type="button" class="profile-btn clone-btn" title="${cloneTitle}" data-id="${escId}" aria-label="${cloneTitle} ${escName}">📋</button>
          <button type="button" class="profile-btn delete-btn" title="${deleteTitle}" data-id="${escId}" style="${Object.keys(state.profiles).length <= 1 ? 'display:none' : ''}" aria-label="${deleteTitle} ${escName}">🗑️</button>
        </div>
      </div>
      <div class="profile-card-body">
        <div class="profile-card-tags">
          <span class="profile-tag">${modeLabel}</span>
          <span class="profile-tag">${tagComp}</span>
        </div>
        <label class="compare-toggle-label" data-id="${escId}">
          <input type="checkbox" role="switch" aria-checked="${isCompare ? 'true' : 'false'}" class="compare-checkbox" data-id="${escId}" ${isCompare ? 'checked' : ''} ${isSelected ? 'disabled style="opacity:0.5"' : ''}>
          <span>${compareLabel}</span>
        </label>
      </div>
    `;

    const titleEl = card.querySelector(`#title-text-${escId}`) as HTMLElement | null;
    if (titleEl) {
      titleEl.textContent = p.name;
    }

    const startRename = () => {
      const titleText = document.getElementById(`title-text-${p.id}`) as HTMLElement | null;
      if (!titleText) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = p.name;
      input.ariaLabel = renameTitle;
      input.placeholder = isFr ? 'Nom du scénario...' : 'New Scenario Name...';
      input.addEventListener('blur', () => {
        const newName = input.value.trim() || p.name;
        p.name = newName;
        titleText.textContent = newName;
        saveSettingsToStorage(state, inputsMap, defaultInputs, false);
        onRecalculate();
      });
      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          input.blur();
        }
      });
      titleText.innerHTML = '';
      titleText.appendChild(input);
      input.focus();
    };

    // Rename scenario button handler
    card.querySelector('.rename-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      startRename();
    });

    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.profile-card-actions') || target.closest('.compare-toggle-label')) {
        return;
      }

      // Double click inline rename fallback
      if (e.detail === 2) {
        startRename();
        return;
      }

      saveSettingsToStorage(state, inputsMap, defaultInputs, false);
      state.activeProfileId = p.id;

      if (state.comparisonProfileId === p.id) {
        state.comparisonProfileId = null;
        state.compareModeActive = false;
      }

      saveSettingsToStorage(state, inputsMap, defaultInputs, true);
      onProfileSelect(p.id);
    });

    // Clone scenario
    card.querySelector('.clone-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Object.keys(state.profiles).length >= 20) {
        showAlertModal(
          t('Scenario Limit Reached'),
          t('You can have a maximum of 20 scenarios. Please delete an existing scenario first.')
        );
        return;
      }
      const newId = generateProfileId();
      const newProfile = structuredClone(p);
      newProfile.id = newId;
      newProfile.name = isFr ? `${p.name} (Copie)` : `${p.name} (Copy)`;
      state.profiles[newId] = newProfile;

      saveSettingsToStorage(state, inputsMap, defaultInputs, false);
      onRecalculate();
      renderSandboxList(state, defaultInputs, inputsMap, onProfileSelect, onRecalculate);
    });

    // Delete scenario
    const delBtn = card.querySelector('.delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (Object.keys(state.profiles).length <= 1) return;

        const confirmDel = await showConfirmModal(
          t('Delete Scenario'),
          isFr
            ? `Êtes-vous sûr de vouloir supprimer le scénario « ${p.name} » ?`
            : `Are you sure you want to delete scenario "${p.name}"?`
        );
        if (confirmDel) {
          if (state.comparisonProfileId === p.id) {
            state.comparisonProfileId = null;
            state.compareModeActive = false;
          }

          const wasActive = state.activeProfileId === p.id;
          delete state.profiles[p.id];

          if (wasActive) {
            const nextActiveId = Object.keys(state.profiles)[0];
            if (nextActiveId) {
              state.activeProfileId = nextActiveId;
              saveSettingsToStorage(state, inputsMap, defaultInputs, true);
              onProfileSelect(state.activeProfileId);
            }
          } else {
            saveSettingsToStorage(state, inputsMap, defaultInputs, false);
          }

          onRecalculate();
          renderSandboxList(state, defaultInputs, inputsMap, onProfileSelect, onRecalculate);
        }
      });
    }

    // Compare checkbox trigger
    const compCheck = card.querySelector('.compare-checkbox') as HTMLInputElement | null;
    if (compCheck) {
      compCheck.addEventListener('change', (e) => {
        e.stopPropagation();
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          state.comparisonProfileId = p.id;
          state.compareModeActive = true;

          document.querySelectorAll('.compare-checkbox').forEach((cb) => {
            const el = cb as HTMLInputElement;
            if (el.getAttribute('data-id') !== p.id) {
              el.checked = false;
              el.setAttribute('aria-checked', 'false');
            }
          });
        } else {
          state.comparisonProfileId = null;
          state.compareModeActive = false;
        }
        saveSettingsToStorage(state, inputsMap, defaultInputs, false);
        onRecalculate();
        renderSandboxList(state, defaultInputs, inputsMap, onProfileSelect, onRecalculate);
      });
    }

    container.appendChild(card);
  });
};

export const setupScenarioSandbox = (
  state: AppState,
  defaultInputs: Inputs,
  inputsMap: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  onProfileSelect: (_pId: string) => void,
  onRecalculate: () => void
) => {
  const trigger = document.getElementById('sandboxTrigger');
  const sidebar = document.getElementById('scenarioSidebar') as HTMLElement | null;
  const overlay = document.getElementById('sidebarOverlay') as HTMLElement | null;
  const closeBtn = document.getElementById('closeSidebarBtn');
  const createBtn = document.getElementById('createProfileBtn');
  const newNameInput = document.getElementById('newProfileName') as HTMLInputElement | null;

  if (!trigger || !sidebar || !overlay || !closeBtn || !createBtn || !newNameInput) return;

  let cleanupSandboxTrap: (() => void) | null = null;

  const openSidebar = () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');

    renderSandboxList(state, defaultInputs, inputsMap, onProfileSelect, onRecalculate);

    cleanupSandboxTrap = trapFocus(sidebar, trigger as HTMLElement, closeSidebar);
    setTimeout(() => {
      newNameInput.focus();
    }, 100);
  };

  const closeSidebar = () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    cleanupSandboxTrap?.();
    cleanupSandboxTrap = null;
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    saveSettingsToStorage(state, inputsMap, defaultInputs, false);
    openSidebar();
  });

  closeBtn.addEventListener('click', () => {
    closeSidebar();
  });

  overlay.addEventListener('click', () => {
    closeSidebar();
  });

  createBtn.addEventListener('click', () => {
    const isFr = state.language === 'fr';
    if (Object.keys(state.profiles).length >= 20) {
      showAlertModal(
        t('Scenario Limit Reached'),
        t('You can have a maximum of 20 scenarios. Please delete an existing scenario first.')
      );
      return;
    }
    saveSettingsToStorage(state, inputsMap, defaultInputs, false);
    const name =
      newNameInput.value.trim() ||
      (isFr
        ? `Scénario ${Object.keys(state.profiles).length + 1}`
        : `Scenario ${Object.keys(state.profiles).length + 1}`);
    const newId = generateProfileId();

    const sanitized = sanitizeProfile(
      {
        id: newId,
        name,
        currentMode: state.currentMode,
        complexity: state.complexity,
        isDark: state.isDark,
        termRates: {},
        customizedYears: {},
        bankWagesView: 'wages',
        inputs: defaultInputs
      },
      defaultInputs
    );
    if (sanitized) {
      state.profiles[newId] = sanitized;
    }

    state.activeProfileId = newId;
    newNameInput.value = '';

    saveSettingsToStorage(state, inputsMap, defaultInputs, true);
    onProfileSelect(newId);

    // Auto show user confirmation feedback (Milestone UX Polish)
    const feedback = document.getElementById('dropzoneFeedback');
    if (feedback) {
      feedback.textContent = isFr
        ? `Le scénario « ${name} » a été créé avec succès ! 🎉`
        : `Scenario "${name}" Created Successfully! 🎉`;
      feedback.style.display = 'block';
      feedback.style.color = '#10b981';
      setTimeout(() => {
        feedback.style.display = 'none';
      }, 3000);
    }
  });

  sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
  });
};
