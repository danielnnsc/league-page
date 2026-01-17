<script>
	import { Row, Cell } from '@smui/data-table';
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

	const getPlayerInfo = (playerId) => {
		if (!players[playerId]) return '';
		const p = players[playerId];
		return p.t ? `${p.pos} - ${p.t}` : p.pos;
	}

	const getTransactionDetails = (transaction) => {
		const details = [];

		for (const move of transaction.moves) {
			// Find the destination index (team receiving this asset)
			let destIndex = -1;
			for (let i = 0; i < move.length; i++) {
				if (move[i] && move[i] !== 'origin' && (move[i].player || move[i].pick || move[i].budget)) {
					destIndex = i;
					break;
				}
			}

			for (let i = 0; i < move.length; i++) {
				const col = move[i];
				if (!col || col === 'origin') continue;

				if (col.player) {
					const playerName = getPlayerName(col.player);
					if (col.type === 'Added') {
						details.push({ type: 'add', text: playerName, bid: col.bid, teamIndex: destIndex });
					} else if (col.type === 'Dropped') {
						details.push({ type: 'drop', text: playerName, teamIndex: destIndex });
					} else if (col.type === 'trade') {
						details.push({ type: 'trade', text: playerName, teamIndex: destIndex });
					}
				} else if (col.pick) {
					const pickText = col.pick.original_owner
						? `${col.pick.season} Round ${col.pick.round} (from ${getTeamFromTeamManagers(leagueTeamManagers, col.pick.original_owner, transaction.season).name})`
						: `${col.pick.season} Round ${col.pick.round}`;
					details.push({ type: 'pick', text: pickText, teamIndex: destIndex });
				} else if (col.budget) {
					details.push({ type: 'budget', text: `$${col.budget.amount} FAAB`, teamIndex: destIndex });
				}
			}
		}

		return details;
	}

	const getTeams = (transaction) => {
		return transaction.rosters.map(rosterID =>
			getTeamFromTeamManagers(leagueTeamManagers, rosterID, transaction.season)
		);
	}

	$: details = getTransactionDetails(transaction);
	$: teams = getTeams(transaction);

	const formatDate = (dateStr) => {
		const parts = dateStr.split(', ');
		return parts[0];
	}
</script>

<style>
	:global(.compactRow) {
		cursor: pointer;
	}

	:global(.compactRow:hover) {
		background-color: var(--f5f5) !important;
	}

	.typeCell {
		text-transform: capitalize;
		font-weight: 500;
	}

	.trade {
		color: var(--blueOne);
	}

	.waiver {
		color: var(--blueTwo);
	}

	.teamsCell {
		display: flex;
		align-items: center;
		gap: 0.25em;
		flex-wrap: wrap;
	}

	.teamChip {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.15em 0.5em 0.15em 0.15em;
		background-color: var(--f5f5);
		border-radius: 16px;
		font-size: 0.85em;
	}

	.teamAvatar {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--ddd);
	}

	.detailsCell {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
	}

	.detailChip {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		font-size: 0.8em;
	}

	.add {
		background-color: rgba(0, 206, 184, 0.15);
		color: #00a894;
	}

	.drop {
		background-color: rgba(255, 42, 109, 0.15);
		color: #ff2a6d;
	}

	.tradeDetail {
		background-color: rgba(0, 130, 195, 0.15);
		color: var(--blueOne);
	}

	.pick {
		background-color: rgba(156, 39, 176, 0.15);
		color: #9c27b0;
	}

	.budget {
		background-color: rgba(255, 152, 0, 0.15);
		color: #f57c00;
	}

	.bid {
		font-weight: 700;
		color: #fff;
		background-color: #f57c00;
		padding: 0.15em 0.4em;
		border-radius: 3px;
		margin-left: 0.25em;
	}

	.dateCell {
		color: var(--g555);
		font-size: 0.9em;
		white-space: nowrap;
	}

	.competingBids {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		margin-left: 0.5em;
		padding: 0.2em 0.5em;
		background-color: rgba(245, 124, 0, 0.1);
		border: 1px solid rgba(245, 124, 0, 0.3);
		border-radius: 4px;
		font-size: 0.75em;
		color: #f57c00;
	}

	.competingBids i {
		font-size: 12px;
	}

	.bidsList {
		display: inline-flex;
		gap: 0.3em;
		margin-left: 0.25em;
	}

	.miniBid {
		display: inline-flex;
		align-items: center;
		gap: 0.15em;
	}

	.miniBid img {
		width: 14px;
		height: 14px;
		border-radius: 50%;
	}

	@media (max-width: 600px) {
		.teamChip span {
			display: none;
		}

		.bidsList {
			display: none;
		}
	}
