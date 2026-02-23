/* =====================================================
   DATA.JS — MPCN Tournament Static Data
   ===================================================== */
'use strict';

const TEAMS = {
    A: { id: 'A', name: 'Jupiter Princes', planet: 'Jupiter', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg', color: '#FFD700', points: 0, nrr: 0 },
    B: { id: 'B', name: 'Venus Vertex', planet: 'Venus', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg', color: '#FF69B4', points: 0, nrr: 0 },
    C: { id: 'C', name: 'Earth Guardians', planet: 'Earth', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg', color: '#1E90FF', points: 0, nrr: 0 },
    D: { id: 'D', name: 'Pluto Phantoms', planet: 'Pluto', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Pluto_in_True_Color_-_High-Res.jpg', color: '#32CD32', points: 0, nrr: 0 },
    E: { id: 'E', name: 'Mars Warriors', planet: 'Mars', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg', color: '#FF4500', points: 0, nrr: 0 },
    F: { id: 'F', name: 'Mercury Strikers', planet: 'Mercury', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Mercury_in_true_color.jpg', color: '#C0C0C0', points: 0, nrr: 0 },
};

function getTeamTheme(teamId) {
    const t = TEAMS[teamId];
    if (!t) return { primary: '#6C63FF', icon: '🏏' };
    return { primary: t.color, icon: t.icon, name: t.name };
}

// Editable initial players
function buildPlayers() {
    const players = {};
    for (const tid of Object.keys(TEAMS)) {
        players[tid] = Array.from({ length: 11 }).map((_, i) => ({
            id: `${tid}_${i}`,
            teamId: tid,
            name: `Player ${i + 1}`,
            role: i < 5 ? 'BAT' : i < 8 ? 'ALL' : 'BOWL',
            // Batting stats
            runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '',
            // Bowling stats
            oversBowled: 0, ballsBowled: 0, runsConceded: 0, wicketsTaken: 0, extras: 0,
        }));
    }
    return players;
}

// 7 match slots with dependency graph
const INITIAL_BRACKET = {
    M1: { id: 'M1', label: 'Match 1', team1: 'A', team2: 'B', tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'pending', score1: null, score2: null, overs1: 0, overs2: 0 },
    M2: { id: 'M2', label: 'Match 2', team1: 'C', team2: 'D', tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'pending', score1: null, score2: null, overs1: 0, overs2: 0 },
    M3: { id: 'M3', label: 'Match 3', team1: 'E', team2: 'F', tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'pending', score1: null, score2: null, overs1: 0, overs2: 0 },
    E1: { id: 'E1', label: 'Eliminator 1', team1: null, team2: null, tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'locked', score1: null, score2: null, overs1: 0, overs2: 0 },
    E2: { id: 'E2', label: 'Eliminator 2', team1: null, team2: null, tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'locked', score1: null, score2: null, overs1: 0, overs2: 0 },
    SF1: { id: 'SF1', label: 'Semi Final 1', team1: null, team2: null, tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'locked', score1: null, score2: null, overs1: 0, overs2: 0 },
    SF2: { id: 'SF2', label: 'Semi Final 2', team1: null, team2: null, tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'locked', score1: null, score2: null, overs1: 0, overs2: 0 },
    FIN: { id: 'FIN', label: 'FINAL 🏆', team1: null, team2: null, tossWinner: null, tossDecision: null, winner: null, loser: null, status: 'locked', score1: null, score2: null, overs1: 0, overs2: 0 },
};

const BRACKET_RULES = {
    M1: [
        { result: 'winner', dest: 'SF1', slot: 'team1' },
        { result: 'loser', dest: 'E1', slot: 'team1' },
    ],
    M2: [
        { result: 'winner', dest: 'SF2', slot: 'team1' },
        { result: 'loser', dest: 'E1', slot: 'team2' },
    ],
    M3: [
        { result: 'winner', dest: 'SF1', slot: 'team2' },
        { result: 'loser', dest: 'E2', slot: 'team2' },
    ],
    E1: [
        { result: 'winner', dest: 'E2', slot: 'team1' },
    ],
    E2: [
        { result: 'winner', dest: 'SF2', slot: 'team2' },
    ],
    SF1: [
        { result: 'winner', dest: 'FIN', slot: 'team1' },
    ],
    SF2: [
        { result: 'winner', dest: 'FIN', slot: 'team2' },
    ],
};
