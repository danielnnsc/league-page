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

// ============================================================================
// TEAM SUMMARY CARD GRADING (Combined System)
// These functions are used ONLY for the draft summary cards, not the draft board
// ============================================================================

/**
 * Weights for combining the three grade components
 */
export const COMBINED_WEIGHTS = {
	value: 0.35,
	points: 0.40,
	efficiency: 0.25
};

/**
 * Thresholds for combined overall grade (0-100 scale)
 */
export const COMBINED_THRESHOLDS = {
	'A+': 90,
	'A': 80,
	'B': 65,
	'C': 45,
	'D': 30,
	'F': 0
};

/**
 * Thresholds for efficiency grade (0-200 scale due to 2x multiplier max)
 */
export const EFFICIENCY_THRESHOLDS = {
	'A': 80,
	'B': 60,
	'C': 40,
	'D': 20,
	'F': 0
};

/**
 * Get color for a letter grade
 */
export const getGradeColor = (grade) => {
	const gradeColors = {
		'A+': '#059669',
		'A': '#059669',
		'B': '#84cc16',
		'C': '#f59e0b',
		'D': '#f87171',
		'F': '#dc2626'
	};
	return gradeColors[grade] || '#9ca3af';
};

/**
 * Get letter grade from a normalized score (0-100)
 */
export const getGradeFromScore = (score, thresholds = COMBINED_THRESHOLDS) => {
	if (thresholds['A+'] !== undefined && score >= thresholds['A+']) return 'A+';
	if (score >= thresholds['A']) return 'A';
	if (score >= thresholds['B']) return 'B';
	if (score >= thresholds['C']) return 'C';
	if (score >= thresholds['D']) return 'D';
	return 'F';
};

/**
 * Calculate finish quality based on actual finish rank (0-100)
 * Better finishes = higher quality
 */
export const calculateFinishQuality = (actualFinish) => {
	if (!actualFinish) return 0;
	if (actualFinish <= 12) return 100;
	if (actualFinish <= 24) return 85;
	if (actualFinish <= 50) return 60;
	if (actualFinish <= 100) return 30;
	return 0;
};

/**
 * Calculate position-relative value multiplier (0.5x - 2.0x)
 * Early picks are held to higher standards, late picks get credit for any production
 */
export const calculateValueMultiplier = (value, draftPosition) => {
	const positionFactor = Math.sqrt(draftPosition);
	const adjustedValue = value / positionFactor;
	const multiplier = 1 + (adjustedValue / 25);
	return Math.max(0.5, Math.min(2.0, multiplier));
};

/**
 * Calculate efficiency score for a single pick
 * Combines finish quality with position-relative value multiplier
 */
export const calculatePickEfficiencyScore = (pick) => {
	const finishQuality = calculateFinishQuality(pick.actualOverallRank);
	const value = pick.overallValue || 0;
	const multiplier = calculateValueMultiplier(value, pick.overallPick || 1);
	const score = finishQuality * multiplier;
	return isNaN(score) ? 0 : round(score, 1);
};

/**
 * ALTERNATIVE ROI calculation (for comparison)
 * - Base points by finish tier: top 12 = 12pts, top 24 = 11pts, etc.
 * - Multiplier: +0.2 for each round drafted later than expected
 */
export const calculatePickROI = (pick) => {
	const actualFinish = pick.actualOverallRank;
	const draftRound = pick.round || 1;

	if (!actualFinish) return 0;

	// Beyond top 156 = 0 points
	if (actualFinish > 156) return 0;

	// Finish tier (1 = top 12, 2 = top 24, etc.)
	const finishTier = Math.ceil(actualFinish / 12);

	// Base points: top 12 = 12, top 24 = 11, etc. (min 1)
	const basePoints = Math.max(1, 13 - finishTier);

	// Expected round = finish tier (top 12 should be round 1, top 24 should be round 2, etc.)
	const expectedRound = finishTier;

	// Multiplier: 1 if drafted at/before expected round, +0.2 for each round later
	const roundsLate = Math.max(0, draftRound - expectedRound);
	const multiplier = 1 + (roundsLate * 0.2);

	return basePoints * multiplier;
};

