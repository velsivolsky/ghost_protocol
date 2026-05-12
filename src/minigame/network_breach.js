const state = {
  turn: 1,
  core: 100,
  player: {
    cpu: 100,
    maxCpu: 100,
    ram: 80,
    maxRam: 80,
    trace: 26,
    tracked: 0,
    antiTrackTurns: 0,
    encrypted: 0,
  },
  enemies: [
    makeIce('firewall', 'FIREWALL', 82),
    makeIce('daemon', 'TRACE DAEMON', 56),
    makeIce('sentinel', 'ICE SENTINEL', 64),
  ],
  blackIceActive: false,
  finished: false,
};

const ACTIONS = [
  {
    id: 'attack',
    name: 'ATTACK',
    costCpu: 14,
    costRam: 0,
    trace: 8,
    desc: 'Direct exploit. Tani i stabilny.',
  },
  {
    id: 'spoof',
    name: 'SPOOF',
    costCpu: 8,
    costRam: 12,
    trace: -16,
    desc: 'Stealth utility. Zbija TRACE i usuwa TRACKED.',
  },
  {
    id: 'worm',
    name: 'WORM',
    costCpu: 12,
    costRam: 18,
    trace: 6,
    desc: 'Virus DOT. Mocny na FIREWALL.',
  },
  {
    id: 'overload',
    name: 'OVERLOAD',
    costCpu: 34,
    costRam: 0,
    trace: 20,
    desc: 'Power burst. Bardzo ryzykowny.',
  },
  {
    id: 'core',
    name: 'PRZEJMIJ RDZEN',
    costCpu: 24,
    costRam: 18,
    trace: 16,
    desc: 'Konczy walke przez przejecie node.',
  },
];

const statsEl = document.getElementById('stats');
const actionsEl = document.getElementById('actions');
const enemiesEl = document.getElementById('enemies');
const logEl = document.getElementById('log');
const footerEl = document.getElementById('footer');

render();
addLog('Polaczenie ustanowione. Rozpoczyna sie NETWORK BREACH.');

function makeIce(type, name, hp) {
  return {
    id: `${type}-${Math.random().toString(16).slice(2, 7)}`,
    type,
    name,
    hp,
    maxHp: hp,
    armor: type === 'firewall' ? 8 : 2,
    infected: 0,
    stunned: 0,
    dead: false,
  };
}

function render() {
  renderStats();
  renderActions();
  renderEnemies();
}

function renderStats() {
  const p = state.player;
  const traceVal = Math.max(0, Math.round(p.trace));
  const traceClass = traceVal >= 80 ? 'trace-critical' : traceVal >= 50 ? 'trace-high' : '';
  statsEl.innerHTML = [
    card('TURA', state.turn),
    card('CPU', `${Math.max(0, Math.round(p.cpu))}/${p.maxCpu}`),
    card('RAM', `${Math.max(0, Math.round(p.ram))}/${p.maxRam}`),
    card('TRACKED', `${Math.max(0, p.tracked)}${p.antiTrackTurns > 0 ? ` | SHIELD:${p.antiTrackTurns}` : ''}`),
    `<div class="stat ${traceClass}"><div class="k">TRACE</div><div class="v">${traceVal}%</div><div class="trace-bar"><div class="fill" style="width:${Math.min(100, traceVal)}%"></div></div></div>`,
    card('RDZEN', `${Math.max(0, Math.round(state.core))}%`),
  ].join('');
}

function renderActions() {
  actionsEl.innerHTML = '';

  for (const action of ACTIONS) {
    const button = document.createElement('button');
    const costs = costForAction(action);
    const p = state.player;
    const cpuClass = costs.cpu > p.cpu ? 'cost-bad' : costs.cpu > p.cpu * 0.6 ? 'cost-warn' : 'cost-ok';
    const ramClass = costs.ram > p.ram ? 'cost-bad' : costs.ram > 0 && costs.ram > p.ram * 0.6 ? 'cost-warn' : 'cost-ok';
    const traceSign = action.trace >= 0 ? '+' : '';
    button.innerHTML = `${action.name}<br><small><span class="${cpuClass}">CPU:${costs.cpu}</span> <span class="${ramClass}">RAM:${costs.ram}</span> TRACE:${traceSign}${action.trace}</small><br><small>${action.desc}</small>`;

    if (state.finished || !canPay(costs.cpu, costs.ram)) {
      button.disabled = true;
    }

    button.addEventListener('click', () => runPlayerTurn(action));
    actionsEl.appendChild(button);
  }
}

