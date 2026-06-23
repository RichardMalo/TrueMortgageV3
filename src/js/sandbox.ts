import { AppState, Inputs } from './types.js';
import { saveSettingsToStorage, sanitizeProfile } from './storage.js';
import { showConfirmModal } from './ui.js';

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

  Object.values(state.profiles).forEach(p => {
    const isSelected = p.id === state.activeProfileId;
    const isCompare = p.id === state.comparisonProfileId && state.compareModeActive;

    const card = document.createElement('div');
    card.className = `profile-card ${isSelected ? 'active active-' + (p.currentMode || 'mortgage') : ''}`;
    card.setAttribute('data-id', p.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Select Scenario Profile: ${p.name}`);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    const modeLabel = p.currentMode === 'cc' ? 'Credit Card' : 'Mortgage';
    const tagComp = p.complexity === 'advanced' ? 'Advanced' : 'Simple';
    
    card.innerHTML = `
      <div class="profile-card-header">
        <h4 class="profile-card-title" id="title-text-${p.id}"></h4>
        <div class="profile-card-actions">
          <button type="button" class="profile-btn clone-btn" title="Clone Scenario" data-id="${p.id}" aria-label="Clone Scenario">📋</button>
          <button type="button" class="profile-btn delete-btn" title="Delete Scenario" data-id="${p.id}" style="${Object.keys(state.profiles).length <= 1 ? 'display:none' : ''}" aria-label="Delete Scenario">🗑️</button>
        </div>
      </div>
      <div class="profile-card-body">
        <div class="profile-card-tags">
          <span class="profile-tag">${modeLabel}</span>
          <span class="profile-tag">${tagComp}</span>
        </div>
        <label class="compare-toggle-label" data-id="${p.id}">
          <input type="checkbox" role="switch" aria-checked="${isCompare ? 'true' : 'false'}" class="compare-checkbox" data-id="${p.id}" ${isCompare ? 'checked' : ''} ${isSelected ? 'disabled style="opacity:0.5"' : ''}>
          <span>COMPARE</span>
        </label>
      </div>
    `;

    const titleEl = card.querySelector(`#title-text-${p.id}`) as HTMLElement | null;
    if (titleEl) {
      titleEl.textContent = p.name;
    }

    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.profile-card-actions') || target.closest('.compare-toggle-label')) {
        return;
      }
      
      const titleText = document.getElementById(`title-text-${p.id}`) as HTMLElement | null;
      
      // Double click inline rename
      if (e.detail === 2 && titleText) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = p.name;
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
      const newId = 'profile-' + Date.now();
      state.profiles[newId] = JSON.parse(JSON.stringify(p));
      state.profiles[newId].id = newId;
      state.profiles[newId].name = `${p.name} (Copy)`;
      
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
        
        const confirmDel = await showConfirmModal('Delete Scenario', `Are you sure you want to delete scenario "${p.name}"?`);
        if (confirmDel) {
          const wasActive = state.activeProfileId === p.id;
          delete state.profiles[p.id];
          
          if (wasActive) {
            state.activeProfileId = Object.keys(state.profiles)[0];
            saveSettingsToStorage(state, inputsMap, defaultInputs, true);
            onProfileSelect(state.activeProfileId);
          } else {
            saveSettingsToStorage(state, inputsMap, defaultInputs, false);
          }
          
          if (state.comparisonProfileId === p.id) {
            state.comparisonProfileId = null;
            state.compareModeActive = false;
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
          
          document.querySelectorAll('.compare-checkbox').forEach(cb => {
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

  let previouslyFocusedElement: HTMLElement | null = null;

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusables = Array.from(sidebar.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !(el as HTMLButtonElement).disabled && (el as HTMLElement).offsetWidth > 0 && (el as HTMLElement).offsetHeight > 0) as HTMLElement[];
      
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    } else if (e.key === 'Escape') {
      closeSidebar();
    }
  };

  const openSidebar = () => {
    previouslyFocusedElement = document.activeElement as HTMLElement | null;
    sidebar.classList.add('active');
    overlay.classList.add('active');
    
    renderSandboxList(state, defaultInputs, inputsMap, onProfileSelect, onRecalculate);
    
    document.addEventListener('keydown', trapFocus);
    setTimeout(() => {
      newNameInput.focus();
    }, 100);
  };

  const closeSidebar = () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.removeEventListener('keydown', trapFocus);
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }
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
    saveSettingsToStorage(state, inputsMap, defaultInputs, false);
    const name = newNameInput.value.trim() || `Scenario ${Object.keys(state.profiles).length + 1}`;
    const newId = 'profile-' + Date.now();
    
    state.profiles[newId] = sanitizeProfile({
      id: newId,
      name,
      currentMode: state.currentMode,
      complexity: state.complexity,
      isDark: state.isDark,
      termRates: {},
      customizedYears: {},
      bankWagesView: 'wages',
      inputs: defaultInputs
    }, defaultInputs)!;

    state.activeProfileId = newId;
    newNameInput.value = '';
    
    saveSettingsToStorage(state, inputsMap, defaultInputs, true);
    onProfileSelect(newId);
    
    // Auto show user confirmation feedback (Milestone UX Polish)
    const feedback = document.getElementById('dropzoneFeedback');
    if (feedback) {
      feedback.textContent = `Scenario "${name}" Created Successfully! 🎉`;
      feedback.style.display = 'block';
      feedback.style.color = '#10b981';
      setTimeout(() => { feedback.style.display = 'none'; }, 3000);
    }
  });

  sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
  });
};
