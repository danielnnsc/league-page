import { getLeagueData } from './leagueData';
import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from './nflState';
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import {transactionsStore} from '$lib/stores';
import { browser } from '$app/environment';
import { getLeagueTeamManagers } from './leagueTeamManagers';

export const getLeagueTransactions = async (preview, refresh = false) => {
	const transactionsStoreVal = get(transactionsStore);

	if(transactionsStoreVal.totals) {
		return {
			transactions: checkPreview(preview, transactionsStoreVal.transactions),
			totals: transactionsStoreVal.totals,
			stale: false
		};
	}

	// if this isn't a refresh data call, check if there are already transactions stored in localStorage
	if(!refresh && browser) {
		let localTransactions = await JSON.parse(localStorage.getItem("transactions"));
		// check if transactions have been saved to localStorage before
		if(localTransactions) {
			localTransactions.transactions = checkPreview(preview, localTransactions.transactions);
			localTransactions.stale = true;
			return localTransactions;
		}
	}

	// gather supporting info simultaneously
	const nflState = await getNflState().catch((err) => { console.error(err); });
	
	let week = 18;
	if(nflState.season_type == 'regular') {
		week = nflState.week;
	}

	const {transactionsData, currentSeason} = await combThroughTransactions(week, leagueID).catch((err) => { console.error(err); });

	const { transactions, totals } = await digestTransactions({transactionsData, currentSeason});

	const transactionPackage = {
		transactions,
		totals
	};

    if(browser) {
	    // update localStorage
        localStorage.setItem("transactions", JSON.stringify(transactionPackage));
    
        // update the store
        transactionsStore.update(() => transactionPackage);
    }

	return {
		transactions: checkPreview(preview, transactions),
		totals,
		stale: false
	};
}

const checkPreview = (preview, passedTransactions) => {
	if(preview) {
		// If this is being used for a preview component, only grab 2 trades and waivers
		const previewToReturn = 3;

		const trades = [];
		const waivers = [];
		
		let i = 0;
		while((trades.length < previewToReturn || waivers.length < previewToReturn) && i < passedTransactions.length) {
			if(passedTransactions[i].type == "waiver" && waivers.length < previewToReturn) {
				waivers.push(passedTransactions[i]);
			} else if(passedTransactions[i].type == "trade" && trades.length < previewToReturn) {

				trades.push(passedTransactions[i]);
			}
			i++;
		}

		return {trades, waivers};
	}
	return passedTransactions;
}

const combThroughTransactions = async (week, currentLeagueID) => {
	week = week > 0 ? week : 1;
	
	const leagueIDs = [];
	let currentSeason = null;

	while(currentLeagueID && currentLeagueID != 0) {
		// gather supporting info simultaneously
		const leagueData = await getLeagueData(currentLeagueID).catch((err) => { console.error(err); });

		leagueIDs.push(currentLeagueID);

		if(!currentSeason) {
			currentSeason = leagueData.season;
		}

		currentLeagueID = leagueData.previous_league_id;
	}

	const transactionPromises = [];

	for(const singleLeagueID of leagueIDs) {
		while(week > 0) {
			transactionPromises.push(fetch(`https://api.sleeper.app/v1/league/${singleLeagueID}/transactions/${week}`, {compress: true}));
			week--;
		}
		week = 18;
	}

	const transactionRess = await waitForAll(...transactionPromises).catch((err) => { console.error(err); });

	const transactionDataPromises = [];
	
	for(const transactionRes of transactionRess) {
			if (transactionRes == null || !transactionRes.ok) {
                console.error(transactionRes);
                continue;
			}
			transactionDataPromises.push(transactionRes.json());
	}

	const transactionsDataJson = await waitForAll(...transactionDataPromises).catch((err) => { console.error(err); });

	let transactionsData = [];

	for(const transactionDataJson of transactionsDataJson) {
		transactionsData = transactionsData.concat(transactionDataJson);
	}

	return {transactionsData, currentSeason};
}

