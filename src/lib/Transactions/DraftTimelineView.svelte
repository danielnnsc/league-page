<script>
	import DraftTransaction from './DraftTransaction.svelte';
	import Pagination from '../Pagination.svelte';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let drafts, players, leagueTeamManagers, selectedTeam, selectedSeason, query;
	export let perPage = 20;

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
						if ((round + 1) % 2 === 0) {
							pickNumber = row.length - col;
						} else {
							pickNumber = col + 1;
						}
					} else {
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
	$: paginatedPicks = sortedPicks.slice(page * perPage, (page + 1) * perPage);

	// Group picks by year and round for timeline display
	const groupByYearAndRound = (picks) => {
		const groups = {};
		for (const pick of picks) {
			const yearKey = pick.year;
			const roundKey = pick.round;
			if (!groups[yearKey]) {
				groups[yearKey] = {};
			}
			if (!groups[yearKey][roundKey]) {
				groups[yearKey][roundKey] = [];
			}
			groups[yearKey][roundKey].push(pick);
		}
		return groups;
	}

	$: groupedPicks = groupByYearAndRound(paginatedPicks);
	$: years = Object.keys(groupedPicks).sort((a, b) => b - a);

	// Reset page when filters change
	$: {
		selectedTeam;
		selectedSeason;
		query;
		page = 0;
	}

	$: top = el?.getBoundingClientRect() ? el.getBoundingClientRect().top : 0;

	const getRoundLabel = (round, draftType) => {
		if (draftType === 'auction') {
			return `Pick Group ${round}`;
		}
		return `Round ${round}`;
	}
</script>

<style>
	.timelineWrapper {
		width: 100%;
		margin: 1em 0;
		padding: 0 15px;
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

	.yearSection {
		margin-bottom: 2em;
	}

	.yearHeader {
		display: flex;
		align-items: center;
		gap: 0.75em;
		margin-bottom: 1em;
		padding-bottom: 0.5em;
		border-bottom: 3px solid var(--blueOne);
	}

	.yearLabel {
		font-size: 1.2em;
		font-weight: 700;
		color: var(--blueOne);
	}

	.yearMeta {
		font-size: 0.85em;
		color: var(--g999);
	}

	.timeline {
		position: relative;
		padding-left: 2em;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 8px;
		top: 0;
		bottom: 0;
		width: 2px;
		background: linear-gradient(to bottom, var(--blueOne), var(--blueTwo));
		border-radius: 1px;
	}

	.roundGroup {
		position: relative;
		margin-bottom: 1.5em;
	}

	.roundMarker {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 0.5em;
		margin-left: -1.5em;
	}

	.roundDot {
		width: 14px;
		height: 14px;
		background-color: var(--blueTwo);
		border: 3px solid var(--fff);
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--blueTwo);
		flex-shrink: 0;
	}

	.roundLabel {
		font-size: 0.9em;
		font-weight: 600;
		color: var(--g333);
		white-space: nowrap;
		background-color: var(--fff);
		padding: 0.25em 0.75em;
		border-radius: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.roundPicks {
		display: flex;
		flex-direction: column;
		padding-top: 0.25em;
	}

	@media (max-width: 600px) {
		.timeline {
			padding-left: 1.5em;
		}

		.timeline::before {
			left: 6px;
		}

		.roundMarker {
			margin-left: -1.25em;
		}

		.roundDot {
			width: 12px;
			height: 12px;
		}

		.roundLabel {
			font-size: 0.85em;
			padding: 0.2em 0.5em;
		}
	}
</style>

<div class="timelineWrapper" bind:this={el}>
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

		{#each years as year}
			<div class="yearSection">
				<div class="yearHeader">
					<span class="yearLabel">{year} Draft</span>
					<span class="yearMeta">
						{Object.values(groupedPicks[year]).flat().length} picks shown
					</span>
				</div>

				<div class="timeline">
					{#each Object.keys(groupedPicks[year]).sort((a, b) => a - b) as round}
						<div class="roundGroup">
							<div class="roundMarker">
								<div class="roundDot"></div>
								<span class="roundLabel">
									{getRoundLabel(parseInt(round), groupedPicks[year][round][0]?.draftType)}
									<span style="color: var(--g999); font-weight: normal;">({groupedPicks[year][round].length} picks)</span>
								</span>
							</div>
							<div class="roundPicks">
								{#each groupedPicks[year][round] as pick}
									<DraftTransaction {pick} {players} {leagueTeamManagers} year={pick.year} />
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<Pagination {perPage} total={totalPicks} bind:page={page} target={top} scroll={true} />
	{/if}
</div>
