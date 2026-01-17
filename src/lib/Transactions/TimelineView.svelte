<script>
	import TimelineTransaction from './TimelineTransaction.svelte';
	import Pagination from '../Pagination.svelte';

	export let transactions, players, leagueTeamManagers, perPage = 20;

	let page = 0;
	let el;

	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

	// NFL season start dates (first Thursday of September after Labor Day)
	const seasonStarts = {
		2020: new Date(2020, 8, 10), // Sept 10, 2020
		2021: new Date(2021, 8, 9),  // Sept 9, 2021
		2022: new Date(2022, 8, 8),  // Sept 8, 2022
		2023: new Date(2023, 8, 7),  // Sept 7, 2023
		2024: new Date(2024, 8, 5),  // Sept 5, 2024
		2025: new Date(2025, 8, 4),  // Sept 4, 2025
		2026: new Date(2026, 8, 10), // Sept 10, 2026
	};

	// Parse date string like "Jan 15 2024" to Date object
	const parseDate = (dateStr) => {
		const parts = dateStr.split(' ');
		const month = months[parts[0]];
		const day = parseInt(parts[1]);
		const year = parseInt(parts[2]);
		return new Date(year, month, day);
	}

	// Get day of week from date string
	const getDayOfWeek = (dateStr) => {
		const date = parseDate(dateStr);
		return days[date.getDay()];
	}

	// Calculate fantasy week from date
	const getFantasyWeek = (dateStr) => {
		const date = parseDate(dateStr);
		const year = date.getFullYear();

		// Determine which season this date belongs to
		// If before September, it's the previous year's season (offseason)
		// If after September, it's the current year's season
		let seasonYear = year;
		if (date.getMonth() < 8) { // Before September
			seasonYear = year - 1;
		}

		const seasonStart = seasonStarts[seasonYear];
		if (!seasonStart) return null;

		const diffTime = date - seasonStart;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			return 'Offseason';
		}

		const week = Math.floor(diffDays / 7) + 1;

		if (week > 18) {
			return 'Playoffs';
		}

		return `Wk ${week}`;
	}

	// Group transactions by date
	const groupByDate = (txns) => {
		const groups = {};
		for (const txn of txns) {
			const dateKey = txn.date.split(',')[0]; // "Jan 15 2024"
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(txn);
		}
		return groups;
	}

	// Get paginated transactions and group them
	$: totalTransactions = transactions.length;
	$: paginatedTransactions = transactions.slice(page * perPage, (page + 1) * perPage);
	$: groupedTransactions = groupByDate(paginatedTransactions);
	$: dateKeys = Object.keys(groupedTransactions);
	$: top = el?.getBoundingClientRect() ? el?.getBoundingClientRect().top : 0;
</script>

<style>
	.timelineWrapper {
		width: 100%;
		margin: 1em 0;
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

	.dateGroup {
		position: relative;
		margin-bottom: 1.5em;
	}

	.dateMarker {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 0.5em;
		margin-left: -1.5em;
	}

	.dateDot {
		width: 14px;
		height: 14px;
		background-color: var(--blueOne);
		border: 3px solid var(--fff);
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--blueOne);
		flex-shrink: 0;
	}

	.dateLabel {
		font-size: 0.9em;
		font-weight: 600;
		color: var(--g333);
		white-space: nowrap;
		background-color: var(--fff);
		padding: 0.25em 0.75em;
		border-radius: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.dayOfWeek {
		color: var(--blueOne);
		font-weight: 700;
		margin-right: 0.25em;
	}

	.fantasyWeek {
		background-color: var(--blueOne);
		color: #fff;
		font-weight: 600;
		font-size: 0.85em;
		padding: 0.15em 0.5em;
		border-radius: 3px;
		margin-left: 0.5em;
	}

	.fantasyWeek.offseason {
		background-color: var(--g999);
	}

	.fantasyWeek.playoffs {
		background-color: #9c27b0;
	}

	.dateTransactions {
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

		.dateMarker {
			margin-left: -1.25em;
		}

		.dateDot {
			width: 12px;
			height: 12px;
		}

		.dateLabel {
			font-size: 0.85em;
			padding: 0.2em 0.5em;
		}
	}
</style>

<div class="timelineWrapper" bind:this={el}>
	<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={false} />

	<div class="timeline">
		{#each dateKeys as dateKey}
			<div class="dateGroup">
				<div class="dateMarker">
					<div class="dateDot"></div>
					<span class="dateLabel">
						<span class="dayOfWeek">{getDayOfWeek(dateKey)}</span>
						{dateKey}
						{#if getFantasyWeek(dateKey)}
							<span class="fantasyWeek" class:offseason={getFantasyWeek(dateKey) === 'Offseason'} class:playoffs={getFantasyWeek(dateKey) === 'Playoffs'}>{getFantasyWeek(dateKey)}</span>
						{/if}
					</span>
				</div>
				<div class="dateTransactions">
					{#each groupedTransactions[dateKey] as transaction (transaction.id)}
						<TimelineTransaction {transaction} {players} {leagueTeamManagers} />
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={true} />
</div>
