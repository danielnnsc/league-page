<script>
	import { getAllHeadToHeadRecords } from '$lib/utils/helper';
	import LinearProgress from '@smui/linear-progress';
	import { onMount, createEventDispatcher } from 'svelte';

	export let leagueTeamManagers;

	const dispatch = createEventDispatcher();

	let loading = true;
	let h2hData = null;
	let allManagers = []; // All managers with games
	let hiddenManagers = new Set(); // Managers to hide
	let showFilterMenu = false;
	let gameFilter = 'all'; // 'all', 'regular', 'playoffs'

	onMount(async () => {
		h2hData = await getAllHeadToHeadRecords();
		updateManagerList();
		loading = false;
	});

	// Get the current matrix based on filter
	$: currentMatrix = h2hData ? getMatrixForFilter(gameFilter) : null;

	const getMatrixForFilter = (filter) => {
		if (!h2hData) return null;
		switch (filter) {
			case 'regular':
				return h2hData.regularSeasonMatrix;
			case 'playoffs':
				return h2hData.playoffsMatrix;
			default:
				return h2hData.matrix;
		}
	};

	// Update manager list when filter changes
	$: if (h2hData && gameFilter) {
		updateManagerList();
	}

	const updateManagerList = () => {
		if (!h2hData) return;
		const matrix = getMatrixForFilter(gameFilter);

		allManagers = h2hData.managerIDs
			.filter(id => h2hData.teamManagers.users[id])
			.map(id => {
				const totalWins = Object.values(matrix[id] || {})
					.reduce((sum, record) => sum + record.wins, 0);
				const totalLosses = Object.values(matrix[id] || {})
					.reduce((sum, record) => sum + record.losses, 0);
				const totalTies = Object.values(matrix[id] || {})
					.reduce((sum, record) => sum + record.ties, 0);
				const totalGames = totalWins + totalLosses + totalTies;
				return { id, totalWins, totalLosses, totalGames };
			})
			.filter(m => m.totalGames > 0)
			.sort((a, b) => {
				const aWinPct = a.totalWins / (a.totalWins + a.totalLosses) || 0;
				const bWinPct = b.totalWins / (b.totalWins + b.totalLosses) || 0;
				if (bWinPct !== aWinPct) return bWinPct - aWinPct;
				return b.totalWins - a.totalWins;
			});
	};

	// Filter out hidden managers reactively
	$: sortedManagers = allManagers
		.filter(m => !hiddenManagers.has(m.id))
		.map(m => m.id);

	const toggleHideManager = (managerId) => {
		if (hiddenManagers.has(managerId)) {
			hiddenManagers.delete(managerId);
		} else {
			hiddenManagers.add(managerId);
		}
		hiddenManagers = hiddenManagers; // Trigger reactivity
	};

	const toggleFilterMenu = () => {
		showFilterMenu = !showFilterMenu;
	};

	const getManagerName = (managerID) => {
		const user = h2hData?.teamManagers?.users[managerID];
		return user?.display_name || user?.user_name || 'Unknown';
	};

	const getManagerAvatar = (managerID) => {
		const user = h2hData?.teamManagers?.users[managerID];
		if (!user) return '/managers/question.png';
		// Check metadata.avatar first (full URL), then user.avatar (hash)
		if (user.metadata?.avatar) {
			return user.metadata.avatar;
		}
		if (user.avatar) {
			return `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;
		}
		return '/managers/question.png';
	};

	const getRecord = (m1, m2) => {
		if (m1 === m2) return null;
		return currentMatrix?.[m1]?.[m2] || { wins: 0, losses: 0, ties: 0 };
	};

	const formatRecord = (record) => {
		if (!record) return '-';
		if (record.ties > 0) {
			return `${record.wins}-${record.losses}-${record.ties}`;
		}
		return `${record.wins}-${record.losses}`;
	};

	const getRecordClass = (record) => {
		if (!record) return '';
		if (record.wins > record.losses) return 'winning';
		if (record.losses > record.wins) return 'losing';
		return 'even';
	};

	const selectRivalry = (m1, m2) => {
		if (m1 !== m2) {
			dispatch('selectRivalry', { playerOne: m1, playerTwo: m2 });
		}
	};
</script>

<style>
	.matrixContainer {
		width: 100%;
		overflow-x: auto;
		margin: 1em 0;
	}

	.matrix {
		border-collapse: collapse;
		font-size: 0.85em;
		min-width: 100%;
	}

	.matrix th,
	.matrix td {
		border: 1px solid var(--ddd);
		padding: 0.4em;
		text-align: center;
		white-space: nowrap;
	}

	.matrix th {
		background-color: var(--f5f5);
		font-weight: 500;
	}

	.cornerCell {
		background-color: var(--rivalryBack, #eaeaea) !important;
		border: none !important;
		position: sticky;
		left: 0;
		z-index: 2;
	}

	.headerCell {
		min-width: 70px;
		max-width: 100px;
	}

	.headerCell.vertical {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		transform: rotate(180deg);
		height: 100px;
		padding: 0.5em 0.25em;
	}

	.rowHeader {
		text-align: left !important;
		padding-left: 0.5em !important;
		background-color: var(--f5f5) !important;
		position: sticky;
		left: 0;
		z-index: 1;
		box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
	}

	.managerInfo {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	.managerAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.managerName {
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.recordCell {
		cursor: pointer;
		transition: background-color 0.15s ease;
		min-width: 55px;
	}

	.recordCell:hover {
		background-color: var(--eee);
	}

	.recordCell.self {
		background-color: var(--g333);
		cursor: default;
	}

	.recordCell.winning {
		background-color: rgba(0, 206, 184, 0.15);
		color: #00a894;
		font-weight: 600;
	}

	.recordCell.losing {
		background-color: rgba(255, 42, 109, 0.15);
		color: #ff2a6d;
	}

	.recordCell.even {
		background-color: rgba(245, 158, 11, 0.15);
		color: #d97706;
	}

	.loading {
		display: block;
		width: 85%;
		max-width: 500px;
		margin: 40px auto;
	}

	.noData {
		text-align: center;
		color: var(--g999);
		font-style: italic;
		padding: 2em;
	}

	.gameTypeToggles {
		display: flex;
		justify-content: center;
		gap: 0.5em;
		margin-bottom: 1em;
	}

	.gameTypeButton {
		padding: 0.5em 1em;
		background-color: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85em;
		color: var(--g555);
		transition: all 0.15s ease;
	}

	.gameTypeButton:hover {
		background-color: var(--f5f5);
		border-color: var(--aaa);
	}

	.gameTypeButton.active {
		background-color: var(--blueOne);
		border-color: var(--blueOne);
		color: white;
	}

	.filterControls {
		position: relative;
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.75em;
	}

	.filterButton {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.5em 0.75em;
		background-color: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85em;
		color: var(--g555);
		transition: all 0.15s ease;
	}

	.filterButton:hover {
		background-color: var(--f5f5);
		border-color: var(--aaa);
	}

	.filterButton i {
		font-size: 18px;
	}

	.hiddenCount {
		color: var(--blueOne);
		font-weight: 500;
	}

	.filterMenu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.25em;
		background-color: var(--fff);
		border: 1px solid var(--ddd);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		min-width: 220px;
		max-height: 300px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.filterHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75em 1em;
		border-bottom: 1px solid var(--eee);
		font-weight: 500;
		font-size: 0.9em;
	}

	.closeFilter {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25em;
		display: flex;
		color: var(--g555);
	}

	.closeFilter:hover {
		color: var(--g333);
	}

	.filterList {
		overflow-y: auto;
		padding: 0.5em;
	}

	.filterItem {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.5em;
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.15s ease;
	}

	.filterItem:hover {
		background-color: var(--f5f5);
	}

	.filterItem input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.filterAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.filterName {
		font-size: 0.9em;
	}

	@media (max-width: 600px) {
		.matrix {
			font-size: 0.75em;
		}

		.managerAvatar {
			width: 20px;
			height: 20px;
		}

		.managerName {
			max-width: 60px;
		}

		.headerCell.vertical {
			height: 80px;
		}
	}
</style>

{#if loading}
	<div class="loading">
		<p>Loading head-to-head records...</p>
		<LinearProgress indeterminate />
	</div>
{:else if allManagers.length < 2}
	<p class="noData">Not enough managers to display head-to-head records</p>
{:else}
	<!-- Game Type Toggles -->
	<div class="gameTypeToggles">
		<button
			class="gameTypeButton"
			class:active={gameFilter === 'all'}
			on:click={() => gameFilter = 'all'}
		>
			All Games
		</button>
		<button
			class="gameTypeButton"
			class:active={gameFilter === 'regular'}
			on:click={() => gameFilter = 'regular'}
		>
			Regular Season
		</button>
		<button
			class="gameTypeButton"
			class:active={gameFilter === 'playoffs'}
			on:click={() => gameFilter = 'playoffs'}
		>
			Playoffs
		</button>
	</div>

	<!-- Filter Controls -->
	<div class="filterControls">
		<button class="filterButton" on:click={toggleFilterMenu}>
			<i class="material-icons">filter_list</i>
			<span>Filter Managers</span>
			{#if hiddenManagers.size > 0}
				<span class="hiddenCount">({hiddenManagers.size} hidden)</span>
			{/if}
		</button>

		{#if showFilterMenu}
			<div class="filterMenu">
				<div class="filterHeader">
					<span>Show/Hide Managers</span>
					<button class="closeFilter" on:click={toggleFilterMenu}>
						<i class="material-icons">close</i>
					</button>
				</div>
				<div class="filterList">
					{#each allManagers as manager}
						<label class="filterItem">
							<input
								type="checkbox"
								checked={!hiddenManagers.has(manager.id)}
								on:change={() => toggleHideManager(manager.id)}
							/>
							<img class="filterAvatar" src={getManagerAvatar(manager.id)} alt="" on:error={(e) => e.target.src = '/managers/question.png'} />
							<span class="filterName">{getManagerName(manager.id)}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if sortedManagers.length < 2}
		<p class="noData">Select at least 2 managers to display</p>
	{:else}
	<div class="matrixContainer">
		<table class="matrix">
			<thead>
				<tr>
					<th class="cornerCell"></th>
					{#each sortedManagers as colManager}
						<th class="headerCell vertical">
							<span>{getManagerName(colManager)}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sortedManagers as rowManager}
					<tr>
						<th class="rowHeader">
							<div class="managerInfo">
								<img class="managerAvatar" src={getManagerAvatar(rowManager)} alt="" on:error={(e) => e.target.src = '/managers/question.png'} />
								<span class="managerName">{getManagerName(rowManager)}</span>
							</div>
						</th>
						{#each sortedManagers as colManager}
							{@const record = getRecord(rowManager, colManager)}
							<td
								class="recordCell {rowManager === colManager ? 'self' : getRecordClass(record)}"
								on:click={() => selectRivalry(rowManager, colManager)}
							>
								{formatRecord(record)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{/if}
{/if}
