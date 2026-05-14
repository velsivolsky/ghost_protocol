import { G, upgradeHack } from '../core/state.js';
import {
  getActiveRunOffers,
  getContacts,
  getCrew,
  getCurrentRunOffer,
  getSelectedCrewMember,
  setCurrentRunOffer,
  setSelectedCrewMember,
} from './recruitment.js';
import {
  buyQuickHackCatalogItem,
  equipQuickHackInSlot,
  getQuickHackDefinitions,
} from './quickhacks.js';
import {
  buyBreachAction,
  equipBreachActionInSlot,
  getBreachActionDefinitions,
} from './networkBreach.js';
import {
  decryptFragment,
  getCollectedFragments,
  getConnectionsFor,
  addFragmentConnection,
  removeFragmentConnection,
  isDecryptorUnlocked,
  isFragmentDecrypted,
  isProbabilityUnlocked,
  getTotalFragmentCount,
} from './dataFragments.js';

let initialized = false;
let stateMutatedCallback = () => {};
let runStartCallback = () => ({ success: false, message: 'NO RUN START HANDLER' });

const terminalState = {
  history: [],
  historyIndex: 0,
  booted: false,
  locked: false,
};

function getEls() {
  return {
    output: document.getElementById('menu-terminal-output'),
    input: document.getElementById('menu-terminal-input'),
    status: document.getElementById('menu-terminal-status'),
  };
}