const digestTransactions = async ({transactionsData, currentSeason}) => {
	const transactions = [];
	const totals = {
		allTime: {},
		seasons: {}
	};

    const leagueTeamManagers = await getLeagueTeamManagers();

	// trades can be out of order because they are aded to sleeper when the offer is sent
	// this sort puts everything in the correct order
	const transactionOrder = transactionsData.sort((a,b) => b.status_updated - a.status_updated);

	// First pass: collect failed bids grouped by player and timestamp
	const failedBids = {};
	for(const transaction of transactionOrder) {
		if(transaction.status !== 'failed') continue;
		if(transaction.type === 'trade') continue;

		const adds = transaction.adds;
		if(!adds) continue;

		for(const playerId in adds) {
			const bid = transaction.settings?.waiver_bid || 0;
			const rosterId = transaction.roster_ids[0];
			const timestamp = transaction.status_updated;

			// Group by player and approximate timestamp (within 1 hour = same waiver period)
			const timeKey = Math.floor(timestamp / 3600000); // Group by hour
			const key = `${playerId}_${timeKey}`;

			if(!failedBids[key]) {
				failedBids[key] = [];
			}
			failedBids[key].push({
				rosterId,
				bid,
				timestamp
			});
		}
	}

	// Second pass: process successful transactions and attach competing bids
	for(const transaction of transactionOrder) {
		let {digestedTransaction, season, success} = digestTransaction({transaction, currentSeason});
		if(!success) continue;

		// For waiver transactions, find competing bids
		if(digestedTransaction.type === 'waiver') {
			const adds = transaction.adds;
			if(adds) {
				for(const playerId in adds) {
					const timestamp = transaction.status_updated;
					const timeKey = Math.floor(timestamp / 3600000);
					const key = `${playerId}_${timeKey}`;

					if(failedBids[key] && failedBids[key].length > 0) {
						digestedTransaction.competingBids = failedBids[key].sort((a, b) => b.bid - a.bid);
					}
				}
			}
		}

		transactions.push(digestedTransaction);
        if(!leagueTeamManagers.teamManagersMap[season]) {
            // the league may not have converted over yet
            season--;
            // there is an edge case when a league is created in the calendar
            // year before the first fantasy season (issue #206)
            if(!leagueTeamManagers.teamManagersMap[season]) {
                season += 2;
            }
        }

		for(const roster of digestedTransaction.rosters) {
			const type = digestedTransaction.type;
            for(const manager of leagueTeamManagers.teamManagersMap[season][roster].managers) {
			    // add to league long totals for each manager involved with the transaction
                if(!totals.allTime[manager]) {
                    totals.allTime[manager] = {
                        trade: 0,
                        waiver: 0
                    };
                }
                totals.allTime[manager][type]++;
            }

            // add to season long totals for each manager
            if(!totals.seasons[season]) {
                totals.seasons[season] = {};
            }
            if(!totals.seasons[season][roster]) {
                totals.seasons[season][roster] = {
                    trade: 0,
                    waiver: 0,
                    rosterID: roster,
                };
            }
            totals.seasons[season][roster][type]++;
		}
	}
	return {transactions, totals};
}

const digestDate = (tStamp) => {
	const a = new Date(tStamp);
	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const year = a.getFullYear();
	const month = months[a.getMonth()];
	const date = a.getDate();
	const hour = a.getHours();
	const min = a.getMinutes();
	return month + ' ' + date + ' ' + year + ', ' + (hour % 12 == 0 ? 12 : hour % 12) + ':' + min + (hour / 12 >= 1 ? "PM" : "AM");
}

const digestTransaction = ({transaction, currentSeason}) => {
	// don't include failed waiver claims
	if(transaction.status == 'failed') return {success: false};
	const handled = [];
	const transactionRosters = transaction.roster_ids;
	const bid = transaction.settings?.waiver_bid;
	const date = digestDate(transaction.status_updated)
	const season = parseInt(date.split(',')[0].split(' ')[2]);


	let digestedTransaction = {
		id: transaction.transaction_id,
		date,
        season,
		type: "waiver",
		rosters: transactionRosters,
		moves : []
	}
	
	if(transaction.type == "trade") {
		digestedTransaction.type = "trade";
	}
	
	if(season != currentSeason) {
		digestedTransaction.previousOwners = true;
	}

	const adds = transaction.adds;
	const drops = transaction.drops;
	const draftPicks = transaction.draft_picks;

	for(let player in adds) {
		if(!player) {
			continue;
		}
		handled.push(player);
		digestedTransaction.moves.push(handleAdds(transactionRosters, adds, drops, player, bid));
	}

	for(let player in drops) {
		if(handled.indexOf(player) > -1) {
			continue;
		}

		let move = new Array(transactionRosters.length).fill(null);
		if(!player) {
			continue;
		}
		move[transactionRosters.indexOf(drops[player])] = {
			type: "Dropped",
			player
		}

		digestedTransaction.moves.push(move);
	}

	for(let pick of draftPicks) {

		let move = new Array(transactionRosters.length).fill(null);

		move[transactionRosters.indexOf(pick.owner_id)] = {
			type: "trade",
			pick: {
				season: pick.season,
				round: pick.round,
				original_owner: null,
			},
		}

		if(pick.roster_id != pick.previous_owner_id) {
			move[transactionRosters.indexOf(pick.owner_id)].pick.original_owner = pick.roster_id;
		}

		move[transactionRosters.indexOf(pick.previous_owner_id)] = "origin";

		digestedTransaction.moves.push(move);
	}

	for(let wBudget of transaction.waiver_budget) {

		let move = new Array(transactionRosters.length).fill(null);

		move[transactionRosters.indexOf(wBudget.receiver)] = {
			type: "trade",
			budget: {
				amount: wBudget.amount,
			},
		}

		move[transactionRosters.indexOf(wBudget.sender)] = "origin";

		digestedTransaction.moves.push(move);
	}

	return {digestedTransaction, season, success: true};
}

