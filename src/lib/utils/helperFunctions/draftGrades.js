import { getPlayerSeasonStats, getOverallRankings, getPositionalRankings } from './playerSeasonStats';
import { getTeamFromTeamManagers } from './universalFunctions';
import { round } from './universalFunctions';

/**
 * Finish bonus scale - rewards players based on their actual season finish
 * Combined with draft value to create adjusted score
 * Formula: adjustedValue = (pick - finish) + (totalPicks - finish) * FINISH_BONUS_SCALE
 */
const FINISH_BONUS_SCALE = 2.5;

/**
 * Grade thresholds based on adjusted value (draft value + finish bonus)
 * These thresholds work with the new formula that produces scores roughly 0-500+
 */
const GRADE_THRESHOLDS = {
	'A': 460,   // Elite - deep sleepers, top early round hits
	'B': 400,   // Very good - solid value picks
	'C': 300,   // Average - met expectations
	'D': 100,   // Below average - underperformed
	'F': -Infinity  // Poor - busts and no-shows
};

/**
 * Get letter grade from adjusted value
 * @param {number} value - The adjusted value (draft value + finish bonus)
 */
export const getGradeFromValue = (value) => {
	if (value >= GRADE_THRESHOLDS['A']) return 'A';
	if (value >= GRADE_THRESHOLDS['B']) return 'B';
	if (value >= GRADE_THRESHOLDS['C']) return 'C';
	if (value >= GRADE_THRESHOLDS['D']) return 'D';
	return 'F';
};

/**
 * Get color for value based on letter grade scale
 * A = green, B = light green, C = yellow/orange, D = light red, F = red
 * @param {number} value - The adjusted value
 */
export const getValueColor = (value) => {
	const grade = getGradeFromValue(value);

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

	// Calculate grades for each pick using new formula:
	// adjustedValue = draftValue + finishBonus
	// where draftValue = pick - finish, finishBonus = (totalPicks - finish) * scale
	const totalPicks = flattenedPicks.length;

	const gradedPicks = flattenedPicks.map(pick => {
		const stats = seasonStats[pick.playerId];
		const playerInfo = players[pick.playerId];

		const totalPoints = stats?.totalPoints || 0;
		const gamesPlayed = stats?.gamesPlayed || 0;
		const ppg = stats?.ppg || 0;

		const actualOverallRank = overallRankMap[pick.playerId] || null;
		const actualPositionalRank = positionalRankMap[pick.playerId] || null;

		// Calculate draft value: draft position - actual finish (positive = outperformed)
		const overallValue = actualOverallRank ? pick.overallPick - actualOverallRank : null;
		const positionalValue = actualPositionalRank ? pick.positionalPick - actualPositionalRank : null;

		// Calculate finish bonus: rewards based on actual season finish
		const finishBonus = actualOverallRank ? (totalPicks - actualOverallRank) * FINISH_BONUS_SCALE : 0;

		// Calculate adjusted value (new formula combining draft value + finish bonus)
		// Players with no stats get a penalty
		const draftValue = overallValue !== null ? overallValue : -50;
		const gradeValue = draftValue + finishBonus;
		const grade = getGradeFromValue(gradeValue);

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
			finishBonus: round(finishBonus),
			grade,
			gradeValue: round(gradeValue),
			flagged: gamesPlayed < 7,
			isSleeper: isSleeper({ ...pick, actualOverallRank, gamesPlayed }, totalPicks),
			isBust: isBust({ ...pick, actualOverallRank, gamesPlayed }, totalPicks)
		};
	});

	// Calculate team grades
	const teamGrades = {};
	const rosterIDs = [...new Set(gradedPicks.map(p => p.rosterID))];

	for (const rosterID of rosterIDs) {
		const teamPicks = gradedPicks.filter(p => p.rosterID === rosterID);
		const validPicks = teamPicks.filter(p => p.overallValue !== null);

		// Use gradeValue (adjusted value with finish bonus) for team calculations
		const totalValue = validPicks.reduce((sum, p) => sum + (p.gradeValue || 0), 0);
		const avgValue = validPicks.length > 0 ? totalValue / validPicks.length : 0;
		const avgGrade = getGradeFromValue(avgValue);

		// Find best and worst picks (sorted by gradeValue for consistency)
		const sortedByValue = [...validPicks].sort((a, b) => (b.gradeValue || 0) - (a.gradeValue || 0));
		const bestPick = sortedByValue[0] || null;
		const worstPick = sortedByValue[sortedByValue.length - 1] || null;

		teamGrades[rosterID] = {
			rosterID,
			team: getTeamFromTeamManagers(leagueTeamManagers, rosterID, year),
			picks: teamPicks,
			totalValue: round(totalValue),
			avgValue: round(avgValue),
			avgGrade,
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
