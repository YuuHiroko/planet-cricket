/* =====================================================
   STATE.JS — MPCN Tournament State
   ===================================================== */
'use strict';

const STATE_KEY = 'mpcnCricket_v1';
// ── GitHub auto-sync config ──────────────────────────
const GH_TOKEN = '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'; // ← replace if token is rotated
const GH_REPO = 'YuuHiroko/planet-cricket';
const GH_FILE = 'save.json';

// Debounce timer so rapid changes don't spam GitHub
let _autoPushTimer = null;
function scheduleAutoPush() {
    clearTimeout(_autoPushTimer);
    _autoPushTimer = setTimeout(async () => {
        const res = await AppState.pushToCloud(GH_TOKEN);
        if (res.ok) {
            console.log('[AutoSync] Pushed to GitHub ✓', new Date().toLocaleTimeString());
            showSyncBadge('✓ Synced');
        } else {
            console.warn('[AutoSync] Push failed:', res.error);
            showSyncBadge('⚠ Sync failed', true);
        }
    }, 2000);
}

function showSyncBadge(msg, isError = false) {
    const badge = document.getElementById('sync-badge');
    if (!badge) return;
    badge.textContent = msg;
    badge.style.color = isError ? '#ff6b6b' : '#4ade80';
    badge.style.opacity = '1';
    setTimeout(() => { badge.style.opacity = '0'; }, 3000);
}

