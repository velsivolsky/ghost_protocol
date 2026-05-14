import { TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';
import { log } from './ui.js';
import { maybeGrantContactFromMainTerminal, resolveRunFailure, resolveRunSuccess } from './recruitment.js';
import { maybeGrantDataFragment, saveDataFragments } from './dataFragments.js';

export function updateMissionText() {
  if (!G.dom.mission) {
    return;
  }

  if (G.tutorial?.active) {
    G.dom.mission.innerHTML = getTutorialMissionText();
    return;
  }

  const floorLabel = `PIĘTRO ${G.floor}/${G.floorCount}`;
  const stairHint = G.stairHintActive
    ? ' | <span style="color:#7ac8ff">SCHODY: kliknij kafelek, aby przejść</span>'
    : '';

  if (G.missionPhase === 0) {
    G.dom.mission.innerHTML = `${floorLabel} | CEL: Znajdź terminal główny ⊛ i go zhakuj${stairHint}`;
  } else if (G.missionPhase === 1) {
    G.dom.mission.innerHTML = `${floorLabel} | HAKOWANIE: <span style="color:#ffd700">pozostań przy terminalu</span>${stairHint}`;
  } else {
    G.dom.mission.innerHTML = `${floorLabel} | EXFILTRACJA: <span style="color:#ff3a5c">wróć do wejścia ▲</span>${stairHint}`;
  }
}

function getTutorialMissionText() {
  const step = G.tutorial?.step || 0;

  if (step === 0) {
    return 'TUTORIAL | Poruszaj się WASD do podświetlonego obiektu';
  }

  if (step === 1) {
    return 'TUTORIAL | Otwórz realtime terminal klawiszem TAB';
  }

  if (step === 2) {
    return 'TUTORIAL | Wpisz <b>tutorial</b> albo <b>help basics</b>';
  }

  if (step === 3) {
    return 'TUTORIAL | Zrób skan: <b>scan local</b>';
  }

  if (step === 4) {
    return 'TUTORIAL | Otwórz drzwi: <b>connect panel_1</b> -> <b>unlock</b> -> <b>disconnect</b>';
  }

  if (step === 5) {
    return 'TUTORIAL | Kamera: <b>connect cam_0</b> -> <b>inject loop</b> -> <b>disconnect</b>';
  }

  if (step === 6) {
    return 'TUTORIAL | Guard: <b>connect guard_0</b> -> <b>set friendly</b> / <b>override</b> / <b>disable</b>';
  }

  if (step === 7) {
    return 'TUTORIAL | Technician: <b>connect tech_0</b> -> <b>set friendly</b> / <b>override</b> / <b>disable</b>';
  }

  if (step === 8) {
    return 'TUTORIAL | Side terminal map: <b>connect node_side_1</b> -> <b>download map</b>';
  }

  if (step === 9) {
    return 'TUTORIAL | Side terminal loot: <b>download hack</b> lub <b>transfer credits</b>';
  }

  if (step === 10) {
    return 'TUTORIAL | Main terminal: <b>connect node_main</b> -> <b>inject relay</b> / <b>deploy worm</b>';
  }

  if (step === 11) {
    return 'TUTORIAL | Encyclopedia: <b>help guards</b> / <b>help technicians</b> / <b>help terminals</b> / <b>help mainterm</b>';
  }

  return 'TUTORIAL | Komplet. Wejdz w normalny run i uzywaj skrotow live terminala';
}

export function completeMainHack() {
  G.hackingMain = false;
  G.mainHacked = true;
  G.breachFailed = false;
  G.missionPhase = 2;
  G.tiles[G.mainTerminal.y][G.mainTerminal.x] = TILE_TYPES.FLOOR;

  const contact = maybeGrantContactFromMainTerminal(G.wave);
  const grantedFragment = maybeGrantDataFragment(G.wave);
  G.mainHackContactReward = contact;
  G.mainHackFragmentReward = grantedFragment;

  if (grantedFragment) {
    saveDataFragments();
  }

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

  G.dom.rewardText.innerHTML = [
    `Sektor: SECTOR-0${G.wave}`,
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