const handleAdds = (rosters, adds, drops, player, bid) => {
	let move = new Array(rosters.length).fill(null);
	if(drops && drops[player]) {
		move[rosters.indexOf(adds[player])] = {
			type: "trade",
			player
		}

		move[rosters.indexOf(drops[player])] = "origin";
		return move;
	}

	move[rosters.indexOf(adds[player])] = {
		type: "Added",
		player,
		bid
	}

	return move;
}

/**
 * Compute the most traded players across all transactions
 * @param {Object[]} transactions - Array of transaction objects
 * @param {Object} playerData - Player data keyed by player ID
 * @param {number} limit - Maximum number of players to return
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object[]} Array of {playerId, name, pos, team, count} sorted by count desc
 */
export const computeMostTradedPlayers = (transactions, playerData, limit = 10, season = 'all') => {
	const playerCounts = {};

	for (const txn of transactions) {
		if (txn.type !== 'trade') continue;
		if (season !== 'all' && txn.season !== season) continue;

		for (const move of txn.moves) {
			for (const col of move) {
				if (!col || col === 'origin' || !col.player) continue;
				if (col.type === 'trade') {
					if (!playerCounts[col.player]) {
						playerCounts[col.player] = 0;
					}
					playerCounts[col.player]++;
				}
			}
		}
	}

	const sorted = Object.entries(playerCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([playerId, count]) => {
			const player = playerData[playerId] || {};
			return {
				playerId,
				name: player.fn && player.ln ? `${player.fn} ${player.ln}` : 'Unknown',
				pos: player.pos || '',
				team: player.t || '',
				count
			};
		});

	return sorted;
}

/**
 * Compute the busiest transaction periods
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} groupBy - 'month' or 'week'
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object[]} Array of {period, count, trades, waivers} sorted by count desc
 */
export const computeBusiestPeriods = (transactions, groupBy = 'month', season = 'all') => {
	const periods = {};

	for (const txn of transactions) {
		if (season !== 'all' && txn.season !== season) continue;

		const dateParts = txn.date.split(',')[0].split(' '); // ["Jan", "15", "2024"]
		let periodKey;

		if (groupBy === 'month') {
			periodKey = `${dateParts[0]} ${dateParts[2]}`; // "Jan 2024"
		} else {
			// Week grouping - use the date as-is for simplicity
			periodKey = txn.date.split(',')[0]; // "Jan 15 2024"
		}

		if (!periods[periodKey]) {
			periods[periodKey] = { trades: 0, waivers: 0 };
		}

		if (txn.type === 'trade') {
			periods[periodKey].trades++;
		} else {
			periods[periodKey].waivers++;
		}
	}

	const sorted = Object.entries(periods)
		.map(([period, data]) => ({
			period,
			count: data.trades + data.waivers,
			trades: data.trades,
			waivers: data.waivers
		}))
		.sort((a, b) => b.count - a.count);

	return sorted;
}

/**
 * Compute total FAAB spent per roster/team
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object} Map of rosterID -> total FAAB spent
 */
export const computeFaabSpent = (transactions, season = 'all') => {
	const faabByRoster = {};

	for (const txn of transactions) {
		if (txn.type !== 'waiver') continue;
		if (season !== 'all' && txn.season !== season) continue;

		for (const move of txn.moves) {
			for (const col of move) {
				if (!col || col === 'origin') continue;
				if (col.type === 'Added' && col.bid) {
					const rosterID = txn.rosters[0];
					if (!faabByRoster[rosterID]) {
						faabByRoster[rosterID] = 0;
					}
					faabByRoster[rosterID] += col.bid;
				}
			}
		}
	}

	return faabByRoster;
}

/**
 * Compute the biggest individual FAAB spends
 * @param {Object[]} transactions - Array of transaction objects
 * @param {Object} playerData - Player data keyed by player ID
 * @param {number} limit - Maximum number of spends to return
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object[]} Array of {playerId, name, pos, team, bid, rosterID, date, season} sorted by bid desc
 */
