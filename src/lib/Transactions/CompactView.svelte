<script>
	import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
	import CompactTransactionRow from './CompactTransactionRow.svelte';
	import Pagination from '../Pagination.svelte';

	export let transactions, players, leagueTeamManagers, perPage = 25;

	let page = 0;
	let el;

	$: totalTransactions = transactions.length;
	$: displayTransactions = transactions.slice(page * perPage, (page + 1) * perPage);
	$: top = el?.getBoundingClientRect() ? el?.getBoundingClientRect().top : 0;
</script>

<style>
	.compactViewWrapper {
		width: 100%;
		overflow-x: auto;
		margin: 1em 0;
	}

	:global(.compactTable) {
		width: 100%;
		min-width: 700px;
	}

	:global(.compactTable .mdc-data-table__header-cell) {
		font-weight: 600;
		color: var(--g333);
		background-color: var(--f5f5);
	}

	.dateCol {
		width: 100px;
	}

	.typeCol {
		width: 80px;
	}

	.teamsCol {
		width: 200px;
	}

	.detailsCol {
		min-width: 300px;
	}
</style>

<div class="compactViewWrapper" bind:this={el}>
	<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={false} />

	<DataTable table$aria-label="Transactions" class="compactTable">
		<Head>
			<Row>
				<Cell class="dateCol">Date</Cell>
				<Cell class="typeCol">Type</Cell>
				<Cell class="teamsCol">Teams</Cell>
				<Cell class="detailsCol">Details</Cell>
			</Row>
		</Head>
		<Body>
			{#each displayTransactions as transaction (transaction.id)}
				<CompactTransactionRow {transaction} {players} {leagueTeamManagers} />
			{/each}
		</Body>
	</DataTable>

	<Pagination {perPage} total={totalTransactions} bind:page={page} target={top} scroll={true} />
</div>
