<script>
	import { gotoManager } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let transaction, players, leagueTeamManagers;

	// Color scheme for multi-team trades
	const teamColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
	const getTeamColor = (index) => teamColors[index % teamColors.length];

	const getPlayerName = (playerId) => {
		if (!players[playerId]) return 'Unknown';
		return `${players[playerId].fn} ${players[playerId].ln}`;
	}

	const getAvatar = (pos, player) => {
		if (pos === 'DEF') {
			return `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${player.toLowerCase()}.png)`;
		}
		return `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${player}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`;
	}

	const getTransactionSummary = (transaction) => {
		const items = [];

		for (const move of transaction.moves) {
			for (const col of move) {
				if (!col || col === 'origin') continue;

				if (col.player) {
					const p = players[col.player];
					items.push({
						type: col.type === 'Added' ? 'add' : col.type === 'Dropped' ? 'drop' : 'trade',
						playerId: col.player,
						name: getPlayerName(col.player),
						pos: p?.pos || '',
						bid: col.bid
					});
				} else if (col.pick) {
					items.push({
						type: 'pick',
						name: `${col.pick.season} Rd ${col.pick.round}`,
						originalOwner: col.pick.original_owner
							? getTeamFromTeamManagers(leagueTeamManagers, col.pick.original_owner, transaction.season).name
							: null
					});
				} else if (col.budget) {
					items.push({
						type: 'budget',
						name: `$${col.budget.amount} FAAB`
					});
				}
			}
		}

		return items;
	}

	$: summary = getTransactionSummary(transaction);
	$: teams = transaction.rosters.map(rosterID =>
		getTeamFromTeamManagers(leagueTeamManagers, rosterID, transaction.season)
	);

	const formatTime = (dateStr) => {
		const parts = dateStr.split(', ');
		return parts.length > 1 ? parts[1] : '';
	}
</script>

<style>
	.timelineTransaction {
		display: flex;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 0.75em;
		overflow: hidden;
		cursor: pointer;
		transition: box-shadow 0.2s ease;
	}

	.timelineTransaction:hover {
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.typeIndicator {
		width: 4px;
		flex-shrink: 0;
	}

	.typeIndicator.trade {
		background-color: var(--blueOne);
	}

	.typeIndicator.waiver {
		background-color: var(--blueTwo);
	}

	.content {
		flex: 1;
		padding: 0.75em 1em;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.teams {
		display: flex;
		align-items: center;
		gap: 0.5em;
		flex-wrap: wrap;
	}

	.team {
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.teamAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid;
	}

	.teamName {
		font-size: 0.9em;
		font-weight: 500;
	}

	.teamSeparator {
		color: var(--g999);
		font-size: 0.8em;
	}

	.time {
		font-size: 0.75em;
		color: var(--g999);
	}

	.items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
	}

	.item {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		font-size: 0.8em;
	}

	.item.add {
		background-color: rgba(0, 206, 184, 0.15);
		color: #00a894;
	}

	.item.drop {
		background-color: rgba(255, 42, 109, 0.15);
		color: #ff2a6d;
	}

	.item.trade {
		background-color: rgba(0, 130, 195, 0.15);
		color: var(--blueOne);
	}

	.item.pick {
		background-color: rgba(156, 39, 176, 0.15);
		color: #9c27b0;
	}

	.item.budget {
		background-color: rgba(255, 152, 0, 0.15);
		color: #f57c00;
	}

	.itemIcon {
		font-size: 14px;
	}

	.bid {
		font-weight: 700;
		color: #fff;
		background-color: #f57c00;
		padding: 0.15em 0.4em;
		border-radius: 3px;
		margin-left: 0.25em;
	}

	.pickFrom {
		font-size: 0.75em;
		opacity: 0.8;
	}

	@media (max-width: 500px) {
		.teamName {
			font-size: 0.8em;
		}

		.item {
			font-size: 0.75em;
		}
	}
</style>

<div class="timelineTransaction" on:click={() => gotoManager({ year: transaction.season, leagueTeamManagers, rosterID: transaction.rosters[0] })}>
	<div class="typeIndicator {transaction.type}"></div>
	<div class="content">
		<div class="header">
			<div class="teams">
				{#each teams as team, i}
					{#if i > 0}
						<span class="teamSeparator">{transaction.type === 'trade' ? '↔' : '•'}</span>
					{/if}
					<div class="team">
						<img class="teamAvatar" style="border-color: {transaction.type === 'trade' ? getTeamColor(i) : 'var(--ddd)'};" src={team.avatar} alt="{team.name} avatar" />
						<span class="teamName" style="{transaction.type === 'trade' && teams.length > 2 ? `color: ${getTeamColor(i)};` : ''}">{team.name}</span>
					</div>
				{/each}
			</div>
			<span class="time">{formatTime(transaction.date)}</span>
		</div>
		<div class="items">
			{#each summary.slice(0, 6) as item}
				<span class="item {item.type}">
					{#if item.type === 'add'}
						<i class="material-icons itemIcon">add_circle</i>
					{:else if item.type === 'drop'}
						<i class="material-icons itemIcon">remove_circle</i>
					{:else if item.type === 'trade'}
						<i class="material-icons itemIcon">swap_horiz</i>
					{:else if item.type === 'pick'}
						<i class="material-icons itemIcon">emoji_events</i>
					{:else if item.type === 'budget'}
						<i class="material-icons itemIcon">attach_money</i>
					{/if}
					{item.name}
					{#if item.bid}
						<span class="bid">(${item.bid})</span>
					{/if}
					{#if item.originalOwner}
						<span class="pickFrom">from {item.originalOwner}</span>
					{/if}
				</span>
			{/each}
			{#if summary.length > 6}
				<span class="item trade">+{summary.length - 6} more</span>
			{/if}
		</div>
	</div>
</div>
