/* =====================================================
   UI.JS — Mobile-First MPCN Tournament UI Layer
   ===================================================== */
'use strict';

function showToast(msg, type = 'inf') {
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function initNav() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.page).classList.add('active');
      renderCurrentPage(btn.dataset.page);
    });
  });
}

function renderCurrentPage(pageId) {
  if (pageId === 'page-bracket') renderBracket();
  if (pageId === 'page-scorer') renderScorer();
  if (pageId === 'page-players') renderPlayersSetup();
  if (pageId === 'page-stats') renderStats();
  if (pageId === 'page-admin') renderAdmin();
}

function initStars() {
  const bg = document.getElementById('stars-bg');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div'); s.className = 'star';
    const sz = Math.random() * 2 + 0.5;
    s.style.cssText = `left:${Math.random() * 100}%; top:${Math.random() * 100}%; width:${sz}px; height:${sz}px; --op:${Math.random() * 0.5 + 0.1}; --dur:${Math.random() * 4 + 2}s; --delay:${Math.random() * 4}s;`;
    bg.appendChild(s);
  }
}

/* ── 1. BRACKET ─────────────────────────────────────── */
function renderBracket() {
  const { bracket } = AppState.get();
  const box = document.getElementById('bracket-inner');

  const groups = [
    { title: 'Round 1', ids: ['M1', 'M2', 'M3'] },
    { title: 'Eliminators', ids: ['E1', 'E2'] },
    { title: 'Semi Finals', ids: ['SF1', 'SF2'] },
    { title: '🏆 Final', ids: ['FIN'] },
  ];

  box.innerHTML = groups.map(g => `
    <div class="round-section">
      <div class="round-header">
        <div class="round-title">${g.title}</div>
        <div class="round-line"></div>
      </div>
      ${g.ids.map(id => renderMatchCard(bracket[id])).join('')}
    </div>
  `).join('');
}

function renderMatchCard(m) {
  const status = m.status;
  const t1 = TEAMS[m.team1]; const t2 = TEAMS[m.team2];
  let badge = '';
  if (status === 'live') badge = `<span class="badge badge-live"><span class="live-dot"></span>LIVE</span>`;
  else if (status === 'done') badge = `<span class="badge badge-done">✓ DONE</span>`;
  else if (status === 'pending') badge = `<span class="badge badge-ready">READY</span>`;
  else badge = `<span class="badge badge-locked">🔒 TBD</span>`;

  const chip = (team, score, overs, won) => {
    if (!team) return `<div class="tbd-chip">To Be Decided</div>`;
    return `
      <div class="team-chip ${won ? 'winner-chip' : ''}" style="border:1px solid ${won ? team.color + '44' : 'transparent'}">
        <div class="team-chip-icon" style="background:${team.color}15;color:${team.color};box-shadow:0 0 10px ${team.color}22"><img src="${team.icon}" class="planet-img" alt="${team.name}"></div>
        <div class="team-chip-name">${team.name}</div>
        ${score !== null ? `<div class="team-chip-score" style="color:${team.color}">${score}<span style="font-size:0.6rem;opacity:0.6">(${overs})</span></div>` : ''}
      </div>`;
  };

  const cls = status === 'pending' ? 'ready' : status;
  return `
    <div class="match-card ${cls}" onclick="openMatchSheet('${m.id}')">
      <div class="match-card-header">
        <span class="match-round-label">${m.label}</span>
        ${badge}
      </div>
      <div class="team-vs-row mb-1">${chip(t1, m.score1, m.overs1, m.winner === m.team1)}</div>
      <div class="team-vs-row">${chip(t2, m.score2, m.overs2, m.winner === m.team2)}</div>
    </div>`;
}

