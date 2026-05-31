import { G, initWaveState } from './state.js';
import { loadHubState, saveHubState } from './persistence.js';
import { CEILING_ATLAS_SRC, CAM_SPRITE_SRC, DOOR_SPRITE_SRC, ELEVATOR_SPRITE_SRC, FLOOR_ATLAS_SRC, GUARD_SPRITE_SRC, HUD_HEIGHT, LAMP_SPRITE_SRC, LIGHT_PANEL_SPRITE_SRC, NEON_PANEL_SPRITE_SRC, SAFE_VENT_SPRITE_SRC, TECHNIC_SPRITE_SRC, TERMINAL_SHEET_SRC, VENT_SPRITE_SRC, WALL_ATLAS_SRC } from './constants.js';
import { generateMultiFloorMap, generateTutorialMap } from '../world/generator.js';
import { createCamera } from '../entities/camera.js';
import { createGuard } from '../entities/guard.js';
import { createDrone } from '../entities/drone.js';
import { createDistraction } from '../entities/distraction.js';
import { createTechnician } from '../entities/technician.js';
import { closeCtx } from '../systems/hacking.js';
import { bindInput } from '../systems/input.js';
import { resetOverlays, updateMissionText } from '../systems/mission.js';
import { clearLog, bindUI, log, rebuildList, refreshHUD, syncZoneLabel } from '../systems/ui.js';
import { spawnEntities, update } from '../systems/update.js';
import { initRenderer, renderFrame } from '../systems/render.js';
import { clearWebGLRenderer, initWebGLRenderer, resizeWebGLRenderer } from '../systems/renderWebGL.js';
import { updateVisibility } from '../systems/visibility.js';
import { initAudio, updateAudio, resetAudio, primeAudioSettings } from '../systems/audio.js';
import {
  buyQuickHackCatalogItem,
  equipQuickHackInSlot,
  getQuickHackDefinitions,
  resetQuickHackState,
} from '../systems/quickhacks.js';
import {
  buyBreachAction,
  equipBreachActionInSlot,
  getBreachActionDefinitions,
  initNetworkBreachBridge,
  resetNetworkBreachState,
} from '../systems/networkBreach.js';
import {
  ensureHubState,
  ensureDebugContacts,
  getActiveRunOffers,
  getContacts,
  getCrew,
  getCurrentRunOffer,
  getSelectedCrewMember,
  markRunStarted,
  setCurrentRunOffer,
  setSelectedCrewMember,
} from '../systems/recruitment.js';
import { loadDataFragments, isProbabilityUnlocked, unlockProbability, saveDataFragments, ensureDataFragmentState, isDecryptorUnlocked, unlockDecryptor } from '../systems/dataFragments.js';
import { ensureDebugDataShards } from '../systems/dataFragments.js';
import { renderDataBoard } from '../systems/ui.js';
import { focusMenuTerminalInput, initMenuTerminal, syncMenuTerminalStatus } from '../systems/menuTerminal.js';
import { initTerminalRuntime, resetTerminalRuntime } from '../systems/terminalRuntime.js';
import { resetTutorialSession, startTutorialSession } from '../systems/tutorial.js';
import { DEBUG_BOOTSTRAP } from '../debug/debugBootstrap.js';
import {
  changeRunIntelDir,
  ensureRunIntelForRun,
  getRunIntelMark,
  getRunIntelSummary,
  listRunIntelDir,
  openRunIntelSession,
  readRunIntelFile,
  setRunIntelMark,
} from '../systems/runIntel.js';

let started = false;
let pendingStart = { wave: 1, credits: 0 };
let modalSelectedCrewId = null;

let planSelectedRunId = null;
let intelRunId = null;
let intelCwd = '/';
let intelSelectedPath = null;
let intelHostPickerActive = false;
let mainMenuClickSfxAudio = null;
let mainMenuClickSfxBound = false;

const INTEL_HOST_PICKER_VIEW = '__intel_host_picker__';
const MAIN_MENU_CLICK_SFX_PATH = 'assets/sfx/button.wav';

function initWallAtlas() {
  const image = new Image();

  G.wallAtlasImage = image;
  G.wallAtlasLoaded = false;
  G.wallAtlasError = false;

  image.onload = () => {
    G.wallAtlasLoaded = true;
    G.wallAtlasError = false;
  };

  image.onerror = () => {
    G.wallAtlasLoaded = false;
    G.wallAtlasError = true;
  };

  image.src = WALL_ATLAS_SRC;
}

function initFloorAtlas() {
  const image = new Image();

  G.floorAtlasImage = image;
  G.floorAtlasLoaded = false;
  G.floorAtlasError = false;

  image.onload = () => {
    G.floorAtlasLoaded = true;
    G.floorAtlasError = false;
  };

  image.onerror = () => {
    G.floorAtlasLoaded = false;
    G.floorAtlasError = true;
  };

  image.src = FLOOR_ATLAS_SRC;
}

function initGuardSprite() {
  const image = new Image();

  G.guardSpriteImage = image;
  G.guardSpriteLoaded = false;
  G.guardSpriteError = false;

  image.onload = () => {
    G.guardSpriteLoaded = true;
    G.guardSpriteError = false;
  };

  image.onerror = () => {
    G.guardSpriteLoaded = false;
    G.guardSpriteError = true;
  };

  image.src = GUARD_SPRITE_SRC;
}

function initTerminalSheet() {
  const image = new Image();

  G.terminalSheetImage = image;
  G.terminalSheetLoaded = false;
  G.terminalSheetError = false;

  image.onload = () => {
    G.terminalSheetLoaded = true;
    G.terminalSheetError = false;
  };

  image.onerror = () => {
    G.terminalSheetLoaded = false;
    G.terminalSheetError = true;
  };

  image.src = TERMINAL_SHEET_SRC;
}

function initCeilingAtlas() {
  const image = new Image();

  G.ceilingAtlasImage = image;
  G.ceilingAtlasLoaded = false;
  G.ceilingAtlasError = false;

  image.onload = () => {
    G.ceilingAtlasLoaded = true;
    G.ceilingAtlasError = false;
  };

  image.onerror = () => {
    G.ceilingAtlasLoaded = false;
    G.ceilingAtlasError = true;
  };

  image.src = CEILING_ATLAS_SRC;
}

function initCamSprite() {
  const image = new Image();

  G.camSpriteImage = image;
  G.camSpriteLoaded = false;
  G.camSpriteError = false;

  image.onload = () => {
    G.camSpriteLoaded = true;
    G.camSpriteError = false;
  };

  image.onerror = () => {
    G.camSpriteLoaded = false;
    G.camSpriteError = true;
  };

  image.src = CAM_SPRITE_SRC;
}

function initLightPanelSprite() {
  const image = new Image();

  G.lightPanelSpriteImage = image;
  G.lightPanelSpriteLoaded = false;
  G.lightPanelSpriteError = false;

  image.onload = () => {
    G.lightPanelSpriteLoaded = true;
    G.lightPanelSpriteError = false;
  };

  image.onerror = () => {
    G.lightPanelSpriteLoaded = false;
    G.lightPanelSpriteError = true;
  };

  image.src = LIGHT_PANEL_SPRITE_SRC;
}

function initTechnicSprite() {
  const image = new Image();

  G.technicSpriteImage = image;
  G.technicSpriteLoaded = false;
  G.technicSpriteError = false;

  image.onload = () => {
    G.technicSpriteLoaded = true;
    G.technicSpriteError = false;
  };

  image.onerror = () => {
    G.technicSpriteLoaded = false;
    G.technicSpriteError = true;
  };

  image.src = TECHNIC_SPRITE_SRC;
}

function initLampSprite() {
  const image = new Image();

  G.lampSpriteImage = image;
  G.lampSpriteLoaded = false;
  G.lampSpriteError = false;

  image.onload = () => {
    G.lampSpriteLoaded = true;
    G.lampSpriteError = false;
  };

  image.onerror = () => {
    G.lampSpriteLoaded = false;
    G.lampSpriteError = true;
  };

  image.src = LAMP_SPRITE_SRC;
}