function renderEnemies() {
  enemiesEl.innerHTML = '';

  for (const enemy of state.enemies) {
    const row = document.createElement('div');
    const isTargeted = !enemy.dead && !state.finished && state.enemies.filter(e => !e.dead)[0]?.id === enemy.id;
    row.className = `enemy ${enemy.dead ? 'dead' : ''} ${isTargeted ? 'targeted' : ''}`.trim();
    const hpPct = Math.max(0, Math.round((enemy.hp / enemy.maxHp) * 100));
    // gradient position: 0% = red (low hp), 100% = green (full hp)
    const hpPos = 100 - hpPct;
    row.innerHTML = `<div class="name">${enemy.name}</div><div class="meta">HP:${Math.max(0, Math.round(enemy.hp))}/${enemy.maxHp} | ARM:${enemy.armor} | INF:${enemy.infected} | STUN:${enemy.stunned}</div><div class="hp-bar"><div class="fill" style="width:${hpPct}%;background-position:${hpPos}% 0"></div></div>`;
    enemiesEl.appendChild(row);
  }
}

function card(key, value) {
  return `<div class="stat"><div class="k">${key}</div><div class="v">${value}</div></div>`;
}

function canPay(cpu, ram) {
  return state.player.cpu >= cpu && state.player.ram >= ram;
}

function costForAction(action) {
  const encryptedCpu = state.player.encrypted > 0 ? 6 : 0;
  const encryptedRam = state.player.encrypted > 0 ? 4 : 0;

  return {
    cpu: action.costCpu + encryptedCpu,
    ram: action.costRam + encryptedRam,
  };
}

function runPlayerTurn(action) {
  if (state.finished) {
    return;
  }

  const target = chooseTarget(action);

  if ((action.id !== 'spoof' && action.id !== 'core') && !target) {
    addLog('Brak aktywnego celu.', 'warn');
    return;
  }

  if (action.id === 'core' && hasAliveType('firewall')) {
    addLog('FIREWALL blokuje dostep do rdzenia.', 'warn');
    return;
  }

  const costs = costForAction(action);

  if (!canPay(costs.cpu, costs.ram)) {
    addLog('Za malo zasobow.', 'warn');
    return;
  }

  state.player.cpu -= costs.cpu;
  state.player.ram -= costs.ram;

  if (action.id === 'attack') {
    const dmg = Math.max(4, 18 - target.armor);
    hurtEnemy(target, dmg);
    addTrace(action.trace);
    addLog(`ATTACK trafia ${target.name} za ${dmg}.`);
  }

  if (action.id === 'spoof') {
    state.player.trace = Math.max(0, state.player.trace - 16);
    state.player.tracked = 0;
    state.player.antiTrackTurns = Math.max(state.player.antiTrackTurns, 1);
    addLog('SPOOF ukrywa sygnature. TRACKED wyczyszczony i aktywna osłona anty-track.');
  }

  if (action.id === 'worm') {
    target.infected = Math.max(target.infected, 4);
    const upfront = target.type === 'firewall' ? 14 : 10;
    hurtEnemy(target, upfront);
    addTrace(action.trace);
    addLog(`WORM infekuje ${target.name}.`);
  }

  if (action.id === 'overload') {
    const bonus = target.type === 'firewall' ? 22 : 10;
    const dmg = Math.max(10, 32 + bonus - target.armor);
    hurtEnemy(target, dmg);
    if (Math.random() < 0.42) {
      target.stunned = Math.max(target.stunned, 1);
      addLog(`${target.name} zostal STUNNED.`, 'warn');
    }
    addTrace(action.trace);
    addLog(`OVERLOAD uderza za ${dmg}.`);
  }

  if (action.id === 'core') {
    const burst = 42;
    state.core -= burst;
    addTrace(action.trace);
    addLog(`Atak na rdzen: -${burst}% integralnosci.`, 'warn');
  }

  endPlayerTurn();
}

function chooseTarget(action) {
  if (action.id === 'spoof' || action.id === 'core') {
    return null;
  }

  const alive = state.enemies.filter((enemy) => !enemy.dead);

  if (!alive.length) {
    return null;
  }

  if (action.id === 'worm') {
    return alive.find((enemy) => enemy.type === 'firewall') || alive[0];
  }

  if (action.id === 'attack') {
    return alive.find((enemy) => enemy.type === 'sentinel') || alive[0];
  }

  if (action.id === 'overload') {
    return alive.sort((a, b) => b.hp - a.hp)[0];
  }

  return alive[0];
}

