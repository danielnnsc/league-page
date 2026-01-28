import { getPlayerSeasonStats, getOverallRankings, getPositionalRankings } from './playerSeasonStats';
import { getTeamFromTeamManagers } from './universalFunctions';
import { round } from './universalFunctions';

/**
 * Grade thresholds based on value differential
 * Value = draftPosition - actualFinish (positive = outperformed)
 */
const GRADE_THRESHOLDS = {
	'A': 12,
	'B': -6,
	'C': -24,
	'D': -48,
	'F': -Infinity
};

/**
 * Early round picks have limited upside (pick #1 can only finish #1 at best = value of 0)
 * Add bonus to account for this - meeting expectations in early rounds is a good outcome
 */
const EARLY_ROUND_BONUS = {
	1: 12,  // Round 1: meeting expectations = exactly A threshold
	2: 6,   // Round 2: meeting expectations = solid B
	3: 3    // Round 3: meeting expectations = B
};

/**
 * Late round A thresholds - harder to get an A in later rounds
 */
const LATE_ROUND_A_THRESHOLD = 25;    // Rounds 8-11
const LATE_ROUND_START = 8;
const VERY_LATE_ROUND_A_THRESHOLD = 49;  // Rounds 12+
const VERY_LATE_ROUND_START = 12;

/**
 * Get letter grade from value differential
 * @param {number} value - The grade value (with bonuses applied)
 * @param {number} round - Optional round number for late-round adjustments
 */
export const getGradeFromValue = (value, round = null) => {
	// Determine A threshold based on round
	let aThreshold = GRADE_THRESHOLDS['A'];
	if (round && round >= VERY_LATE_ROUND_START) {
		aThreshold = VERY_LATE_ROUND_A_THRESHOLD;
	} else if (round && round >= LATE_ROUND_START) {
		aThreshold = LATE_ROUND_A_THRESHOLD;
	}

	if (value >= aThreshold) return 'A';
	if (value >= GRADE_THRESHOLDS['B']) return 'B';
	if (value >= GRADE_THRESHOLDS['C']) return 'C';
	if (value >= GRADE_THRESHOLDS['D']) return 'D';
	return 'F';
};

/**
 * Get color for value based on letter grade scale
 * A = green, B = light green, C = yellow/orange, D = light red, F = red
 * @param {number} value - The grade value
 * @param {number} round - Optional round number for late-round adjustments
 */
export const getValueColor = (value, round = null) => {
	const grade = getGradeFromValue(value, round);

	const gradeColors = {
		'A': '#059669',  // emerald green
		'B': '#84cc16',  // lime green
		'C': '#f59e0b',  // amber/orange
		'D': '#f87171',  // light red
		'F': '#dc2626'   // red
	};

	return gradeColors[grade] || '#9ca3af';
};

/**
 * Get text color for value (dark text on light bg, light text on dark bg)
 */
export const getValueTextColor = (value) => {
	const absValue = Math.abs(value);
	return absValue > 18 ? '#fff' : '#333';
};

/**
 * Calculate expected points based on draft position
 * Earlier picks should produce more points
 * Uses rough PPR benchmarks
 */
export const getExpectedPoints = (overallPick, totalPicks) => {
	// Rough expected points curve (PPR scoring)
	// Pick 1 expects ~300 pts, Pick 100 expects ~100 pts
	const maxExpected = 320;
	const minExpected = 80;
	const decay = 0.015;

	return maxExpected * Math.exp(-decay * (overallPick - 1)) + minExpected * (1 - Math.exp(-decay * (overallPick - 1)));
};

/**
 * Determine if a pick is a "sleeper" (late round gem)
 * Drafted in round 8+ but finished in top 50% of drafted players
 */
export const isSleeper = (pick, totalDraftedPlayers) => {
	if (pick.round < 8) return false;
	if (!pick.actualOverallRank) return false;
	return pick.actualOverallRank <= totalDraftedPlayers / 2;
};

/**
 * Determine if a pick is a "bust" (early disappointment)
 * Drafted in rounds 1-4 but finished outside top 75% or played <7 games
 */
