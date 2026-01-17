<script>
	import Textfield from '@smui/textfield';
	import Icon from '@smui/textfield/icon';
	import IconButton from '@smui/icon-button';
	import TradeTransaction from './TradeTransaction.svelte';
	import WaiverTransaction from './WaiverTransaction.svelte';
	import Pagination from '../Pagination.svelte';
	import TransactionFilters from './TransactionFilters.svelte';
	import ViewModeToggle from './ViewModeToggle.svelte';
	import CompactView from './CompactView.svelte';
	import TimelineView from './TimelineView.svelte';
	import TransactionAnalytics from './TransactionAnalytics.svelte';
	import { match } from 'fuzzyjs';
	import { goto } from '$app/navigation';
	import { getLeagueTransactions, loadPlayers } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let show, playersInfo, query, queryPage, transactions, stale, perPage, postUpdate = false, leagueTeamManagers;
	export let totals = null;
	export let initialTeam = null;
	export let initialSeason = 'all';
	export let initialViewMode = 'card';

	const oldQuery = query;
	let page = queryPage || 0;

	// New state variables
	let selectedTeam = initialTeam;
	let selectedSeason = initialSeason;
	let viewMode = initialViewMode;
	let selectedPeriod = null; // e.g., "Jan 2024"

	// Compute available seasons from transactions
	$: seasons = [...new Set(transactions.map(t => t.season))].sort((a, b) => b - a);

	const refreshTransactions = async () => {
		const newTransactions = await getLeagueTransactions(false, true);
		transactions = newTransactions.transactions;
		if (newTransactions.totals) {
			totals = newTransactions.totals;
		}
	}

	if (stale) {
		refreshTransactions();
	}

	let players = playersInfo.players;

	const refreshPlayers = async () => {
		const newPlayersInfo = await loadPlayers(null, true);
		players = newPlayersInfo.players;
	}

	if (playersInfo.stale) {
		refreshPlayers();
	}

	// Multi-stage filtering chain
	const setTypeFilter = (filterBy, txns) => {
		if (filterBy === "both" || filterBy === "records") {
			return txns;
		}
		return txns.filter(t => t.type === filterBy);
	}

	const setTeamFilter = (team, txns) => {
		if (team === null) {
			return txns;
		}
		return txns.filter(t => t.rosters.includes(team));
	}

	const setSeasonFilter = (season, txns) => {
		if (season === 'all') {
			return txns;
		}
		return txns.filter(t => t.season === season);
	}

	// Period filter (e.g., "Jan 2024")
	const setPeriodFilter = (period, txns) => {
		if (!period) {
			return txns;
		}
		// Period is like "Jan 2024" - match against transaction date which is like "Jan 15 2024, 3:45PM"
		return txns.filter(t => {
			const txnDate = t.date.split(',')[0]; // "Jan 15 2024"
			const parts = txnDate.split(' '); // ["Jan", "15", "2024"]
			const txnPeriod = `${parts[0]} ${parts[2]}`; // "Jan 2024"
			return txnPeriod === period;
		});
	}

	const setQueryFilter = (q, txns) => {
		if (!txns) return [];
		if (!q || q.trim() === "") {
			return txns;
		}
		return txns.filter(t => checkForQuery(t));
	}

	// Reactive filtering chain
	$: typeFiltered = setTypeFilter(show, transactions);
	$: teamFiltered = setTeamFilter(selectedTeam, typeFiltered);
	$: seasonFiltered = setSeasonFilter(selectedSeason, teamFiltered);
	$: periodFiltered = setPeriodFilter(selectedPeriod, seasonFiltered);
	$: queryFiltered = setQueryFilter(query, periodFiltered);

	// For card view pagination
	$: totalTransactions = queryFiltered.length;
	$: displayTransactions = queryFiltered.slice(page * perPage, (page + 1) * perPage);

	// Player transaction summary (when searching)
	const computePlayerSummary = (txns, q) => {
		if (!q || q.trim() === '' || txns.length === 0) return null;

		const teamStats = {};

		for (const txn of txns) {
			for (const move of txn.moves) {
				for (const col of move) {
					if (!col || col === 'origin' || !col.player) continue;
					const p = players[col.player];
					if (!p) continue;
					const playerName = `${p.fn} ${p.ln}`;
					if (!checkMatch(q, playerName)) continue;

					const rosterID = txn.rosters[0];
					if (!teamStats[rosterID]) {
						teamStats[rosterID] = { adds: 0, drops: 0, trades: 0 };
					}

					if (col.type === 'Added') {
						teamStats[rosterID].adds++;
					} else if (col.type === 'Dropped') {
						teamStats[rosterID].drops++;
					} else if (col.type === 'trade') {
						// For trades, count for the team receiving the player
						const destRoster = txn.rosters[move.findIndex(m => m && m !== 'origin' && m.player === col.player)];
						if (destRoster) {
							if (!teamStats[destRoster]) {
								teamStats[destRoster] = { adds: 0, drops: 0, trades: 0 };
							}
							teamStats[destRoster].trades++;
						}
					}
				}
			}
		}

		return Object.entries(teamStats)
			.map(([rosterID, stats]) => ({
				rosterID: parseInt(rosterID),
				...stats,
				total: stats.adds + stats.drops + stats.trades
			}))
			.filter(t => t.total > 0)
			.sort((a, b) => b.total - a.total);
	}

	$: playerSummary = computePlayerSummary(queryFiltered, query);

	// URL update helper
	const updateUrl = () => {
		if (!postUpdate) return;
		const params = new URLSearchParams();
		params.set('show', show);
		params.set('query', query.trim());
		params.set('page', String(page + 1));
		if (selectedTeam !== null) params.set('team', String(selectedTeam));
		if (selectedSeason !== 'all') params.set('season', String(selectedSeason));
		if (viewMode !== 'card') params.set('view', viewMode);
		goto(`/transactions?${params.toString()}`, { noscroll: true, keepfocus: true });
	}

	const changePage = (dest, pageChange = false) => {
		if (queryPage === dest && pageChange) return;
		page = dest;
		if (dest > Math.ceil(totalTransactions / perPage) || dest < 0) {
			page = 0;
		}
		updateUrl();
	}

	let timer;

	const debounce = (fn, delay = 750) => {
		clearTimeout(timer);
		timer = setTimeout(fn, delay);
	}

	const search = () => {
		query = query.trimStart();
		if (query.trim() === oldQuery) return;
		page = 0;
		debounce(updateUrl);
	}

	const clearSearch = () => {
		query = "";
		updateUrl();
	}

	const checkMatch = (q, name) => {
		const nameMatch = match(q, name);
		return nameMatch.match && nameMatch.score > 0;
	}

	const checkForQuery = (transaction) => {
		for (const move of transaction.moves) {
			for (const col of move) {
				if (!col?.player) continue;
				const p = players[col.player];
				if (p && checkMatch(query, `${p.fn} ${p.ln}`)) {
					return true;
				}
			}
		}
		return false;
	}

	// Reset page when filters change
	$: {
		show;
		selectedTeam;
		selectedSeason;
		page = 0;
	}

	let el;
	$: top = el?.getBoundingClientRect() ? el?.getBoundingClientRect().top : 0;

	// Event handlers for filter components
	const handleTypeChange = (e) => {
		show = e.detail;
		page = 0;
		updateUrl();
	}

	const handleTeamChange = (e) => {
		selectedTeam = e.detail;
		page = 0;
		updateUrl();
	}

	const handleSeasonChange = (e) => {
		selectedSeason = e.detail;
		page = 0;
		updateUrl();
	}

	const handleViewChange = (e) => {
		viewMode = e.detail;
		page = 0;
		updateUrl();
	}

	const handlePeriodFilter = (e) => {
		selectedPeriod = e.detail;
		page = 0;
		// Switch to trades tab to show the filtered trades
		show = 'trade';
		updateUrl();
	}

	const handlePlayerFilter = (e) => {
		const { playerName, transactionType } = e.detail;
		query = playerName;
		page = 0;
		show = transactionType;
		updateUrl();
	}

	const clearPeriodFilter = () => {
		selectedPeriod = null;
		page = 0;
	}

	// Get title based on filters
	$: title = show === 'trade' ? 'Trades' : show === 'waiver' ? 'Waivers' : 'Transactions';