function initVentSprite() {
  const image = new Image();

  G.ventSpriteImage = image;
  G.ventSpriteLoaded = false;
  G.ventSpriteError = false;

  image.onload = () => {
    G.ventSpriteLoaded = true;
    G.ventSpriteError = false;
  };

  image.onerror = () => {
    G.ventSpriteLoaded = false;
    G.ventSpriteError = true;
  };

  image.src = VENT_SPRITE_SRC;
}

function initDoorSprite() {
  const image = new Image();

  G.doorSpriteImage = image;
  G.doorSpriteLoaded = false;
  G.doorSpriteError = false;

  image.onload = () => {
    G.doorSpriteLoaded = true;
    G.doorSpriteError = false;
  };

  image.onerror = () => {
    G.doorSpriteLoaded = false;
    G.doorSpriteError = true;
  };

  image.src = DOOR_SPRITE_SRC;
}

function initElevatorSprite() {
  const image = new Image();

  G.elevatorSpriteImage = image;
  G.elevatorSpriteLoaded = false;
  G.elevatorSpriteError = false;

  image.onload = () => {
    G.elevatorSpriteLoaded = true;
    G.elevatorSpriteError = false;
  };

  image.onerror = () => {
    G.elevatorSpriteLoaded = false;
    G.elevatorSpriteError = true;
  };

  image.src = ELEVATOR_SPRITE_SRC;
}

function initSafeVentSprite() {
  const image = new Image();

  G.safeVentSpriteImage = image;
  G.safeVentSpriteLoaded = false;
  G.safeVentSpriteError = false;

  image.onload = () => {
    G.safeVentSpriteLoaded = true;
    G.safeVentSpriteError = false;
  };

  image.onerror = () => {
    G.safeVentSpriteLoaded = false;
    G.safeVentSpriteError = true;
  };

  image.src = SAFE_VENT_SPRITE_SRC;
}

function initNeonPanelSprite() {
  const image = new Image();

  G.neonPanelSpriteImage = image;
  G.neonPanelSpriteLoaded = false;
  G.neonPanelSpriteError = false;

  image.onload = () => {
    G.neonPanelSpriteLoaded = true;
    G.neonPanelSpriteError = false;
  };

  image.onerror = () => {
    G.neonPanelSpriteLoaded = false;
    G.neonPanelSpriteError = true;
  };

  image.src = NEON_PANEL_SPRITE_SRC;
}

function playMainMenuClickSfx() {
  if (!G.audioEnabled) return;

  try {
    if (!mainMenuClickSfxAudio) {
      mainMenuClickSfxAudio = new Audio(MAIN_MENU_CLICK_SFX_PATH);
      mainMenuClickSfxAudio.preload = 'auto';
      mainMenuClickSfxAudio.volume = 0.5;
    }

    mainMenuClickSfxAudio.currentTime = 0;
    void mainMenuClickSfxAudio.play();
  } catch {
    // Ignore click SFX playback errors.
  }
}

function bindMainMenuClickSfx() {
  if (mainMenuClickSfxBound) {
    return;
  }

  const menu = document.getElementById('main-menu');
  if (!menu) {
    return;
  }

  menu.addEventListener('click', (event) => {
    if (!menu.classList.contains('show')) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const clickable = target.closest(
      'button, [role="button"], a[href], input[type="button"], input[type="submit"], [onclick], .plan-map-point, .intel-node',
    );

    if (!clickable) {
      return;
    }

    if (clickable.matches(':disabled') || clickable.getAttribute('aria-disabled') === 'true') {
      return;
    }

    playMainMenuClickSfx();
  }, { capture: true });

  mainMenuClickSfxBound = true;
}

function getGlobalWalletCredits(fallback = 0) {
  ensureHubState();
  const hubCredits = Number(G.hub?.walletCredits);
  if (Number.isFinite(hubCredits)) {
    return Math.max(0, hubCredits);
  }

  const playerCredits = Number(G.P?.cr);
  if (Number.isFinite(playerCredits)) {
    return Math.max(0, playerCredits);
  }

  const pendingCredits = Number(pendingStart?.credits);
  if (Number.isFinite(pendingCredits)) {
    return Math.max(0, pendingCredits);
  }

  const base = Number(fallback);
  return Number.isFinite(base) ? Math.max(0, base) : 0;
}

function setGlobalWalletCredits(nextCredits) {
  ensureHubState();
  const value = Math.max(0, Math.floor(Number(nextCredits) || 0));
  G.hub.walletCredits = value;

  if (!G.P) {
    G.P = {
      x: 0,
      y: 0,
      hp: 100,
      mhp: 100,
      bw: 100,
      mbw: 100,
      cr: value,
    };
  } else {
    G.P.cr = value;
  }

  pendingStart = { ...(pendingStart || { wave: 1 }), credits: value };
  saveHubState();
  return value;
}

function applyDebugBootstrap(wave, credits) {
  ensureHubState();

  if (!DEBUG_BOOTSTRAP?.enabled) {
    return getGlobalWalletCredits(credits);
  }

  ensureDataFragmentState();

  if (typeof DEBUG_BOOTSTRAP.contacts !== 'undefined') {
    ensureDebugContacts(DEBUG_BOOTSTRAP.contacts, wave || 1);
  }

  if (typeof DEBUG_BOOTSTRAP.dataShards !== 'undefined') {
    ensureDebugDataShards(DEBUG_BOOTSTRAP.dataShards);
  }

  if (!G.hub.debugBootstrapApplied) {
    const debugCredits = Number(DEBUG_BOOTSTRAP.credits);
    if (Number.isFinite(debugCredits)) {
      setGlobalWalletCredits(debugCredits);
    }
    G.hub.debugBootstrapApplied = true;
  }

  return getGlobalWalletCredits(credits);
}

