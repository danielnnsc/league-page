<script>
	import { getValueColor, getValueTextColor } from '$lib/utils/helper';
	import Pagination from '../Pagination.svelte';

	export let picks = [];
	export let viewMode = 'totalPoints';
	export let hideUnder7Games = false;
	export let perPage = 20;

	let page = 0;
	let sortKey = 'overallPick';
	let sortDirection = 'asc';

	// Filter picks based on settings
	$: filteredPicks = hideUnder7Games
		? picks.filter(p => !p.flagged)
		: picks;

	// Sort picks
	$: sortedPicks = [...filteredPicks].sort((a, b) => {
		let aVal = a[sortKey];
		let bVal = b[sortKey];

		// Handle nulls
		if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
		if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

		if (sortDirection === 'asc') {
			return aVal > bVal ? 1 : -1;
		} else {
			return aVal < bVal ? 1 : -1;
		}
	});

	// Paginate
	$: displayPicks = sortedPicks.slice(page * perPage, (page + 1) * perPage);

	const toggleSort = (key) => {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = key === 'overallPick' ? 'asc' : 'desc';
		}
		page = 0;
	};

	const getSortIcon = (key) => {
		if (sortKey !== key) return 'unfold_more';
		return sortDirection === 'asc' ? 'expand_less' : 'expand_more';
	};

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId?.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	};

	const formatValue = (value) => {
		if (value === null) return '-';
		return value > 0 ? `+${value}` : value.toString();
	};
</script>