export const isBust = (pick, totalDraftedPlayers) => {
	if (pick.round > 4) return false;
	if (pick.gamesPlayed < 7) return true;
	if (!pick.actualOverallRank) return true;
	return pick.actualOverallRank > totalDraftedPlayers * 0.75;
};

/**
 * Calculate draft grades for a single draft
 */
export const calculateDraftGrades = async (draft, players, leagueTeamManagers, options = {}) => {
	const {
		viewMode = 'totalPoints', // 'totalPoints' or 'ppg'
		minGames = 0
	} = options;

	const year = draft.year;

	// Fetch season stats for this year
	let seasonStats;
	try {
		seasonStats = await getPlayerSeasonStats(year);
	} catch (e) {
		console.error(`Failed to fetch stats for ${year}:`, e);
		return null;
	}

	// Get rankings
	const overallRankings = getOverallRankings(seasonStats, viewMode, minGames);
	const positionalRankings = getPositionalRankings(seasonStats, viewMode, minGames);

	// Create lookup maps for quick rank access
	const overallRankMap = {};
	overallRankings.forEach(p => { overallRankMap[p.playerId] = p.rank; });

	const positionalRankMap = {};
	for (const pos in positionalRankings) {
		positionalRankings[pos].forEach(p => {
			positionalRankMap[p.playerId] = p.positionalRank;
		});
	}

	// Helper to calculate actual overall pick number for snake drafts
	const getActualOverallPick = (roundIdx, colIdx, teamsCount, draftType, reversalRound) => {
		const row = roundIdx + 1;
		const basePick = roundIdx * teamsCount;

		if (draftType === 'snake') {
			if (!reversalRound) {
				// Standard snake: odd rounds normal, even rounds reversed
				if (row % 2 === 0) {
					return basePick + (teamsCount - colIdx);
				} else {
					return basePick + colIdx + 1;
				}
			} else {
				// Snake with reversal round
				if ((row < reversalRound && row % 2 === 0) || (row >= reversalRound && row % 2 === 1)) {
					return basePick + (teamsCount - colIdx);
				} else {
					return basePick + colIdx + 1;
				}
			}
		}
		// Linear/auction draft
		return basePick + colIdx + 1;
	};

	// First pass: collect all picks with their actual overall pick number
	const unsortedPicks = [];
	const teamsCount = draft.draft[0]?.length || 0;

	for (let roundIdx = 0; roundIdx < draft.draft.length; roundIdx++) {
		const row = draft.draft[roundIdx];
		for (let colIdx = 0; colIdx < row.length; colIdx++) {
			const cell = row[colIdx];
			if (!cell || !cell.player) continue;

			const playerId = cell.player;
			const playerInfo = players[playerId];
			const position = playerInfo?.pos || 'Unknown';

			// Calculate actual overall pick based on draft type
			const actualOverallPick = getActualOverallPick(
				roundIdx, colIdx, teamsCount, draft.draftType, draft.reversalRound
			);

			// Get roster ID from draft order
			let rosterID = draft.draftOrder[colIdx];
			if (cell.newOwner) {
				rosterID = cell.newOwner;
			}

			unsortedPicks.push({
				playerId,
				rosterID,
				round: roundIdx + 1,
				pickInRound: colIdx + 1,
				overallPick: actualOverallPick,
				position,
				amount: cell.amount || null
			});
		}
	}

	// Sort by actual overall pick order to correctly count positional picks
	unsortedPicks.sort((a, b) => a.overallPick - b.overallPick);

	// Second pass: assign positional pick numbers in correct draft order
	const flattenedPicks = [];
	const positionalPickCounters = {};

	for (const pick of unsortedPicks) {
		if (!positionalPickCounters[pick.position]) {
			positionalPickCounters[pick.position] = 0;
		}
		positionalPickCounters[pick.position]++;

		flattenedPicks.push({
			...pick,
			positionalPick: positionalPickCounters[pick.position]
		});
	}

	// Calculate grades for each pick
	const gradedPicks = flattenedPicks.map(pick => {
		const stats = seasonStats[pick.playerId];
		const playerInfo = players[pick.playerId];

		const totalPoints = stats?.totalPoints || 0;
		const gamesPlayed = stats?.gamesPlayed || 0;
		const ppg = stats?.ppg || 0;

		const actualOverallRank = overallRankMap[pick.playerId] || null;
		const actualPositionalRank = positionalRankMap[pick.playerId] || null;

		// Calculate value: draft position - actual finish (positive = outperformed)
		const overallValue = actualOverallRank ? pick.overallPick - actualOverallRank : null;
		const positionalValue = actualPositionalRank ? pick.positionalPick - actualPositionalRank : null;

		// Apply early round bonus - early picks have limited upside so meeting expectations is good
		const earlyRoundBonus = EARLY_ROUND_BONUS[pick.round] || 0;

		// Calculate grade value with bonus applied
		// Use overall value for grade, penalize players with no stats (but less harshly)
		const baseValue = overallValue !== null ? overallValue : -30;
		const gradeValue = baseValue + earlyRoundBonus;
		const grade = getGradeFromValue(gradeValue, pick.round);

		// Calculate efficiency
		const expectedPoints = getExpectedPoints(pick.overallPick, flattenedPicks.length);
		const efficiency = expectedPoints > 0 ? round(totalPoints / expectedPoints, 2) : 0;

		return {
			...pick,
			playerName: playerInfo ? `${playerInfo.fn} ${playerInfo.ln}` : 'Unknown',
			team: playerInfo?.t || '',
			totalPoints,
			gamesPlayed,
			ppg,
			actualOverallRank,
			actualPositionalRank,
			totalPlayersRanked: overallRankings.length,
			totalAtPosition: positionalRankings[pick.position]?.length || 0,
			overallValue,
			positionalValue,
			grade,
			gradeValue,
			expectedPoints: round(expectedPoints),
			efficiency,
			flagged: gamesPlayed < 7,
			isSleeper: isSleeper({ ...pick, actualOverallRank, gamesPlayed }, flattenedPicks.length),
			isBust: isBust({ ...pick, actualOverallRank, gamesPlayed }, flattenedPicks.length)
		};
	});

	// Calculate team grades
	const teamGrades = {};
	const rosterIDs = [...new Set(gradedPicks.map(p => p.rosterID))];

	for (const rosterID of rosterIDs) {
		const teamPicks = gradedPicks.filter(p => p.rosterID === rosterID);
		const validPicks = teamPicks.filter(p => p.overallValue !== null);

		// Use gradeValue (includes early round bonus) for team calculations
		const totalValue = validPicks.reduce((sum, p) => sum + (p.gradeValue || 0), 0);
		const avgValue = validPicks.length > 0 ? totalValue / validPicks.length : 0;
		const avgGrade = getGradeFromValue(avgValue);

		// Calculate efficiency
		const totalActualPoints = teamPicks.reduce((sum, p) => sum + p.totalPoints, 0);
		const totalExpectedPoints = teamPicks.reduce((sum, p) => sum + p.expectedPoints, 0);
		const teamEfficiency = totalExpectedPoints > 0 ? round(totalActualPoints / totalExpectedPoints, 2) : 0;

		// Position breakdown
		const positionBreakdown = {};
		const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
		for (const pos of positions) {
			const posPicks = teamPicks.filter(p => p.position === pos);
			if (posPicks.length > 0) {
				const draftCapital = posPicks.reduce((sum, p) => sum + (flattenedPicks.length - p.overallPick + 1), 0);
				const pointsReturned = posPicks.reduce((sum, p) => sum + p.totalPoints, 0);
				positionBreakdown[pos] = {
					picks: posPicks.length,
					draftCapital,
					pointsReturned: round(pointsReturned),
					efficiency: draftCapital > 0 ? round(pointsReturned / draftCapital, 2) : 0,
					avgValue: posPicks.filter(p => p.overallValue !== null).length > 0
						? round(posPicks.filter(p => p.overallValue !== null).reduce((s, p) => s + p.overallValue, 0) / posPicks.filter(p => p.overallValue !== null).length)
						: 0
				};
			}
		}

		// Find best and worst picks
		const sortedByValue = [...validPicks].sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0));
		const bestPick = sortedByValue[0] || null;
		const worstPick = sortedByValue[sortedByValue.length - 1] || null;

		teamGrades[rosterID] = {
			rosterID,
			team: getTeamFromTeamManagers(leagueTeamManagers, rosterID, year),
			picks: teamPicks,
			totalValue,
			avgValue: round(avgValue),
			avgGrade,
			efficiency: teamEfficiency,
			positionBreakdown,
			bestPick,
			worstPick,
			sleeperCount: teamPicks.filter(p => p.isSleeper).length,
			bustCount: teamPicks.filter(p => p.isBust).length
		};
	}

	return {
		year,
		draftType: draft.draftType,
		picks: gradedPicks,
		teamGrades,
		totalPicks: gradedPicks.length,
		rankings: {
			overall: overallRankings,
			positional: positionalRankings
		}
	};
};