function renderStartMenu() {
  ensureHubState();

  const operatorPicker = document.getElementById('menu-operator-picker');
  const market = document.getElementById('menu-hack-market');
  const crewList = document.getElementById('menu-crew-list');
  const recruitList = document.getElementById('menu-recruit-list');
  const contacts = getContacts();
  const crew = getCrew();
  const selectedCrew = getSelectedCrewMember();

  // Operator picker — now lives inside the PLANUJ RUN panel
  if (operatorPicker) {
    if (!crew.length) {
      operatorPicker.innerHTML = '<div class="menu-operator-empty">Brak operatorów. Rekrutuj w zakładce REKRUTACJA.</div>';
    } else {
      operatorPicker.innerHTML = `
        <div class="menu-operator-head">
          <span>AKTYWNY OPERATOR</span>
          <span>${selectedCrew ? selectedCrew.alias : 'BRAK'}</span>
        </div>
        <div class="menu-operator-list">
          ${crew.map((member) => {
            const portrait = buildOperatorPortrait(member);
            return `
            <button type="button" class="menu-operator-item ${selectedCrew?.id === member.id ? 'selected' : ''}" data-operator-id="${member.id}">
              <img src="${portrait}" class="menu-operator-portrait" alt="${member.alias}" />
              <span class="menu-operator-info">
                <span class="menu-operator-name">${member.alias}</span>
                <span class="menu-operator-meta">${member.tier.toUpperCase()} | ${member.specialization}</span>
              </span>
            </button>
          `;
          }).join('')}
        </div>
      `;

      operatorPicker.querySelectorAll('.menu-operator-item').forEach((button) => {
        button.addEventListener('click', () => {
          const operatorId = button.dataset.operatorId;
          if (!operatorId) return;
          const result = setSelectedCrewMember(operatorId);
          if (!result.success) return;
          renderStartMenu();
          if (planSelectedRunId) renderPlanRunDetail(planSelectedRunId);
        });
      });
    }
  }

  // Hack market — lives inside MARKETPLACE panel
  if (market) {
    market.innerHTML = renderHackMarket();

    market.querySelectorAll('[data-buy-qh]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-buy-qh');
        if (!id) return;
        buyQuickHackFromMenu(id);
      });
    });

    market.querySelectorAll('[data-equip-qh]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-equip-qh');
        const slot = Number(button.getAttribute('data-slot'));
        if (!id || Number.isNaN(slot)) return;
        equipQuickHackFromMenu(id, slot);
      });
    });

    market.querySelectorAll('[data-buy-breach]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-buy-breach');
        if (!id) return;
        buyBreachActionFromMenu(id);
      });
    });

    market.querySelectorAll('[data-equip-breach]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-equip-breach');
        const slot = Number(button.getAttribute('data-slot'));
        if (!id || Number.isNaN(slot)) return;
        equipBreachActionFromMenu(id, slot);
      });
    });

    const scannerBtn = market.querySelector('[data-buy-scanner]');
    if (scannerBtn) {
      scannerBtn.addEventListener('click', () => {
        buyMetadataScannerFromMenu();
      });
    }

    const decryptorBtn = market.querySelector('[data-buy-decryptor]');
    if (decryptorBtn) {
      decryptorBtn.addEventListener('click', () => {
        buyDecryptorFromMenu();
      });
    }
  }

  // EKIPA — crew members with portraits
  if (crewList) {
    if (!crew.length) {
      crewList.innerHTML = '<div class="menu-empty">Brak operatorów w załodze. Zakończ misję rekrutacyjną.</div>';
    } else {
      crewList.innerHTML = crew.map((member) => {
        const portrait = buildOperatorPortrait(member);
        const isSelected = selectedCrew?.id === member.id;
        return `
          <div class="menu-crew-card ${isSelected ? 'active' : ''}">
            <img src="${portrait}" class="menu-crew-portrait" alt="${member.alias}" />
            <div class="menu-crew-info">
              <div class="menu-crew-name">${member.alias}</div>
              <div class="menu-crew-meta">${member.tier.toUpperCase()} | ${member.specialization}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // REKRUTACJA — contacts based on intel status
  if (recruitList) {
    if (!contacts.length) {
      recruitList.innerHTML = '<div class="menu-empty">Brak kontaktów.<br>Hackuj główne terminale, aby zdobywać kandydatów.</div>';
    } else {
      recruitList.innerHTML = contacts.map((contact) => {
        const status = contact.mission?.status;
        const statusLabel = status === 'intel'
          ? 'DANE WYWIADOWCZE'
          : status === 'active'
            ? `MISJA ${contact.mission.progress}/${contact.mission.goal}`
            : 'GOTOWY DO REKRUTACJI';
        const statusClass = status === 'intel' ? 'intel' : status === 'active' ? 'active' : 'ready';

        return `
          <div class="menu-contact-item ${statusClass}">
            <div class="menu-contact-head">
              <span>${contact.alias}</span>
              <span class="menu-contact-status ${statusClass}">${statusLabel}</span>
            </div>
            <div class="menu-contact-body">${contact.tier.toUpperCase()} / ${contact.risk} | ${contact.specialization}</div>
            <div class="menu-contact-body">${contact.backstory}</div>
            <div class="menu-contact-body" style="color:#7ac8ff;">TTL: ${contact.expiresInRuns} runów</div>
          </div>
        `;
      }).join('');
    }
  }
}

function renderHackMarket() {
  const credits = getGlobalWalletCredits(0);
  const quickCatalog = getQuickHackDefinitions();
  const breachCatalog = getBreachActionDefinitions();
  const quickLoadout = Array.isArray(G.quickHackLoadout) ? G.quickHackLoadout.slice(0, 4) : ['optics', 'motorics', 'neural', 'ddos'];
  const breachLoadout = Array.isArray(G.breachActionLoadout) ? G.breachActionLoadout.slice(0, 4) : ['crack', 'suppress', 'worm', 'overload'];

  const renderSlots = (prefix, loadout) => `
    <div class="menu-hack-slots">
      ${loadout.map((id, index) => `<span class="menu-hack-slot">S${index + 1}: ${id ? id.toUpperCase() : 'EMPTY'}</span>`).join('')}
    </div>
  `;

  const quickRows = quickCatalog.map((hack) => {
    const owned = !!G.quickHackCatalogOwned?.[hack.id];
    const inSlot = quickLoadout.includes(hack.id);
    const canBuy = !owned && credits >= (hack.price || 0);

    const slotButtons = [0, 1, 2, 3].map((slot) => {
      const active = quickLoadout[slot] === hack.id;
      const disabled = owned ? '' : 'disabled';
      return `<button class="menu-slot-btn ${active ? 'active' : ''}" data-equip-qh="${hack.id}" data-slot="${slot}" ${disabled}>S${slot + 1}</button>`;
    }).join('');

    return `
      <div class="menu-hack-item ${owned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span>${hack.name}</span>
          <span>BW ${hack.bw}</span>
        </div>
        <div class="menu-hack-desc">${hack.desc}</div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn" data-buy-qh="${hack.id}" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : `BUY ¥${hack.price || 0}`}</button>
          <span class="menu-hack-slots-inline ${inSlot ? 'active' : ''}">${slotButtons}</span>
        </div>
      </div>
    `;
  }).join('');

  const breachRows = breachCatalog.map((action) => {
    const owned = !!G.breachActionCatalogOwned?.[action.id];
    const inSlot = breachLoadout.includes(action.id);

    const slotButtons = [0, 1, 2, 3].map((slot) => {
      const active = breachLoadout[slot] === action.id;
      const disabled = owned ? '' : 'disabled';
      return `<button class="menu-slot-btn ${active ? 'active' : ''}" data-equip-breach="${action.id}" data-slot="${slot}" ${disabled}>S${slot + 1}</button>`;
    }).join('');

    return `
      <div class="menu-hack-item ${owned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span>${action.name}</span>
          <span>CPU ${action.cpu} / RAM ${action.ram}</span>
        </div>
        <div class="menu-hack-desc">${action.desc}</div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn" data-buy-breach="${action.id}" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : `BUY ¥${action.price || 0}`}</button>
          <span class="menu-hack-slots-inline ${inSlot ? 'active' : ''}">${slotButtons}</span>
        </div>
      </div>
    `;
  }).join('');

  const scannerOwned = isProbabilityUnlocked();

  return `
    <div class="menu-hack-market-head">
      <span>MARKET // LOADOUT MANAGER</span>
      <span>WALLET: ¥${credits}</span>
    </div>
    <div class="menu-hack-market-grid">
      <div class="menu-hack-market-col">
        <div class="menu-hack-col-head">QUICKHACKS</div>
        ${renderSlots('qh', quickLoadout)}
        <div class="menu-hack-list">${quickRows}</div>
      </div>
      <div class="menu-hack-market-col">
        <div class="menu-hack-col-head">BREACH ACTIONS</div>
        ${renderSlots('ba', breachLoadout)}
        <div class="menu-hack-list">${breachRows}</div>
      </div>
    </div>
    <div class="menu-hack-tools-section">
      <div class="menu-hack-tools-head">NARZĘDZIA ŚLEDCZE</div>
      <div class="menu-hack-item menu-hack-tool-item ${scannerOwned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span class="menu-tool-name">METADATA SCANNER <span class="menu-tool-badge">DATA BOARD</span></span>
          <span class="menu-tool-price">${scannerOwned ? 'ZAINSTALOWANY' : '¥2000'}</span>
        </div>
        <div class="menu-hack-desc">
          Analizator metadanych neuronowych. Odszyfrowuje wskaźnik PROBABILITY na każdym DATA FRAGMENT —
          ujawnia prawdopodobieństwo autentyczności danych. Bez niego wszystkie dane wyglądają tak samo.
        </div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn menu-buy-btn--tool" data-buy-scanner="1" ${scannerOwned || credits < 2000 ? 'disabled' : ''}>
            ${scannerOwned ? 'OWNED' : credits < 2000 ? `BRAKUJE ¥${2000 - credits}` : 'KUP — ¥2000'}
          </button>
        </div>
      </div>
      ${(()=>{
        const decOwned = isDecryptorUnlocked();
        return `
      <div class="menu-hack-item menu-hack-tool-item ${decOwned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span class="menu-tool-name">DECRYPTOR v1 <span class="menu-tool-badge">DATA BOARD</span></span>
          <span class="menu-tool-price">${decOwned ? 'ZAINSTALOWANY' : '¥2500'}</span>
        </div>
        <div class="menu-hack-desc">
          Narzędzie do łamania szyfrów neuronalnych. Bez niego wszystkie przechwycone DATA FRAGMENTS
          pozostają zlepkiem liter, cyfr i znaków specjalnych. Po instalacji możesz ręcznie
          deszyfrować każdy fragment na DATA BOARD.
        </div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn menu-buy-btn--tool" data-buy-decryptor="1" ${decOwned || credits < 2500 ? 'disabled' : ''}>
            ${decOwned ? 'OWNED' : credits < 2500 ? `BRAKUJE ¥${2500 - credits}` : 'KUP — ¥2500'}
          </button>
        </div>
      </div>`;
      })()}
    </div>
  `;
}

function buyQuickHackFromMenu(id) {
  const result = buyQuickHackCatalogItem(id);
  if (!result.success) {
    log(result.message || 'Nie udalo sie kupic hacka.', 'w');
    return;
  }

  setGlobalWalletCredits(G.P?.cr ?? getGlobalWalletCredits(0));

  log('Hack odblokowany w market.', 'ok');
  refreshHUD();
  renderStartMenu();
}

function equipQuickHackFromMenu(id, slot) {
  const result = equipQuickHackInSlot(slot, id);
  if (!result.success) {
    log(result.message || 'Nie udalo sie ustawic loadoutu.', 'w');
    return;
  }

  log(result.swapped ? 'Quickhack zamieniony miedzy slotami.' : 'Quickhack przypisany do slotu.', 'ok');
  refreshHUD();
  renderStartMenu();
}

function buyBreachActionFromMenu(id) {
  const result = buyBreachAction(id);
  if (!result.success) {
    log(result.message || 'Nie udalo sie kupic akcji breach.', 'w');
    return;
  }

  setGlobalWalletCredits(G.P?.cr ?? getGlobalWalletCredits(0));

  log('Akcja breach odblokowana w market.', 'ok');
  refreshHUD();
  renderStartMenu();
}

function equipBreachActionFromMenu(id, slot) {
  const result = equipBreachActionInSlot(slot, id);
  if (!result.success) {
    log(result.message || 'Nie udalo sie ustawic akcji breach.', 'w');
    return;
  }

  log(result.swapped ? 'Akcja breach zamieniona miedzy slotami.' : 'Akcja breach przypisana do slotu.', 'ok');
  renderStartMenu();
}

function buyMetadataScannerFromMenu() {
  const cost = 2000;
  if (isProbabilityUnlocked()) {
    log('METADATA SCANNER juz zainstalowany.', 'w');
    return;
  }
  if (!G.P || G.P.cr < cost) {
    log(`Brak kredytow. Wymagane: ¥${cost}.`, 'w');
    return;
  }
  G.P.cr -= cost;
  setGlobalWalletCredits(G.P.cr);
  ensureDataFragmentState();
  unlockProbability();
  saveDataFragments();
  refreshHUD();
  renderStartMenu();
  log('METADATA SCANNER zainstalowany — PROBABILITY odblokowane na DATA BOARD.', 'ok');
}

function buyDecryptorFromMenu() {
  const cost = 2500;
  if (isDecryptorUnlocked()) {
    log('DECRYPTOR v1 juz zainstalowany.', 'w');
    return;
  }
  if (!G.P || G.P.cr < cost) {
    log(`Brak kredytow. Wymagane: ¥${cost}.`, 'w');
    return;
  }
  G.P.cr -= cost;
  setGlobalWalletCredits(G.P.cr);
  ensureDataFragmentState();
  unlockDecryptor();
  refreshHUD();
  renderStartMenu();
  log('DECRYPTOR v1 zainstalowany — mozesz teraz deszyfrowac DATA FRAGMENTS na DATA BOARD.', 'ok');
}

function getAllRunsForPlan() {
  const toRecruitRunId = (contactId) => {
    const raw = String(contactId || '');
    const tail = raw.match(/(\d+)$/);
    return `rc-${tail ? tail[1] : raw.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'x'}`;
  };

  const normalRuns = getActiveRunOffers();
  const recruitRuns = (G.hub.contacts || [])
    .filter((c) => c.mission?.status === 'ready' || c.mission?.status === 'active' || c.mission?.status === 'intel')
    .map((c) => {
      const recruitRunId = toRecruitRunId(c.id);
      return {
      id: recruitRunId,
      typeId: 'recruit',
      typeName: c.alias,
      target: c.specialization,
      mapX: c.mapX || Math.floor(Math.random() * 80 + 10),
      mapY: c.mapY || Math.floor(Math.random() * 70 + 20),
      danger: c.risk === 'hardcore' ? 10 : c.risk === 'hard' ? 8 : c.risk === 'medium' ? 5 : 2,
      security: c.risk === 'hardcore' ? 82 : c.risk === 'hard' ? 64 : c.risk === 'medium' ? 46 : 28,
      profit: 0,
      contactChance: 1,
      floorCount: 1,
      intelHost: `${recruitRunId}.ops.gp`,
      recruit: true,
      contact: c,
    };
    });

  return [...normalRuns, ...recruitRuns];
}

function getRunDifficulty(run) {
  if (run.recruit) return 'recruit';
  if (run.danger >= 10) return 'hardcore';
  if (run.danger >= 7) return 'hard';
  if (run.danger >= 4) return 'medium';
  return 'easy';
}

function renderPlanMapAndList() {
  const runs = getAllRunsForPlan();
  const points = document.getElementById('plan-map-points');
  if (!points) return;

  points.innerHTML = runs.map((run) => {
    const diff = getRunDifficulty(run);
    const netName = getRunNetworkName(run);
    const tooltip = `${run.typeName} (${netName})`;
    return `<button class="plan-map-point ${diff}" data-runid="${run.id}" data-label="${tooltip}" aria-label="${tooltip}" style="left:${run.mapX}%;top:${run.mapY}%"></button>`;
  }).join('');

  const pointEls = Array.from(points.querySelectorAll('.plan-map-point'));

  function setActive(runId) {
    pointEls.forEach((el) => el.classList.toggle('active', el.dataset.runid === runId));
  }

  pointEls.forEach((el) => {
    el.addEventListener('mouseenter', () => setActive(el.dataset.runid));
    el.addEventListener('mouseleave', () => setActive(planSelectedRunId));
    el.addEventListener('click', () => {
      planSelectedRunId = el.dataset.runid;
      setActive(planSelectedRunId);
      renderPlanRunDetail(planSelectedRunId);
    });
  });

  // Restore selection if already chosen
  if (planSelectedRunId && runs.some((run) => run.id === planSelectedRunId)) {
    setActive(planSelectedRunId);
    renderPlanRunDetail(planSelectedRunId);
    return;
  }

  // Pick first run by default so right panel is always populated.
  if (runs.length) {
    planSelectedRunId = runs[0].id;
    setActive(planSelectedRunId);
    renderPlanRunDetail(planSelectedRunId);
  }
}

function getRunNetworkName(run) {
  const source = String(run.id || run.typeName || 'run').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const trimmed = source.slice(0, 8) || 'RUN';
  const hash = hashString(`${run.id}|${run.typeName}`);
  return `OPS-${trimmed}-${(hash % 1000).toString().padStart(3, '0')}`;
}

function renderPlanRunDetail(runId) {
  const detail = document.getElementById('plan-run-detail');
  const infiltrateBtn = document.getElementById('plan-infiltrate-btn');
  if (!detail) return;

  const runs = getAllRunsForPlan();
  const run = runs.find((r) => r.id === runId);

  if (!run) {
    detail.innerHTML = '<div class="plan-detail-empty">← Kliknij punkt na mapie</div>';
    if (infiltrateBtn) infiltrateBtn.disabled = true;
    return;
  }

  const diff = getRunDifficulty(run);
  const diffLabels = { easy: 'ŁATWY', medium: 'ŚREDNI', hard: 'TRUDNY', hardcore: 'HARDCORE', recruit: 'REKRUT' };
  const intelHost = run.intelHost || getRunNetworkName(run);

  detail.innerHTML = `
    <div class="plan-detail-title">${run.typeName}</div>
    <div class="plan-detail-row"><span class="plan-detail-label">CEL</span><span>${run.target}</span></div>
    <div class="plan-detail-row">
      <span class="plan-detail-label">POZIOM</span>
      <span class="plan-run-diff plan-diff-inline ${diff}">${diffLabels[diff] || diff}</span>
    </div>
    <div class="plan-detail-row"><span class="plan-detail-label">PIĘTRA</span><span>${run.floorCount || 1}</span></div>
    <div class="plan-detail-row"><span class="plan-detail-label">HOST</span><span>${intelHost}</span></div>
    ${run.profit ? `<div class="plan-detail-row"><span class="plan-detail-label">NAGRODA</span><span>¥${run.profit}</span></div>` : ''}
    ${run.contactChance > 0 ? `<div class="plan-detail-row"><span class="plan-detail-label">KONTAKT</span><span>${Math.round(run.contactChance * 100)}%</span></div>` : ''}
    ${run.recruit ? '<div class="plan-detail-recruit">RUN REKRUTACYJNY</div>' : ''}
    <div class="plan-infiltrate-wrap" style="padding-top:10px; margin-top:8px;">
      <button class="plan-infiltrate-btn plan-intel-btn" onclick="window.OPEN_RUN_INTEL('${run.id}')">INTEL</button>
    </div>
  `;

  const selectedCrew = getSelectedCrewMember();
  if (infiltrateBtn) {
    infiltrateBtn.disabled = !selectedCrew;
    infiltrateBtn.onclick = () => {
      const operator = getSelectedCrewMember();
      if (!operator) {
        log('Brak wybranego operatora.', 'w');
        return;
      }

      const result = startSelectedRun(run.id);
      if (!result.success) {
        log(result.message, 'w');
      }
    };
  }
}

function renderIntelHostPicker(runs) {
  const head = document.getElementById('intel-head');
  const tree = document.getElementById('intel-tree');
  const body = document.getElementById('intel-body');
  const pathEl = document.getElementById('intel-path');
  const stats = document.getElementById('intel-stats');
  const fileStatus = document.getElementById('intel-file-status');

  if (!head || !tree || !body || !pathEl || !stats || !fileStatus) {
    return;
  }

  head.textContent = 'RUN INTEL // HOSTS';
  pathEl.textContent = 'hosts /';
  stats.textContent = `online hosts ${runs.length}`;

  if (!runs.length) {
    tree.innerHTML = '<div class="intel-empty">Brak hostów INTEL.</div>';
    body.textContent = 'Nie ma dostępnych runów do analizy INTEL.';
    fileStatus.textContent = 'status: none';
    fileStatus.className = 'intel-file-status';
    updateIntelMarkButtons(null);
    return;
  }

  tree.innerHTML = runs.map((run) => {
    const difficulty = run.recruit ? 'RECRUIT' : `DANGER ${run.danger || 0}`;
    const host = run.intelHost || 'unknown';
    return `<button class="intel-node intel-node-dir" data-type="host" data-runid="${run.id}">[HOST] ${host} :: ${run.typeName} :: ${difficulty}</button>`;
  }).join('');

  body.textContent = 'Wybierz host z listy, aby wejść do root katalogu tego runa.';
  fileStatus.textContent = 'status: none';
  fileStatus.className = 'intel-file-status';
  updateIntelMarkButtons(null);

  tree.querySelectorAll('.intel-node[data-type="host"]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetRunId = button.dataset.runid;
      const run = runs.find((item) => item.id === targetRunId);
      if (!run) return;

      planSelectedRunId = run.id;
      intelRunId = run.id;
      intelCwd = '/';
      intelSelectedPath = '/briefing/run_profile.txt';
      intelHostPickerActive = false;
      openRunIntelSession(run, 'panel');
      renderIntelPanel(run.id);
    });
  });
}

function renderIntelPanel(runId = planSelectedRunId) {
  const panel = document.getElementById('menu-panel-intel');
  const head = document.getElementById('intel-head');
  const tree = document.getElementById('intel-tree');
  const body = document.getElementById('intel-body');
  const pathEl = document.getElementById('intel-path');
  const stats = document.getElementById('intel-stats');
  const fileStatus = document.getElementById('intel-file-status');

  if (!panel || !head || !tree || !body || !pathEl || !stats || !fileStatus) {
    return;
  }

  const runs = getAllRunsForPlan();
  const effectiveRunId = runId === INTEL_HOST_PICKER_VIEW
    ? INTEL_HOST_PICKER_VIEW
    : (runId || intelRunId || planSelectedRunId);

  if (effectiveRunId === INTEL_HOST_PICKER_VIEW || intelHostPickerActive) {
    intelRunId = null;
    intelCwd = '/';
    intelSelectedPath = null;
    intelHostPickerActive = true;
    renderIntelHostPicker(runs);
    return;
  }

  const run = runs.find((item) => item.id === effectiveRunId);

  if (!run) {
    intelRunId = null;
    intelCwd = '/';
    intelSelectedPath = null;
    head.textContent = 'RUN INTEL // NO TARGET';
    pathEl.textContent = '/';
    stats.textContent = 'offline';
    tree.innerHTML = '<div class="intel-empty">Wybierz run na mapie i kliknij INTEL.</div>';
    body.textContent = 'Brak aktywnego targetu intel.';
    fileStatus.textContent = 'status: none';
    fileStatus.className = 'intel-file-status';
    updateIntelMarkButtons(null);
    return;
  }

  intelRunId = run.id;
  intelHostPickerActive = false;
  ensureRunIntelForRun(run);

  if (!intelSelectedPath) {
    intelSelectedPath = '/briefing/run_profile.txt';
  }

  head.textContent = `RUN INTEL // ${run.typeName}`;

  const listed = listRunIntelDir(run.id, intelCwd, '.');
  if (!listed.ok) {
    intelCwd = '/';
  }

  const current = listRunIntelDir(run.id, intelCwd, '.');
  const entries = current.ok ? current.entries : [];

  pathEl.textContent = `cwd ${intelCwd}`;

  const usage = getRunIntelSummary(run.id);
  stats.textContent = `host ${usage.host || run.intelHost || 'unknown'} | sessions ${usage.sessions} | files ${usage.filesRead} | signal ${usage.signalReads} | noise ${usage.noiseReads} | v ${usage.verifiedMarks} | s ${usage.suspiciousMarks}`;

  const marks = getIntelMarkMap(run.id);

  const parentBtn = intelCwd !== '/'
    ? `<button class="intel-node intel-node-dir" data-path="..">..</button>`
    : '<button class="intel-node intel-node-dir" data-path=".." data-type="host-picker">..</button>';

  tree.innerHTML = [
    parentBtn,
    ...entries.map((entry) => {
      const cls = entry.type === 'dir' ? 'intel-node-dir' : 'intel-node-file';
      const unread = usage.available && entry.type === 'file' && !Object.prototype.hasOwnProperty.call(getIntelReadMap(run.id), entry.path)
        ? ' intel-node-unread'
        : '';
      const mark = entry.type === 'file' ? marks[entry.path] : '';
      const markClass = mark === 'verified'
        ? ' intel-node-mark-verified'
        : mark === 'suspicious'
          ? ' intel-node-mark-suspicious'
          : '';
      const markPrefix = mark === 'verified'
        ? '[V] '
        : mark === 'suspicious'
          ? '[?] '
          : '';
      return `<button class="intel-node ${cls}${unread}${markClass}" data-path="${entry.path}" data-type="${entry.type}">${markPrefix}${entry.type === 'dir' ? '[DIR] ' : '[FILE] '}${entry.name}</button>`;
    }),
  ].join('');

  tree.querySelectorAll('.intel-node').forEach((button) => {
    button.addEventListener('click', () => {
      const path = button.dataset.path || '/';
      const type = button.dataset.type || 'dir';

      if (path === '..') {
        if (intelCwd === '/') {
          intelHostPickerActive = true;
          renderIntelPanel(INTEL_HOST_PICKER_VIEW);
          return;
        }

        const changed = changeRunIntelDir(run.id, intelCwd, '..');
        if (changed.ok) {
          intelCwd = changed.cwd;
          renderIntelPanel(run.id);
        }
        return;
      }

      if (type === 'dir') {
        const changed = changeRunIntelDir(run.id, intelCwd, path);
        if (changed.ok) {
          intelCwd = changed.cwd;
          renderIntelPanel(run.id);
        }
        return;
      }

      intelSelectedPath = path;
      renderIntelPanel(run.id);
    });
  });

  bindIntelMarkButtons(run.id);
  renderIntelFile(run.id, intelSelectedPath);
}

function renderIntelFile(runId, path) {
  const body = document.getElementById('intel-body');
  if (!body) {
    return;
  }

  const response = readRunIntelFile(runId, intelCwd, path, 'panel');
  if (!response.ok) {
    body.textContent = `FILE ERROR: ${response.reason || 'unknown'}`;
    updateIntelFileStatus(runId, path, false);
    return;
  }

  intelSelectedPath = response.path;
  updateIntelFileStatus(runId, response.path, true);
  body.textContent = response.content;
}

function bindIntelMarkButtons(runId) {
  const verifiedBtn = document.getElementById('intel-mark-verified');
  const suspiciousBtn = document.getElementById('intel-mark-suspicious');
  const clearBtn = document.getElementById('intel-mark-clear');

  if (!verifiedBtn || !suspiciousBtn || !clearBtn) {
    return;
  }

  const attach = (button, mark) => {
    button.onclick = () => {
      if (!runId || !intelSelectedPath) {
        return;
      }

      const result = setRunIntelMark(runId, intelCwd, intelSelectedPath, mark);
      if (!result.ok) {
        return;
      }

      intelSelectedPath = result.path;
      updateIntelFileStatus(runId, result.path, true);
      renderIntelPanel(runId);
    };
  };

  attach(verifiedBtn, 'verified');
  attach(suspiciousBtn, 'suspicious');
  attach(clearBtn, 'clear');
}

function updateIntelFileStatus(runId, path, isFile) {
  const statusEl = document.getElementById('intel-file-status');
  if (!statusEl) {
    return;
  }

  if (!runId || !path || !isFile) {
    statusEl.textContent = 'status: none';
    statusEl.className = 'intel-file-status';
    updateIntelMarkButtons(null);
    return;
  }

  const mark = getRunIntelMark(runId, intelCwd, path);
  const markLabel = mark.ok ? mark.mark : 'none';
  statusEl.textContent = `status: ${markLabel}`;
  statusEl.className = 'intel-file-status';
  if (markLabel === 'verified') {
    statusEl.classList.add('status-verified');
  }
  if (markLabel === 'suspicious') {
    statusEl.classList.add('status-suspicious');
  }
  updateIntelMarkButtons(markLabel);
}

function updateIntelMarkButtons(activeMark) {
  const verifiedBtn = document.getElementById('intel-mark-verified');
  const suspiciousBtn = document.getElementById('intel-mark-suspicious');
  const clearBtn = document.getElementById('intel-mark-clear');

  if (!verifiedBtn || !suspiciousBtn || !clearBtn) {
    return;
  }

  verifiedBtn.classList.toggle('is-active', activeMark === 'verified');
  suspiciousBtn.classList.toggle('is-active', activeMark === 'suspicious');
  clearBtn.classList.toggle('is-active', activeMark === 'clear' || activeMark === 'none');
}

function getIntelReadMap(runId) {
  const intel = ensureRunIntelForRun(runId);
  if (!intel?.stats?.filesRead) {
    return {};
  }

  return intel.stats.filesRead;
}

function getIntelMarkMap(runId) {
  const intel = ensureRunIntelForRun(runId);
  if (!intel?.stats?.userMarks) {
    return {};
  }

  return intel.stats.userMarks;
}

function openIntelForRun(runId) {
  planSelectedRunId = runId || planSelectedRunId;
  intelRunId = planSelectedRunId;
  intelCwd = '/';
  intelSelectedPath = '/briefing/run_profile.txt';
  intelHostPickerActive = false;

  const runs = getAllRunsForPlan();
  const run = runs.find((item) => item.id === planSelectedRunId);
  if (run) {
    openRunIntelSession(run, 'panel');
  }

  switchStartMenuTab('intel');
  renderIntelPanel(planSelectedRunId);
}

function hashString(input) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickFromSeed(seed, values) {
  return values[seed % values.length];
}

function buildOperatorPortrait(member) {
  const seed = hashString(`${member.id}|${member.alias}|${member.tier}|${member.specialization}`);
  const palette = member.tier === 'ghost'
    ? ['#0c0f1d', '#7dffe0', '#b36aff', '#ff3a5c']
    : member.tier === 'operator'
      ? ['#101723', '#00ff9f', '#7ac8ff', '#ffd269']
      : ['#1a1320', '#ff9a3c', '#ffd269', '#b36aff'];

  const bg = palette[0];
  const neonA = palette[1];
  const neonB = palette[2];
  const accent = palette[3];
  const faceTone = pickFromSeed(seed >> 3, ['#1a2434', '#24364a', '#1d2f2b', '#35243e']);
  const visorTone = pickFromSeed(seed >> 5, [neonA, neonB, accent]);
  const hairTone = pickFromSeed(seed >> 7, [accent, neonB, '#0c0f1d', '#182233']);
  const shoulderTone = pickFromSeed(seed >> 9, [neonA, accent, '#15263d']);
  const pixels = [];
  const blocks = [
    [2, 1, 1], [3, 1, 1],
    [1, 2, 1], [2, 2, 2], [3, 2, 2], [4, 2, 1],
    [1, 3, 2], [2, 3, 2], [3, 3, 2], [4, 3, 2],
    [1, 4, 1], [2, 4, 1], [3, 4, 1], [4, 4, 1],
    [2, 5, 1], [3, 5, 1],
  ];

  const mirror = [];
  const rand = (offset) => ((seed >> offset) & 3) !== 0;

  for (const [x, y, size] of blocks) {
    if (!rand(x + y + size)) {
      continue;
    }

    const color = y <= 1 ? hairTone : y <= 3 ? faceTone : shoulderTone;
    pixels.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" />`);
    mirror.push(`<rect x="${7 - x - size}" y="${y}" width="${size}" height="${size}" fill="${color}" />`);
  }

  const eyesY = 3;
  const eyeGap = ((seed >> 12) & 1) ? 1 : 0;
  const eyesColor = visorTone;
  pixels.push(`<rect x="2" y="${eyesY}" width="1" height="1" fill="${eyesColor}" />`);
  pixels.push(`<rect x="4" y="${eyesY}" width="1" height="1" fill="${eyesColor}" />`);
  if (eyeGap) {
    pixels.push(`<rect x="3" y="${eyesY}" width="1" height="1" fill="${accent}" />`);
  }

  const glyphs = [
    `<rect x="0" y="0" width="8" height="8" fill="${bg}" />`,
    `<rect x="1" y="1" width="6" height="6" rx="0.4" ry="0.4" fill="none" stroke="${neonA}" stroke-width="0.35" opacity="0.7" />`,
    `<rect x="0" y="6" width="8" height="1" fill="${accent}" opacity="0.7" />`,
    `<rect x="1" y="6" width="6" height="1" fill="${neonB}" opacity="0.45" />`,
    ...pixels,
    ...mirror,
    `<rect x="2" y="5" width="3" height="1" fill="${visorTone}" opacity="0.85" />`,
    `<rect x="1" y="7" width="6" height="1" fill="${neonB}" opacity="0.45" />`,
  ];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">
      ${glyphs.join('')}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function switchStartMenuTab(tab) {
  const valid = ['plan', 'recruit', 'market', 'terminal', 'instructions', 'databoard', 'intel'];
  const normalized = valid.includes(tab) ? tab : 'plan';
  const tabPlan = document.getElementById('menu-tab-plan');
  const tabRecruit = document.getElementById('menu-tab-recruit');
  const tabMarket = document.getElementById('menu-tab-market');
  const tabTerminal = document.getElementById('menu-tab-terminal');
  const tabInstructions = document.getElementById('menu-tab-instructions');
  const tabDataboard = document.getElementById('menu-tab-databoard');
  const tabIntel = document.getElementById('menu-tab-intel');
  const panelPlan = document.getElementById('menu-panel-plan');
  const panelRecruit = document.getElementById('menu-panel-recruit');
  const panelMarket = document.getElementById('menu-panel-market');
  const panelTerminal = document.getElementById('menu-panel-terminal');
  const panelInstructions = document.getElementById('menu-panel-instructions');
  const panelDataboard = document.getElementById('menu-panel-databoard');
  const panelIntel = document.getElementById('menu-panel-intel');

  if (tabPlan) tabPlan.classList.toggle('active', normalized === 'plan');
  if (tabRecruit) tabRecruit.classList.toggle('active', normalized === 'recruit');
  if (tabMarket) tabMarket.classList.toggle('active', normalized === 'market');
  if (tabTerminal) tabTerminal.classList.toggle('active', normalized === 'terminal');
  if (tabInstructions) tabInstructions.classList.toggle('active', normalized === 'instructions');
  if (tabDataboard) tabDataboard.classList.toggle('active', normalized === 'databoard');
  if (tabIntel) tabIntel.classList.toggle('active', normalized === 'intel');
  if (panelPlan) panelPlan.classList.toggle('show', normalized === 'plan');
  if (panelRecruit) panelRecruit.classList.toggle('show', normalized === 'recruit');
  if (panelMarket) panelMarket.classList.toggle('show', normalized === 'market');
  if (panelTerminal) panelTerminal.classList.toggle('show', normalized === 'terminal');
  if (panelInstructions) panelInstructions.classList.toggle('show', normalized === 'instructions');
  if (panelDataboard) panelDataboard.classList.toggle('show', normalized === 'databoard');
  if (panelIntel) panelIntel.classList.toggle('show', normalized === 'intel');

  renderStartMenu();
  if (normalized === 'plan') {
    setTimeout(renderPlanMapAndList, 0);
  }
  if (normalized === 'databoard') {
    setTimeout(renderDataBoard, 0);
  }
  if (normalized === 'terminal') {
    setTimeout(() => {
      syncMenuTerminalStatus();
      focusMenuTerminalInput();
    }, 0);
  }
  if (normalized === 'intel') {
    setTimeout(() => {
      const runs = getAllRunsForPlan();
      const run = runs.find((item) => item.id === (planSelectedRunId || intelRunId));
      if (intelHostPickerActive) {
        renderIntelPanel(INTEL_HOST_PICKER_VIEW);
        return;
      }
      if (run) {
        openRunIntelSession(run, 'panel');
      }
      renderIntelPanel(planSelectedRunId || intelRunId);
    }, 0);
  }
}

// Ensure inline HTML handlers can call tab switching even if boot() has not
// completed yet.
if (typeof window !== 'undefined') {
  window.SWITCH_START_MENU_TAB = switchStartMenuTab;
}

function hideMainMenu() {
  const menu = document.getElementById('main-menu');
  if (menu) {
    menu.classList.remove('show');
  }

  G.menuActive = false;
}

function showMainMenu(fromRun = false) {
  const menu = document.getElementById('main-menu');
  if (menu) {
    menu.classList.add('show');
  }

  G.menuActive = true;

  const overlay = document.getElementById('terminal-stream-overlay');
  const container = document.getElementById('ts-lines');
  if (overlay) overlay.classList.remove('active');
  if (container) container.innerHTML = '';

  renderStartMenu();
  syncMenuTerminalStatus();
  setTimeout(renderPlanMapAndList, 0);
}

function openMainMenuForRunSelection(wave, credits) {
  const creditsForRun = applyDebugBootstrap(wave, credits);
  const globalCredits = getGlobalWalletCredits(creditsForRun);
  setGlobalWalletCredits(globalCredits);
  pendingStart = { wave, credits: globalCredits };
  switchStartMenuTab('plan');
  showMainMenu(true);
}

function startTerminalStream() {
  const overlay = document.getElementById('terminal-stream-overlay');
  const container = document.getElementById('ts-lines');
  if (!overlay || !container) return;

  container.innerHTML = '';
  overlay.classList.add('active');

  const prefixes = [
    'DATA_STREAM >>', 'BUFFER_FLUSH >>', 'TRACE_CLEAN >>', 'ICE_BYPASS >>',
    'NET_ROUTE >>', 'SYS_CACHE >>', 'EXFIL_PKT >>', 'CIPHER_TX >>'
  ];
  const types = ['', '', '', 'dim', 'dim', 'warn', 'err', 'dim'];
  let count = 0;
  const maxLines = 38;

  const rndHex = (len) => Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)).join('');
  const rndTs = () => `[${Date.now().toString(16).slice(-8).toUpperCase()}]`;

  const iv = setInterval(() => {
    if (count >= maxLines) return;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const cls = types[Math.floor(Math.random() * types.length)];
    const line = document.createElement('div');
    line.className = `ts-line${cls ? ' ' + cls : ''}`;
    line.textContent = `${rndTs()} ${prefix} 0x${rndHex(16)}  |  ${rndHex(8)}-${rndHex(4)}`;
    container.appendChild(line);
    count++;
  }, 60);

  setTimeout(() => {
    clearInterval(iv);
    overlay.classList.remove('active');
    setTimeout(() => { container.innerHTML = ''; }, 300);
  }, 2200);
}

function startSelectedRun(runId) {
  const planRun = getAllRunsForPlan().find((run) => run.id === runId) || null;
  if (!planRun) {
    return { success: false, message: 'Run nie istnieje.' };
  }

  if (planRun.recruit) {
    G.hub.currentRunId = planRun.id;
    saveHubState();
  } else {
    const selectedRun = setCurrentRunOffer(runId);
    if (!selectedRun.success) {
      return { success: false, message: selectedRun.message || 'Nie mozna wybrac runu.' };
    }
  }

  const selectedCrew = getSelectedCrewMember();
  if (!selectedCrew) {
    return { success: false, message: 'Brak wybranego operatora.' };
  }

  hideMainMenu();
  startRun(pendingStart.wave, pendingStart.credits);
  return { success: true, message: `Uruchamianie ${runId}...` };
}

function startSelectedRunFromMap(runId) {
  return startSelectedRun(runId);
}

function startTutorialRun() {
  const map = generateTutorialMap();

  if (Array.isArray(map.sideTerminals)) {
    const authNode = map.sideTerminals.find((node) => node.id === 'node_side_1');
    if (authNode) {
      authNode.requiresFirewall = true;
      authNode.firewallBreached = false;
      authNode.authShard = 'AX9';
      authNode.authShardIndex = 1;
      authNode.authShardExtracted = false;
      authNode.used = false;
      authNode.hacked = false;
    }

    const lootNode = map.sideTerminals.find((node) => node.id === 'node_side_2');
    if (lootNode) {
      lootNode.requiresFirewall = false;
      lootNode.firewallBreached = true;
      lootNode.authShard = null;
      lootNode.authShardIndex = null;
      lootNode.authShardExtracted = false;
      lootNode.used = false;
      lootNode.hacked = false;
    }
  }

  const devices = createTutorialDevices(map);

  hideMainMenu();
  initWaveState({ wave: 1, credits: 0, map, devices });
  G.floors = [map];
  G.code = null;
  G.codeFound = false;
  G.mainTerminalAuth = {
    requiredShards: 1,
    recoveredByNode: {},
    unlocked: false,
    passphrasePreview: null,
  };
  G.elevatorUnlocked = true;
  G.floor = 1;
  G.floorCount = 1;
  resetAudio();
  resetQuickHackState();
  resetNetworkBreachState();
  resetTerminalRuntime();
  resetTutorialSession();
  startTutorialSession();
  resetOverlays();
  clearLog();
  syncZoneLabel();
  updateMissionText();
  refreshHUD();
  rebuildList();
  closeCtx();
  log('Tryb treningowy online.', 'ok');
  log('Tutorial obejmuje pelny flow: dystrakcje, stealth, side nodes, fail/success na main node i winde.', 'ok');
  log('Wpisz tutorial w live terminalu i realizuj kroki sekwencyjnie.', 'ok');
  renderFrame(G);
}

function createTutorialDevices(map) {
  const camRoom = { x: 24, y: 1, w: 10, h: 8 };
  const guardRoom = { x: 14, y: 12, w: 8, h: 10 };
  const droneRoom = { x: 25, y: 14, w: 9, h: 8 };
  const techRoom = { x: 1, y: 14, w: 10, h: 9 };

  const cam = createCamera(0, camRoom);
  cam.id = 'cam_0';
  cam.x = 27;
  cam.y = 6;
  cam.desc = 'Kamera Treningowa';

  const guard = createGuard(0, guardRoom, 1);
  guard.id = 'guard_0';
  guard.x = 19;
  guard.y = 16;
  guard.desc = 'Strażnik Treningowy';

  const drone = createDrone(0, droneRoom, 1);
  drone.id = 'drone_0';
  drone.ocx = 29;
  drone.ocy = 18;
  drone.x = 29;
  drone.y = 18;
  drone.desc = 'Dron Treningowy';

  const tech = createTechnician(0, techRoom);
  tech.id = 'tech_0';
  tech.x = 8;
  tech.y = 18;
  tech.homeX = 8;
  tech.homeY = 18;
  tech.patrolA = { x: 5.5, y: 16.5 };
  tech.patrolB = { x: 10.5, y: 20.5 };
  tech.desc = 'Technik Treningowy';

  const distractionNodes = (map.distractionNodes || []).map((node, index) => {
    const distract = createDistraction(index, node);
    distract.desc = `${node.desc || 'Węzeł dystrakcji'} [Trening]`;
    return distract;
  });

  return [cam, guard, drone, tech, ...distractionNodes];
}

export function boot() {
  primeAudioSettings();
  bindUI();
  loadHubState();
  initTerminalRuntime();
  loadDataFragments();
  initAudio();
  initNetworkBreachBridge();

  G.canvas = G.dom.canvas;
  G.ctx = G.canvas.getContext('2d');
  G.ctx.imageSmoothingEnabled = false;
  initWebGLRenderer(G);
  initWallAtlas();
  initFloorAtlas();
  initGuardSprite();
  initTerminalSheet();
  initCeilingAtlas();
  initCamSprite();
  initLightPanelSprite();
  initTechnicSprite();
  initLampSprite();
  initVentSprite();
  initElevatorSprite();
  initDoorSprite();
  initSafeVentSprite();
  initNeonPanelSprite();

  resize();
  initRenderer();

  if (!started) {
    started = true;
    window.addEventListener('resize', resize);
    bindInput();
    startLoop();
  }

  bindMainMenuClickSfx();
  window.addEventListener('beforeunload', saveHubState);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveHubState();
    }
  });

  initMenuTerminal({
    onStateMutated: () => {
      renderStartMenu();
      if (planSelectedRunId) {
        renderPlanRunDetail(planSelectedRunId);
      }
      setTimeout(renderPlanMapAndList, 0);
      syncMenuTerminalStatus();
    },
    onRequestRunStart: () => {
      const run = getCurrentRunOffer();
      if (!run) {
        return { success: false, message: 'Brak wybranego runu.' };
      }
      return startSelectedRun(run.id);
    },
  });

  window.RESTART = () => openMainMenuForRunSelection(1, 0);
  window.NEXT = () => openMainMenuForRunSelection(G.wave + 1, G.P.cr);
  window.SWITCH_START_MENU_TAB = switchStartMenuTab;
  window.START_SELECTED_RUN = startSelectedRun;
  window.START_SELECTED_RUN_FROM_MAP = startSelectedRunFromMap;
  window.START_TUTORIAL = startTutorialRun;
  window.OPEN_RUN_INTEL = openIntelForRun;
  window.MENU_BUY_QH = buyQuickHackFromMenu;
  window.MENU_EQUIP_QH = equipQuickHackFromMenu;
  window.MENU_BUY_BREACH = buyBreachActionFromMenu;
  window.MENU_EQUIP_BREACH = equipBreachActionFromMenu;
  window.RENDER_DATA_BOARD = renderDataBoard;
  window.MENU_BUY_SCANNER = buyMetadataScannerFromMenu;
  window.MENU_BUY_DECRYPTOR = buyDecryptorFromMenu;

  openMainMenuForRunSelection(1, 0);
}