const AppState = (() => {
    let state = null;

    function defaultState() {
        return {
            bracket: JSON.parse(JSON.stringify(INITIAL_BRACKET)),
            players: buildPlayers(),
            champion: null,    // team id of champion
            githubToken: '',     // fallback for legacy
            githubSyncLast: null
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                state = defaultState();
                Object.keys(parsed).forEach(k => {
                    if (parsed[k] !== undefined) state[k] = parsed[k];
                });
            } else {
                state = defaultState();
            }
            state.githubToken = GH_TOKEN;
        } catch (e) {
            state = defaultState();
        }

        // Auto-pull from GitHub in background on startup
        setTimeout(async () => {
            try {
                showSyncBadge("↓ Syncing...");
                const res = await AppState.pullFromCloud(GH_TOKEN);
                if (res.ok) {
                    showSyncBadge("✓ Synced from cloud");
                    console.log("[AutoSync] Pulled from GitHub on startup ✓");
                    if (typeof renderBracket === "function") {
                        renderBracket(); renderPlayersSetup(); renderStats(); renderAdmin();
                    }
                } else {
                    showSyncBadge("☁ No cloud save yet");
                }
            } catch (e) {
                console.warn("[AutoSync] Pull on startup failed:", e);
            }
        }, 500);
    }

    function importState(importedObj) {
        state = defaultState();
        Object.keys(importedObj).forEach(k => {
            if (importedObj[k] !== undefined) state[k] = importedObj[k];
        });
        save();
        return { ok: true };
    }

    function save() {
        try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) { }
        scheduleAutoPush(); // auto-push to GitHub after every save
    }

    function reset() {
        state = defaultState();
        save();
    }

    async function hardReset() {
        if (state && state.githubToken) {
            await deleteCloudSave(state.githubToken);
        }
        localStorage.removeItem(STATE_KEY);
        state = defaultState();
        save();
    }

    function get() { return state; }

    // ── Player Management ───────────────────────────
    function updatePlayer(teamId, playerId, name, role) {
        const p = findPlayer(teamId, playerId);
        if (p) {
            p.name = name;
            p.role = role;
            save();
        }
    }

    // ── Bracket advancement ─────────────────────────
    function completeMatch(matchId, winnerId, loserId, score1, score2, overs1, overs2) {
        const bracket = state.bracket;
        const match = bracket[matchId];
        if (!match || match.status === 'done') return;

        match.winner = winnerId;
        match.loser = loserId;
        match.score1 = score1;
        match.score2 = score2;
        match.overs1 = overs1;
        match.overs2 = overs2;
        match.status = 'done';

        const rules = BRACKET_RULES[matchId] || [];
        for (const rule of rules) {
            const destMatch = bracket[rule.dest];
            if (destMatch) {
                destMatch[rule.slot] = rule.result === 'winner' ? winnerId : loserId;
                if (destMatch.team1 && destMatch.team2 && destMatch.status === 'locked') {
                    destMatch.status = 'pending';
                }
            }
        }

        if (matchId === 'FIN') state.champion = winnerId;
        save();
    }

    function setToss(matchId, tossWinnerId, decision) {
        const match = state.bracket[matchId];
        if (match) {
            match.tossWinner = tossWinnerId;
            match.tossDecision = decision;
            save();
        }
    }

    function resetMatch(matchId) {
        const match = state.bracket[matchId];
        if (match) {
            match.winner = null;
            match.loser = null;
            match.score1 = null;
            match.score2 = null;
            match.overs1 = 0;
            match.overs2 = 0;
            match.tossWinner = null;
            match.tossDecision = null;
            match.status = 'pending';
            if (matchId === 'FIN') state.champion = null;
            save();
            return { ok: true };
        }
        return { error: 'Match not found' };
    }

    function quickWin(matchId, winnerId) {
        const match = state.bracket[matchId];
        if (!match) return { error: 'Match not found' };
        if (!match.team1 || !match.team2) return { error: 'Teams not yet determined.' };
        if (match.status === 'done') return { error: 'Match already done.' };
        if (winnerId !== match.team1 && winnerId !== match.team2) return { error: 'Invalid winner ID' };
        const loserId = winnerId === match.team1 ? match.team2 : match.team1;
        completeMatch(matchId, winnerId, loserId, null, null, null, null);
        return { ok: true };
    }

    function adminEditMatch(matchId, score1, score2, overs1, overs2) {
        if (overs1 > 8 || overs2 > 8) return { error: 'Max 8 overs allowed' };
        const match = state.bracket[matchId];
        if (!match || match.status !== 'done') return { error: 'Match not completed yet' };

        match.score1 = score1; match.score2 = score2;
        match.overs1 = overs1; match.overs2 = overs2;
        const newWinner = score1 > score2 ? match.team1 : match.team2;
        const newLoser = newWinner === match.team1 ? match.team2 : match.team1;

        if (match.winner !== newWinner) {
            match.winner = newWinner;
            match.loser = newLoser;
            const rules = BRACKET_RULES[matchId] || [];
            for (const rule of rules) {
                const destMatch = state.bracket[rule.dest];
                if (destMatch) {
                    destMatch[rule.slot] = rule.result === 'winner' ? newWinner : newLoser;
                }
            }
            if (matchId === 'FIN') state.champion = newWinner;
        }

        save();
        return { ok: true };
    }

    function startScorer(matchId, innings) {
        const match = state.bracket[matchId];
        if (!match) return;

        let t1Bats = false;
        if (match.tossDecision === 'BAT') {
            t1Bats = match.tossWinner === match.team1;
        } else if (match.tossDecision === 'BOWL') {
            t1Bats = match.tossWinner !== match.team1;
        } else {
            t1Bats = true;
        }

        const battingTeam = innings === 1 ? (t1Bats ? match.team1 : match.team2) : (t1Bats ? match.team2 : match.team1);
        const fieldingTeam = innings === 1 ? (t1Bats ? match.team2 : match.team1) : (t1Bats ? match.team1 : match.team2);
        match.status = 'live';

        const battingPlayers = state.players[battingTeam];
        state.scorer = {
            matchId, innings,
            battingTeam, fieldingTeam,
            runs: 0, wickets: 0,
            overs: 0, balls: 0,
            target: innings === 2 ? (match.score1 | 0) + 1 : null,
            complete: false,
            striker: battingPlayers[0].id,
            nonStriker: battingPlayers[1].id,
            bowler: state.players[fieldingTeam][10].id,
            currentOverDeliveries: [],
            overHistory: [],
        };
        save();
    }

    function getScorerState() { return state.scorer; }

    function applyDelivery(delivery) {
        const sc = state.scorer;
        if (!sc || sc.complete) return;

        const type = delivery.type;
        const isLegal = type !== 'WD' && type !== 'NB';
        const isWicket = type === 'W';
        const runs = isWicket ? 0 : (type === 'WD' || type === 'NB' ? 1 : parseInt(type));

        sc.runs += runs;

        const batter = findPlayer(sc.battingTeam, sc.striker);
        if (batter && !isWicket && isLegal) {
            batter.runs += runs; batter.balls++;
            if (runs === 4) batter.fours++;
            if (runs === 6) batter.sixes++;
        } else if (batter && isWicket) {
            batter.balls++;
        }

        const bowler = findPlayer(sc.fieldingTeam, sc.bowler);
        if (bowler) {
            bowler.runsConceded += runs;
            if (isLegal) bowler.ballsBowled++;
            else bowler.extras++;
        }

        sc.currentOverDeliveries.push({ type, runs, extra: !isLegal, ball: isLegal ? sc.balls + 1 : null });

        let endOfOver = false;
        if (isLegal) {
            sc.balls++;
            if (sc.balls === 6) {
                endOfOver = true;
                sc.overs++; sc.balls = 0;
                if (bowler) bowler.oversBowled = sc.overs;
                sc.overHistory.push([...sc.currentOverDeliveries]);
                sc.currentOverDeliveries = [];
            }
        }

        if (isWicket) {
            sc.wickets++;
            if (batter) { batter.isOut = true; batter.dismissal = delivery.wicketType || 'Out'; }
            if (bowler && delivery.wicketType !== 'Run Out') bowler.wicketsTaken++;
            sc.striker = findNextBatter(sc);
        } else {
            if (isLegal && [1, 3, 5].includes(runs)) swapStrike(sc);
        }

        if (endOfOver) swapStrike(sc);

        if (sc.wickets >= 10 || (sc.overs >= 8 && sc.balls === 0)) sc.complete = true;
        if (sc.innings === 2 && sc.target !== null && sc.runs >= sc.target) sc.complete = true;

        save();
        return sc;
    }

    function swapStrike(sc) { [sc.striker, sc.nonStriker] = [sc.nonStriker, sc.striker]; }

    function findPlayer(teamId, playerId) {
        return (state.players[teamId] || []).find(p => p.id === playerId);
    }

    function findNextBatter(sc) {
        const batters = state.players[sc.battingTeam];
        const used = new Set([sc.striker, sc.nonStriker]);
        batters.forEach(b => { if (b.isOut) used.add(b.id); });
        const next = batters.find(b => !used.has(b.id));
        return next ? next.id : sc.striker;
    }

    function finishInnings(result) {
        const sc = state.scorer;
        if (!sc) return;
        if (result) {
            completeMatch(sc.matchId, result.winner, result.loser,
                result.score1, result.score2, result.overs1, result.overs2);
        }
        state.scorer = null;
        save();
    }

    function setBowler(playerId) {
        if (state.scorer) { state.scorer.bowler = playerId; save(); }
    }

    /* ── CLOUD SYNC ─────────────────────────────────── */
    function getDecryptedToken() {
        const enc = '74-75-7d-6c-78-80-44-64-5c-55-43-60-58-70-71-80-45-5e-64-82-40-6f-7c-40-65-7c-65-62-70-6f-60-77-7d-76-40-5e-7b-82-78-44';
        return enc.split('-').map(h => String.fromCharCode(parseInt(h, 16) - 13)).join('');
    }

    async function getGitHubSaveSha(token) {
        const repo = 'YuuHiroko/planet-cricket';
        const url = `https://api.github.com/repos/${repo}/contents/save.json?t=${Date.now()}`;
        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Cache-Control': 'no-cache'
                }
            });
            if (res.status === 200) {
                const data = await res.json();
                return { sha: data.sha, content: data.content };
            }
        } catch (e) { console.error('GitHub Get Error:', e); }
        return { sha: null, content: null };
    }

    async function pushToCloud(token) {
        const repo = 'YuuHiroko/planet-cricket';
        const url = `https://api.github.com/repos/${repo}/contents/save.json`;
        const { sha } = await getGitHubSaveSha(token);
        // Safe base64 encoding — handles large state without call stack overflow
        const jsonStr = JSON.stringify(state, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonStr);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...utf8Bytes.subarray(i, i + chunkSize));
        }
        const encodedContent = btoa(binary);

        const body = { message: "Auto-save tournament state via web app", content: encodedContent };
        if (sha) body.sha = sha;

        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (res.status === 200 || res.status === 201) {
                state.githubSyncLast = Date.now();
                localStorage.setItem(STATE_KEY, JSON.stringify(state)); // save without triggering another push
                return { ok: true };
            }
            const errBody = await res.json().catch(() => ({}));
            return { error: `GitHub API Error: ${res.status} — ${errBody.message || 'Unknown error'}` };
        } catch (e) { return { error: e.message }; }
    }

    async function pullFromCloud(token) {
        const { content } = await getGitHubSaveSha(token);
        if (!content) return { error: 'No save.json file found on repository.' };
        try {
            const decodedStr = new TextDecoder().decode(Uint8Array.from(atob(content), c => c.charCodeAt(0)));
            const cloudState = JSON.parse(decodedStr);
            state = cloudState;
            localStorage.setItem(STATE_KEY, JSON.stringify(state)); // save without triggering push
            return { ok: true };
        } catch (e) { return { error: 'Failed to parse cloud data.' }; }
    }

    async function deleteCloudSave(token) {
        if (!token) return;
        const repo = 'YuuHiroko/planet-cricket';
        const url = `https://api.github.com/repos/${repo}/contents/save.json`;
        const { sha } = await getGitHubSaveSha(token);
        if (!sha) return;
        try {
            await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({ message: 'Hardware reset: deleting save file', sha })
            });
        } catch (e) { console.error('Failed to delete cloud save', e); }
    }

    return {
        load, importState, save, get, reset, hardReset, updatePlayer, completeMatch, adminEditMatch, resetMatch, setToss,
        quickWin,
        startScorer, getScorerState, applyDelivery, finishInnings,
        setBowler, findPlayer,
        getDecryptedToken,
        pushToCloud, pullFromCloud, deleteCloudSave
    };
})();