</script>

<style>
	.transactionsParent {
		display: flex;
		flex-wrap: wrap;
		flex-direction: column;
		position: relative;
		width: 100%;
		z-index: 1;
		overflow-y: hidden;
	}

	.transactions {
		flex-grow: 1;
		padding: 0 15px;
	}

	p {
		text-align: center;
	}

	h5 {
		text-align: center;
		margin: 20px auto 16px;
	}

	:global(.disabled) {
		pointer-events: none;
	}

	.searchContainer {
		width: 100%;
		text-align: center;
		margin: 0.5em 0;
	}

	.clearPlaceholder {
		width: 48px;
		display: inline-block;
	}

	.empty {
		width: 100%;
		font-style: italic;
		text-align: center;
		color: #999;
		padding: 2em 0;
	}

	.transactionsChild {
		min-height: 200px;
	}

	.periodFilterChip {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		background-color: var(--blueOne);
		color: white;
		padding: 0.5em 1em;
		border-radius: 8px;
		margin: 0.5em auto 1em;
		max-width: 400px;
		font-size: 0.9em;
	}

	.periodFilterChip i {
		font-size: 1.2em;
	}

	.clearPeriod {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.2);
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		cursor: pointer;
		margin-left: 0.5em;
		transition: background-color 0.15s ease;
	}

	.clearPeriod:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	.clearPeriod i {
		font-size: 16px;
		color: white;
	}

	.playerSummary {
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1em;
		margin: 0.5em auto 1em;
		max-width: 600px;
	}

	.playerSummaryHeader {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 0.75em;
		font-weight: 500;
		color: var(--g333);
	}

	.playerSummaryHeader i {
		color: var(--blueOne);
	}

	.summaryTable {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9em;
	}

	.summaryTable th {
		text-align: left;
		padding: 0.5em;
		border-bottom: 2px solid var(--eee);
		color: var(--g999);
		font-weight: 500;
		font-size: 0.85em;
	}

	.summaryTable th:not(:first-child) {
		text-align: center;
	}

	.summaryTable td {
		padding: 0.5em;
		border-bottom: 1px solid var(--eee);
	}

	.summaryTable td:not(:first-child) {
		text-align: center;
	}

	.summaryTable tr:last-child td {
		border-bottom: none;
	}

	.teamCell {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.teamCell img {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.statAdd {
		color: #00a894;
		font-weight: 600;
	}

	.statDrop {
		color: #ff2a6d;
		font-weight: 600;
	}

	.statTrade {
		color: var(--blueOne);
		font-weight: 600;
	}
</style>

<div class="transactionsParent">
	<!-- Filters -->
	<TransactionFilters
		{show}
		{selectedTeam}
		{selectedSeason}
		{leagueTeamManagers}
		{seasons}
		on:typeChange={handleTypeChange}
		on:teamChange={handleTeamChange}
		on:seasonChange={handleSeasonChange}
	/>

	<!-- View Mode Toggle (only show when not on Records tab) -->
	{#if show !== 'records'}
		<ViewModeToggle
			{viewMode}
			on:viewChange={handleViewChange}
		/>
	{/if}

	<!-- Search (only show when not on Records tab) -->
	{#if show !== 'records'}
		<div class="searchContainer">
			<span class="clearPlaceholder" />
			<Textfield
				class="shaped-outlined"
				variant="outlined"
				bind:value={query}
				label="Search for a player..."
				on:input={() => search()}
			>
				<Icon class="material-icons" slot="leadingIcon">search</Icon>
			</Textfield>
			{#if query.length > 0}
				<IconButton class="material-icons" on:click={() => clearSearch()}>clear</IconButton>
			{:else}
				<span class="clearPlaceholder" />
			{/if}
		</div>
	{/if}

	<!-- Player Transaction Summary (when searching) -->
	{#if query.trim() !== '' && playerSummary && playerSummary.length > 0 && show !== 'records'}
		<div class="playerSummary">
			<div class="playerSummaryHeader">
				<i class="material-icons">person_search</i>
				Transaction Summary for "{query}"
			</div>
			<table class="summaryTable">
				<thead>
					<tr>
						<th>Team</th>
						<th>Adds</th>
						<th>Drops</th>
						<th>Trades</th>
					</tr>
				</thead>
				<tbody>
					{#each playerSummary as team}
						<tr>
							<td>
								<div class="teamCell">
									<img src="{getTeamFromTeamManagers(leagueTeamManagers, team.rosterID).avatar}" alt="team" />
									{getTeamFromTeamManagers(leagueTeamManagers, team.rosterID).name}
								</div>
							</td>
							<td class="{team.adds > 0 ? 'statAdd' : ''}">{team.adds || '-'}</td>
							<td class="{team.drops > 0 ? 'statDrop' : ''}">{team.drops || '-'}</td>
							<td class="{team.trades > 0 ? 'statTrade' : ''}">{team.trades || '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Records Tab (Analytics) -->
	{#if show === 'records'}
		<TransactionAnalytics
			transactions={seasonFiltered}
			{totals}
			{players}
			{leagueTeamManagers}
			{selectedSeason}
			on:periodFilter={handlePeriodFilter}
			on:playerFilter={handlePlayerFilter}
		/>
	{/if}

	<!-- Period Filter Indicator (only show on transaction tabs) -->
	{#if selectedPeriod && show !== 'records'}
		<div class="periodFilterChip">
			<i class="material-icons">event</i>
			Showing transactions from <strong>{selectedPeriod}</strong>
			<button class="clearPeriod" on:click={clearPeriodFilter}>
				<i class="material-icons">close</i>
			</button>
		</div>
	{/if}

	<!-- Transactions Display (only show on transaction tabs) -->
	{#if show !== 'records'}
	<div class="transactions" bind:this={el}>
		<h5>
			{title}
			{#if selectedSeason !== 'all'}({selectedSeason}){/if}
			{#if totalTransactions > 0}
				<span style="font-weight: normal; color: #999;">({totalTransactions})</span>
			{/if}
		</h5>

		{#if totalTransactions === 0}
			<p class="empty">
				{#if query.trim() !== ""}
					No {title.toLowerCase()} match your search
				{:else}
					No {title.toLowerCase()} found with current filters
				{/if}
			</p>
		{:else if viewMode === 'card'}
			<!-- Card View (original style) -->
			<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={false} />
			<div class="transactionsChild">
				{#each displayTransactions as transaction (transaction.id)}
					{#if transaction.type === "waiver"}
						<WaiverTransaction {players} {transaction} {leagueTeamManagers} />
					{:else}
						<TradeTransaction {players} {transaction} {leagueTeamManagers} />
					{/if}
				{/each}
			</div>
			<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={true} />
		{:else if viewMode === 'timeline'}
			<!-- Timeline View -->
			<TimelineView transactions={queryFiltered} {players} {leagueTeamManagers} perPage={20} />
		{:else if viewMode === 'compact'}
			<!-- Compact View -->
			<CompactView transactions={queryFiltered} {players} {leagueTeamManagers} perPage={25} />
		{/if}
	</div>
	{/if}
</div>
