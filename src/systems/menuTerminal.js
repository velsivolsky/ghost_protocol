import { G, upgradeHack } from '../core/state.js';
import {
  ensureHubState,
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
  isFragmentMetadataScanned,
  isProbabilityUnlocked,
  scanFragmentMetadata,
  getTotalFragmentCount,
  unlockProbability,
  unlockDecryptor,
} from './dataFragments.js';
import {
  changeRunIntelDir,
  ensureRunIntelForRun,
  getRunIntelMark,
  getRunIntelSummary,
  listRunIntelDir,
  normalizeIntelPath,
  openRunIntelSession,
  readRunIntelFile,
  setRunIntelMark,
} from './runIntel.js';

let initialized = false;
let stateMutatedCallback = () => {};
let runStartCallback = () => ({ success: false, message: 'NO RUN START HANDLER' });

function getWalletCredits() {
  ensureHubState();
  const hubCredits = Number(G.hub?.walletCredits);
  if (Number.isFinite(hubCredits)) {
    if (!G.P) {
      G.P = {
        x: 0,
        y: 0,
        hp: 100,
        mhp: 100,
        bw: 100,
        mbw: 100,
        cr: Math.max(0, hubCredits),
      };
    } else {
      G.P.cr = Math.max(0, hubCredits);
    }
    return Math.max(0, hubCredits);
  }

  const playerCredits = Number(G.P?.cr);
  if (Number.isFinite(playerCredits)) {
    return Math.max(0, playerCredits);
  }

  return 0;
}

function setWalletCredits(nextCredits) {
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
  return value;
}

const terminalState = {
  history: [],
  historyIndex: 0,
  booted: false,
  locked: false,
  intelShell: {
    active: false,
    runId: null,
    cwd: '/',
    host: '',
  },
};

