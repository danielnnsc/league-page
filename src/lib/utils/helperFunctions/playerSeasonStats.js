import { get } from 'svelte/store';
import { playerSeasonStatsStore } from '$lib/stores';
import { getLeagueData } from './leagueData';
import { leagueID } from '$lib/utils/leagueInfo';
import { round } from './universalFunctions';

/**
 * Fetch player season stats for a given year
 * Uses Sleeper API and applies league scoring settings
 */
export const getPlayerSeasonStats = async (year, forceRefresh = false) => {
	const cached = get(playerSeasonStatsStore);

	// Check if we already have this year's stats cached
	if (!forceRefresh && cached[year]) {
		return cached[year];
	}

	// Check localStorage cache
	const localStorageKey = `playerSeasonStats_${year}`;
	if (!forceRefresh) {
		try {
			const stored = localStorage.getItem(localStorageKey);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Update store and return
				playerSeasonStatsStore.update(store => ({ ...store, [year]: parsed }));
				return parsed;
			}
		} catch (e) {
			console.error('Error reading from localStorage:', e);
		}
	}

	// Fetch league data to get scoring settings
	const leagueData = await getLeagueData(leagueID);
	const scoringSettings = leagueData.scoring_settings;

	// Fetch season stats from Sleeper API
	const statsRes = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${year}`, { compress: true });
	if (!statsRes.ok) {
		throw new Error(`Failed to fetch stats for ${year}`);
	}
	const rawStats = await statsRes.json();

	// Fetch player info for names and positions
	const playersRes = await fetch(`https://api.sleeper.app/v1/players/nfl`, { compress: true });
	if (!playersRes.ok) {
		throw new Error('Failed to fetch player info');
	}
	const playersData = await playersRes.json();

	// Process stats and calculate fantasy points
	const processedStats = {};

	for (const playerId in rawStats) {
		const playerStats = rawStats[playerId];
		const playerInfo = playersData[playerId];

		if (!playerInfo) continue;

		// Calculate fantasy points using league scoring settings
		const totalPoints = calculateFantasyPoints(playerStats, scoringSettings);
		const gamesPlayed = playerStats.gp || playerStats.gms_active || 0;
		const ppg = gamesPlayed > 0 ? round(totalPoints / gamesPlayed) : 0;

		processedStats[playerId] = {
			playerId,
			name: `${playerInfo.first_name || ''} ${playerInfo.last_name || ''}`.trim(),
			position: playerInfo.position,
			team: playerInfo.team,
			totalPoints: round(totalPoints),
			gamesPlayed,
			ppg,
			rawStats: playerStats
		};
	}

	// Cache in localStorage (completed seasons don't change)
	try {
		localStorage.setItem(localStorageKey, JSON.stringify(processedStats));
	} catch (e) {
		console.error('Error saving to localStorage:', e);
	}

	// Update store
	playerSeasonStatsStore.update(store => ({ ...store, [year]: processedStats }));

	return processedStats;
};

/**
 * Calculate fantasy points from raw stats using scoring settings
 * Mirrors the calculateProjection function from fetch_players_info
 */
export const calculateFantasyPoints = (stats, scoringSettings) => {
	let score = 0;
	for (const stat in stats) {
		const multiplier = scoringSettings[stat] ? scoringSettings[stat] : 0;
		score += (stats[stat] || 0) * multiplier;
	}
	return score;
};

/**
 * Get overall player rankings for a year based on total points or PPG
 * Returns array sorted by points (highest first) with rank property
 */
export const getOverallRankings = (seasonStats, metric = 'totalPoints', minGames = 0) => {
	const players = Object.values(seasonStats)
		.filter(p => p.gamesPlayed >= minGames && p.totalPoints > 0)
		.sort((a, b) => b[metric] - a[metric])
		.map((player, index) => ({
			...player,
			rank: index + 1
		}));

	return players;
};

/**
 * Get positional rankings for a year
 * Returns object keyed by position with ranked arrays
 */
export const getPositionalRankings = (seasonStats, metric = 'totalPoints', minGames = 0) => {
	const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
	const rankings = {};

	for (const pos of positions) {
		rankings[pos] = Object.values(seasonStats)
			.filter(p => p.position === pos && p.gamesPlayed >= minGames && p.totalPoints > 0)
			.sort((a, b) => b[metric] - a[metric])
			.map((player, index) => ({
				...player,
				positionalRank: index + 1
			}));
	}

	return rankings;
};

/**
 * Get a player's rank in both overall and positional rankings
 */
export const getPlayerRankings = (playerId, seasonStats, metric = 'totalPoints', minGames = 0) => {
	const overallRanked = getOverallRankings(seasonStats, metric, minGames);
	const positionalRanked = getPositionalRankings(seasonStats, metric, minGames);

	const player = seasonStats[playerId];
	if (!player) {
		return { overallRank: null, positionalRank: null };
	}

	const overallEntry = overallRanked.find(p => p.playerId === playerId);
	const positionalList = positionalRanked[player.position] || [];
	const positionalEntry = positionalList.find(p => p.playerId === playerId);

	return {
		overallRank: overallEntry?.rank || null,
		positionalRank: positionalEntry?.positionalRank || null,
		totalPlayers: overallRanked.length,
		totalAtPosition: positionalList.length
	};
};

/**
 * Clear cached stats for a specific year or all years
 */
export const clearStatsCache = (year = null) => {
	if (year) {
		localStorage.removeItem(`playerSeasonStats_${year}`);
		playerSeasonStatsStore.update(store => {
			const { [year]: removed, ...rest } = store;
			return rest;
		});
	} else {
		// Clear all cached stats
		const keys = Object.keys(localStorage).filter(k => k.startsWith('playerSeasonStats_'));
		keys.forEach(k => localStorage.removeItem(k));
		playerSeasonStatsStore.set({});
	}
};
