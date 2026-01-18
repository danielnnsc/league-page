<script>
	import { Row, Cell } from '@smui/data-table';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let pick, players, leagueTeamManagers;

	$: player = players[pick.player];
	$: team = getTeamFromTeamManagers(leagueTeamManagers, pick.rosterID, pick.year);

	const getAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	}

	const getPosClass = (pos) => {
		const posClasses = {
			'QB': 'posQB',
			'RB': 'posRB',
			'WR': 'posWR',
			'TE': 'posTE',
			'K': 'posK',
			'DEF': 'posDEF'
		};
		return posClasses[pos] || '';
	}
</script>

<style>
	:global(.draftCompactRow) {
		cursor: default;
	}

	:global(.draftCompactRow:hover) {
		background-color: var(--f5f5) !important;
	}

	.pickCell {
		font-weight: 600;
		color: var(--g555);
	}

	.playerCell {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.playerAvatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
		background-color: var(--eee);
	}

	.playerInfo {
		display: flex;
		flex-direction: column;
	}

	.playerName {
		font-weight: 500;
		font-size: 0.9em;
	}

	.playerMeta {
		font-size: 0.75em;
		color: var(--g999);
	}

	.positionBadge {
		display: inline-block;
		padding: 0.1em 0.3em;
		border-radius: 3px;
		font-size: 0.7em;
		font-weight: 600;
		margin-right: 0.25em;
	}

	.posQB {
		background-color: var(--QBfade);
		color: #9c27b0;
	}

	.posRB {
		background-color: var(--RBfade);
		color: #00b0b0;
	}

	.posWR {
		background-color: var(--WRfade);
		color: #0066cc;
	}

	.posTE {
		background-color: var(--TEfade);
		color: #cc6600;
	}

	.posK {
		background-color: var(--Kfade);
		color: #666;
	}

	.posDEF {
		background-color: var(--DEFfade);
		color: #663399;
	}

	.teamCell {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	.teamAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.teamName {
		font-size: 0.85em;
	}

	.amountCell {
		font-weight: 600;
		color: #00a894;
	}

	.yearCell {
		color: var(--g555);
		font-size: 0.9em;
	}
</style>

<Row class="draftCompactRow">
	<Cell class="yearCell">{pick.year}</Cell>
	<Cell class="pickCell">Rd {pick.round}, Pick {pick.pickNumber}</Cell>
	<Cell>
		<div class="playerCell">
			{#if player}
				<img class="playerAvatar" src="{getAvatar(player.pos, pick.player)}" alt="{player.fn} {player.ln}" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'" />
				<div class="playerInfo">
					<span class="playerName">{player.fn} {player.ln}</span>
					<span class="playerMeta">
						<span class="positionBadge {getPosClass(player.pos)}">{player.pos}</span>
						{#if player.t}{player.t}{/if}
					</span>
				</div>
			{:else}
				<span class="playerName">Unknown Player</span>
			{/if}
		</div>
	</Cell>
	<Cell>
		<div class="teamCell">
			<img class="teamAvatar" src={team.avatar} alt="{team.name}" />
			<span class="teamName">{team.name}</span>
		</div>
	</Cell>
	{#if pick.amount !== null && pick.amount !== undefined}
		<Cell class="amountCell">${pick.amount}</Cell>
	{:else}
		<Cell></Cell>
	{/if}
</Row>