function getEls() {
  return {
    output: document.getElementById('menu-terminal-output'),
    input: document.getElementById('menu-terminal-input'),
    status: document.getElementById('menu-terminal-status'),
    prompt: document.querySelector('.menu-terminal-prompt'),
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
  if (prob >= 0.75) return 'LEGIT';
  if (prob >= 0.5) return 'PARTIAL';
  if (prob >= 0.25) return 'SUSPECT';
  return 'FALSE';
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
  const { status, prompt } = getEls();
  if (!status) return;
  const credits = getWalletCredits();
  const wave = G.wave || 1;
  const notoriety = G.hub?.notoriety || 0;
  const collected = getCollectedFragments().length;
  const total = getTotalFragmentCount();
  status.textContent = `W${wave}  ¥${credits}  REP:${notoriety}  DF:${collected}/${total}`;

  if (prompt) {
    if (terminalState.intelShell.active && terminalState.intelShell.host) {
      const cwd = terminalState.intelShell.cwd || '/';
      prompt.textContent = `root@${terminalState.intelShell.host}:${cwd}$`;
    } else {
      prompt.textContent = 'root@gp://$';
    }
  }
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
  appendLine('market list tools            -> scanner/decryptor status', 'dim');
  appendLine('buy qh <#|id>                -> unlock quickhack item', 'dim');
  appendLine('buy breach <#|id>            -> unlock breach action', 'dim');
  appendLine('buy scanner                  -> install metadata scanner', 'dim');
  appendLine('buy decryptor                -> install decryptor v1', 'dim');
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
  appendLine('df verify <#|id>             -> scan metadata + verify legitimacy', 'dim');
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

  if (topic === 'intel' || topic === 'ssh') {
    section('HELP // INTEL SHELL');
    appendLine('hosts                 -> list available intel hosts', 'dim');
    appendLine('intel                 -> list runs with hosts', 'dim');
    appendLine('intel run <#|id>      -> set run context for ssh', 'dim');
    appendLine('ssh <host|#|id>       -> connect to intel server', 'dim');
    appendLine('TAB autocomplete      -> host name for ssh', 'dim');
    appendLine('after ssh TAB         -> paths for cd/ls/cat/intel mark', 'dim');
    appendLine('ls [-la] [path]       -> list directory', 'dim');
    appendLine('cd <path>             -> change directory', 'dim');
    appendLine('pwd                   -> print current directory', 'dim');
    appendLine('cat <file>            -> read intel file', 'dim');
    appendLine('intel mark <file> <verified|suspicious|clear>', 'dim');
    appendLine('exit                  -> leave intel shell context', 'dim');
    appendLine('intel summary         -> intel usage stats for current run', 'dim');
    return;
  }

  section('AVAILABLE NETWORK FUNCTIONS');
  appendLine('help | help crew | help runs | help marketplace', 'dim');
  appendLine('help loadout | help df | help intel', 'dim');
  appendLine('whoami | status | wallet | history | clear', 'dim');
  appendLine('LIVE RUN NOTE: side terminals may require breach firewall before dump creds', 'dim');
  appendLine('LIVE RUN NOTE: unlock elevator on main terminal after collecting auth shards', 'dim');
  sep();
  section('INTEL');
  appendLine('runs | run list | run show <#|id> | hosts', 'dim');
  appendLine('crew | crew select <#|id|alias> | contacts', 'dim');
  appendLine('loadout qh | loadout breach', 'dim');
  sep();
  section('TACTICAL');
  appendLine('run select <#|id> | run start', 'dim');
  appendLine('operator select <#|id|alias>', 'dim');
  appendLine('equip qh <#|id> <slot> | equip breach <#|id> <slot>', 'dim');
  sep();
  section('MARKETPLACE');
  appendLine('market | market list qh | market list breach | market list tools', 'dim');
  appendLine('buy qh <#|id> | buy breach <#|id> | buy scanner | buy decryptor', 'dim');
  appendLine('upgrade hack <#|id>', 'dim');
  sep();
  section('DATA FRAGMENTS');
  appendLine('df list | df show <#|id> | df decrypt <#|id> | df verify <#|id>', 'dim');
  appendLine('df connect <#|id> <#|id> | df disconnect <#|id> <#|id> | df stats', 'dim');
  sep();
  section('INTEL SHELL');
  appendLine('hosts | intel | intel run <#|id> | ssh <host|#|id>', 'dim');
  appendLine('ls | ls -la | cd | pwd | cat | intel mark | exit | intel summary', 'dim');
}

function getIntelEnabledRuns() {
  const toRecruitRunId = (contactId) => {
    const raw = String(contactId || '');
    const tail = raw.match(/(\d+)$/);
    return `rc-${tail ? tail[1] : raw.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'x'}`;
  };

  const normalRuns = getActiveRunOffers();
  const recruitRuns = (getContacts() || [])
    .filter((contact) => contact?.mission?.status === 'ready' || contact?.mission?.status === 'intel')
    .map((contact) => {
      const risk = String(contact?.risk || '').toLowerCase();
      const danger = risk === 'hardcore' ? 10 : risk === 'hard' ? 8 : risk === 'medium' ? 5 : 2;
      const security = risk === 'hardcore' ? 82 : risk === 'hard' ? 64 : risk === 'medium' ? 46 : 28;
      const recruitRunId = toRecruitRunId(contact.id);

      return {
        id: recruitRunId,
        typeId: 'recruit',
        typeName: contact.alias || 'KONTAKT',
        target: contact.specialization || 'Rekrutacja operatora',
        danger,
        security,
        floorCount: 1,
        recruit: true,
        contact,
        intelHost: `${recruitRunId}.ops.gp`,
      };
    });

  return [...normalRuns, ...recruitRuns];
}

function printIntelHostsList() {
  const runs = getIntelEnabledRuns();
  if (!runs.length) {
    commandWarn('NO RUN OFFERS ONLINE');
    return;
  }

  sep();
  appendLine('#  RUN_ID    HOST                        DANGER  SECURITY', 'system');
  sep();
  runs.forEach((run, index) => {
    const host = run.intelHost || `intel-${run.id}.ops.gp`;
    appendLine(`${String(index + 1).padStart(2)} ${run.id.padEnd(9)} ${host.padEnd(27)} ${String(run.danger).padStart(2)}      ${String(run.security).padStart(3)}%`, 'info');
  });
  sep();
  appendLine('connect with: ssh <host|#|id>', 'dim');
}

async function cmdHosts() {
  printIntelHostsList();
}

function resolveRunByIdOrIndex(raw) {
  const runs = getIntelEnabledRuns();
  const runId = resolveIdFromList(raw, runs, (item) => item.id);
  if (!runId) {
    return null;
  }

  return runs.find((run) => run.id === runId) || null;
}

function resolveRunByHost(rawHost) {
  const token = normalizeToken(rawHost);
  if (!token) {
    return null;
  }

  const runs = getIntelEnabledRuns();
  const byHost = runs.find((run) => {
    const host = run.intelHost || `intel-${run.id}.ops.gp`;
    return normalizeToken(host) === token;
  });
  if (byHost) {
    return byHost;
  }

  return resolveRunByIdOrIndex(rawHost);
}

function getSshAutocompleteHosts() {
  const runs = getIntelEnabledRuns();
  const seen = new Set();
  const hosts = [];

  const pushHost = (value) => {
    const host = String(value || '').trim();
    const key = normalizeToken(host);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    hosts.push(host);
  };

  if (terminalState.intelShell.host) {
    pushHost(terminalState.intelShell.host);
  }

  runs.forEach((run) => {
    pushHost(run.intelHost || `intel-${run.id}.ops.gp`);
  });

  return hosts;
}

function formatLsTimestamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()] || 'Jan';
  const day = String(now.getDate()).padStart(2, ' ');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${month} ${day} ${hour}:${minute}`;
}

function formatLsEntryLine(entry, fileSize = 0, displayName = '') {
  const perms = entry.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
  const size = String(fileSize).padStart(6, ' ');
  const stamp = formatLsTimestamp();
  const name = displayName || entry.name;
  return `${perms} 1 root root ${size} ${stamp} ${name}`;
}

function getLsEntrySize(intel, entry) {
  if (entry.type === 'file') {
    return String(intel?.files?.[entry.path] || '').length;
  }
  return 4096;
}

function toLsBlocks(sizeBytes) {
  return Math.max(1, Math.ceil(Number(sizeBytes || 0) / 1024));
}

function parseLsArgs(args = []) {
  const state = {
    showAll: false,
    path: '.',
    error: null,
  };

  for (const tokenRaw of args) {
    const token = String(tokenRaw || '').trim();
    if (!token) {
      continue;
    }

    if (token.startsWith('-')) {
      for (const flag of token.slice(1)) {
        if (flag === 'a') {
          state.showAll = true;
          continue;
        }
        if (flag === 'l') {
          continue;
        }
        state.error = `UNKNOWN OPTION: -${flag}`;
        return state;
      }
      continue;
    }

    if (state.path !== '.') {
      state.error = 'USAGE: ls [-la] [path]';
      return state;
    }

    state.path = token;
  }

  return state;
}

function getIntelPathSuggestions(run, cwd, typedPath, mode = 'any') {
  const rawPath = String(typedPath || '');
  const hasLeadingSlash = rawPath.startsWith('/');
  const slashIndex = rawPath.lastIndexOf('/');
  const hasSeparator = slashIndex !== -1;
  const parentRaw = hasSeparator ? rawPath.slice(0, slashIndex + 1) : '.';
  const prefix = hasSeparator ? rawPath.slice(slashIndex + 1) : rawPath;

  const listed = listRunIntelDir(run, cwd, parentRaw || '.');
  if (!listed.ok) {
    return [];
  }

  const normalizedPrefix = normalizeToken(prefix);
  const filtered = listed.entries.filter((entry) => {
    if (mode === 'dir' && entry.type !== 'dir') {
      return false;
    }
    if (mode === 'file' && entry.type !== 'file') {
      return false;
    }

    return normalizeToken(entry.name).startsWith(normalizedPrefix);
  });

  return filtered.map((entry) => {
    if (hasLeadingSlash) {
      return entry.path;
    }

    if (!hasSeparator || parentRaw === '.') {
      return entry.name;
    }

    return `${parentRaw}${entry.name}`;
  });
}

function resolveIntelShellAutocomplete(raw) {
  if (!terminalState.intelShell.active) {
    return null;
  }

  const run = getIntelRun();
  if (!run) {
    return null;
  }

  const trimmed = String(raw || '').trimStart();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const root = normalizeToken(parts[0]);

  if (root === 'cd') {
    const typedPath = parts[1] || '';
    const suggestions = getIntelPathSuggestions(run, terminalState.intelShell.cwd, typedPath, 'dir');
    if (suggestions[0]) {
      return `cd ${suggestions[0]}`;
    }
  }

  if (root === 'ls') {
    const optionToken = parts[1] || '';
    const hasOption = optionToken.startsWith('-');
    const typedPath = hasOption ? (parts[2] || '') : (parts[1] || '');
    const suggestions = getIntelPathSuggestions(run, terminalState.intelShell.cwd, typedPath, 'any');
    if (suggestions[0]) {
      return hasOption
        ? `ls ${optionToken} ${suggestions[0]}`
        : `ls ${suggestions[0]}`;
    }
  }

  if (root === 'cat') {
    const typedPath = parts[1] || '';
    const suggestions = getIntelPathSuggestions(run, terminalState.intelShell.cwd, typedPath, 'file');
    if (suggestions[0]) {
      return `cat ${suggestions[0]}`;
    }
  }

  if (root === 'intel' && normalizeToken(parts[1]) === 'mark') {
    const typedPath = parts[2] || '';
    const mark = parts[3] || '';
    const suggestions = getIntelPathSuggestions(run, terminalState.intelShell.cwd, typedPath, 'file');
    if (suggestions[0]) {
      return `intel mark ${suggestions[0]}${mark ? ` ${mark}` : ''}`;
    }
  }

  return null;
}

function getIntelRun() {
  if (!terminalState.intelShell.runId) {
    return getCurrentRunOffer() || null;
  }

  return getIntelEnabledRuns().find((run) => run.id === terminalState.intelShell.runId) || getCurrentRunOffer() || null;
}

function ensureIntelShellActive() {
  if (!terminalState.intelShell.active || !terminalState.intelShell.runId) {
    commandWarn('INTEL SHELL OFFLINE // use ssh <host|#|id>');
    return false;
  }

  return true;
}

async function cmdIntel(args) {
  const sub = normalizeToken(args?.[0]);

  if (!sub) {
    printIntelHostsList();
    return;
  }

  if (sub === 'run') {
    const target = args?.[1];
    if (!target) {
      commandWarn('USAGE: intel run <#|id>');
      return;
    }

    const run = resolveRunByIdOrIndex(target);
    if (!run) {
      commandErr(`UNKNOWN TARGET: ${target}`);
      return;
    }

    terminalState.intelShell.runId = run.id;
    terminalState.intelShell.host = run.intelHost || `intel-${run.id}.ops.gp`;
    terminalState.intelShell.cwd = '/';
    commandOk(`INTEL TARGET SET: ${run.id} (${terminalState.intelShell.host})`);
    appendLine(`next: ssh ${terminalState.intelShell.host}`, 'dim');
    return;
  }

  if (sub === 'summary') {
    const run = getIntelRun() || getCurrentRunOffer();
    if (!run) {
      commandWarn('NO RUN CONTEXT');
      return;
    }

    const summary = getRunIntelSummary(run.id);
    if (!summary.available) {
      commandWarn('INTEL NOT GENERATED YET // connect via ssh first');
      return;
    }

    sep();
    section('INTEL SUMMARY');
    appendLine(`run       ${run.id}`, 'info');
    appendLine(`host      ${summary.host}`, 'info');
    appendLine(`sessions  ${summary.sessions}`, 'info');
    appendLine(`files     ${summary.filesRead}`, 'info');
    appendLine(`signal    ${summary.signalReads}`, 'ok');
    appendLine(`noise     ${summary.noiseReads}`, summary.noiseReads > summary.signalReads ? 'warn' : 'dim');
    appendLine(`lore      ${summary.loreReads}`, 'dim');
    appendLine(`verified  ${summary.verifiedMarks}`, 'ok');
    appendLine(`suspect   ${summary.suspiciousMarks}`, 'warn');
    sep();
    return;
  }

  if (sub === 'mark') {
    if (!ensureIntelShellActive()) {
      return;
    }

    const run = getIntelRun();
    if (!run) {
      commandErr('RUN CONTEXT LOST');
      return;
    }

    const target = args?.[1];
    const mark = args?.[2];

    if (!target || !mark) {
      commandWarn('USAGE: intel mark <file> <verified|suspicious|clear>');
      return;
    }

    const result = setRunIntelMark(run, terminalState.intelShell.cwd, target, mark);
    if (!result.ok) {
      commandErr(`MARK FAILED: ${result.path || target}`);
      return;
    }

    const normalizedMark = result.mark === 'clear' ? 'clear' : result.mark;
    appendLine(`mark ${normalizedMark} -> ${result.path}`, normalizedMark === 'verified' ? 'ok' : normalizedMark === 'suspicious' ? 'warn' : 'dim');
    return;
  }

  commandWarn('USAGE: intel | intel run <#|id> | intel summary | intel mark <file> <verified|suspicious|clear>');
}

async function cmdSsh(args) {
  const fallbackRun = getIntelRun();
  const target = args?.[0]
    || terminalState.intelShell.host
    || terminalState.intelShell.runId
    || fallbackRun?.intelHost
    || fallbackRun?.id;
  if (!target) {
    commandWarn('USAGE: ssh <host|#|id>');
    appendLine('hint: run "intel" to list hosts or "intel run <#|id>" first', 'dim');
    return;
  }

  const run = resolveRunByHost(target);
  if (!run) {
    commandErr(`HOST NOT FOUND: ${target}`);
    return;
  }

  await preambleConnect();
  openRunIntelSession(run, 'menu-terminal');
  terminalState.intelShell.active = true;
  terminalState.intelShell.runId = run.id;
  terminalState.intelShell.host = run.intelHost || `intel-${run.id}.ops.gp`;
  terminalState.intelShell.cwd = '/';

  commandOk(`CONNECTED ${terminalState.intelShell.host}`);
  appendLine('use ls/cd/cat/pwd, type exit to disconnect', 'dim');
}

async function cmdLs(args) {
  if (!ensureIntelShellActive()) {
    return;
  }

  const run = getIntelRun();
  if (!run) {
    commandErr('RUN CONTEXT LOST');
    terminalState.intelShell.active = false;
    return;
  }

  const parsed = parseLsArgs(args);
  if (parsed.error) {
    commandWarn(parsed.error);
    return;
  }

  const target = parsed.path || '.';
  const listed = listRunIntelDir(run, terminalState.intelShell.cwd, target);
  if (!listed.ok) {
    commandErr(`PATH ERROR: ${listed.path || target}`);
    return;
  }

  const intel = ensureRunIntelForRun(run);
  const ordered = [...listed.entries].sort((a, b) => a.name.localeCompare(b.name));
  const dotEntries = parsed.showAll
    ? [
      { name: '.', path: listed.path, type: 'dir', dotName: '.' },
      { name: '..', path: normalizeIntelPath(listed.path, '..'), type: 'dir', dotName: '..' },
    ]
    : [];
  const renderEntries = [...dotEntries, ...ordered];
  const totalBlocks = renderEntries.reduce((sum, entry) => {
    return sum + toLsBlocks(getLsEntrySize(intel, entry));
  }, 0);

  appendLine(`total ${totalBlocks}`, 'system');
  renderEntries.forEach((entry) => {
    const fileSize = getLsEntrySize(intel, entry);
    appendLine(
      formatLsEntryLine(entry, fileSize, entry.dotName || ''),
      entry.type === 'dir' ? 'ok' : 'info',
    );
  });
}

async function cmdCd(args) {
  if (!ensureIntelShellActive()) {
    return;
  }

  const run = getIntelRun();
  if (!run) {
    commandErr('RUN CONTEXT LOST');
    terminalState.intelShell.active = false;
    return;
  }

  const target = args?.[0] || '/';
  const changed = changeRunIntelDir(run, terminalState.intelShell.cwd, target);
  if (!changed.ok) {
    commandErr(`CD FAILED: ${target}`);
    return;
  }

  terminalState.intelShell.cwd = changed.cwd;
  appendLine(`cwd -> ${terminalState.intelShell.cwd}`, 'ok');
}

async function cmdPwd() {
  if (!ensureIntelShellActive()) {
    return;
  }

  appendLine(terminalState.intelShell.cwd, 'info');
}

async function cmdCat(args) {
  if (!ensureIntelShellActive()) {
    return;
  }

  const run = getIntelRun();
  if (!run) {
    commandErr('RUN CONTEXT LOST');
    terminalState.intelShell.active = false;
    return;
  }

  const target = args?.[0];
  if (!target) {
    commandWarn('USAGE: cat <file>');
    return;
  }

  const previewPath = normalizeIntelPath(terminalState.intelShell.cwd, target);
  const read = readRunIntelFile(run, terminalState.intelShell.cwd, target, 'menu-terminal');
  if (!read.ok) {
    commandErr(`CAT FAILED: ${previewPath}`);
    return;
  }

  const mark = getRunIntelMark(run, terminalState.intelShell.cwd, target);
  const markLabel = mark.ok ? mark.mark : 'none';

  appendLine(`--- ${read.path} [${read.tag}] [mark:${markLabel}] ---`, 'system');
  read.content.split('\n').forEach((line) => appendLine(line, 'info'));
}

async function cmdExit() {
  if (!terminalState.intelShell.active) {
    commandWarn('NO ACTIVE SHELL CONTEXT');
    return;
  }

  terminalState.intelShell.active = false;
  terminalState.intelShell.cwd = '/';
  commandOk(`DISCONNECTED ${terminalState.intelShell.host || ''}`.trim());
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
  appendLine(`WALLET     ¥${getWalletCredits()}`, 'ok');
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
  const credits = getWalletCredits();

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
    appendLine('TOOLS', 'system');
    const scannerOwned = isProbabilityUnlocked();
    const decryptorOwned = isDecryptorUnlocked();
    const scannerState = scannerOwned ? 'OWNED' : credits >= 2000 ? '¥ 2000' : 'LOCKED';
    const decryptorState = decryptorOwned ? 'OWNED' : credits >= 2500 ? '¥ 2500' : 'LOCKED';
    appendLine(`01 ID:scanner   METADATA SCANNER      ${scannerState}`, scannerOwned ? 'dim' : credits >= 2000 ? 'info' : 'warn');
    appendLine(`02 ID:decryptor DECRYPTOR v1          ${decryptorState}`, decryptorOwned ? 'dim' : credits >= 2500 ? 'info' : 'warn');
    sep();
    appendLine('buy qh <id> | buy breach <id> | buy scanner | buy decryptor | upgrade hack <id>', 'dim');
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

  if (sub === 'list' && type === 'tools') {
    const scannerOwned = isProbabilityUnlocked();
    const decryptorOwned = isDecryptorUnlocked();
    sep();
    appendLine('#  ID         NAME               PRICE/STATE', 'system');
    sep();
    appendLine(`01 scanner    METADATA SCANNER   ${scannerOwned ? 'OWNED' : credits >= 2000 ? '¥2000' : `BRAKUJE ¥${2000 - credits}`}`, scannerOwned ? 'dim' : credits >= 2000 ? 'info' : 'warn');
    appendLine('   Unlocks PROBABILITY labels in DATA BOARD fragments.', 'dim');
    appendLine(`02 decryptor  DECRYPTOR v1       ${decryptorOwned ? 'OWNED' : credits >= 2500 ? '¥2500' : `BRAKUJE ¥${2500 - credits}`}`, decryptorOwned ? 'dim' : credits >= 2500 ? 'info' : 'warn');
    appendLine('   Unlocks manual decryption for encrypted fragments.', 'dim');
    sep();
    return;
  }

  commandWarn('USAGE: market | market list qh | market list breach | market list tools');
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
    appendLine(`WALLET: ¥${setWalletCredits(G.P?.cr ?? getWalletCredits())}`, 'dim');
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
    appendLine(`WALLET: ¥${setWalletCredits(G.P?.cr ?? getWalletCredits())}`, 'dim');
    stateMutatedCallback();
    return;
  }

  if (type === 'scanner' || type === 'metadata') {
    const cost = 2000;
    const credits = getWalletCredits();
    if (isProbabilityUnlocked()) {
      commandWarn('METADATA SCANNER ALREADY INSTALLED');
      return;
    }
    if (credits < cost) {
      commandErr(`INSUFFICIENT CREDITS // NEED ¥${cost}`);
      return;
    }
    setWalletCredits(credits - cost);
    unlockProbability();
    commandOk(`PURCHASED METADATA SCANNER -¥${cost}`);
    appendLine(`WALLET: ¥${getWalletCredits()}`, 'dim');
    stateMutatedCallback();
    return;
  }

  if (type === 'decryptor') {
    const cost = 2500;
    const credits = getWalletCredits();
    if (isDecryptorUnlocked()) {
      commandWarn('DECRYPTOR V1 ALREADY INSTALLED');
      return;
    }
    if (credits < cost) {
      commandErr(`INSUFFICIENT CREDITS // NEED ¥${cost}`);
      return;
    }
    setWalletCredits(credits - cost);
    unlockDecryptor();
    commandOk(`PURCHASED DECRYPTOR V1 -¥${cost}`);
    appendLine(`WALLET: ¥${getWalletCredits()}`, 'dim');
    stateMutatedCallback();
    return;
  }

  commandWarn('USAGE: buy qh <#|id> | buy breach <#|id> | buy scanner | buy decryptor');
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
      if (isFragmentMetadataScanned(id)) {
        appendLine(`legit       ${probLabel(frag.probability)}`, frag.probability >= 0.5 ? 'ok' : 'warn');
      } else {
        appendLine('legit       NOT SCANNED (use df verify <id>)', 'dim');
      }
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
    appendLine('[metadata scan in progress...]', 'dim');
    scanFragmentMetadata(id);
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
    const scanned = frags.filter((f) => isFragmentMetadataScanned(f.id)).length;
    sep();
    section('DF STATS');
    appendLine(`collected   ${frags.length}/${total}`, 'info');
    appendLine(`decrypted   ${decrypted}/${frags.length}`, 'info');
    appendLine(`scanned     ${scanned}/${frags.length}`, 'info');
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
  hosts: { fn: cmdHosts },
  intel: { fn: cmdIntel },
  ssh: { fn: cmdSsh },
  ls: { fn: cmdLs },
  cd: { fn: cmdCd },
  pwd: { fn: cmdPwd },
  cat: { fn: cmdCat },
  exit: { fn: cmdExit },

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
  'help intel',
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
  'market list tools',
  'buy qh ',
  'buy breach ',
  'buy scanner',
  'buy decryptor',
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
  'hosts',
  'intel',
  'intel run ',
  'intel summary',
  'intel mark ',
  'ssh ',
  'ls',
  'ls -la',
  'ls -la ',
  'cd ',
  'pwd',
  'cat ',
  'exit',
];

function resolveAutocomplete(currentValue) {
  const raw = String(currentValue || '');

  const intelSuggestion = resolveIntelShellAutocomplete(raw);
  if (intelSuggestion) {
    return intelSuggestion;
  }

  const sshInput = raw.trimStart();
  if (normalizeToken(sshInput).startsWith('ssh')) {
    const parts = sshInput.split(/\s+/).filter(Boolean);
    if (parts.length <= 2) {
      const hosts = getSshAutocompleteHosts();
      if (hosts.length) {
        const typedHost = parts[1] || '';
        const typed = normalizeToken(typedHost);
        const match = hosts.find((host) => normalizeToken(host).startsWith(typed));
        if (match) {
          return `ssh ${match}`;
        }
      }
    }
  }

  const input = normalizeToken(raw);
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