function endPlayerTurn() {
  applyEnemyDots();

  if (checkWinOrLose()) {
    return;
  }

  systemTurn();
  state.turn += 1;

  state.player.cpu = Math.min(state.player.maxCpu, state.player.cpu + 14);
  state.player.ram = Math.min(state.player.maxRam, state.player.ram + 10);
  state.player.trace += 4;
  state.player.tracked = Math.max(0, state.player.tracked - 1);
  state.player.antiTrackTurns = Math.max(0, state.player.antiTrackTurns - 1);
  state.player.encrypted = Math.max(0, state.player.encrypted - 1);

  maybeDeployBlackIce();
  checkWinOrLose();
  render();
}

function applyEnemyDots() {
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.infected <= 0) {
      continue;
    }

    const dot = enemy.type === 'firewall' ? 12 : 9;
    hurtEnemy(enemy, dot);
    enemy.infected -= 1;
    addLog(`INFECTED zadaje ${dot} obrazen: ${enemy.name}.`);
  }
}

function systemTurn() {
  for (const enemy of state.enemies) {
    if (enemy.dead) {
      continue;
    }

    if (enemy.stunned > 0) {
      enemy.stunned -= 1;
      addLog(`${enemy.name} pomija ture (STUNNED).`, 'warn');
      continue;
    }

    if (enemy.type === 'firewall') {
      for (const ally of state.enemies) {
        if (!ally.dead) {
          ally.armor = Math.min(16, ally.armor + 1);
        }
      }
      addLog('FIREWALL wzmacnia armor innych ICE.', 'warn');
      continue;
    }

    if (enemy.type === 'daemon') {
      state.player.trace += 13;
      if (Math.random() < 0.45) {
        if (state.player.antiTrackTurns > 0) {
          addLog('TRACE DAEMON probuje TRACKED, ale SPOOF oslania sygnature.', 'ok');
        } else {
          state.player.tracked = Math.max(state.player.tracked, 2);
          addLog('TRACE DAEMON oznacza cie jako TRACKED.', 'bad');
        }
      } else {
        addLog('TRACE DAEMON zwieksza TRACE.', 'warn');
      }
      continue;
    }

    if (enemy.type === 'sentinel') {
      state.player.cpu = Math.max(0, state.player.cpu - 12);
      state.player.ram = Math.max(0, state.player.ram - 7);
      state.player.trace += 9;
      addLog('ICE SENTINEL destabilizuje procesy gracza.', 'warn');
      continue;
    }

    if (enemy.type === 'blackice') {
      state.player.trace += 18;
      state.player.encrypted = Math.max(state.player.encrypted, 2);
      if (state.player.antiTrackTurns > 0) {
        addLog('BLACK ICE nie moze nalozyc TRACKED - SPOOF aktywny.', 'ok');
      } else {
        state.player.tracked = Math.max(state.player.tracked, 2);
      }
      addLog('BLACK ICE egzekwuje ENCRYPTED i podnosi TRACE!', 'bad');
      continue;
    }
  }

  if (state.player.tracked > 0) {
    state.player.trace += 6;
    addLog('TRACKED: dodatkowy wzrost TRACE.', 'bad');
  }
}

function maybeDeployBlackIce() {
  if (state.blackIceActive || state.player.trace < 80) {
    return;
  }

  state.blackIceActive = true;
  state.enemies.push(makeIce('blackice', 'BLACK ICE', 92));
  addLog('WARNING: BLACK ICE DEPLOYED', 'bad');
}

function addTrace(amount) {
  state.player.trace += amount;
}

function hurtEnemy(enemy, damage) {
  enemy.hp -= damage;

  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.hp = 0;
    addLog(`${enemy.name} zneutralizowany.`);
  }
}

function hasAliveType(type) {
  return state.enemies.some((enemy) => !enemy.dead && enemy.type === type);
}

function checkWinOrLose() {
  state.core = Math.max(0, state.core);
  state.player.trace = Math.max(0, state.player.trace);

  if (state.player.trace >= 100) {
    finish(false, 'TRACE 100% - polaczenie zerwane.');
    return true;
  }

  const aliveCount = state.enemies.filter((enemy) => !enemy.dead).length;

  if (aliveCount === 0 || state.core <= 0) {
    finish(true, 'Node przejety. Kontrola uzyskana.');
    return true;
  }

  return false;
}

function finish(success, text) {
  if (state.finished) {
    return;
  }

  state.finished = true;
  render();

  footerEl.classList.add('show');
  footerEl.textContent = text;
  addLog(text, success ? '' : 'bad');

  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'network-breach-result',
        success,
        trace: Math.round(state.player.trace),
        turns: state.turn,
      },
      '*'
    );
  }

  setTimeout(() => {
    window.close();
  }, 3200);
}

function addLog(message, cls = '') {
  const line = document.createElement('div');
  line.className = `line ${cls}`.trim();
  line.textContent = `> ${message}`;
  logEl.prepend(line);
}