function appendLine(text, cls = 'info') {
  const { output } = getEls();
  if (!output) return;
  const line = document.createElement('div');
  line.className = `menu-terminal-line ${cls}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function sep() {
  appendLine('--------------------------------------------------------------', 'dim');
}

function section(label) {
  appendLine(`[ ${label} ]`, 'system');
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function appendSeq(lines) {
  for (const line of lines) {
    if (line.ms) {
      await delay(line.ms);
    }
    appendLine(line.text, line.cls || 'info');
  }
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function parseListIndex(raw) {
  const parsed = Number.parseInt(String(raw || ''), 10);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed - 1;
}

function resolveIdFromList(raw, items, getId) {
  const index = parseListIndex(raw);
  if (index !== null) {
    const byIndex = items[index];
    if (byIndex) return getId(byIndex);
  }

  const token = normalizeToken(raw);
  if (!token) return null;
  const byId = items.find((item) => normalizeToken(getId(item)) === token);
  return byId ? getId(byId) : null;
}

function parseSlot(slotRaw) {
  const parsed = Number.parseInt(slotRaw, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 4) {
    return { ok: false, message: 'INVALID SLOT // RANGE 1-4' };
  }
  return { ok: true, slot: parsed - 1 };
}

function resolveOperatorId(needle) {
  const crew = getCrew();
  const byIndex = resolveIdFromList(needle, crew, (m) => m.id);
  if (byIndex) return byIndex;

  const lookup = normalizeToken(needle);
  if (!lookup) return null;
  const byId = crew.find((m) => normalizeToken(m.id) === lookup);
  if (byId) return byId.id;
  const byAlias = crew.find((m) => normalizeToken(m.alias) === lookup);
  return byAlias ? byAlias.id : null;
}

function probLabel(prob) {
  const pct = Math.round(prob * 100);
  if (prob >= 0.75) return `LEGIT ${pct}%`;
  if (prob >= 0.5) return `PARTIAL ${pct}%`;
  if (prob >= 0.25) return `SUSPECT ${pct}%`;
  return `FALSE ${pct}%`;
}

function formatQuickHackOwnedStatus(id) {
  const owned = !!G.quickHackCatalogOwned?.[id];
  const charges = Math.max(0, Number(G.quickHacks?.[id] || 0));
  if (!owned) {
    return { text: null, charges, cls: 'info', depleted: false };
  }
  if (charges <= 0) {
    return { text: 'OWNED [0x DEPLETED]', charges, cls: 'err', depleted: true };
  }
  return { text: `OWNED [${charges}x]`, charges, cls: 'ok', depleted: false };
}

function refreshStatusLine() {
  const { status } = getEls();
  if (!status) return;
  const credits = G.P?.cr ?? 0;
  const wave = G.wave || 1;
  const notoriety = G.hub?.notoriety || 0;
  const collected = getCollectedFragments().length;
  const total = getTotalFragmentCount();
  status.textContent = `W${wave}  ¥${credits}  REP:${notoriety}  DF:${collected}/${total}`;
}

function printBootBanner() {
  if (terminalState.booted) return;
  terminalState.booted = true;
  appendLine('##############################################################', 'system');
  appendLine('# GHOST PROTOCOL // TACTICAL SHELL v2                        #', 'system');
  appendLine('# ACCESS LOGGING ENABLED                                     #', 'dim');
  appendLine('##############################################################', 'system');
  appendLine('Type help. Tab autocomplete active.', 'dim');
}

async function preambleConnect() {
  await appendSeq([
    { text: '[connecting uplink...]', cls: 'dim', ms: 150 },
    { text: '[data stream stabilized]', cls: 'dim', ms: 250 },
  ]);
}

async function preambleScan() {
  await appendSeq([{ text: '[scanning node...]', cls: 'dim', ms: 180 }]);
}

async function preambleDecrypt() {
  await appendSeq([
    { text: '[handshake accepted]', cls: 'dim', ms: 180 },
    { text: '[decrypting node...]', cls: 'dim', ms: 250 },
    { text: '[integrity checksum ok]', cls: 'dim', ms: 320 },
  ]);
}

async function preambleRunStart() {
  await appendSeq([
    { text: 'NEURAL LINK ESTABLISHED', cls: 'system', ms: 140 },
    { text: 'ROUTING SIGNAL', cls: 'system', ms: 220 },
    { text: 'CHECKING ENCRYPTION', cls: 'system', ms: 300 },
    { text: 'LOCKING TARGET GRID', cls: 'system', ms: 380 },
  ]);
}

function pushHistory(text) {
  terminalState.history.push(text);
  if (terminalState.history.length > 50) {
    terminalState.history = terminalState.history.slice(-50);
  }
  terminalState.historyIndex = terminalState.history.length;
}

function commandOk(message) {
  appendLine(message, 'ok');
}

function commandWarn(message) {
  appendLine(message, 'warn');
}

function commandErr(message) {
  appendLine(message, 'err');
}

function renderHelpCrew() {
  section('HELP // CREW');
  appendLine('crew                         -> list crew members', 'dim');
  appendLine('crew select <#|id|alias>     -> set active operator', 'dim');
  appendLine('operator select <#|id|alias> -> same as crew select', 'dim');
}

function renderHelpRuns() {
  section('HELP // RUNS');
  appendLine('runs                         -> list active run offers', 'dim');
  appendLine('run list                     -> same as runs', 'dim');
  appendLine('run show <#|id>              -> inspect run details', 'dim');
  appendLine('run select <#|id>            -> lock run target', 'dim');
  appendLine('run start                    -> deploy selected run', 'dim');
}

function renderHelpMarketplace() {
  section('HELP // MARKETPLACE');
  appendLine('rows include # and ID, both selectable', 'dim');
  appendLine('market                       -> market overview', 'dim');
  appendLine('market list qh               -> quickhack catalog + IDs + charges', 'dim');
  appendLine('market list breach           -> breach action catalog + IDs', 'dim');
  appendLine('buy qh <#|id>                -> unlock quickhack item', 'dim');
  appendLine('buy breach <#|id>            -> unlock breach action', 'dim');
  appendLine('upgrade hack <#|id>          -> upgrade owned breach hack', 'dim');
}

function renderHelpLoadout() {
  section('HELP // LOADOUT');
  appendLine('loadout qh                   -> show quickhack loadout + charges', 'dim');
  appendLine('loadout breach               -> show breach loadout', 'dim');
  appendLine('equip qh <#|id> <slot>       -> equip quickhack to slot 1-4', 'dim');
  appendLine('equip breach <#|id> <slot>   -> equip breach action to slot 1-4', 'dim');
}

function renderHelpDf() {
  section('HELP // DATA FRAGMENTS');
  appendLine('df list                      -> collected fragments', 'dim');
  appendLine('df show <#|id>               -> inspect fragment', 'dim');
  appendLine('df decrypt <#|id>            -> decrypt fragment', 'dim');
  appendLine('df verify <#|id>             -> verify legitimacy', 'dim');
  appendLine('df connect <#|id> <#|id>     -> link two fragments', 'dim');
  appendLine('df disconnect <#|id> <#|id>  -> remove link', 'dim');
  appendLine('df stats                     -> collection stats', 'dim');
}

async function cmdHelp(args) {
  const topic = normalizeToken(args?.[0]);

  if (topic === 'crew') {
    renderHelpCrew();
    return;
  }

  if (topic === 'runs' || topic === 'run') {
    renderHelpRuns();
    return;
  }

  if (topic === 'marketplace' || topic === 'market' || topic === 'shop') {
    renderHelpMarketplace();
    return;
  }

  if (topic === 'loadout') {
    renderHelpLoadout();
    return;
  }

  if (topic === 'df' || topic === 'fragments' || topic === 'data') {
    renderHelpDf();
    return;
  }

  section('AVAILABLE NETWORK FUNCTIONS');
  appendLine('help | help crew | help runs | help marketplace', 'dim');
  appendLine('help loadout | help df', 'dim');
  appendLine('whoami | status | wallet | history | clear', 'dim');
  sep();
  section('INTEL');
  appendLine('runs | run list | run show <#|id>', 'dim');
  appendLine('crew | crew select <#|id|alias> | contacts', 'dim');
  appendLine('loadout qh | loadout breach', 'dim');
  sep();
  section('TACTICAL');
  appendLine('run select <#|id> | run start', 'dim');
  appendLine('operator select <#|id|alias>', 'dim');
  appendLine('equip qh <#|id> <slot> | equip breach <#|id> <slot>', 'dim');
  sep();
  section('MARKETPLACE');
  appendLine('market | market list qh | market list breach', 'dim');
  appendLine('buy qh <#|id> | buy breach <#|id> | upgrade hack <#|id>', 'dim');
  sep();
  section('DATA FRAGMENTS');
  appendLine('df list | df show <#|id> | df decrypt <#|id> | df verify <#|id>', 'dim');
  appendLine('df connect <#|id> <#|id> | df disconnect <#|id> <#|id> | df stats', 'dim');
}

async function cmdWhoami() {
  const op = getSelectedCrewMember();
  const run = getCurrentRunOffer();
  appendLine(`operator : ${op ? op.alias : 'NO ACTIVE OPERATOR'}`, op ? 'ok' : 'warn');
  appendLine(`run      : ${run ? `${run.id} | ${run.typeName}` : 'NO ACTIVE RUN'}`, run ? 'info' : 'warn');
  appendLine('shell    : root@gp://tactical', 'dim');
}

async function cmdHistory() {
  if (!terminalState.history.length) {
    commandWarn('NO HISTORY BUFFER');
    return;
  }
  terminalState.history.forEach((entry, i) => {
    appendLine(`${String(i + 1).padStart(2)}  ${entry}`, 'dim');
  });
}

async function cmdClear() {
  const { output } = getEls();
  if (output) output.innerHTML = '';
}

async function cmdStatus() {
  await preambleScan();
  const run = getCurrentRunOffer();
  const op = getSelectedCrewMember();
  sep();
  appendLine(`WALLET     ¥${G.P?.cr ?? 0}`, 'ok');
  appendLine(`WAVE       ${G.wave || 1}`, 'info');
  appendLine(`NOTORIETY  ${G.hub?.notoriety || 0}`, 'info');
  appendLine(`RUN        ${run ? `${run.id} - ${run.typeName}` : 'NO ACTIVE RUN'}`, run ? 'info' : 'warn');
  appendLine(`OPERATOR   ${op ? `${op.alias} [${op.tier.toUpperCase()}]` : 'NO ACTIVE OPERATOR'}`, op ? 'info' : 'warn');
  sep();
}

async function cmdRuns(args) {
  const sub = args[0];
  const arg = args[1];

  if (!sub || sub === 'list') {
    await preambleConnect();
    const runs = getActiveRunOffers();
    if (!runs.length) {
      commandWarn('NO RUN OFFERS ONLINE');
      return;
    }
    sep();
    appendLine('#  ID       TYPE                 DANGER  PROFIT', 'system');
    sep();
    runs.forEach((run, index) => {
      const selected = run.id === G.hub?.currentRunId ? '*' : ' ';
      appendLine(`${String(index + 1).padStart(2)} ${selected} ${run.id.padEnd(8)} ${run.typeName.padEnd(20)} ${String(run.danger).padStart(2)}      ¥${run.profit}`, 'info');
    });
    sep();
    return;
  }

  if (sub === 'show') {
    if (!arg) {
      commandWarn('USAGE: run show <#|id>');
      return;
    }
    const runs = getActiveRunOffers();
    const runId = resolveIdFromList(arg, runs, (item) => item.id);
    const run = runs.find((item) => item.id === runId);
    if (!run) {
      commandErr(`UNKNOWN TARGET: ${arg}`);
      return;
    }
    await preambleScan();
    sep();
    appendLine(`${run.id}  ${run.typeName}`, 'system');
    appendLine(`target      ${run.target}`, 'info');
    appendLine(`danger      ${run.danger}/10`, run.danger >= 8 ? 'err' : run.danger >= 5 ? 'warn' : 'ok');
    appendLine(`security    ${run.security}%`, 'info');
    appendLine(`profit      ¥${run.profit}`, 'ok');
    appendLine(`floors      ${run.floorCount}`, 'info');
    sep();
    return;
  }

  commandWarn('USAGE: run list | run show <#|id> | run select <#|id> | run start');
}

async function cmdRun(args) {
  const sub = args[0];
  const arg = args[1];

  if (sub === 'list' || sub === 'show') {
    await cmdRuns(args);
    return;
  }

  if (sub === 'select') {
    if (!arg) {
      commandWarn('USAGE: run select <#|id>');
      return;
    }
    const runs = getActiveRunOffers();
    const runId = resolveIdFromList(arg, runs, (item) => item.id);
    if (!runId) {
      commandErr(`UNKNOWN TARGET: ${arg}`);
      return;
    }
    const result = setCurrentRunOffer(runId);
    if (!result.success) {
      commandErr(result.message || 'NODE ACCESS DENIED');
      return;
    }
    commandOk(`RUN LOCKED: ${runId}`);
    stateMutatedCallback();
    return;
  }

  if (sub === 'start') {
    await preambleRunStart();
    const result = runStartCallback();
    appendLine(result.message || (result.success ? 'DEPLOYMENT ACCEPTED' : 'DEPLOYMENT REJECTED'), result.success ? 'ok' : 'err');
    return;
  }

  commandWarn('USAGE: run list | run show <#|id> | run select <#|id> | run start');
}

async function cmdCrew(args) {
  if (args?.[0] === 'select') {
    await cmdOperator(['select', ...args.slice(1)]);
    return;
  }

  await preambleScan();
  const selected = getSelectedCrewMember();
  const crew = getCrew();
  if (!crew.length) {
    commandWarn('NO ACTIVE OPERATOR');
    return;
  }
  sep();
  appendLine('#  ID            ALIAS           TIER      SPECIALIZATION', 'system');
  sep();
  crew.forEach((member, index) => {
    const marker = selected?.id === member.id ? '*' : ' ';
    appendLine(`${String(index + 1).padStart(2)} ${marker} ${member.id.padEnd(13)} ${member.alias.padEnd(15)} ${member.tier.padEnd(9)} ${member.specialization}`, 'info');
  });
  sep();
}

async function cmdContacts() {
  await preambleConnect();
  const contacts = getContacts();
  if (!contacts.length) {
    commandWarn('CONTACT OFFLINE');
    return;
  }
  sep();
  contacts.forEach((contact) => {
    const prog = `${contact.mission.progress}/${contact.mission.goal}`;
    appendLine(`${contact.alias.padEnd(20)} ${contact.tier.padEnd(8)} ${contact.mission.status.toUpperCase().padEnd(9)} ${prog}  TTL:${contact.expiresInRuns}`, 'info');
  });
  sep();
}

async function cmdLoadout(args) {
  const sub = args[0];

  if (sub === 'qh') {
    const slots = Array.isArray(G.quickHackLoadout) ? G.quickHackLoadout : [];
    sep();
    appendLine('QH LOADOUT', 'system');
    slots.slice(0, 4).forEach((id, i) => {
      const def = getQuickHackDefinitions().find((d) => d.id === id);
      const charges = G.quickHacks?.[id] ?? 0;
      appendLine(`S${i + 1}  ${(id || '-').padEnd(12)} ${def ? def.name.padEnd(24) : ''.padEnd(24)} CHARGES:${charges}`, id ? 'info' : 'dim');
    });
    sep();
    return;
  }

  if (sub === 'breach') {
    const slots = Array.isArray(G.breachActionLoadout) ? G.breachActionLoadout : [];
    const defs = getBreachActionDefinitions();
    sep();
    appendLine('BREACH LOADOUT', 'system');
    slots.slice(0, 4).forEach((id, i) => {
      const def = defs.find((d) => d.id === id);
      const lvl = G.hackLevels?.[id] ?? 1;
      appendLine(`S${i + 1}  ${(id || '-').padEnd(12)} ${def ? def.name.padEnd(14) : ''.padEnd(14)} LVL:${lvl} CPU:${def?.cpu ?? '-'} TRACE:${def?.trace ?? '-'}`, id ? 'info' : 'dim');
    });
    sep();
    return;
  }

  commandWarn('USAGE: loadout qh | loadout breach');
}

async function cmdMarket(args) {
  const sub = args[0];
  const type = args[1];
  const credits = G.P?.cr ?? 0;

  if (!sub) {
    sep();
    section('MARKETPLACE');
    appendLine(`WALLET  ¥${credits}`, 'ok');
    appendLine('#  ID            NAME                     STATE', 'system');
    sep();
    appendLine('QUICKHACKS', 'system');
    getQuickHackDefinitions().forEach((hack, index) => {
      const ownership = formatQuickHackOwnedStatus(hack.id);
      const price = `¥${String(hack.price || 0).padStart(5)}`;
      const right = ownership.text || price;
      const cls = ownership.text ? ownership.cls : credits < (hack.price || 0) ? 'warn' : 'info';
      appendLine(`${String(index + 1).padStart(2)} ID:${hack.id.padEnd(9)} ${hack.name.padEnd(24)} ${right}`, cls);
    });
    sep();
    appendLine('BREACH ACTIONS', 'system');
    getBreachActionDefinitions().forEach((action, index) => {
      const owned = !!G.breachActionCatalogOwned?.[action.id];
      const value = owned ? 'OWNED' : `¥${String(action.price || 0).padStart(5)}`;
      const cls = owned ? 'dim' : credits < (action.price || 0) ? 'warn' : 'info';
      appendLine(`${String(index + 1).padStart(2)} ID:${action.id.padEnd(9)} ${action.name.padEnd(16)} ${value}`, cls);
    });
    sep();
    appendLine('buy qh <id> | buy breach <id> | upgrade hack <id>', 'dim');
    return;
  }

  if (sub === 'list' && type === 'qh') {
    const qhSlots = Array.isArray(G.quickHackLoadout) ? G.quickHackLoadout : [];
    sep();
    appendLine('#  ID            NAME                     BW   PRICE/OWNED           CHARGES   SLOTS', 'system');
    sep();
    getQuickHackDefinitions().forEach((hack, index) => {
      const ownership = formatQuickHackOwnedStatus(hack.id);
      const slots = [0, 1, 2, 3].map((i) => (qhSlots[i] === hack.id ? `S${i + 1}` : '  ')).join(' ');
      const priceOrOwned = ownership.text || `¥${String(hack.price || 0).padStart(5)}`;
      const rowClass = ownership.text ? ownership.cls : credits < (hack.price || 0) ? 'warn' : 'info';
      appendLine(`${String(index + 1).padStart(2)} ID:${hack.id.padEnd(9)} ${hack.name.padEnd(24)} ${String(hack.bw).padStart(3)}  ${priceOrOwned.padEnd(20)} ${String(ownership.charges).padStart(3)}x      ${slots}`, rowClass);
      appendLine(`  ${hack.desc}`, 'dim');
    });
    sep();
    return;
  }

  if (sub === 'list' && type === 'breach') {
    const baSlots = Array.isArray(G.breachActionLoadout) ? G.breachActionLoadout : [];
    sep();
    appendLine('#  ID            NAME           CPU RAM TRACE PRICE   LVL SLOTS', 'system');
    sep();
    getBreachActionDefinitions().forEach((action, index) => {
      const owned = !!G.breachActionCatalogOwned?.[action.id];
      const slots = [0, 1, 2, 3].map((i) => (baSlots[i] === action.id ? `S${i + 1}` : '  ')).join(' ');
      const price = owned ? 'OWNED ' : `¥${String(action.price || 0).padStart(5)}`;
      const lvl = G.hackLevels?.[action.id] ?? '-';
      const cls = owned ? 'dim' : credits < (action.price || 0) ? 'warn' : 'info';
      appendLine(`${String(index + 1).padStart(2)} ID:${action.id.padEnd(9)} ${action.name.padEnd(14)} ${String(action.cpu).padStart(3)} ${String(action.ram).padStart(3)} ${String(action.trace).padStart(5)} ${price}  ${lvl}   ${slots}`, cls);
      appendLine(`  ${action.desc}`, 'dim');
    });
    sep();
    return;
  }

  commandWarn('USAGE: market | market list qh | market list breach');
}

async function cmdBuy(args) {
  const type = args[0];
  const id = args[1];

  if (type === 'qh') {
    if (!id) {
      commandWarn('USAGE: buy qh <#|id>');
      return;
    }
    const defs = getQuickHackDefinitions();
    const resolvedId = resolveIdFromList(id, defs, (item) => item.id);
    const def = defs.find((item) => item.id === resolvedId);
    if (!def) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    const result = buyQuickHackCatalogItem(resolvedId);
    if (!result.success) {
      commandErr(result.message || 'INSUFFICIENT CREDITS');
      return;
    }
    commandOk(`PURCHASED ${def.name} -¥${def.price || 0}`);
    appendLine(`WALLET: ¥${G.P?.cr ?? 0}`, 'dim');
    stateMutatedCallback();
    return;
  }

  if (type === 'breach') {
    if (!id) {
      commandWarn('USAGE: buy breach <#|id>');
      return;
    }
    const defs = getBreachActionDefinitions();
    const resolvedId = resolveIdFromList(id, defs, (item) => item.id);
    const def = defs.find((item) => item.id === resolvedId);
    if (!def) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    const result = buyBreachAction(resolvedId);
    if (!result.success) {
      commandErr(result.message || 'INSUFFICIENT CREDITS');
      return;
    }
    commandOk(`PURCHASED ${def.name} -¥${def.price || 0}`);
    appendLine(`WALLET: ¥${G.P?.cr ?? 0}`, 'dim');
    stateMutatedCallback();
    return;
  }

  commandWarn('USAGE: buy qh <#|id> | buy breach <#|id>');
}

async function cmdEquip(args) {
  const type = args[0];
  const id = args[1];
  const slotRaw = args[2];

  if (!id || !slotRaw) {
    commandWarn('USAGE: equip qh|breach <#|id> <slot>');
    return;
  }

  const slotParsed = parseSlot(slotRaw);
  if (!slotParsed.ok) {
    commandWarn(slotParsed.message);
    return;
  }

  if (type === 'qh') {
    const defs = getQuickHackDefinitions();
    const resolvedId = resolveIdFromList(id, defs, (item) => item.id);
    if (!resolvedId) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    const result = equipQuickHackInSlot(slotParsed.slot, resolvedId);
    if (!result.success) {
      commandErr(result.message || 'NODE ACCESS DENIED');
      return;
    }
    commandOk(`QH ${resolvedId} -> S${slotParsed.slot + 1}${result.swapped ? ' SWAP' : ''}`);
    stateMutatedCallback();
    return;
  }

  if (type === 'breach') {
    const defs = getBreachActionDefinitions();
    const resolvedId = resolveIdFromList(id, defs, (item) => item.id);
    if (!resolvedId) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    const result = equipBreachActionInSlot(slotParsed.slot, resolvedId);
    if (!result.success) {
      commandErr(result.message || 'NODE ACCESS DENIED');
      return;
    }
    commandOk(`BREACH ${resolvedId} -> S${slotParsed.slot + 1}${result.swapped ? ' SWAP' : ''}`);
    stateMutatedCallback();
    return;
  }

  commandWarn('USAGE: equip qh|breach <#|id> <slot>');
}

async function cmdUpgrade(args) {
  if (args[0] !== 'hack' || !args[1]) {
    commandWarn('USAGE: upgrade hack <#|id>');
    return;
  }
  const defs = getBreachActionDefinitions();
  const id = resolveIdFromList(args[1], defs, (item) => item.id);
  if (!id) {
    commandErr(`UNKNOWN TARGET: ${args[1]}`);
    return;
  }
  const result = upgradeHack(id);
  if (!result.success) {
    commandErr(result.message || 'UPGRADE FAILED');
    return;
  }
  commandOk(`${id.toUpperCase()} -> LVL ${result.newLevel}`);
  appendLine(`NEXT COST: ¥${result.newCost}`, 'dim');
  stateMutatedCallback();
}

async function cmdOperator(args) {
  if (args[0] !== 'select') {
    commandWarn('USAGE: operator select <#|id|alias>');
    return;
  }
  const needle = args.slice(1).join(' ');
  if (!needle) {
    commandWarn('USAGE: operator select <#|id|alias>');
    return;
  }
  const resolvedId = resolveOperatorId(needle);
  if (!resolvedId) {
    commandErr(`UNKNOWN TARGET: ${needle}`);
    return;
  }
  const result = setSelectedCrewMember(resolvedId);
  if (!result.success) {
    commandErr(result.message || 'NODE ACCESS DENIED');
    return;
  }
  commandOk(`OPERATOR LOCKED: ${resolvedId}`);
  stateMutatedCallback();
}

async function cmdDf(args) {
  const sub = args[0];
  const arg1 = args[1];
  const arg2 = args[2];

  if (!sub || sub === 'list') {
    const frags = getCollectedFragments();
    if (!frags.length) {
      commandWarn('NO FRAGMENTS COLLECTED');
      return;
    }
    sep();
    appendLine(`${frags.length}/${getTotalFragmentCount()} FRAGMENTS`, 'system');
    sep();
    appendLine('#  ID       STATE  RARITY      TITLE', 'system');
    sep();
    frags.forEach((f, index) => {
      const decrypted = isFragmentDecrypted(f.id);
      appendLine(`${String(index + 1).padStart(2)} ${f.id.padEnd(8)} ${decrypted ? 'DECR' : 'LOCK'}  ${f.rarity.padEnd(11)} ${f.title}`, decrypted ? 'ok' : 'warn');
    });
    sep();
    return;
  }

  if (sub === 'show') {
    if (!arg1) {
      commandWarn('USAGE: df show <#|id>');
      return;
    }
    const fragments = getCollectedFragments();
    const id = resolveIdFromList(arg1, fragments, (f) => f.id);
    const frag = fragments.find((f) => f.id === id);
    if (!frag) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    sep();
    appendLine(`${frag.id}  ${frag.title}`, 'system');
    appendLine(`category    ${frag.category} > ${frag.subcategory}`, 'info');
    appendLine(`rarity      ${frag.rarity}`, frag.rarity === 'classified' ? 'err' : frag.rarity === 'rare' ? 'warn' : 'dim');
    appendLine(`paranoia    ${frag.paranoiaLevel}/5`, 'info');
    if (isProbabilityUnlocked()) {
      appendLine(`legit       ${probLabel(frag.probability)}`, frag.probability >= 0.5 ? 'ok' : 'warn');
    } else {
      appendLine('legit       LOCKED (METADATA SCANNER REQUIRED)', 'dim');
    }

    if (isFragmentDecrypted(id)) {
      appendLine('content:', 'system');
      appendLine(`  ${frag.content}`, 'info');
    } else {
      appendLine('content     LOCKED // use df decrypt <id>', 'warn');
    }

    const links = getConnectionsFor(frag.id);
    if (links.length) {
      appendLine(`links       ${links.join(', ')}`, 'dim');
    }
    sep();
    return;
  }

  if (sub === 'decrypt') {
    if (!arg1) {
      commandWarn('USAGE: df decrypt <#|id>');
      return;
    }
    await preambleDecrypt();
    const fragments = getCollectedFragments();
    const id = resolveIdFromList(arg1, fragments, (f) => f.id);
    const frag = fragments.find((f) => f.id === id);
    if (!frag) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    if (!isDecryptorUnlocked()) {
      commandErr('NODE ACCESS DENIED // DECRYPTOR V1 REQUIRED');
      return;
    }
    if (isFragmentDecrypted(id)) {
      commandWarn(`${id} ALREADY DECRYPTED`);
      return;
    }
    decryptFragment(id);
    commandOk(`DECRYPTED: ${id}`);
    appendLine(`use df show ${id}`, 'dim');
    return;
  }

  if (sub === 'verify') {
    if (!arg1) {
      commandWarn('USAGE: df verify <#|id>');
      return;
    }
    await preambleDecrypt();
    const fragments = getCollectedFragments();
    const id = resolveIdFromList(arg1, fragments, (f) => f.id);
    const frag = fragments.find((f) => f.id === id);
    if (!frag) {
      commandErr(`UNKNOWN TARGET: ${id}`);
      return;
    }
    if (!isProbabilityUnlocked()) {
      commandErr('NODE ACCESS DENIED // METADATA SCANNER REQUIRED');
      return;
    }
    appendLine(`VERIFY ${id}`, 'system');
    appendLine(`legit       ${probLabel(frag.probability)}`, frag.probability >= 0.5 ? 'ok' : 'warn');
    appendLine(`paranoia    ${frag.paranoiaLevel}/5`, 'info');
    if (frag.probability >= 0.75) {
      commandOk('ASSESSMENT: HIGH TRUST');
    } else if (frag.probability >= 0.5) {
      commandWarn('ASSESSMENT: PARTIAL TRUST');
    } else {
      commandErr('ASSESSMENT: DISINFORMATION LIKELY');
    }
    return;
  }

  if (sub === 'connect') {
    if (!arg1 || !arg2) {
      commandWarn('USAGE: df connect <#|id> <#|id>');
      return;
    }
    const frags = getCollectedFragments();
    const a = resolveIdFromList(arg1, frags, (f) => f.id);
    const b = resolveIdFromList(arg2, frags, (f) => f.id);
    if (!frags.find((f) => f.id === a) || !frags.find((f) => f.id === b)) {
      commandErr('UNKNOWN TARGET');
      return;
    }
    addFragmentConnection(a, b);
    commandOk(`LINKED ${a} <-> ${b}`);
    return;
  }

  if (sub === 'disconnect') {
    if (!arg1 || !arg2) {
      commandWarn('USAGE: df disconnect <#|id> <#|id>');
      return;
    }
    const frags = getCollectedFragments();
    const a = resolveIdFromList(arg1, frags, (f) => f.id);
    const b = resolveIdFromList(arg2, frags, (f) => f.id);
    if (!a || !b) {
      commandErr('UNKNOWN TARGET');
      return;
    }
    removeFragmentConnection(a, b);
    commandOk(`UNLINKED ${a} <-> ${b}`);
    return;
  }

  if (sub === 'stats') {
    const frags = getCollectedFragments();
    const total = getTotalFragmentCount();
    const decrypted = frags.filter((f) => isFragmentDecrypted(f.id)).length;
    sep();
    section('DF STATS');
    appendLine(`collected   ${frags.length}/${total}`, 'info');
    appendLine(`decrypted   ${decrypted}/${frags.length}`, 'info');
    appendLine(`scanner     ${isProbabilityUnlocked() ? 'ONLINE' : 'OFFLINE'}`, isProbabilityUnlocked() ? 'ok' : 'warn');
    appendLine(`decryptor   ${isDecryptorUnlocked() ? 'ONLINE' : 'OFFLINE'}`, isDecryptorUnlocked() ? 'ok' : 'warn');
    sep();
    return;
  }

  commandWarn('USAGE: df list|show|decrypt|verify|connect|disconnect|stats');
}

async function cmdGhost() {
  await appendSeq([
    { text: '[ghost node detected]', cls: 'warn', ms: 200 },
    { text: '[clearance: insufficient]', cls: 'err', ms: 260 },
    { text: '[connection severed]', cls: 'err', ms: 320 },
  ]);
}

async function cmdOverride() {
  await appendSeq([
    { text: '[override initialized]', cls: 'warn', ms: 220 },
    { text: '[trace active]', cls: 'err', ms: 260 },
  ]);
  if ((G.hub?.notoriety || 0) >= 4) {
    appendLine('[fallback route opened: unstable]', 'warn');
    return;
  }
  appendLine('[abort: self-preservation]', 'err');
}

async function cmdTrace() {
  await delay(180);
  if ((G.hub?.notoriety || 0) >= 3) {
    appendLine('[signal source: located]', 'warn');
    appendLine('[someone is watching]', 'err');
  } else {
    appendLine('[no active trace detected]', 'dim');
  }
}

async function cmdMirror() {
  appendLine('[mirror protocol]', 'warn');
  appendLine('[reflection node: offline]', 'err');
}

async function cmdListen() {
  await appendSeq([
    { text: '[passive intercept mode]', cls: 'dim', ms: 190 },
    { text: '[scanning frequencies...]', cls: 'dim', ms: 260 },
  ]);
  const lore = [
    '[static]',
    '[whisper] sector 23 remembers',
    '[echo] do not trust mirrors',
    '[noise] packet loss 87%',
  ];
  appendLine(lore[Math.floor(Math.random() * lore.length)], 'warn');
}

const COMMANDS = {
  help: { fn: cmdHelp },
  whoami: { fn: cmdWhoami },
  history: { fn: cmdHistory },
  clear: { fn: cmdClear },
  status: { fn: cmdStatus },
  wallet: { fn: cmdStatus },
  runs: { fn: () => cmdRuns([]) },
  run: { fn: cmdRun, mutating: true },
  crew: { fn: cmdCrew },
  contacts: { fn: cmdContacts },
  loadout: { fn: cmdLoadout },
  market: { fn: cmdMarket },
  marketplace: { fn: cmdMarket },
  buy: { fn: cmdBuy, mutating: true },
  equip: { fn: cmdEquip, mutating: true },
  upgrade: { fn: cmdUpgrade, mutating: true },
  operator: { fn: cmdOperator, mutating: true },
  df: { fn: cmdDf, mutating: true },

  ghost: { fn: cmdGhost, hidden: true },
  override: { fn: cmdOverride, hidden: true },
  trace: { fn: cmdTrace, hidden: true },
  mirror: { fn: cmdMirror, hidden: true },
  listen: { fn: cmdListen, hidden: true },
};

const AUTOCOMPLETE_COMMANDS = [
  'help',
  'help crew',
  'help runs',
  'help marketplace',
  'help loadout',
  'help df',
  'whoami',
  'history',
  'clear',
  'status',
  'wallet',
  'runs',
  'run list',
  'run show ',
  'run select ',
  'run start',
  'crew',
  'crew select ',
  'contacts',
  'loadout qh',
  'loadout breach',
  'operator select ',
  'market',
  'marketplace',
  'market list qh',
  'market list breach',
  'buy qh ',
  'buy breach ',
  'upgrade hack ',
  'equip qh ',
  'equip breach ',
  'df list',
  'df show ',
  'df decrypt ',
  'df verify ',
  'df connect ',
  'df disconnect ',
  'df stats',
];

function resolveAutocomplete(currentValue) {
  const input = normalizeToken(currentValue);
  if (!input) return currentValue;
  const match = AUTOCOMPLETE_COMMANDS.find((cmd) => normalizeToken(cmd).startsWith(input));
  return match || currentValue;
}

async function handleCommand(raw) {
  const text = String(raw || '').trim();
  if (!text) return;

  appendLine(`> ${text}`, 'input');
  pushHistory(text);

  const tokens = text.split(/\s+/).map(normalizeToken);
  const [root, ...args] = tokens;
  const entry = COMMANDS[root];

  if (!entry) {
    commandErr(`UNKNOWN TARGET: ${root}`);
    refreshStatusLine();
    return;
  }

  terminalState.locked = true;
  try {
    await entry.fn(args);
  } catch (error) {
    commandErr('CORRUPTION DETECTED // COMMAND ABORTED');
    appendLine(String(error?.message || error), 'dim');
  } finally {
    terminalState.locked = false;
    refreshStatusLine();
  }
}

function bindInput() {
  const { input } = getEls();
  if (!input) return;

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (terminalState.locked) {
        return;
      }
      const value = input.value;
      input.value = '';
      void handleCommand(value);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (terminalState.historyIndex > 0) {
        terminalState.historyIndex -= 1;
        input.value = terminalState.history[terminalState.historyIndex] || '';
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (terminalState.historyIndex < terminalState.history.length - 1) {
        terminalState.historyIndex += 1;
        input.value = terminalState.history[terminalState.historyIndex] || '';
      } else {
        terminalState.historyIndex = terminalState.history.length;
        input.value = '';
      }
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      input.value = resolveAutocomplete(input.value);
    }
  });
}

export function initMenuTerminal(options = {}) {
  if (initialized) {
    refreshStatusLine();
    return;
  }

  stateMutatedCallback = typeof options.onStateMutated === 'function' ? options.onStateMutated : () => {};
  runStartCallback = typeof options.onRequestRunStart === 'function'
    ? options.onRequestRunStart
    : () => ({ success: false, message: 'NO RUN CALLBACK' });

  bindInput();
  printBootBanner();
  refreshStatusLine();
  initialized = true;
}

export function focusMenuTerminalInput() {
  const { input } = getEls();
  if (!input) return;
  input.focus();
}

export function syncMenuTerminalStatus() {
  refreshStatusLine();
}

export function listMenuTerminalCatalog() {
  return {
    quickhacks: getQuickHackDefinitions().map((entry) => entry.id),
    breach: getBreachActionDefinitions().map((entry) => entry.id),
  };
}
