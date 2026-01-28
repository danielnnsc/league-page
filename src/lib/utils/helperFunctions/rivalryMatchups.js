import { getLeagueData } from "./leagueData"
import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from "./nflState"
import { waitForAll } from './multiPromise';
import { getRosterIDFromManagerIDAndYear } from '$lib/utils/helperFunctions/universalFunctions';
import { getLeagueTeamManagers } from "./leagueTeamManagers";

export const getRivalryMatchups = async (userOneID, userTwoID) => {
    if(!userOneID || !userTwoID) {
        return;
    }

    let curLeagueID = leagueID;

	const [nflState, teamManagers] = await waitForAll(
		getNflState(),
		getLeagueTeamManagers(),
	).catch((err) => { console.error(err); });

	let week = 1;
	if(nflState.season_type == 'regular') {
		week = nflState.display_week;
	} else if(nflState.season_type == 'post') {
		week = 18;
	}

    const rivalry = {
        points: {
            one: 0,
            two: 0,
        },
        wins: {
            one: 0,
            two: 0,
        },
        ties: 0,
        matchups: []
    }

    while(curLeagueID && curLeagueID != 0) {
        const leagueData = await getLeagueData(curLeagueID).catch((err) => { console.error(err); });
        const year = leagueData.season;
        const rosterIDOne = getRosterIDFromManagerIDAndYear(teamManagers, userOneID, year);
        const rosterIDTwo = getRosterIDFromManagerIDAndYear(teamManagers, userTwoID, year);
        if(!rosterIDOne || !rosterIDTwo || rosterIDOne == rosterIDTwo) {
            curLeagueID = leagueData.previous_league_id;
            week = 18;
            continue;
        }

        // pull in all matchup data for the season
        const matchupsPromises = [];
        for(let i = 1; i < leagueData.settings.playoff_week_start; i++) {
            matchupsPromises.push(fetch(`https://api.sleeper.app/v1/league/${curLeagueID}/matchups/${i}`, {compress: true}))
        }
        const matchupsRes = await waitForAll(...matchupsPromises);

        // convert the json matchup responses
        const matchupsJsonPromises = [];
        for(const matchupRes of matchupsRes) {
            const data = matchupRes.json();
            matchupsJsonPromises.push(data)
            if (!matchupRes.ok) {
                throw new Error(data);
            }
        }
        const matchupsData = await waitForAll(...matchupsJsonPromises).catch((err) => { console.error(err); }).catch((err) => { console.error(err); });

        // process all the matchups
        for(let i = 1; i < matchupsData.length + 1; i++) {
            const processed = processRivalryMatchups(matchupsData[i - 1], i, rosterIDOne, rosterIDTwo);
            if(processed) {
                const {matchup, week} = processed;
                const sideA = matchup[0];
                const sideB = matchup[1];
                let sideAPoints = sideA.points.reduce((t, nV) => t + nV, 0);
                let sideBPoints = sideB.points.reduce((t, nV) => t + nV, 0);
                rivalry.points.one += sideAPoints;
                rivalry.points.two += sideBPoints;
                if(sideAPoints > sideBPoints) {
                    rivalry.wins.one++;
                } else if(sideAPoints < sideBPoints) {
                    rivalry.wins.two++;
                } else {
                    rivalry.ties++;
                }
                rivalry.matchups.push({
                    week,
                    year,
                    matchup,
                })
            }
        }
        curLeagueID = leagueData.previous_league_id;
        week = 18;
    }

    rivalry.matchups.sort((a, b) => {
        var yearOrder = b.year - a.year;
        var weekOrder = b.week - a.week;
        return yearOrder || weekOrder;
    });

	return rivalry;
}

/**
 * Get all head-to-head records between all managers
 * Returns a matrix of { managerA: { managerB: { wins, losses, ties } } }
 */
