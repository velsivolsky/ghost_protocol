import { TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';
import { log } from './ui.js';
import { resolveRunFailure, resolveRunSuccess } from './recruitment.js';
import { getRunIntelSummary } from './runIntel.js';

export function updateMissionText() {
  if (!G.dom.mission) {
    return;
  }

  if (G.tutorial?.active) {
    G.dom.mission.innerHTML = getTutorialMissionText();
    return;
  }

  const floorLabel = `PIĘTRO ${G.floor}/${G.floorCount}`;
  const meta = G.terminalRuntime?.metaObjective;
  const metaLabel = meta && !meta.completed
    ? ` | META: <span style="color:#7ac8ff">${meta.title.replace('META: ', '')} ${meta.progress}/${meta.target}</span>`
    : '';
  const stairHint = G.stairHintActive
    ? ` | <span style="color:${G.elevatorUnlocked ? '#7ac8ff' : '#ff9a3c'}">WINDA: ${G.elevatorUnlocked ? 'kliknij kafelek, aby przejsc' : 'zablokowana - odblokuj w terminalu'}</span>`
    : '';

  if (G.missionPhase === 0) {
    G.dom.mission.innerHTML = `${floorLabel} | CEL: Znajdź terminal główny ⊛ i go zhakuj${stairHint}${metaLabel}`;
  } else if (G.missionPhase === 1) {
    G.dom.mission.innerHTML = `${floorLabel} | HAKOWANIE: <span style="color:#ffd700">pozostań przy terminalu</span>${stairHint}${metaLabel}`;
  } else {
    G.dom.mission.innerHTML = `${floorLabel} | EXFILTRACJA: <span style="color:#ff3a5c">wróć do wejścia ▲</span>${stairHint}${metaLabel}`;
  }
}

function getTutorialMissionText() {
  const step = G.tutorial?.step || 0;

  if (step === 0) {
    return 'TUTORIAL | Ruch: przejdz WASD miedzy pokojami treningowymi';
  }

  if (step === 1) {
    return 'TUTORIAL | Otwórz realtime terminal klawiszem TAB';
  }

  if (step === 2) {
    return 'TUTORIAL | Wpisz <b>tutorial</b> albo <b>help basics</b>';
  }

  if (step === 3) {
    return 'TUTORIAL | Skan: <b>scan local</b> lub <b>scan network</b>';
  }

  if (step === 4) {
    return 'TUTORIAL | Odblokuj drzwi: <b>connect panel_1</b> -> <b>unlock</b>, potem otworz <b>E</b>';
  }

  if (step === 5) {
    return 'TUTORIAL | Kamera: <b>connect cam_0</b> -> <b>inject loop</b> lub <b>disable</b>';
  }

  if (step === 6) {
    return 'TUTORIAL | Guard: <b>connect guard_0</b> -> <b>set friendly</b> / <b>override</b> / <b>disable</b> / <b>deploy worm</b>';
  }

  if (step === 7) {
    return 'TUTORIAL | Technician: <b>connect tech_0</b> -> <b>set friendly</b> / <b>override</b> / <b>disable</b> / <b>deploy worm</b>';
  }

  if (step === 8) {
    return 'TUTORIAL | Drone: <b>connect drone_0</b> -> <b>set friendly</b> / <b>override</b> / <b>disable</b> / <b>deploy worm</b>';
  }

  if (step === 9) {
    return 'TUTORIAL | Dystrakcja swiatel: <b>connect lights_1</b> -> <b>lights cut</b>';
  }

  if (step === 10) {
    return 'TUTORIAL | Dystrakcja paneli: <b>junction overload</b> na <b>junction_1</b> i <b>wallpanel_1</b>';
  }

  if (step === 11) {
    return 'TUTORIAL | Dystrakcja wentylacji: <b>connect vent_1</b> -> <b>vent on</b>';
  }

  if (step === 12) {
    return 'TUTORIAL | Dystrakcja wentylacji: <b>vent off</b>';
  }

  if (step === 13) {
    return 'TUTORIAL | Stealth checklista: <b>spoof</b> + <b>mask trace</b> + <b>ghost</b>';
  }

  if (step === 14) {
    return 'TUTORIAL | Main node fail-case: <b>connect node_main</b> i sproboj akcji bez creds';
  }

  if (step === 15) {
    return 'TUTORIAL | Side A: <b>connect node_side_1</b> -> <b>breach firewall</b>';
  }

  if (step === 16) {
    return 'TUTORIAL | Side A: <b>dump creds</b> na <b>node_side_1</b>';
  }

  if (step === 17) {
    return 'TUTORIAL | Side B loot: <b>connect node_side_2</b> -> <b>download map</b> / <b>download hack</b> / <b>transfer credits</b>';
  }

  if (step === 18) {
    return 'TUTORIAL | Main node success: <b>connect node_main</b> -> <b>elevator unlock</b>';
  }

  if (step === 19) {
    return 'TUTORIAL | Uzyj windy: <b>elevator up</b> lub <b>elevator down</b>';
  }

  return 'TUTORIAL | Komplet. Wejdz w normalny run i uzywaj skrotow live terminala';
}

export function completeMainHack() {
  G.hackingMain = false;
  G.mainHacked = true;
  G.breachFailed = false;
  G.missionPhase = 2;
  G.tiles[G.mainTerminal.y][G.mainTerminal.x] = TILE_TYPES.FLOOR;

  // Rewards are already applied by handleDisconnectExfil (networkBreach.js).
  // G.mainHackContactReward and G.mainHackFragmentReward reflect only what was actually exfilled.
  const contact = G.mainHackContactReward;
  const grantedFragment = G.mainHackFragmentReward;

  if (contact) {
    log(`>>> ZDOBYTO DANE KONTAKT: ${contact.alias} [${contact.tier.toUpperCase()}]`, 'ok');
  } else {
    log('>>> Terminal bez użytecznych danych kontaktowych.', 'w');
  }

  if (grantedFragment) {
    log(`>>> DATA FRAGMENT POZYSKANY: ${grantedFragment.title}`, 'ok');
  } else {
    log('>>> Terminal nie zawiera nowego DATA FRAGMENT.', 'w');
  }

  log('>>> TERMINAL ZHAKOWANY — wróć do wejścia!', 'ok');
  updateMissionText();
}

export function handleMainHackFailure() {
  G.hackingMain = false;
  G.mainHacked = false;
  G.breachFailed = true;
  G.missionPhase = 2;
  G.alert = Math.max(G.alert, 95);

  resetSecuritySystems();
  showSystemResetWarning();
  updateMissionText();
}

export function win() {
  G.cleared = true;
  G.succeeded = true;

  const recruitmentTick = resolveRunSuccess();

  const bonus = 150 + G.wave * 80 + ((100 - G.alert) | 0);
  G.P.cr += bonus;
  const rewardContact = G.mainHackContactReward;
  const grantedFragment = G.mainHackFragmentReward;
  const runMeta = G.hub?.activeRunMeta;
  const intelSummary = getRunIntelSummary(runMeta?.id || null);
  const aiCounterLevel = G.terminalRuntime?.aiDirector?.counterLevel || 0;
  const meta = G.terminalRuntime?.metaObjective;
  const telemetry = G.terminalRuntime?.telemetryLast;

  G.dom.rewardText.innerHTML = [
    '<span style="color:#7ac8ff;font-weight:bold;">RUN SUMMARY</span>',
    `Sektor: SECTOR-0${G.wave}`,
    runMeta
      ? `Profil runa: ${runMeta.typeName} | Cel: ${runMeta.target}`
      : 'Profil runa: brak danych',
    runMeta
      ? `Ryzyko/Security: ${runMeta.danger}/10 | ${runMeta.security}%`
      : 'Ryzyko/Security: brak',
    runMeta?.intelHost
      ? `Intel host: ${runMeta.intelHost}`
      : 'Intel host: n/a',
    `Node archetype: ${G.terminalRuntime?.archetypeName || 'BALANCED BACKBONE'}`,
    meta
      ? `Meta objective: ${meta.title.replace('META: ', '')} ${meta.progress}/${meta.target} ${meta.completed ? '✓' : '✗'}`
      : 'Meta objective: brak',
    `AI counter-level: ${aiCounterLevel}`,
    telemetry
      ? `Last cmd telemetry: ${telemetry.commandId} | heat +${telemetry.heat} | trace +${telemetry.trace.toFixed(1)} | bw -${telemetry.bw}`
      : 'Last cmd telemetry: brak',
    '',
    '<span style="color:#7ac8ff;font-weight:bold;">ECONOMY</span>',
    `Piętra: ${G.floorCount}`,
    `Nagroda za misję: ¥${bonus}`,
    `Alert przy wyjściu: ${Math.ceil(G.alert)}%`,
    `Notoriety: ${G.hub?.notoriety || 0}`,
    `Załoga: ${G.hub?.crew?.length || 0}`,
    `Kontakty: ${G.hub?.contacts?.length || 0}`,
    `Kredyty łącznie: ¥${G.P.cr}`,
    rewardContact
      ? `Kontakt z terminala: ${rewardContact.alias} [${rewardContact.tier.toUpperCase()}]`
      : 'Kontakt z terminala: brak',
    `Terminale poboczne: ${G.sideHacked.length}/${G.sideTerminals.length}`,
    recruitmentTick.removedAliases.length
      ? `Utracone kontakty: ${recruitmentTick.removedAliases.join(', ')}`
      : 'Utracone kontakty: brak',
    '',
    '<span style="color:#7ac8ff;font-weight:bold;">INTEL SUMMARY</span>',
    intelSummary.available
      ? `Intel sessions: ${intelSummary.sessions} | files read: ${intelSummary.filesRead}`
      : 'Intel sessions: 0 | files read: 0',
    intelSummary.available
      ? `Signal/Noise/Lore: ${intelSummary.signalReads}/${intelSummary.noiseReads}/${intelSummary.loreReads}`
      : 'Signal/Noise/Lore: 0/0/0',
    intelSummary.available
      ? `Marks verified/suspicious: ${intelSummary.verifiedMarks}/${intelSummary.suspiciousMarks}`
      : 'Marks verified/suspicious: 0/0',
    intelSummary.available && intelSummary.noiseReads > intelSummary.signalReads
      ? '<span style="color:#ff9a3c;">Ocena intel: wysoki szum, niski confidence</span>'
      : '<span style="color:#00ff9f;">Ocena intel: sygnal operacyjny stabilny</span>',
    grantedFragment
      ? `<span style="color:#b36aff;font-weight:bold;">▶ DATA FRAGMENT: ${grantedFragment.title}</span>`
      : '<span style="color:#555">[ BRAK NOWYCH DANYCH ]</span>',
  ].join('<br>');

  G.dom.successOverlay.classList.add('show');
}

export function killPlayer(reason) {
  if (!G.dead && !G.cleared) {
    const failTick = resolveRunFailure();
    if (failTick.lostOperator) {
      log(`Operator utracony: ${failTick.lostOperator.alias}`, 'bad');
    }
  }

  G.dead = true;
  G.dom.deathMessage.textContent = `// ${reason.toUpperCase()}`;
  G.dom.deathOverlay.classList.add('show');
}

export function resetOverlays() {
  G.dom.deathOverlay.classList.remove('show');
  G.dom.failOverlay.classList.remove('show');
  G.dom.successOverlay.classList.remove('show');

  if (G.dom.systemResetWarning) {
    G.dom.systemResetWarning.classList.remove('show');
  }
}

function showSystemResetWarning() {
  if (!G.dom.systemResetWarning) {
    return;
  }

  G.dom.systemResetWarning.textContent = 'SYSTEM ZRESETOWANY - ZABEZPIECZENIA AKTYWNE';
  G.dom.systemResetWarning.classList.add('show');
}

function resetSecuritySystems() {
  for (const camera of byType('cam')) {
    camera.hacked = false;
  }

  for (const guard of byType('guard')) {
    guard.dead = false;
    guard.hacked = false;
    guard.offline = false;
    guard.state = 'search';
    guard.detect = 0;
    guard.searchTimer = 0;
    guard.bodyReported = true;
    guard.opticsOfflineT = 0;
    guard.motoricsResetT = 0;
  }

  for (const drone of byType('drone')) {
    drone.dead = false;
    drone.hacked = false;
    drone.hijacked = false;
  }

  for (const technician of byType('tech')) {
    technician.dead = false;
    technician.state = 'patrol';
    technician.targetId = null;
    technician.repairTimer = 0;
    technician.repairDuration = 0;
  }

  G.techDisabled = false;
  G.blackout = false;
  G.boT = 0;
  G.sideHacked = [];

  for (const terminal of G.sideTerminals) {
    terminal.hacked = false;
    terminal.used = false;
    terminal.options = [];

    if (G.tiles[terminal.y]?.[terminal.x] !== undefined) {
      G.tiles[terminal.y][terminal.x] = TILE_TYPES.SIDE_TERMINAL;
    }
  }
}