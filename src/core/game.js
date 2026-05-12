import { G, initWaveState } from './state.js';
import { HUD_HEIGHT } from './constants.js';
import { generateMultiFloorMap } from '../world/generator.js';
import { closeCtx } from '../systems/hacking.js';
import { bindInput } from '../systems/input.js';
import { resetOverlays, updateMissionText } from '../systems/mission.js';
import { clearLog, bindUI, log, rebuildList, refreshHUD, syncZoneLabel } from '../systems/ui.js';
import { spawnEntities, update } from '../systems/update.js';
import { render } from '../systems/render.js';
import { updateVisibility } from '../systems/visibility.js';
import { initAudio, updateAudio, resetAudio } from '../systems/audio.js';
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
  getActiveRunOffers,
  getContacts,
  getCrew,
  getSelectedCrewMember,
  markRunStarted,
  setCurrentRunOffer,
  setSelectedCrewMember,
} from '../systems/recruitment.js';
import { loadDataFragments, isProbabilityUnlocked, unlockProbability, saveDataFragments, ensureDataFragmentState, isDecryptorUnlocked, unlockDecryptor } from '../systems/dataFragments.js';
import { renderDataBoard } from '../systems/ui.js';

let started = false;
let pendingStart = { wave: 1, credits: 0 };
let modalSelectedCrewId = null;

let planSelectedRunId = null;

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
  const credits = G.P?.cr || 0;
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
      return `<button class="menu-slot-btn ${active ? 'active' : ''}" onclick="window.MENU_EQUIP_QH('${hack.id}', ${slot})" ${disabled}>S${slot + 1}</button>`;
    }).join('');

    return `
      <div class="menu-hack-item ${owned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span>${hack.name}</span>
          <span>BW ${hack.bw}</span>
        </div>
        <div class="menu-hack-desc">${hack.desc}</div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn" onclick="window.MENU_BUY_QH('${hack.id}')" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : `BUY ¥${hack.price || 0}`}</button>
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
      return `<button class="menu-slot-btn ${active ? 'active' : ''}" onclick="window.MENU_EQUIP_BREACH('${action.id}', ${slot})" ${disabled}>S${slot + 1}</button>`;
    }).join('');

    return `
      <div class="menu-hack-item ${owned ? 'owned' : ''}">
        <div class="menu-hack-head">
          <span>${action.name}</span>
          <span>CPU ${action.cpu} / RAM ${action.ram}</span>
        </div>
        <div class="menu-hack-desc">${action.desc}</div>
        <div class="menu-hack-actions">
          <button class="menu-buy-btn" onclick="window.MENU_BUY_BREACH('${action.id}')" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : `BUY ¥${action.price || 0}`}</button>
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
          <button class="menu-buy-btn menu-buy-btn--tool" onclick="window.MENU_BUY_SCANNER()" ${scannerOwned || credits < 2000 ? 'disabled' : ''}>
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
          <button class="menu-buy-btn menu-buy-btn--tool" onclick="window.MENU_BUY_DECRYPTOR()" ${decOwned || credits < 2500 ? 'disabled' : ''}>
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
  ensureDataFragmentState();
  unlockDecryptor();
  refreshHUD();
  renderStartMenu();
  log('DECRYPTOR v1 zainstalowany — mozesz teraz deszyfrowac DATA FRAGMENTS na DATA BOARD.', 'ok');
}