export function startRun(wave, credits) {
  hideMainMenu();
  ensureHubState();
  const bootstrapCredits = applyDebugBootstrap(wave, credits);
  const startCredits = getGlobalWalletCredits(bootstrapCredits);
  setGlobalWalletCredits(startCredits);

  const selected = markRunStarted(G.hub.selectedOperatorId);
  if (!selected.success) {
    showMainMenu();
    return;
  }

  const run = G.hub.activeRuns.find((r) => r.id === G.hub.currentRunId)
    || getAllRunsForPlan().find((r) => r.id === G.hub.currentRunId)
    || null;
  G.hub.activeRunMeta = run
    ? {
        id: run.id,
        typeName: run.typeName,
        target: run.target,
        danger: run.danger,
        security: run.security,
        floorCount: run.floorCount,
        profit: run.profit,
        intelHost: run.intelHost || getRunNetworkName(run),
      }
    : null;

  if (run) {
    openRunIntelSession(run, 'run-start');
  }
  const floorCount = run?.floorCount || 2;

  const floors = generateMultiFloorMap(floorCount);
  const map = floors[0];
  const devices = spawnEntities(map, wave);

  initWaveState({ wave, credits: startCredits, map, devices });
  G.floors = floors;
  G.code = floors.code || null;
  G.codeFound = false;
  const requiredShards = floors.reduce((sum, floor) => {
    const nodes = floor.sideTerminals || [];
    return sum + nodes.filter((terminal) => !!terminal.authShard).length;
  }, 0);
  G.mainTerminalAuth = {
    requiredShards,
    recoveredByNode: {},
    unlocked: requiredShards === 0,
    passphrasePreview: null,
  };
  G.elevatorUnlocked = true;
  G.floor = 1;
  G.floorCount = floorCount;
  resetAudio();
  resetQuickHackState();
  resetNetworkBreachState();
  resetTerminalRuntime();
  resetOverlays();
  clearLog();
  syncZoneLabel();
  updateMissionText();
  refreshHUD();
  rebuildList();
  closeCtx();

  const operator = getSelectedCrewMember();
  log(`Operator: ${operator ? operator.alias : 'N/A'}`, 'ok');
  log('System online. Infiltruj.', 'ok');
  log('Uzyj TAB i live terminal overlay do hackowania.');
  renderFrame(G);
}

function startLoop() {
  let last = performance.now();

  function loop(ts) {
    const dt = Math.min(ts - last, 50);
    last = ts;

    if (G.menuActive) {
      clearWebGLRenderer(G);
      updateAudio();
      updateAmbientBg();

      requestAnimationFrame(loop);
      return;
    }

    update(dt);
    updateVisibility();
    updateAudio();
    renderFrame(G);
    updateAmbientBg();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function updateAmbientBg() {
  const el = document.getElementById('ambient-bg-overlay');
  if (!el) return;
  if (!G.menuActive && G.alert > 85) {
    el.classList.add('active');
  } else {
    el.classList.remove('active');
  }
}

function resize() {
  const sideW = 410;
  G.canvas.width  = Math.max(320, window.innerWidth - sideW);
  G.canvas.height = window.innerHeight;
  resizeWebGLRenderer(G, G.canvas.width, G.canvas.height);
}
