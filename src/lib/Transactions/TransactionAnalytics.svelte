<script>
	import BarChart from '../BarChart.svelte';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
	import {
		computeMostTradedPlayers,
		computeMostPickedUpPlayers,
		computeMostDroppedPlayers,
		computeBusiestPeriods,
		computeFaabSpent,
		computeBiggestFaabSpends,
		getTransactionFrequency
	} from '$lib/utils/helperFunctions/leagueTransactions';
	import { createEventDispatcher } from 'svelte';

	export let transactions, totals, players, leagueTeamManagers, selectedSeason = 'all', selectedTeam = null;

	const dispatch = createEventDispatcher();

	// Filter transactions by team if selected
	$: teamFilteredTransactions = selectedTeam
		? transactions.filter(t => t.rosters.includes(selectedTeam))
		: transactions;

	// Calculate total FAAB spent
	$: totalFaabSpent = Object.values(computeFaabSpent(teamFilteredTransactions, selectedSeason))
		.reduce((sum, amount) => sum + amount, 0);

	// Calculate league-wide total for comparison
	$: leagueTotalFaab = Object.values(computeFaabSpent(transactions, selectedSeason))
		.reduce((sum, amount) => sum + amount, 0);

	// Get team info for display
	$: selectedTeamInfo = selectedTeam
		? getTeamFromTeamManagers(leagueTeamManagers, selectedTeam, selectedSeason === 'all' ? leagueTeamManagers.currentSeason : selectedSeason)
		: null;

	const handlePeriodClick = (period) => {
		dispatch('periodFilter', period);
	}

	const handlePlayerClick = (playerName, transactionType) => {
		dispatch('playerFilter', { playerName, transactionType });
	}

	// Generate graph data for trade frequency
	const generateFrequencyGraph = (frequency, header, short, label) => {
		if (!frequency || frequency.length === 0) return null;

		const maxCount = Math.max(...frequency.map(f => f.count));
		const xMax = Math.ceil(maxCount / 5) * 5 || 5;

		return {
			stats: frequency.map(f => f.count),
			secondStats: [],
			managerIDs: frequency.map(() => null),
			rosterIDs: frequency.map(f => f.rosterID),
			labels: { x: '', stat: label },
			header,
			xMin: 0,
			xMax,
			short,
			year: selectedSeason === 'all' ? leagueTeamManagers.currentSeason : selectedSeason
		};
	}

	// Generate graph data for FAAB spending
	const generateFaabGraph = (faabData, header, short) => {
		if (!faabData || Object.keys(faabData).length === 0) return null;

		const entries = Object.entries(faabData)
			.map(([rosterID, amount]) => ({ rosterID: parseInt(rosterID), amount }))
			.sort((a, b) => b.amount - a.amount);

		const maxAmount = Math.max(...entries.map(e => e.amount));
		const xMax = Math.ceil(maxAmount / 50) * 50 || 100;

		return {
			stats: entries.map(e => e.amount),
			secondStats: [],
			managerIDs: entries.map(() => null),
			rosterIDs: entries.map(e => e.rosterID),
			labels: { x: '', stat: '$' },
			header,
			xMin: 0,
			xMax,
			short,
			year: selectedSeason === 'all' ? leagueTeamManagers.currentSeason : selectedSeason
		};
	}

	// Reactive computations - use team filtered transactions when team is selected
	$: tradeFrequency = totals ? getTransactionFrequency(totals, 'trade', selectedSeason, selectedTeam) : [];
	$: waiverFrequency = totals ? getTransactionFrequency(totals, 'waiver', selectedSeason, selectedTeam) : [];
	$: faabSpent = computeFaabSpent(teamFilteredTransactions, selectedSeason);
	$: mostTradedPlayers = computeMostTradedPlayers(teamFilteredTransactions, players, 10, selectedSeason);
	$: mostPickedUpPlayers = computeMostPickedUpPlayers(teamFilteredTransactions, players, 10, selectedSeason);
	$: mostDroppedPlayers = computeMostDroppedPlayers(teamFilteredTransactions, players, 10, selectedSeason);
	$: biggestFaabSpends = computeBiggestFaabSpends(teamFilteredTransactions, players, 10, selectedSeason);
	$: busiestPeriods = computeBusiestPeriods(teamFilteredTransactions, 'month', selectedSeason).slice(0, 5);

	// Count transactions for summary
	$: tradeCount = teamFilteredTransactions.filter(t => t.type === 'trade').length;
	$: waiverCount = teamFilteredTransactions.filter(t => t.type === 'waiver').length;

	// Build graphs array
	$: tradeGraph = generateFrequencyGraph(tradeFrequency, 'Trade Frequency by Team', 'Trades', ' trades');
	$: waiverGraph = generateFrequencyGraph(waiverFrequency, 'Waiver Frequency by Team', 'Waivers', ' waivers');
	$: faabGraph = generateFaabGraph(faabSpent, 'Total FAAB Spent by Team', 'FAAB');

	$: graphs = [tradeGraph, waiverGraph, faabGraph].filter(g => g !== null);

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	}
</script>