function openMatchSheet(matchId) {
  const m = AppState.get().bracket[matchId];
  if (m.status === 'locked') { showToast('Prerequisite matches not finished yet.', 'inf'); return; }

  const t1 = TEAMS[m.team1]; const t2 = TEAMS[m.team2];
  document.getElementById('sheet-match-title').textContent = m.label;
  const body = document.getElementById('sheet-match-body');

  if (m.status === 'done') {
    const wt = TEAMS[m.winner];
    body.innerHTML = `
      <div class="text-center mb-2">
        <div style="width:70px;height:70px;margin:0 auto 0.5rem;border-radius:50%;overflow:hidden"><img src="${wt.icon}" class="planet-img"></div>
        <div class="fw-800" style="color:${wt.color};font-size:1.1rem">${wt.name} won!</div>
        <div class="text-muted text-sm mt-1">${t1.name} ${m.score1}/${m.overs1} vs ${t2.name} ${m.score2}/${m.overs2}</div>
      </div>
      <button class="btn btn-ghost w-full" onclick="closeSheet('sheet-match')">Close</button>
    `;
  } else {
    body.innerHTML = `
      <div class="flex items-center justify-between mb-2 px-1">
        <div class="text-center flex-1">
          <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;overflow:hidden"><img src="${t1.icon}" class="planet-img"></div>
          <div class="fw-800 text-sm mt-1" style="color:${t1.color}">${t1.name}</div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:1.2rem;color:var(--muted)">VS</div>
        <div class="text-center flex-1">
          <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;overflow:hidden"><img src="${t2.icon}" class="planet-img"></div>
          <div class="fw-800 text-sm mt-1" style="color:${t2.color}">${t2.name}</div>
        </div>
      </div>
      ${m.tossWinner ?
        `<button class="btn btn-primary btn-lg w-full mb-1" onclick="prepScorer('${matchId}')">🏏 Start Match / Score</button>` :
        `<button class="btn btn-primary btn-lg w-full mb-1" onclick="openTossSheet('${matchId}')">🪙 Toss Coin</button>`
      }
      <button class="btn btn-ghost w-full" onclick="closeSheet('sheet-match')">Cancel</button>
    `;
  }
  document.getElementById('sheet-match').classList.add('open');
}

let _activeMatchId = null;

function openTossSheet(id) {
  closeSheet('sheet-match');
  _activeMatchId = id;
  const m = AppState.get().bracket[id];
  const t1 = TEAMS[m.team1]; const t2 = TEAMS[m.team2];

  document.getElementById('sheet-toss-body').innerHTML = `
    <div class="text-sm text-center text-muted mb-1">Who won the toss?</div>
    <div class="flex gap-1 mb-2">
      <button class="btn btn-ghost flex-1 flex-col py-1" onclick="selectTossWinner('${m.team1}')">
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-bottom:0.5rem"><img src="${t1.icon}" class="planet-img"></div>
        <span style="font-size:0.75rem">${t1.name}</span>
      </button>
      <button class="btn btn-ghost flex-1 flex-col py-1" onclick="selectTossWinner('${m.team2}')">
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;margin-bottom:0.5rem"><img src="${t2.icon}" class="planet-img"></div>
        <span style="font-size:0.75rem">${t2.name}</span>
      </button>
    </div>
    <div id="toss-decision" class="hidden">
      <div class="text-sm text-center text-muted mb-1">What did they choose?</div>
      <div class="flex gap-1 mb-2">
        <button class="btn btn-ghost flex-1" onclick="finalizeToss('BAT')">🏏 BAT</button>
        <button class="btn btn-ghost flex-1" onclick="finalizeToss('BOWL')">🎳 BOWL</button>
      </div>
    </div>
    <button class="btn btn-ghost w-full" onclick="closeSheet('sheet-toss')">Cancel</button>
  `;
  document.getElementById('sheet-toss').classList.add('open');
}

let _tossWinner = null;
function selectTossWinner(tid) {
  _tossWinner = tid;
  document.getElementById('toss-decision').classList.remove('hidden');
}

function finalizeToss(decision) {
  closeSheet('sheet-toss');
  AppState.setToss(_activeMatchId, _tossWinner, decision);
  showToast('Toss saved! Ready to start.', 'ok');
  openMatchSheet(_activeMatchId); // Reopen match sheet now showing "Start Match"
}

