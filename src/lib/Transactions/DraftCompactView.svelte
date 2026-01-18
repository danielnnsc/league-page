<script>
	import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
	import DraftCompactRow from './DraftCompactRow.svelte';
	import Pagination from '../Pagination.svelte';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let drafts, players, leagueTeamManagers, selectedTeam, selectedSeason, query;
	export let perPage = 30;

	let page = 0;
	let el;

	// Flatten drafts into individual picks
	const flattenDrafts = (draftsData) => {
		const picks = [];

		for (const draft of draftsData) {
			const { year, draftOrder, draftType } = draft;

			for (let round = 0; round < draft.draft.length; round++) {
				const row = draft.draft[round];
				for (let col = 0; col < row.length; col++) {
					const cell = row[col];
					if (!cell || !cell.player) continue;

					const rosterID = draftOrder[col];
					let pickNumber;

					// Calculate pick number based on draft type
					if (draftType === 'auction') {
						pickNumber = col + 1;
					} else if (draftType === 'snake') {
						// Snake draft: odd rounds go left to right, even rounds go right to left
						if ((round + 1) % 2 === 0) {
							pickNumber = row.length - col;
						} else {
							pickNumber = col + 1;
						}
					} else {
						// Linear draft
						pickNumber = col + 1;
					}

					picks.push({
						player: cell.player,
						rosterID,
						round: round + 1,
						pickNumber,
						overallPick: round * row.length + col + 1,
						amount: cell.amount || null,
						year,
						draftType,
						newOwner: cell.newOwner || null
					});
				}
			}
		}

		return picks;
	}

	$: allPicks = flattenDrafts(drafts);

	// Filter by season
	$: seasonFiltered = selectedSeason === 'all'
		? allPicks
		: allPicks.filter(p => p.year === selectedSeason);

	// Filter by team
	$: teamFiltered = selectedTeam === null
		? seasonFiltered
		: seasonFiltered.filter(p => p.rosterID === selectedTeam);

	// Filter by query (player name search)
	$: queryFiltered = !query || query.trim() === ''
		? teamFiltered
		: teamFiltered.filter(p => {
			const player = players[p.player];
			if (!player) return false;
			const name = `${player.fn} ${player.ln}`.toLowerCase();
			return name.includes(query.toLowerCase().trim());
		});

	// Sort by year (descending), then round, then pick number
	$: sortedPicks = [...queryFiltered].sort((a, b) => {
		if (a.year !== b.year) return b.year - a.year;
		if (a.round !== b.round) return a.round - b.round;
		return a.overallPick - b.overallPick;
	});

	$: totalPicks = sortedPicks.length;
	$: displayPicks = sortedPicks.slice(page * perPage, (page + 1) * perPage);

	// Check if any picks have auction amounts
	$: hasAuction = sortedPicks.some(p => p.amount !== null && p.amount !== undefined);

	// Reset page when filters change
	$: {
		selectedTeam;
		selectedSeason;
		query;
		page = 0;
	}

	$: top = el?.getBoundingClientRect() ? el.getBoundingClientRect().top : 0;
</script>

<style>
	.compactViewWrapper {
		width: 100%;
		overflow-x: auto;
		margin: 1em 0;
		padding: 0 15px;
	}

	:global(.draftCompactTable) {
		width: 100%;
		min-width: 600px;
	}

	:global(.draftCompactTable .mdc-data-table__header-cell) {
		font-weight: 600;
		color: var(--g333);
		background-color: var(--f5f5);
	}

	.yearCol {
		width: 80px;
	}

	.pickCol {
		width: 120px;
	}

	.playerCol {
		min-width: 200px;
	}

	.teamCol {
		width: 180px;
	}

	.amountCol {
		width: 80px;
	}

	h5 {
		text-align: center;
		margin: 20px auto 16px;
	}

	.empty {
		width: 100%;
		font-style: italic;
		text-align: center;
		color: #999;
		padding: 2em 0;
	}
</style>

<div class="compactViewWrapper" bind:this={el}>
	<h5>
		Draft History
		{#if selectedSeason !== 'all'}({selectedSeason}){/if}
		{#if totalPicks > 0}
			<span style="font-weight: normal; color: #999;">({totalPicks} picks)</span>
		{/if}
	</h5>

	{#if totalPicks === 0}
		<p class="empty">
			{#if query && query.trim() !== ""}
				No draft picks match your search
			{:else}
				No draft picks found with current filters
			{/if}
		</p>
	{:else}
		<Pagination {perPage} total={totalPicks} bind:page={page} target={top} scroll={false} />

		<DataTable table$aria-label="Draft Picks" class="draftCompactTable">
			<Head>
				<Row>
					<Cell class="yearCol">Year</Cell>
					<Cell class="pickCol">Pick</Cell>
					<Cell class="playerCol">Player</Cell>
					<Cell class="teamCol">Team</Cell>
					{#if hasAuction}
						<Cell class="amountCol">Amount</Cell>
					{:else}
						<Cell class="amountCol"></Cell>
					{/if}
				</Row>
			</Head>
			<Body>
				{#each displayPicks as pick (pick.year + '-' + pick.round + '-' + pick.pickNumber + '-' + pick.player)}
					<DraftCompactRow {pick} {players} {leagueTeamManagers} />
				{/each}
			</Body>
		</DataTable>

		<Pagination {perPage} total={totalPicks} bind:page={page} target={top} scroll={true} />
	{/if}
</div>