function getAllRunsForPlan() {
  const normalRuns = getActiveRunOffers();
  const recruitRuns = (G.hub.contacts || [])
    .filter((c) => c.mission?.status === 'ready' || c.mission?.status === 'intel')
    .map((c) => ({
      id: `recruit-${c.id}`,
      typeId: 'recruit',
      typeName: c.alias,
      target: c.specialization,
      mapX: c.mapX || Math.floor(Math.random() * 80 + 10),
      mapY: c.mapY || Math.floor(Math.random() * 70 + 20),
      danger: c.risk === 'hardcore' ? 10 : c.risk === 'hard' ? 8 : c.risk === 'medium' ? 5 : 2,
      security: 0,
      profit: 0,
      contactChance: 1,
      floorCount: 1,
      recruit: true,
      contact: c,
    }));

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
    return `<button class="plan-map-point ${diff}" data-runid="${run.id}" data-label="${run.typeName}" aria-label="${run.typeName}" style="left:${run.mapX}%;top:${run.mapY}%"></button>`;
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

  detail.innerHTML = `
    <div class="plan-detail-title">${run.typeName}</div>
    <div class="plan-detail-row"><span class="plan-detail-label">CEL</span><span>${run.target}</span></div>
    <div class="plan-detail-row">
      <span class="plan-detail-label">POZIOM</span>
      <span class="plan-run-diff plan-diff-inline ${diff}">${diffLabels[diff] || diff}</span>
    </div>
    <div class="plan-detail-row"><span class="plan-detail-label">PIĘTRA</span><span>${run.floorCount || 1}</span></div>
    ${run.profit ? `<div class="plan-detail-row"><span class="plan-detail-label">NAGRODA</span><span>¥${run.profit}</span></div>` : ''}
    ${run.contactChance > 0 ? `<div class="plan-detail-row"><span class="plan-detail-label">KONTAKT</span><span>${Math.round(run.contactChance * 100)}%</span></div>` : ''}
    ${run.recruit ? '<div class="plan-detail-recruit">RUN REKRUTACYJNY</div>' : ''}
  `;

  const selectedCrew = getSelectedCrewMember();
  if (infiltrateBtn) {
    infiltrateBtn.disabled = !selectedCrew;
    infiltrateBtn.onclick = () => {
      const operator = getSelectedCrewMember();
      if (!operator) return;
      if (run.recruit) {
        // TODO: full recruitment run flow
        return;
      }
      setCurrentRunOffer(run.id);
      hideMainMenu();
      startRun(pendingStart.wave, pendingStart.credits);
    };
  }
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
  const valid = ['plan', 'recruit', 'market', 'instructions', 'databoard'];
  const normalized = valid.includes(tab) ? tab : 'plan';
  const tabPlan = document.getElementById('menu-tab-plan');
  const tabRecruit = document.getElementById('menu-tab-recruit');
  const tabMarket = document.getElementById('menu-tab-market');
  const tabInstructions = document.getElementById('menu-tab-instructions');
  const tabDataboard = document.getElementById('menu-tab-databoard');
  const panelPlan = document.getElementById('menu-panel-plan');
  const panelRecruit = document.getElementById('menu-panel-recruit');
  const panelMarket = document.getElementById('menu-panel-market');
  const panelInstructions = document.getElementById('menu-panel-instructions');
  const panelDataboard = document.getElementById('menu-panel-databoard');

  if (tabPlan) tabPlan.classList.toggle('active', normalized === 'plan');
  if (tabRecruit) tabRecruit.classList.toggle('active', normalized === 'recruit');
  if (tabMarket) tabMarket.classList.toggle('active', normalized === 'market');
  if (tabInstructions) tabInstructions.classList.toggle('active', normalized === 'instructions');
  if (tabDataboard) tabDataboard.classList.toggle('active', normalized === 'databoard');
  if (panelPlan) panelPlan.classList.toggle('show', normalized === 'plan');
  if (panelRecruit) panelRecruit.classList.toggle('show', normalized === 'recruit');
  if (panelMarket) panelMarket.classList.toggle('show', normalized === 'market');
  if (panelInstructions) panelInstructions.classList.toggle('show', normalized === 'instructions');
  if (panelDataboard) panelDataboard.classList.toggle('show', normalized === 'databoard');

  renderStartMenu();
  if (normalized === 'plan') {
    setTimeout(renderPlanMapAndList, 0);
  }
  if (normalized === 'databoard') {
    setTimeout(renderDataBoard, 0);
  }
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

  if (fromRun) {
    startTerminalStream();
  }

  renderStartMenu();
  setTimeout(renderPlanMapAndList, 0);
}

function openMainMenuForRunSelection(wave, credits) {
  pendingStart = { wave, credits };
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
  const selectedRun = setCurrentRunOffer(runId);
  if (!selectedRun.success) {
    return;
  }

  const selectedCrew = getSelectedCrewMember();
  if (!selectedCrew) {
    return;
  }

  hideMainMenu();
  startRun(pendingStart.wave, pendingStart.credits);
}

function startSelectedRunFromMap(runId) {
  startSelectedRun(runId);
}

export function boot() {
  bindUI();
  loadDataFragments();
  initAudio();
  initNetworkBreachBridge();

  G.canvas = G.dom.canvas;
  G.ctx = G.canvas.getContext('2d');
  G.ctx.imageSmoothingEnabled = false;

  resize();

  if (!started) {
    started = true;
    window.addEventListener('resize', resize);
    bindInput();
    startLoop();
  }

  window.RESTART = () => openMainMenuForRunSelection(1, 0);
  window.NEXT = () => openMainMenuForRunSelection(G.wave + 1, G.P.cr);
  window.SWITCH_START_MENU_TAB = switchStartMenuTab;
  window.START_SELECTED_RUN = startSelectedRun;
  window.START_SELECTED_RUN_FROM_MAP = startSelectedRunFromMap;
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

  const selected = markRunStarted(G.hub.selectedOperatorId);
  if (!selected.success) {
    showMainMenu();
    return;
  }

  const run = G.hub.activeRuns.find((r) => r.id === G.hub.currentRunId);
  const floorCount = run?.floorCount || 2;

  const floors = generateMultiFloorMap(floorCount);
  const map = floors[0];
  const devices = spawnEntities(map.rooms, wave);

  initWaveState({ wave, credits, map, devices });
  G.floors = floors;
  G.code = floors.code || null;
  G.codeFound = false;
  G.floor = 1;
  G.floorCount = floorCount;
  resetAudio();
  resetQuickHackState();
  resetNetworkBreachState();
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
  log('KLIKNIJ obiekt aby zobaczyć opcje hackowania');
  render();
}

function startLoop() {
  let last = performance.now();

  function loop(ts) {
    const dt = Math.min(ts - last, 50);
    last = ts;

    update(dt);
    updateVisibility();
    updateAudio();
    render();
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
  G.canvas.width = window.innerWidth;
  G.canvas.height = window.innerHeight - HUD_HEIGHT;
}