function prepScorer(id) {
  _activeMatchId = id;
  closeSheet('sheet-match');
  const m = AppState.get().bracket[id];

  const sc = AppState.getScorerState();
  if (!sc || sc.matchId !== id || sc.complete) {
    if (m.score1 === null) AppState.startScorer(id, 1);
    else AppState.startScorer(id, 2);
  }
  document.querySelector('[data-page="page-scorer"]').click(); // nav to scorer
}

/* ── 2. SCORER ──────────────────────────────────────── */
function renderScorer() {
  const sc = AppState.getScorerState();
  const box = document.getElementById('scorer-inner');

  if (!sc) {
    box.innerHTML = `
      <div class="text-center" style="padding-top:4rem">
        <div style="font-size:4rem;margin-bottom:1rem;opacity:0.5">🏏</div>
        <div class="sec-title">No Active Match</div>
        <div class="text-sm text-muted mb-2">Go to Bracket and select a READY match to start scoring.</div>
        <button class="btn btn-primary" onclick="document.querySelector('[data-page=\\'page-bracket\\']').click()">Go to Bracket</button>
      </div>`;
    return;
  }

  const { players, bracket } = AppState.get();
  const m = bracket[sc.matchId];
  const batT = TEAMS[sc.battingTeam]; const fldT = TEAMS[sc.fieldingTeam];
  const str = AppState.findPlayer(sc.battingTeam, sc.striker);
  const nstr = AppState.findPlayer(sc.battingTeam, sc.nonStriker);
  const bwl = AppState.findPlayer(sc.fieldingTeam, sc.bowler);

  const calcSR = p => p && p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
  const calcEco = b => {
    if (!b) return '0.0';
    const o = b.oversBowled + (b.ballsBowled / 6);
    return o > 0 ? (b.runsConceded / o).toFixed(1) : '0.0';
  };

  // Lookout criteria
  const isLookoutBat = p => p && (p.runs >= 30 || (p.balls >= 10 && (p.runs / p.balls) * 100 > 200));
  const isLookoutBwl = b => b && (b.wicketsTaken >= 2 || (b.oversBowled >= 2 && parseFloat(calcEco(b)) <= 6.0));

  const pmc = (p, isStr) => {
    if (!p) return `<div class="player-mini-card"><div class="pmc-label">BATTER</div><div class="text-muted">TBD</div></div>`;
    const lo = isLookoutBat(p) ? `<span class="lookout-tag">🔥 HOT</span>` : '';
    return `
      <div class="player-mini-card ${isStr ? 'batting-now' : ''}">
        <div class="pmc-label">BATTER</div>
        <div class="pmc-name">${p.name} ${lo}</div>
        <div class="pmc-stat"><span class="fw-800 text-sm mr-1" style="color:var(--text)">${p.runs}</span><span style="opacity:0.8">(${p.balls})</span> &nbsp; ${p.fours}x4 ${p.sixes}x6</div>
        <div class="pmc-stat">SR: <span class="pmc-sr">${calcSR(p)}</span></div>
      </div>`;
  };

  let tgtHtml = '';
  if (sc.innings === 2 && sc.target !== null) {
    const nd = sc.target - sc.runs;
    const bl = (8 * 6) - (sc.overs * 6 + sc.balls);
    tgtHtml = `<div class="score-target-pill"><div class="score-target-need">NEED ${nd} in ${bl}b</div><div class="score-target-detail">Target: ${sc.target}</div></div>`;
  }

  box.innerHTML = `
    <!-- Top info -->
    <div class="scorer-top-bar">
      <div class="scorer-match-label">
        <span>${m.label} · Innings ${sc.innings}</span>
        <span class="live-dot" style="background:#00E676;animation:none"></span>
      </div>
      <div class="score-main">
        <div class="score-team-badge" style="background:${batT.color}22;color:${batT.color}"><img src="${batT.icon}" class="planet-img"></div>
        <div>
          <div class="score-runs-big" style="color:${batT.color}">${sc.runs}<span class="score-wkt">/${sc.wickets}</span></div>
          <div class="score-over-label">Overs: <span class="fw-700" style="color:var(--text)">${sc.overs}.${sc.balls}</span> <span style="opacity:0.5">/ 8.0</span></div>
        </div>
        ${tgtHtml}
      </div>
      <div class="over-strip">
        <span class="over-no">This Over</span>
        ${sc.currentOverDeliveries.length === 0 ? '<span class="text-xs text-muted">0 balls bowled</span>' : ''}
        ${sc.currentOverDeliveries.map(d => {
    let c = 'ob-' + Math.min(d.runs, 6);
    if (d.type === 'W') c = 'ob-W'; if (d.type === 'WD') c = 'ob-WD'; if (d.type === 'NB') c = 'ob-NB';
    const lbl = (d.type === 'W' || d.type === 'WD' || d.type === 'NB') ? d.type : d.runs;
    return `<div class="ob ${c}">${lbl}</div>`;
  }).join('')}
      </div>
    </div>

    <!-- Players stats -->
    <div class="players-strip">
      ${pmc(str, true)}
      ${pmc(nstr, false)}
    </div>

    <div class="bowler-strip" onclick="openBowlerSheet()" style="cursor:pointer">
      <div class="bowler-info">
        <div class="bowler-lbl">BOWLER 🔄</div>
        <div class="bowler-name">${bwl?.name || 'Select Bowler'} ${isLookoutBwl(bwl) ? '<span class="lookout-tag">🔥</span>' : ''}</div>
        <div class="bowler-eco">Eco: ${calcEco(bwl)}</div>
      </div>
      <div class="bowler-fig">${bwl ? `${bwl.wicketsTaken}-${bwl.runsConceded}` : ''}</div>
    </div>

    <!-- Keyboard -->
    ${sc.complete ? `
      <div class="innings-complete-card">
        <h3>INNINGS ${sc.innings} COMPLETE</h3>
        <div class="fw-800 text-sm mb-1">${batT.name}: ${sc.runs}/${sc.wickets} (${sc.overs}.${sc.balls} ov)</div>
        ${sc.innings === 1 ? `<button class="btn btn-primary w-full" onclick="startInn2fromComplete()">Starts Innings 2</button>` : `<button class="btn btn-green w-full" onclick="finishFullMatch()">Declare Match Result 🏆</button>`}
      </div>
    ` : `
      <div class="scoring-keyboard">
        <div class="kb-section-label">Runs</div>
        <div class="kb-row kb-row-7">
          <button class="kb-btn kb-0" onclick="rB('0')">0<span class="kb-sub">DOT</span></button>
          <button class="kb-btn kb-1" onclick="rB('1')">1<span class="kb-sub">RUN</span></button>
          <button class="kb-btn kb-2" onclick="rB('2')">2<span class="kb-sub">RUNS</span></button>
          <button class="kb-btn kb-3" onclick="rB('3')">3<span class="kb-sub">RUNS</span></button>
        </div>
        <div class="kb-row kb-row-7 mb-1">
          <button class="kb-btn kb-4" onclick="rB('4')">4<span class="kb-sub" style="color:var(--accent2)">FOUR</span></button>
          <button class="kb-btn kb-5" onclick="rB('5')">5<span class="kb-sub" style="color:#88dd88">RUNS</span></button>
          <button class="kb-btn kb-6" onclick="rB('6')">6<span class="kb-sub" style="color:#a78bfa">SIX</span></button>
          <button class="kb-btn" style="color:var(--muted)" onclick="rB('0')">B<span class="kb-sub">BYE</span></button>
        </div>

        <div class="kb-section-label">Extras & Wickets</div>
        <div class="kb-row kb-row-ex mb-1">
          <button class="kb-btn kb-WD" onclick="rB('WD')">WD<span class="kb-sub">WIDE</span></button>
          <button class="kb-btn kb-NB" onclick="rB('NB')">NB<span class="kb-sub">NO BALL</span></button>
          <button class="kb-btn kb-W" onclick="openWktSheet()">W<span class="kb-sub" style="color:var(--red)">OUT</span></button>
        </div>

        <div class="kb-row-undo-change mt-1">
          <button class="kb-undo" onclick="showToast('Undo available in Admin panel edit mode.')">↩ UNDO</button>
          <button class="kb-bowler-change" onclick="openBowlerSheet()">🔄 BOWLER</button>
        </div>
      </div>
    `}

    <!-- Scorecard summary -->
    <div class="card" style="padding:0.5rem;overflow-x:auto">
      <div class="kb-section-label" style="padding-left:0.5rem">BATTING SCORECARD</div>
      <table class="sc-table">
        <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
        <tbody>
          ${(players[sc.battingTeam] || []).filter(p => p.balls > 0 || p.isOut || p.id === sc.striker || p.id === sc.nonStriker).map(p => `
            <tr class="${p.isOut ? '' : 'fw-700 text-sm'}">
              <td>
                <div class="sc-name ${p.isOut ? 'sc-out' : ''}">${p.name} ${p.id === sc.striker ? '🏏' : ''}</div>
                ${p.isOut ? `<div class="text-xs sc-out">${p.dismissal}</div>` : ''}
              </td>
              <td>${p.runs}</td><td>${p.balls}</td><td>${p.fours}</td><td>${p.sixes}</td>
              <td class="pmc-sr" style="color:${p.isOut ? 'var(--muted)' : 'var(--yellow)'}">${calcSR(p)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function handleDeliveryEffects(prevOvers, sc) {
  if (!sc) return;
  renderScorer();
  if (sc.overs > prevOvers && !sc.complete) {
    setTimeout(() => {
      openBowlerSheet();
      showToast('Select bowler for next over', 'inf');
    }, 450);
  }
}

function rB(t) {
  const scState = AppState.getScorerState();
  if (!scState) return;
  const prevOvers = scState.overs;
  const sc = AppState.applyDelivery({ type: t });
  handleDeliveryEffects(prevOvers, sc);
}

function startInn2fromComplete() {
  const sc = AppState.getScorerState();
  const m = AppState.get().bracket[sc.matchId];
  m.score1 = sc.runs; m.overs1 = sc.overs + '.' + sc.balls; AppState.save();
  AppState.startScorer(sc.matchId, 2);
  renderScorer();
}

function finishFullMatch() {
  const sc = AppState.getScorerState();
  const m = AppState.get().bracket[sc.matchId];

  const s1 = m.score1; const s2 = sc.runs;
  const o1 = m.overs1; const o2 = sc.overs + '.' + sc.balls;

  const wId = s2 > s1 ? sc.battingTeam : sc.fieldingTeam;
  const lId = wId === sc.battingTeam ? sc.fieldingTeam : sc.battingTeam;

  AppState.finishInnings({ winner: wId, loser: lId, score1: s1, score2: s2, overs1: o1, overs2: o2 });
  renderScorer();
  document.querySelector('[data-page="page-bracket"]').click(); // nav back

  const wt = TEAMS[wId];
  if (AppState.get().champion === wId) {
    showToast(`🏆 ${wt.name} ARE CHAMPIONS!`, 'ok');
    document.getElementById('champ-icon').innerHTML = `<img src="${wt.icon}" class="planet-img" style="width:100px;height:100px;border-radius:50%;margin:0 auto">`;
    document.getElementById('champ-name').textContent = wt.name;
    document.getElementById('champ-name').style.color = wt.color;
    document.getElementById('modal-champ').classList.add('open');
    triggerConfetti(wt.color);
  } else {
    showToast(`${wt.name} won the match!`, 'ok');
  }
}

let _curWktBatter = null;
function openWktSheet() { document.getElementById('sheet-wicket').classList.add('open'); }
function selWkt(type) {
  closeSheet('sheet-wicket');
  if (type === 'Run Out') {
    const sc = AppState.getScorerState();
    const str = AppState.findPlayer(sc.battingTeam, sc.striker);
    const nstr = AppState.findPlayer(sc.battingTeam, sc.nonStriker);
    document.getElementById('sheet-runout-body').innerHTML = `
      <div class="text-sm text-center text-muted mb-2">Who was run out?</div>
      <button class="player-choice-btn" onclick="execRunOut('${str.id}')">🏏 ${str.name} (Striker)</button>
      <button class="player-choice-btn" onclick="execRunOut('${nstr.id}')">🏃 ${nstr.name} (Non-striker)</button>
    `;
    document.getElementById('sheet-runout').classList.add('open');
    return;
  }
  const scState = AppState.getScorerState();
  if (!scState) return;
  const prevOvers = scState.overs;
  const sc = AppState.applyDelivery({ type: 'W', wicketType: type });
  handleDeliveryEffects(prevOvers, sc);
}

function execRunOut(pid) {
  closeSheet('sheet-runout');
  const scState = AppState.getScorerState();
  if (!scState) return;
  if (scState.nonStriker === pid) {
    scState.striker = pid; scState.nonStriker = scState.striker; // temp swap
  }
  const prevOvers = scState.overs;
  const newSc = AppState.applyDelivery({ type: 'W', wicketType: 'Run Out' });
  handleDeliveryEffects(prevOvers, newSc);
}

function openBowlerSheet() {
  const sc = AppState.getScorerState();
  const fld = AppState.get().players[sc.fieldingTeam];
  const list = fld.map(p => `
    <div class="bowler-list-item ${p.id === sc.bowler ? 'active' : ''}" onclick="selectBowler('${p.id}')">
      <div class="bli-name">${p.name} <span class="text-xs text-muted fw-700 ml-1">(${p.role})</span></div>
      <div class="bli-fig">${p.wicketsTaken}-${p.runsConceded} (${p.oversBowled}.${p.ballsBowled % 6})</div>
    </div>
  `).join('');
  document.getElementById('sheet-bowler-body').innerHTML = `<div class="mb-2" style="max-height:60vh;overflow-y:auto">${list}</div><button class="btn btn-ghost w-full" onclick="closeSheet('sheet-bowler')">Cancel</button>`;
  document.getElementById('sheet-bowler').classList.add('open');
}

function selectBowler(pid) {
  closeSheet('sheet-bowler');
  AppState.setBowler(pid);
  renderScorer();
}

/* ── 3. PLAYERS SETUP ───────────────────────────────── */
function renderPlayersSetup() {
  const { players } = AppState.get();
  const box = document.getElementById('players-inner');

  box.innerHTML = Object.keys(TEAMS).map(tid => {
    const t = TEAMS[tid];
    const roster = players[tid];
    const inputs = roster.map((p, i) => `
      <div class="player-name-row">
        <div class="player-num">${i + 1}</div>
        <input type="text" class="player-input" value="${p.name}" onchange="savePl('${tid}','${p.id}', this.value, '${p.role}')">
        <select class="role-select" onchange="savePl('${tid}','${p.id}', null, this.value)">
          <option value="BAT" ${p.role === 'BAT' ? 'selected' : ''}>BAT</option>
          <option value="ALL" ${p.role === 'ALL' ? 'selected' : ''}>ALL</option>
          <option value="BOWL" ${p.role === 'BOWL' ? 'selected' : ''}>BOWL</option>
        </select>
      </div>
    `).join('');

    return `
      <div class="team-setup-card" id="setup-${tid}">
        <div class="team-setup-header" onclick="toggleSetup('${tid}')">
          <div class="team-setup-icon" style="background:${t.color}22;color:${t.color}"><img src="${t.icon}" class="planet-img"></div>
          <div>
            <div class="team-setup-name">${t.name}</div>
            <div class="team-setup-sub">11 Players Edit</div>
          </div>
          <div class="team-setup-chevron">▼</div>
        </div>
        <div class="team-setup-body">${inputs}</div>
      </div>
    `;
  }).join('');
}

function toggleSetup(tid) {
  document.querySelectorAll('.team-setup-card').forEach(el => {
    if (el.id !== 'setup-' + tid) el.classList.remove('open');
  });
  document.getElementById('setup-' + tid).classList.toggle('open');
}

function savePl(tid, pid, name, role) {
  const p = AppState.findPlayer(tid, pid);
  if (!p) return;
  AppState.updatePlayer(tid, pid, name || p.name, role || p.role);
  showToast('Player updated', 'inf');
}

/* ── 4. STATS ───────────────────────────────────────── */
function renderStats() {
  const { players } = AppState.get();
  const box = document.getElementById('stats-inner');

  // Flatten all players
  let allPlayers = [];
  Object.keys(players).forEach(tid => {
    players[tid].forEach(p => {
      allPlayers.push({ ...p, teamObj: TEAMS[tid] });
    });
  });

  // Top Batters
  const batters = [...allPlayers].sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 10).filter(p => p.runs > 0);

  // Top Bowlers
  const bowlers = [...allPlayers].sort((a, b) => b.wicketsTaken - a.wicketsTaken || a.runsConceded - b.runsConceded).slice(0, 10).filter(p => p.wicketsTaken > 0);

  box.innerHTML = `
    <div class="stats-container">
      <div class="stats-card">
        <div class="stats-card-header">🏏 MOST RUNS</div>
        <table class="stats-table">
          <thead><tr><th>Batter</th><th>R</th><th>B</th><th>SR</th></tr></thead>
          <tbody>
            ${batters.length === 0 ? '<tr><td colspan="4" class="text-center text-muted text-sm py-2">No data yet</td></tr>' : ''}
            ${batters.map((p, i) => `
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="stat-rank">${i + 1}</span>
                    <div style="width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${p.teamObj.icon}" class="planet-img"></div>
                    <div>
                      <div class="stat-p-name">${p.name}</div>
                      <div class="stat-t-name">${p.teamObj.name}</div>
                    </div>
                  </div>
                </td>
                <td class="stat-val">${p.runs}</td>
                <td>${p.balls}</td>
                <td style="color:var(--yellow);font-family:'Orbitron',monospace;font-size:0.75rem">${p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="stats-card">
        <div class="stats-card-header">🎳 MOST WICKETS</div>
        <table class="stats-table">
          <thead><tr><th>Bowler</th><th>W</th><th>Eco</th><th>Ovs</th></tr></thead>
          <tbody>
            ${bowlers.length === 0 ? '<tr><td colspan="4" class="text-center text-muted text-sm py-2">No data yet</td></tr>' : ''}
            ${bowlers.map((p, i) => {
    const oversDec = p.oversBowled + (p.ballsBowled / 6);
    const eco = oversDec > 0 ? (p.runsConceded / oversDec).toFixed(1) : '0.0';
    return `
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="stat-rank">${i + 1}</span>
                    <div style="width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${p.teamObj.icon}" class="planet-img"></div>
                    <div>
                      <div class="stat-p-name">${p.name}</div>
                      <div class="stat-t-name">${p.teamObj.name}</div>
                    </div>
                  </div>
                </td>
                <td class="stat-val" style="color:var(--green)">${p.wicketsTaken}</td>
                <td style="color:var(--yellow);font-family:'Orbitron',monospace;font-size:0.75rem">${eco}</td>
                <td>${p.oversBowled}.${p.ballsBowled % 6}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ── 5. ADMIN ───────────────────────────────────────── */
function renderAdmin() {
  const { bracket } = AppState.get();
  const dMatches = Object.values(bracket).filter(m => m.status === 'done');
  const box = document.getElementById('admin-inner');

  box.innerHTML = `
    <div class="card mb-2">
      <div class="text-sm fw-800 mb-1">EDIT MATCH SCORES</div>
      <div class="text-xs text-muted mb-2">Fix mistakes from scoring view.</div>
      <div class="form-group">
        <label class="form-label">Select Finished Match</label>
        <select class="form-input" id="adm-match" onchange="loadAdmForm()">
          <option value="">-- Choose Match --</option>
          ${dMatches.map(m => `<option value="${m.id}">${m.label} (${TEAMS[m.team1].name} vs ${TEAMS[m.team2].name})</option>`).join('')}
        </select>
      </div>
      <div id="adm-form" class="hidden">
        <div class="form-row-2">
          <div class="form-group"><label class="form-label" id="adm-l1">P1 Score</label><input type="number" id="adm-s1" class="form-input"></div>
          <div class="form-group"><label class="form-label">P1 Overs</label><input type="number" step="0.1" id="adm-o1" class="form-input"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label" id="adm-l2">P2 Score</label><input type="number" id="adm-s2" class="form-input"></div>
          <div class="form-group"><label class="form-label">P2 Overs</label><input type="number" step="0.1" id="adm-o2" class="form-input"></div>
        </div>
        <div id="adm-err" class="form-error hidden"></div>
        <button class="btn btn-primary w-full mt-1 mb-1" onclick="saveAdm()">Save Score Edits</button>
        <button class="btn btn-ghost w-full" style="color:var(--orange);border-color:var(--orange)" onclick="resetMatchAdm()">🔄 Reset Match Status to TBD</button>
      </div>
    </div>
    <div class="card text-center">
      <div class="text-sm fw-800 mb-2">SYSTEM CONTROLS</div>
      <button class="btn btn-ghost w-full mb-1" onclick="exp()">💾 Export JSON Backup</button>
      <button class="btn btn-red w-full" onclick="rst()">⚠️ Hardware Reset Tournament</button>
    </div>
  `;
}

function loadAdmForm() {
  const id = document.getElementById('adm-match').value;
  const f = document.getElementById('adm-form');
  if (!id) { f.classList.add('hidden'); return; }
  const m = AppState.get().bracket[id];
  document.getElementById('adm-l1').textContent = TEAMS[m.team1].name.split(' ')[0] + ' Score';
  document.getElementById('adm-l2').textContent = TEAMS[m.team2].name.split(' ')[0] + ' Score';
  document.getElementById('adm-s1').value = m.score1; document.getElementById('adm-s2').value = m.score2;
  document.getElementById('adm-o1').value = m.overs1; document.getElementById('adm-o2').value = m.overs2;
  f.classList.remove('hidden');
}

function saveAdm() {
  const id = document.getElementById('adm-match').value;
  const err = document.getElementById('adm-err');
  const s1 = parseFloat(document.getElementById('adm-s1').value);
  const s2 = parseFloat(document.getElementById('adm-s2').value);
  const o1 = parseFloat(document.getElementById('adm-o1').value);
  const o2 = parseFloat(document.getElementById('adm-o2').value);

  const res = AppState.adminEditMatch(id, s1, s2, o1, o2);
  if (res.error) { err.textContent = res.error; err.classList.remove('hidden'); }
  else {
    err.classList.add('hidden'); showToast('Scores saved.', 'ok');
    renderAdmin(); renderStats(); renderBracket();
  }
}

function resetMatchAdm() {
  const id = document.getElementById('adm-match').value;
  if (!id) return;
  if (confirm('Are you sure you want to reset this match to Pending? This will clear its result (but will NOT clear the individual runs/wickets players earned).')) {
    AppState.resetMatch(id);
    showToast('Match reset to pending.', 'inf');
    renderAdmin(); renderBracket();
  }
}

function exp() {
  const blob = new Blob([JSON.stringify(AppState.get(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mpcn_data.json'; a.click();
}
function rst() {
  if (confirm('Wipe everything? All match progress will be lost.')) {
    AppState.reset(); renderCurrentPage('page-admin'); showToast('Wiped clean.', 'inf');
  }
}

/* ── UTILS ──────────────────────────────────────────── */
function closeSheet(id) { document.getElementById(id).classList.remove('open'); }

function triggerConfetti(color) {
  const cvs = document.getElementById('confetti-canvas'); cvs.style.display = 'block';
  const ctx = cvs.getContext('2d'); cvs.width = window.innerWidth; cvs.height = window.innerHeight;
  const pts = Array.from({ length: 100 }, () => ({
    x: Math.random() * cvs.width, y: Math.random() * cvs.height - cvs.height,
    r: Math.random() * 6 + 4, d: Math.random() * 150,
    c: color, tilt: Math.random() * 10,
  }));
  let ang = 0, f = 0;
  function d() {
    ctx.clearRect(0, 0, cvs.width, cvs.height); ang += 0.02; f++;
    pts.forEach(p => {
      ctx.beginPath(); ctx.fillStyle = p.c;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      p.y += Math.cos(ang + p.d) + 1 + p.r / 2; p.x += Math.sin(ang);
    });
    if (f < 200) requestAnimationFrame(d); else cvs.style.display = 'none';
  }
  d();
}