</style>

<Row class="compactRow" on:click={() => gotoManager({ year: transaction.season, leagueTeamManagers, rosterID: transaction.rosters[0] })}>
	<Cell class="dateCell">{formatDate(transaction.date)}</Cell>
	<Cell>
		<span class="typeCell {transaction.type}">{transaction.type}</span>
	</Cell>
	<Cell>
		<div class="teamsCell">
			{#each teams as team, i}
				<span class="teamChip" style="{transaction.type === 'trade' ? `border: 1px solid ${getTeamColor(i)};` : ''}">
					<img class="teamAvatar" style="border-color: {transaction.type === 'trade' ? getTeamColor(i) : 'var(--ddd)'};" src={team.avatar} alt="{team.name} avatar" />
					<span style="{transaction.type === 'trade' ? `color: ${getTeamColor(i)}; font-weight: 600;` : ''}">{team.name}</span>
				</span>
			{/each}
		</div>
	</Cell>
	<Cell>
		<div class="detailsCell">
			{#each details.slice(0, 4) as detail}
				{#if transaction.type === 'trade' && detail.teamIndex >= 0}
					<span class="detailChip" style="background-color: {getTeamColor(detail.teamIndex)}22; color: {getTeamColor(detail.teamIndex)}; border: 1px solid {getTeamColor(detail.teamIndex)}40;">
						<i class="material-icons" style="font-size: 14px;">swap_horiz</i>
						{detail.text}
					</span>
				{:else}
					<span class="detailChip {detail.type === 'add' ? 'add' : detail.type === 'drop' ? 'drop' : detail.type === 'trade' ? 'tradeDetail' : detail.type === 'pick' ? 'pick' : 'budget'}">
						{#if detail.type === 'add'}
							<i class="material-icons" style="font-size: 14px;">add_circle</i>
						{:else if detail.type === 'drop'}
							<i class="material-icons" style="font-size: 14px;">remove_circle</i>
						{:else if detail.type === 'trade'}
							<i class="material-icons" style="font-size: 14px;">swap_horiz</i>
						{:else if detail.type === 'pick'}
							<i class="material-icons" style="font-size: 14px;">emoji_events</i>
						{:else if detail.type === 'budget'}
							<i class="material-icons" style="font-size: 14px;">attach_money</i>
						{/if}
						{detail.text}
						{#if detail.bid}
							<span class="bid">(${detail.bid})</span>
						{/if}
					</span>
				{/if}
			{/each}
			{#if details.length > 4}
				<span class="detailChip tradeDetail">+{details.length - 4} more</span>
			{/if}
			{#if transaction.competingBids && transaction.competingBids.length > 0}
				<span class="competingBids">
					<i class="material-icons">gavel</i>
					{transaction.competingBids.length} other bid{transaction.competingBids.length > 1 ? 's' : ''}
					<span class="bidsList">
						{#each transaction.competingBids.slice(0, 3) as bid}
							<span class="miniBid">
								<img src="{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).avatar}" alt="team" />
								${bid.bid}
							</span>
						{/each}
					</span>
				</span>
			{/if}
		</div>
	</Cell>
</Row>