<style>
	.tableContainer {
		overflow-x: auto;
		margin: 1em 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85em;
	}

	th, td {
		padding: 0.6em 0.5em;
		text-align: left;
		border-bottom: 1px solid var(--eee);
	}

	th {
		background-color: var(--f5f5);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		user-select: none;
	}

	th:hover {
		background-color: var(--eee);
	}

	th .sortIcon {
		font-size: 16px;
		vertical-align: middle;
		color: var(--g999);
	}

	tr:hover {
		background-color: var(--f5f5);
	}

	.pickNum {
		font-weight: 600;
		color: var(--g555);
		text-align: center;
	}

	.playerCell {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.playerAvatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
	}

	.playerInfo {
		display: flex;
		flex-direction: column;
	}

	.playerName {
		font-weight: 500;
	}

	.playerMeta {
		font-size: 0.85em;
		color: var(--g999);
	}

	.badges {
		display: flex;
		gap: 0.25em;
		margin-left: 0.25em;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		font-size: 12px;
	}

	.badge.sleeper {
		background-color: #fef3c7;
		color: #d97706;
	}

	.badge.bust {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.badge.flagged {
		background-color: #fef3c7;
		color: #d97706;
	}

	.positionBadge {
		display: inline-block;
		padding: 0.15em 0.4em;
		border-radius: 3px;
		font-size: 0.75em;
		font-weight: 600;
		color: #fff;
	}

	.positionBadge.QB { background-color: #ef4444; }
	.positionBadge.RB { background-color: #22c55e; }
	.positionBadge.WR { background-color: #3b82f6; }
	.positionBadge.TE { background-color: #f97316; }
	.positionBadge.K { background-color: #8b5cf6; }
	.positionBadge.DEF { background-color: #6b7280; }

	.draftPos, .actualPos {
		text-align: center;
	}

	.valueCell {
		text-align: center;
		font-weight: 600;
		border-radius: 4px;
		padding: 0.3em 0.5em;
	}

	.pointsCell {
		text-align: right;
		font-weight: 500;
	}

	.gamesCell {
		text-align: center;
	}

	.gradeCell {
		text-align: center;
		font-weight: 700;
		font-size: 1.1em;
	}

	.efficiencyCell {
		text-align: center;
	}

	.efficiency {
		display: inline-block;
		padding: 0.2em 0.4em;
		border-radius: 4px;
		font-size: 0.85em;
	}

	.efficiency.high {
		background-color: rgba(0, 206, 184, 0.15);
		color: #00a894;
	}

	.efficiency.low {
		background-color: rgba(255, 42, 109, 0.15);
		color: #ff2a6d;
	}

	.efficiency.neutral {
		background-color: var(--f5f5);
		color: var(--g555);
	}

	.noData {
		text-align: center;
		padding: 2em;
		color: var(--g999);
		font-style: italic;
	}

	@media (max-width: 768px) {
		table {
			font-size: 0.75em;
		}

		.playerAvatar {
			width: 24px;
			height: 24px;
		}

		th, td {
			padding: 0.4em 0.3em;
		}
	}
</style>

{#if picks.length === 0}
	<p class="noData">No draft data available</p>
{:else}
	<Pagination {perPage} total={filteredPicks.length} bind:page={page} />

	<div class="tableContainer">
		<table>
			<thead>
				<tr>
					<th on:click={() => toggleSort('overallPick')}>
						Pick <i class="material-icons sortIcon">{getSortIcon('overallPick')}</i>
					</th>
					<th>Player</th>
					<th on:click={() => toggleSort('positionalPick')}>
						Pos Pick <i class="material-icons sortIcon">{getSortIcon('positionalPick')}</i>
					</th>
					<th on:click={() => toggleSort('actualOverallRank')}>
						Finish <i class="material-icons sortIcon">{getSortIcon('actualOverallRank')}</i>
					</th>
					<th on:click={() => toggleSort('overallValue')}>
						Value <i class="material-icons sortIcon">{getSortIcon('overallValue')}</i>
					</th>
					<th on:click={() => toggleSort(viewMode)}>
						{viewMode === 'ppg' ? 'PPG' : 'Points'} <i class="material-icons sortIcon">{getSortIcon(viewMode)}</i>
					</th>
					<th on:click={() => toggleSort('gamesPlayed')}>
						GP <i class="material-icons sortIcon">{getSortIcon('gamesPlayed')}</i>
					</th>
					<th on:click={() => toggleSort('gradeValue')}>
						Grade <i class="material-icons sortIcon">{getSortIcon('gradeValue')}</i>
					</th>
					<th on:click={() => toggleSort('efficiency')}>
						Eff <i class="material-icons sortIcon">{getSortIcon('efficiency')}</i>
					</th>
				</tr>
			</thead>
			<tbody>
				{#each displayPicks as pick (pick.playerId + '-' + pick.overallPick)}
					<tr>
						<td class="pickNum">
							{pick.overallPick}
							<span style="font-size: 0.8em; color: var(--g999);">
								(Rd {pick.round})
							</span>
						</td>
						<td>
							<div class="playerCell">
								<img
									class="playerAvatar"
									src={getPlayerAvatar(pick.position, pick.playerId)}
									alt=""
									onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'"
								/>
								<div class="playerInfo">
									<span class="playerName">
										{pick.playerName}
										<span class="badges">
											{#if pick.isSleeper}
												<span class="badge sleeper" title="Sleeper: Late round gem">
													<i class="material-icons" style="font-size: 12px;">star</i>
												</span>
											{/if}
											{#if pick.isBust}
												<span class="badge bust" title="Bust: Early disappointment">
													<i class="material-icons" style="font-size: 12px;">trending_down</i>
												</span>
											{/if}
											{#if pick.flagged && !hideUnder7Games}
												<span class="badge flagged" title="Played fewer than 7 games">
													<i class="material-icons" style="font-size: 12px;">warning</i>
												</span>
											{/if}
										</span>
									</span>
									<span class="playerMeta">
										<span class="positionBadge {pick.position}">{pick.position}</span>
										{pick.team || 'FA'}
									</span>
								</div>
							</div>
						</td>
						<td class="draftPos">
							{pick.position}{pick.positionalPick}
						</td>
						<td class="actualPos">
							{#if pick.actualOverallRank}
								#{pick.actualOverallRank}
								<span style="font-size: 0.8em; color: var(--g999);">
									({pick.position}{pick.actualPositionalRank || '?'})
								</span>
							{:else}
								<span style="color: var(--g999);">-</span>
							{/if}
						</td>
						<td>
							<span
								class="valueCell"
								style="background-color: {getValueColor(pick.overallValue || 0)}; color: {getValueTextColor(pick.overallValue || 0)};"
							>
								{formatValue(pick.overallValue)}
							</span>
						</td>
						<td class="pointsCell">
							{viewMode === 'ppg' ? pick.ppg : pick.totalPoints}
						</td>
						<td class="gamesCell">
							{pick.gamesPlayed}
						</td>
						<td class="gradeCell" style="color: {getValueColor(pick.gradeValue || 0)};">
							{pick.grade}
						</td>
						<td class="efficiencyCell">
							<span class="efficiency {pick.efficiency >= 1.1 ? 'high' : pick.efficiency <= 0.7 ? 'low' : 'neutral'}">
								{pick.efficiency}x
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Pagination {perPage} total={filteredPicks.length} bind:page={page} />
{/if}