/**
 * Calculate combined grades for all teams in a draft
 * Normalizes scores across all teams and applies weights
 * @param {Object} teamGradesObj - Object with rosterID keys and team grade data
 * @returns {Object} - Same structure with added combined grade fields
 */
export const calculateCombinedScores = (teamGradesObj) => {
	const teams = Object.values(teamGradesObj);
	if (teams.length === 0) return teamGradesObj;

	// First pass: Calculate position averages across ALL picks in the draft
	const positionTotals = {};
	const positionCounts = {};
	for (const team of teams) {
		const skillPicks = team.picks?.filter(p => p.position !== 'K' && p.position !== 'DEF') || [];
		for (const p of skillPicks) {
			if (p.totalPoints && p.position) {
				if (!positionTotals[p.position]) {
					positionTotals[p.position] = 0;
					positionCounts[p.position] = 0;
				}
				positionTotals[p.position] += p.totalPoints;
				positionCounts[p.position]++;
			}
		}
	}
	const positionAverages = {};
	for (const pos in positionTotals) {
		positionAverages[pos] = positionCounts[pos] > 0
			? positionTotals[pos] / positionCounts[pos]
			: 0;
	}
	console.log('Position Averages:', positionAverages);

	// Calculate raw metrics for each team
	const teamsWithMetrics = teams.map(team => {
		// Filter to skill positions only (exclude K and DEF)
		const skillPicks = team.picks?.filter(p => p.position !== 'K' && p.position !== 'DEF') || [];

		// Total points from skill position picks (handle undefined/NaN)
		let totalPoints = 0;
		for (const p of skillPicks) {
			const pts = Number(p.totalPoints);
			if (isFinite(pts)) {
				totalPoints += pts;
			}
		}

		// Average efficiency score across skill picks with valid ranks
		const picksWithRanks = skillPicks.filter(p => p.actualOverallRank);

		// Calculate Total ROI
		let totalROI = 0;
		if (picksWithRanks.length > 0) {
			for (const p of picksWithRanks) {
				totalROI += calculatePickROI(p);
			}
		}

		// Calculate Draft Capital
		let totalDraftCapital = 0;
		const totalDraftPicks = 156; // Approximate total picks in draft
		for (const p of skillPicks) {
			// Pick 1 costs 156, Pick 156 costs 1
			const pickCost = Math.max(1, totalDraftPicks + 1 - (p.overallPick || 1));
			totalDraftCapital += pickCost;
		}

		// OPTION 1: Position-Adjusted Points Efficiency
		// Compare each player's points to their position's average
		let positionAdjustedPoints = 0;
		for (const p of skillPicks) {
			const posAvg = positionAverages[p.position] || 0;
			const differential = (p.totalPoints || 0) - posAvg;
			positionAdjustedPoints += differential;
		}
		const posAdjustedEfficiency = totalDraftCapital > 0
			? (positionAdjustedPoints / totalDraftCapital) * 100  // Scale up for readability
			: 0;

		// OPTION 2: Positional Rank Efficiency
		// Use positional finish rank - top at position = more points
		let positionalRankScore = 0;
		for (const p of skillPicks) {
			const posRank = p.actualPositionalRank;
			if (posRank) {
				// Top 1 = 24 pts, Top 12 = 13 pts, Top 24 = 1 pt, beyond = 0
				const rankScore = posRank <= 24 ? (25 - posRank) : 0;
				positionalRankScore += rankScore;
			}
		}
		const posRankEfficiency = totalDraftCapital > 0
			? (positionalRankScore / totalDraftCapital) * 100  // Scale up for readability
			: 0;

		// Raw points efficiency (current)
		const rawPtsEfficiency = totalDraftCapital > 0
			? (totalPoints / totalDraftCapital)
			: 0;

		// Calculate positive-only value (only count picks that outperformed)
		let positiveValueSum = 0;
		let positiveValueCount = 0;
		for (const p of skillPicks) {
			const val = p.gradeValue || 0;  // gradeValue includes early round bonus
			if (val > 0) {
				positiveValueSum += val;
				positiveValueCount++;
			}
		}
		// Use total positive value (rewards finding more sleepers, ignores busts)
		const positiveOnlyValue = positiveValueSum;

		return {
			...team,
			avgValue: positiveOnlyValue,
			totalPoints: isFinite(totalPoints) ? totalPoints : 0,
			totalROI: isFinite(totalROI) ? round(totalROI, 1) : 0,
			totalDraftCapital: totalDraftCapital,
			rawPtsEfficiency: isFinite(rawPtsEfficiency) ? round(rawPtsEfficiency, 2) : 0,
			posAdjustedEfficiency: isFinite(posAdjustedEfficiency) ? round(posAdjustedEfficiency, 2) : 0,
			posRankEfficiency: isFinite(posRankEfficiency) ? round(posRankEfficiency, 2) : 0,
			avgEfficiencyScore: isFinite(posRankEfficiency) ? round(posRankEfficiency, 2) : 0  // Using Option 2: Positional Rank
		};
	});

	// Debug: Compare efficiency options
	console.log('\n=== EFFICIENCY COMPARISON ===');
	console.table(teamsWithMetrics.map(t => ({
		team: t.team?.name?.substring(0, 18) || `Team ${t.rosterID}`,
		'Value': t.avgValue,
		'RawPts/Cap': t.rawPtsEfficiency,
		'Opt1:PosAdj': t.posAdjustedEfficiency,
		'Opt2:PosRank': t.posRankEfficiency
	})).sort((a, b) => b['Opt1:PosAdj'] - a['Opt1:PosAdj']));
	console.log('\nOption 1: Position-Adjusted Points / Capital');
	console.log('Option 2: Positional Rank Score / Capital');
	console.log('==========================================\n');

	// Find min/max for normalization (filter out non-finite values)
	const values = teamsWithMetrics.map(t => t.avgValue).filter(v => isFinite(v));
	const points = teamsWithMetrics.map(t => t.totalPoints).filter(v => isFinite(v));
	const efficiencies = teamsWithMetrics.map(t => t.avgEfficiencyScore).filter(v => isFinite(v));

	// Provide defaults if arrays are empty
	const minValue = values.length > 0 ? Math.min(...values) : 0;
	const maxValue = values.length > 0 ? Math.max(...values) : 0;
	const minPoints = points.length > 0 ? Math.min(...points) : 0;
	const maxPoints = points.length > 0 ? Math.max(...points) : 0;
	const minEff = efficiencies.length > 0 ? Math.min(...efficiencies) : 0;
	const maxEff = efficiencies.length > 0 ? Math.max(...efficiencies) : 0;

	// Calculate normalized scores and grades for each team
	const result = {};
	for (const team of teamsWithMetrics) {
		// Normalize to 0-100 scale
		const valueScore = maxValue !== minValue
			? ((team.avgValue - minValue) / (maxValue - minValue)) * 100
			: 50;
		const pointsScore = maxPoints !== minPoints
			? ((team.totalPoints - minPoints) / (maxPoints - minPoints)) * 100
			: 50;
		const efficiencyScore = maxEff !== minEff
			? ((team.avgEfficiencyScore - minEff) / (maxEff - minEff)) * 100
			: 50;

		// Calculate weighted combined score
		const combinedScore =
			(valueScore * COMBINED_WEIGHTS.value) +
			(pointsScore * COMBINED_WEIGHTS.points) +
			(efficiencyScore * COMBINED_WEIGHTS.efficiency);

		// Get letter grades
		const valueGrade = getGradeFromScore(valueScore);
		const pointsGrade = getGradeFromScore(pointsScore);
		const efficiencyGrade = getGradeFromScore(efficiencyScore);
		const combinedGrade = getGradeFromScore(combinedScore);

		result[team.rosterID] = {
			...team,
			// Normalized scores (0-100)
			valueScore: round(valueScore, 1),
			pointsScore: round(pointsScore, 1),
			efficiencyScore: round(efficiencyScore, 1),
			combinedScore: round(combinedScore, 1),
			// Letter grades
			valueGrade,
			pointsGrade,
			efficiencyGrade,
			combinedGrade,
			// League context for tooltips
			leagueMinValue: round(minValue, 1),
			leagueMaxValue: round(maxValue, 1),
			leagueMinPoints: round(minPoints),
			leagueMaxPoints: round(maxPoints)
		};
	}

	return result;
};