/**
 * Calculate owner draft history across all seasons
 */
export const calculateOwnerDraftHistory = async (drafts, players, leagueTeamManagers) => {
	const ownerHistory = {};

	for (const draft of drafts) {
		const grades = await calculateDraftGrades(draft, players, leagueTeamManagers);
		if (!grades) continue;

		for (const rosterID in grades.teamGrades) {
			const teamData = grades.teamGrades[rosterID];
			const team = teamData.team;

			// Use manager ID as key for cross-season tracking
			const managerIDs = team?.managers || [rosterID];
			for (const managerID of managerIDs) {
				if (!ownerHistory[managerID]) {
					ownerHistory[managerID] = {
						managerID,
						name: team?.name || 'Unknown',
						avatar: team?.avatar,
						totalDrafts: 0,
						totalPicks: 0,
						totalValue: 0,
						gradeHistory: [],
						allPicks: [],
						positionBreakdown: {}
					};
				}

				const owner = ownerHistory[managerID];
				owner.totalDrafts++;
				owner.totalPicks += teamData.picks.length;
				owner.totalValue += teamData.totalValue;
				owner.gradeHistory.push({
					year: grades.year,
					grade: teamData.avgGrade,
					value: teamData.totalValue,
					efficiency: teamData.efficiency
				});
				owner.allPicks.push(...teamData.picks.map(p => ({ ...p, year: grades.year })));

				// Aggregate position breakdown
				for (const pos in teamData.positionBreakdown) {
					if (!owner.positionBreakdown[pos]) {
						owner.positionBreakdown[pos] = { picks: 0, totalValue: 0 };
					}
					owner.positionBreakdown[pos].picks += teamData.positionBreakdown[pos].picks;
					const posAvgValue = teamData.positionBreakdown[pos].avgValue || 0;
					owner.positionBreakdown[pos].totalValue += posAvgValue * teamData.positionBreakdown[pos].picks;
				}
			}
		}
	}

	// Calculate averages and find best/worst
	for (const managerID in ownerHistory) {
		const owner = ownerHistory[managerID];

		// Average grade
		const avgValue = owner.totalPicks > 0 ? owner.totalValue / owner.totalPicks : 0;
		owner.averageGrade = getGradeFromValue(avgValue);
		owner.avgValue = round(avgValue);

		// Best/worst year
		if (owner.gradeHistory.length > 0) {
			const sortedYears = [...owner.gradeHistory].sort((a, b) => b.value - a.value);
			owner.bestYear = sortedYears[0];
			owner.worstYear = sortedYears[sortedYears.length - 1];
		}

		// Best/worst pick all-time
		const picksWithValue = owner.allPicks.filter(p => p.overallValue !== null);
		if (picksWithValue.length > 0) {
			const sortedPicks = [...picksWithValue].sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0));
			owner.bestPick = sortedPicks[0];
			owner.worstPick = sortedPicks[sortedPicks.length - 1];
		}

		// Position averages
		for (const pos in owner.positionBreakdown) {
			const posData = owner.positionBreakdown[pos];
			posData.avgValue = posData.picks > 0 ? round(posData.totalValue / posData.picks) : 0;
		}

		// Clean up large data
		delete owner.allPicks;
	}

	return ownerHistory;
};