export const getAllHeadToHeadRecords = async () => {
	let curLeagueID = leagueID;

	const [nflState, teamManagers] = await waitForAll(
		getNflState(),
		getLeagueTeamManagers(),
	).catch((err) => { console.error(err); });

	// Build a map of all managers who have ever been in the league
	const allManagerIDs = new Set();
	for (const year in teamManagers.teamManagersMap) {
		for (const rosterID in teamManagers.teamManagersMap[year]) {
			const managers = teamManagers.teamManagersMap[year][rosterID].managers;
			for (const managerID of managers) {
				allManagerIDs.add(managerID);
			}
		}
	}

	// Initialize separate matrices for regular season, playoffs, and combined
	const initMatrix = () => {
		const matrix = {};
		for (const m1 of allManagerIDs) {
			matrix[m1] = {};
			for (const m2 of allManagerIDs) {
				if (m1 !== m2) {
					matrix[m1][m2] = { wins: 0, losses: 0, ties: 0 };
				}
			}
		}
		return matrix;
	};

	const regularSeasonMatrix = initMatrix();
	const playoffsMatrix = initMatrix();

	// Helper to update a matrix with matchup results
	const updateMatrix = (matrix, managers1, managers2, points1, points2) => {
		for (const m1 of managers1) {
			for (const m2 of managers2) {
				if (m1 === m2) continue;

				if (points1 > points2) {
					matrix[m1][m2].wins++;
					matrix[m2][m1].losses++;
				} else if (points2 > points1) {
					matrix[m2][m1].wins++;
					matrix[m1][m2].losses++;
				} else {
					matrix[m1][m2].ties++;
					matrix[m2][m1].ties++;
				}
			}
		}
	};

	// Process all seasons
	while (curLeagueID && curLeagueID != 0) {
		const leagueData = await getLeagueData(curLeagueID).catch((err) => { console.error(err); });
		const year = leagueData.season;
		const playoffWeekStart = leagueData.settings.playoff_week_start;

		// Build roster ID to managers mapping for this season (all managers, not just primary)
		const rosterToManagers = {};
		for (const rosterID in teamManagers.teamManagersMap[year]) {
			const managers = teamManagers.teamManagersMap[year][rosterID].managers;
			if (managers && managers.length > 0) {
				rosterToManagers[rosterID] = managers;
			}
		}

		// Fetch bracket data to identify championship-contention games
		// Only count games for 1st-4th place (exclude 5th, 8th, 10th place games, etc.)
		const [winnersBracketRes, losersBracketRes] = await waitForAll(
			fetch(`https://api.sleeper.app/v1/league/${curLeagueID}/winners_bracket`, { compress: true }),
			fetch(`https://api.sleeper.app/v1/league/${curLeagueID}/losers_bracket`, { compress: true })
		).catch((err) => { console.error(err); });

		const [winnersBracket, losersBracket] = await waitForAll(
			winnersBracketRes.json(),
			losersBracketRes.json()
		).catch((err) => { console.error(err); });

		// Build a set of valid playoff matchups (championship contention only)
		// Format: "roster1-roster2" (sorted to be order-independent)
		const validPlayoffMatchups = new Set();

		if (winnersBracket && Array.isArray(winnersBracket)) {
			for (const match of winnersBracket) {
				// p = placement: 1 = championship (1st/2nd), 3 = 3rd/4th place
				// Only include games for 1st-4th place (p <= 3 or p is undefined for semis)
				// Exclude 5th place and below
				const placement = match.p;

				// Include: championship game (p=1), 3rd place game (p=3), and semifinal games (no p value yet)
				// Exclude: 5th place (p=5), 7th place (p=7), etc.
				if (placement === undefined || placement === null || placement <= 3) {
					if (match.t1 && match.t2) {
						const key = [match.t1, match.t2].sort((a, b) => a - b).join('-');
						validPlayoffMatchups.add(key);
					}
				}
			}
		}

		// Pull in all matchup data for the season (regular season + playoffs)
		const totalWeeks = 18;
		const matchupsPromises = [];
		for (let i = 1; i <= totalWeeks; i++) {
			matchupsPromises.push(fetch(`https://api.sleeper.app/v1/league/${curLeagueID}/matchups/${i}`, { compress: true }));
		}
		const matchupsRes = await waitForAll(...matchupsPromises);

		// Convert the json matchup responses
		const matchupsJsonPromises = [];
		for (const matchupRes of matchupsRes) {
			const data = matchupRes.json();
			matchupsJsonPromises.push(data);
			if (!matchupRes.ok) {
				throw new Error(data);
			}
		}
		const matchupsData = await waitForAll(...matchupsJsonPromises).catch((err) => { console.error(err); });

		// Process all matchups for this season
		for (let weekIndex = 0; weekIndex < matchupsData.length; weekIndex++) {
			const weekMatchups = matchupsData[weekIndex];
			const weekNum = weekIndex + 1;
			const isPlayoffs = weekNum >= playoffWeekStart;

			if (!weekMatchups || weekMatchups.length === 0) continue;

			// Group matchups by matchup_id
			const matchupGroups = {};
			for (const match of weekMatchups) {
				if (!matchupGroups[match.matchup_id]) {
					matchupGroups[match.matchup_id] = [];
				}
				matchupGroups[match.matchup_id].push(match);
			}

			// Process each matchup pair
			for (const matchupId in matchupGroups) {
				const pair = matchupGroups[matchupId];
				if (pair.length !== 2) continue;

				const roster1 = pair[0].roster_id;
				const roster2 = pair[1].roster_id;
				const managers1 = rosterToManagers[roster1] || [];
				const managers2 = rosterToManagers[roster2] || [];

				if (managers1.length === 0 || managers2.length === 0) continue;

				const points1 = pair[0].points || 0;
				const points2 = pair[1].points || 0;

				// Update the appropriate matrix
				if (isPlayoffs) {
					// Only count playoff games that are in championship contention (1st-4th place)
					const matchupKey = [roster1, roster2].sort((a, b) => a - b).join('-');
					if (validPlayoffMatchups.has(matchupKey)) {
						updateMatrix(playoffsMatrix, managers1, managers2, points1, points2);
					}
				} else {
					updateMatrix(regularSeasonMatrix, managers1, managers2, points1, points2);
				}
			}
		}

		curLeagueID = leagueData.previous_league_id;
	}

	// Combine regular season and playoffs into an "all" matrix
	const allMatrix = initMatrix();
	for (const m1 of allManagerIDs) {
		for (const m2 of allManagerIDs) {
			if (m1 !== m2) {
				allMatrix[m1][m2].wins = regularSeasonMatrix[m1][m2].wins + playoffsMatrix[m1][m2].wins;
				allMatrix[m1][m2].losses = regularSeasonMatrix[m1][m2].losses + playoffsMatrix[m1][m2].losses;
				allMatrix[m1][m2].ties = regularSeasonMatrix[m1][m2].ties + playoffsMatrix[m1][m2].ties;
			}
		}
	}

	return {
		matrix: allMatrix,
		regularSeasonMatrix,
		playoffsMatrix,
		managerIDs: Array.from(allManagerIDs),
		teamManagers
	};
}

const processRivalryMatchups = (inputMatchups, week, rosterIDOne, rosterIDTwo) => {
	if(!inputMatchups || inputMatchups.length == 0) {
		return false;
	}
	const matchups = {};
	for(const match of inputMatchups) {
        if(match.roster_id == rosterIDOne || match.roster_id == rosterIDTwo) {
            if(!matchups[match.matchup_id]) {
                matchups[match.matchup_id] = [];
            }
            matchups[match.matchup_id].push({
                roster_id: match.roster_id,
                starters: match.starters,
                points: match.starters_points,
            })
        }
	}
    const keys = Object.keys(matchups);
    const matchup = matchups[keys[0]];
    // if the two teams played each other, there will only be one matchup, or if
    // there is one matchup that only has half the matchup, then one of the teams wasn't in the league yet
    if(keys.length > 1 || matchup.length == 1) {
        return;
    }
    // make sure that the order matches
    if(matchup[0].roster_id == rosterIDTwo) {
        const two = matchup.shift();
        matchup.push(two);
    }
	return {matchup, week};
}