export const computeBiggestFaabSpends = (transactions, playerData, limit = 10, season = 'all') => {
	const spends = [];

	for (const txn of transactions) {
		if (txn.type !== 'waiver') continue;
		if (season !== 'all' && txn.season !== season) continue;

		for (const move of txn.moves) {
			for (const col of move) {
				if (!col || col === 'origin') continue;
				if (col.type === 'Added' && col.bid && col.bid > 0) {
					const player = playerData[col.player] || {};
					spends.push({
						playerId: col.player,
						name: player.fn && player.ln ? `${player.fn} ${player.ln}` : 'Unknown',
						pos: player.pos || '',
						team: player.t || '',
						bid: col.bid,
						rosterID: txn.rosters[0],
						date: txn.date,
						season: txn.season
					});
				}
			}
		}
	}

	return spends.sort((a, b) => b.bid - a.bid).slice(0, limit);
}

/**
 * Get transaction frequency data formatted for bar charts
 * @param {Object} totals - Transaction totals object from getLeagueTransactions
 * @param {string} type - 'trade' or 'waiver'
 * @param {string|number} season - Specific season year or 'all' for all-time
 * @returns {Object[]} Array of {rosterID, count} sorted by count desc
 */
export const getTransactionFrequency = (totals, type, season = 'all') => {
	const frequency = [];

	if (season === 'all') {
		// Aggregate across all seasons by roster
		const rosterTotals = {};
		for (const seasonKey in totals.seasons) {
			for (const rosterID in totals.seasons[seasonKey]) {
				if (!rosterTotals[rosterID]) {
					rosterTotals[rosterID] = 0;
				}
				rosterTotals[rosterID] += totals.seasons[seasonKey][rosterID][type] || 0;
			}
		}
		for (const rosterID in rosterTotals) {
			frequency.push({
				rosterID: parseInt(rosterID),
				count: rosterTotals[rosterID]
			});
		}
	} else {
		// Single season
		if (totals.seasons[season]) {
			for (const rosterID in totals.seasons[season]) {
				frequency.push({
					rosterID: parseInt(rosterID),
					count: totals.seasons[season][rosterID][type] || 0
				});
			}
		}
	}

	return frequency.sort((a, b) => b.count - a.count);
}

/**
 * Compute the most picked up (added) players from waivers
 * @param {Object[]} transactions - Array of transaction objects
 * @param {Object} playerData - Player data keyed by player ID
 * @param {number} limit - Maximum number of players to return
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object[]} Array of {playerId, name, pos, team, count} sorted by count desc
 */
export const computeMostPickedUpPlayers = (transactions, playerData, limit = 10, season = 'all') => {
	const playerCounts = {};
	const excludedPositions = ['DEF', 'K'];

	for (const txn of transactions) {
		if (txn.type !== 'waiver') continue;
		if (season !== 'all' && txn.season !== season) continue;

		for (const move of txn.moves) {
			for (const col of move) {
				if (!col || col === 'origin' || !col.player) continue;
				// Exclude DEF and K positions
				const playerPos = playerData[col.player]?.pos;
				if (excludedPositions.includes(playerPos)) continue;
				if (col.type === 'Added') {
					if (!playerCounts[col.player]) {
						playerCounts[col.player] = 0;
					}
					playerCounts[col.player]++;
				}
			}
		}
	}

	const sorted = Object.entries(playerCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([playerId, count]) => {
			const player = playerData[playerId] || {};
			return {
				playerId,
				name: player.fn && player.ln ? `${player.fn} ${player.ln}` : 'Unknown',
				pos: player.pos || '',
				team: player.t || '',
				count
			};
		});

	return sorted;
}

/**
 * Compute the most dropped players
 * @param {Object[]} transactions - Array of transaction objects
 * @param {Object} playerData - Player data keyed by player ID
 * @param {number} limit - Maximum number of players to return
 * @param {string|number} season - Filter by season ('all' or year number)
 * @returns {Object[]} Array of {playerId, name, pos, team, count} sorted by count desc
 */
export const computeMostDroppedPlayers = (transactions, playerData, limit = 10, season = 'all') => {
	const playerCounts = {};
	const excludedPositions = ['DEF', 'K'];

	for (const txn of transactions) {
		if (txn.type !== 'waiver') continue;
		if (season !== 'all' && txn.season !== season) continue;

		for (const move of txn.moves) {
			for (const col of move) {
				if (!col || col === 'origin' || !col.player) continue;
				// Exclude DEF and K positions
				const playerPos = playerData[col.player]?.pos;
				if (excludedPositions.includes(playerPos)) continue;
				if (col.type === 'Dropped') {
					if (!playerCounts[col.player]) {
						playerCounts[col.player] = 0;
					}
					playerCounts[col.player]++;
				}
			}
		}
	}

	const sorted = Object.entries(playerCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([playerId, count]) => {
			const player = playerData[playerId] || {};
			return {
				playerId,
				name: player.fn && player.ln ? `${player.fn} ${player.ln}` : 'Unknown',
				pos: player.pos || '',
				team: player.t || '',
				count
			};
		});

	return sorted;
}