<style>
	.analyticsPanel {
		background-color: var(--f5f5);
		border-radius: 12px;
		padding: 1.5em;
		margin: 1em 0 2em;
	}

	.analyticsHeader {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 1em;
	}

	.analyticsHeader h4 {
		margin: 0;
		font-weight: 500;
	}

	.analyticsHeader i {
		color: var(--blueOne);
	}

	.summarySection {
		display: flex;
		gap: 1em;
		margin-bottom: 1.5em;
		flex-wrap: wrap;
	}

	.summaryCard {
		flex: 1;
		min-width: 140px;
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 1em;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.summaryCard i {
		font-size: 2em;
		opacity: 0.9;
	}

	.summaryCard.faab i {
		color: #f57c00;
	}

	.summaryCard.trades i {
		color: var(--blueOne);
	}

	.summaryCard.waivers i {
		color: var(--blueTwo);
	}

	.summaryContent {
		display: flex;
		flex-direction: column;
	}

	.summaryValue {
		font-size: 1.5em;
		font-weight: 600;
		line-height: 1.2;
	}

	.summaryCard.faab .summaryValue {
		color: #f57c00;
	}

	.summaryCard.trades .summaryValue {
		color: var(--blueOne);
	}

	.summaryCard.waivers .summaryValue {
		color: var(--blueTwo);
	}

	.summaryLabel {
		font-size: 0.85em;
		color: var(--g555);
	}

	.summarySubtext {
		font-size: 0.75em;
		color: var(--g999);
		font-style: italic;
	}

	.analyticsGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5em;
	}

	.analyticsCard {
		background-color: var(--fff);
		border-radius: 8px;
		padding: 1em;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.cardHeader {
		font-weight: 500;
		margin-bottom: 0.75em;
		color: var(--g333);
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.cardHeader i {
		font-size: 1.2em;
		color: var(--blueOne);
	}

	.playerList {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.playerItem {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.4em 0.5em;
		border-bottom: 1px solid var(--eee);
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.15s ease;
		margin: 0 -0.5em;
	}

	.playerItem:hover {
		background-color: var(--f5f5);
	}

	.playerItem:last-child {
		border-bottom: none;
	}

	.rank {
		font-size: 0.8em;
		color: var(--g999);
		width: 20px;
		text-align: right;
	}

	.playerAvatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid var(--ddd);
		background-color: var(--f5f5);
		background-size: cover;
		background-position: center;
	}

	.playerInfo {
		flex: 1;
	}

	.playerName {
		font-size: 0.9em;
		font-weight: 500;
	}

	.playerMeta {
		font-size: 0.75em;
		color: var(--g999);
	}

	.playerCount {
		font-weight: 600;
		color: var(--blueOne);
	}

	.playerCount.added {
		color: #00a894;
	}

	.playerCount.dropped {
		color: #ff2a6d;
	}

	.faabAmount {
		font-weight: 600;
		color: #f57c00;
	}

	.teamChip {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.1em 0.4em;
		background-color: var(--f5f5);
		border-radius: 12px;
		font-size: 0.75em;
	}

	.teamAvatar {
		width: 16px;
		height: 16px;
		border-radius: 50%;
	}

	.periodList {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.periodItem {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5em;
		border-bottom: 1px solid var(--eee);
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.15s ease;
	}

	.periodItem:hover {
		background-color: var(--f5f5);
	}

	.periodItem:last-child {
		border-bottom: none;
	}

	.periodName {
		font-weight: 500;
	}

	.periodStats {
		display: flex;
		gap: 1em;
		font-size: 0.85em;
	}

	.periodStat {
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.periodStat.trades {
		color: var(--blueOne);
	}

	.periodStat.waivers {
		color: var(--blueTwo);
	}

	.chartsSection {
		margin-top: 1.5em;
	}

	.noData {
		text-align: center;
		color: var(--g999);
		font-style: italic;
		padding: 2em;
	}

	@media (max-width: 600px) {
		.analyticsPanel {
			padding: 1em;
		}

		.analyticsGrid {
			grid-template-columns: 1fr;
		}
	}
</style>

<div class="analyticsPanel">
	<div class="analyticsHeader">
		<i class="material-icons">analytics</i>
		<h4>
			Transaction Analytics
			{#if selectedTeamInfo}
				- {selectedTeamInfo.name}
			{/if}
			{selectedSeason !== 'all' ? `(${selectedSeason})` : '(All Time)'}
		</h4>
	</div>

	<!-- Summary Stats -->
	<div class="summarySection">
		<div class="summaryCard faab">
			<i class="material-icons">attach_money</i>
			<div class="summaryContent">
				<span class="summaryValue">${totalFaabSpent.toLocaleString()}</span>
				<span class="summaryLabel">FAAB Spent{selectedTeam ? '' : ' (League)'}</span>
				{#if selectedTeam && leagueTotalFaab > 0}
					<span class="summarySubtext">{Math.round((totalFaabSpent / leagueTotalFaab) * 100)}% of league total</span>
				{/if}
			</div>
		</div>
		<div class="summaryCard trades">
			<i class="material-icons">swap_horiz</i>
			<div class="summaryContent">
				<span class="summaryValue">{tradeCount}</span>
				<span class="summaryLabel">Trades</span>
			</div>
		</div>
		<div class="summaryCard waivers">
			<i class="material-icons">person_add</i>
			<div class="summaryContent">
				<span class="summaryValue">{waiverCount}</span>
				<span class="summaryLabel">Waiver Claims</span>
			</div>
		</div>
	</div>

	<div class="analyticsGrid">
		<!-- Most Traded Players -->
		<div class="analyticsCard">
			<div class="cardHeader">
				<i class="material-icons">swap_horiz</i>
				Most Traded Players
				<span style="font-size: 0.7em; font-weight: 400; color: var(--g999); margin-left: auto;">(click to filter)</span>
			</div>
			{#if mostTradedPlayers.length > 0}
				<ul class="playerList">
					{#each mostTradedPlayers as player, i}
						<li class="playerItem" on:click={() => handlePlayerClick(player.name, 'trade')}>
							<span class="rank">{i + 1}.</span>
							<div class="playerAvatar" style="background-image: url({getPlayerAvatar(player.pos, player.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
							<div class="playerInfo">
								<div class="playerName">{player.name}</div>
								<div class="playerMeta">{player.pos} {player.team ? `- ${player.team}` : ''}</div>
							</div>
							<span class="playerCount">{player.count}x</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="noData">No trades found</p>
			{/if}
		</div>

		<!-- Most Picked Up Players -->
		<div class="analyticsCard">
			<div class="cardHeader">
				<i class="material-icons" style="color: #00a894;">add_circle</i>
				Most Picked Up
				<span style="font-size: 0.7em; font-weight: 400; color: var(--g999); margin-left: auto;">(click to filter)</span>
			</div>
			{#if mostPickedUpPlayers.length > 0}
				<ul class="playerList">
					{#each mostPickedUpPlayers as player, i}
						<li class="playerItem" on:click={() => handlePlayerClick(player.name, 'waiver')}>
							<span class="rank">{i + 1}.</span>
							<div class="playerAvatar" style="background-image: url({getPlayerAvatar(player.pos, player.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
							<div class="playerInfo">
								<div class="playerName">{player.name}</div>
								<div class="playerMeta">{player.pos} {player.team ? `- ${player.team}` : ''}</div>
							</div>
							<span class="playerCount added">{player.count}x</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="noData">No pickups found</p>
			{/if}
		</div>

		<!-- Most Dropped Players -->
		<div class="analyticsCard">
			<div class="cardHeader">
				<i class="material-icons" style="color: #ff2a6d;">remove_circle</i>
				Most Dropped
				<span style="font-size: 0.7em; font-weight: 400; color: var(--g999); margin-left: auto;">(click to filter)</span>
			</div>
			{#if mostDroppedPlayers.length > 0}
				<ul class="playerList">
					{#each mostDroppedPlayers as player, i}
						<li class="playerItem" on:click={() => handlePlayerClick(player.name, 'waiver')}>
							<span class="rank">{i + 1}.</span>
							<div class="playerAvatar" style="background-image: url({getPlayerAvatar(player.pos, player.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
							<div class="playerInfo">
								<div class="playerName">{player.name}</div>
								<div class="playerMeta">{player.pos} {player.team ? `- ${player.team}` : ''}</div>
							</div>
							<span class="playerCount dropped">{player.count}x</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="noData">No drops found</p>
			{/if}
		</div>

		<!-- Biggest FAAB Spends -->
		<div class="analyticsCard">
			<div class="cardHeader">
				<i class="material-icons">attach_money</i>
				Biggest FAAB Spends
			</div>
			{#if biggestFaabSpends.length > 0}
				<ul class="playerList">
					{#each biggestFaabSpends as spend, i}
						<li class="playerItem">
							<span class="rank">{i + 1}.</span>
							<div class="playerAvatar" style="background-image: url({getPlayerAvatar(spend.pos, spend.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
							<div class="playerInfo">
								<div class="playerName">{spend.name}</div>
								<span class="teamChip">
									<img class="teamAvatar" src="{getTeamFromTeamManagers(leagueTeamManagers, spend.rosterID, spend.season).avatar}" alt="team" />
									{getTeamFromTeamManagers(leagueTeamManagers, spend.rosterID, spend.season).name}
								</span>
							</div>
							<span class="faabAmount">${spend.bid}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="noData">No FAAB bids found</p>
			{/if}
		</div>

		<!-- Busiest Periods -->
		<div class="analyticsCard">
			<div class="cardHeader">
				<i class="material-icons">event</i>
				Busiest Trading Periods
				<span style="font-size: 0.7em; font-weight: 400; color: var(--g999); margin-left: auto;">(click to filter)</span>
			</div>
			{#if busiestPeriods.length > 0}
				<ul class="periodList">
					{#each busiestPeriods as period}
						<li class="periodItem" on:click={() => handlePeriodClick(period.period)}>
							<span class="periodName">{period.period}</span>
							<div class="periodStats">
								<span class="periodStat trades">
									<i class="material-icons" style="font-size: 14px;">swap_horiz</i>
									{period.trades}
								</span>
								<span class="periodStat waivers">
									<i class="material-icons" style="font-size: 14px;">person_add</i>
									{period.waivers}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="noData">No transaction data</p>
			{/if}
		</div>
	</div>

	<!-- Bar Charts Section -->
	{#if graphs.length > 0}
		<div class="chartsSection">
			<BarChart {graphs} {leagueTeamManagers} />
		</div>
	{/if}
</div>
