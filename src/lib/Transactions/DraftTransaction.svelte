<script>
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let pick, players, leagueTeamManagers, year;

	$: player = players[pick.player];
	$: team = getTeamFromTeamManagers(leagueTeamManagers, pick.rosterID, year);

	const getAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png)`;
		}
		return `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`;
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
	.draftTransaction {
		display: flex;
		align-items: center;
		gap: 1em;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 0.75em 1em;
		margin-bottom: 0.5em;
	}

	.pickNumber {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 50px;
		padding: 0.5em;
		background-color: var(--f5f5);
		border-radius: 6px;
	}

	.round {
		font-size: 0.7em;
		color: var(--g999);
		text-transform: uppercase;
	}

	.pick {
		font-size: 1.1em;
		font-weight: 600;
		color: var(--g333);
	}

	.playerInfo {
		display: flex;
		align-items: center;
		gap: 0.75em;
		flex: 1;
	}

	.playerAvatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-size: cover;
		background-position: center;
		background-color: var(--eee);
		flex-shrink: 0;
	}

	.playerDetails {
		flex: 1;
	}

	.playerName {
		font-weight: 500;
		font-size: 0.95em;
		color: var(--g000);
	}

	.playerMeta {
		font-size: 0.8em;
		color: var(--g999);
	}

	.positionBadge {
		display: inline-block;
		padding: 0.15em 0.4em;
		border-radius: 3px;
		font-size: 0.75em;
		font-weight: 600;
		margin-right: 0.3em;
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

	.teamInfo {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.teamAvatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
	}

	.teamName {
		font-size: 0.85em;
		color: var(--g555);
	}

	.amount {
		font-weight: 700;
		color: #00a894;
		font-size: 0.95em;
		background-color: rgba(0, 168, 148, 0.1);
		padding: 0.3em 0.6em;
		border-radius: 4px;
	}

	@media (max-width: 500px) {
		.draftTransaction {
			flex-wrap: wrap;
			gap: 0.75em;
		}

		.teamInfo {
			width: 100%;
			padding-top: 0.5em;
			border-top: 1px solid var(--eee);
		}

		.teamName {
			flex: 1;
		}
	}
</style>

<div class="draftTransaction">
	<div class="pickNumber">
		<span class="round">Rd {pick.round}</span>
		<span class="pick">{pick.pickNumber}</span>
	</div>

	<div class="playerInfo">
		{#if player}
			<div class="playerAvatar" style="{getAvatar(player.pos, pick.player)}"></div>
			<div class="playerDetails">
				<div class="playerName">{player.fn} {player.ln}</div>
				<div class="playerMeta">
					<span class="positionBadge {getPosClass(player.pos)}">{player.pos}</span>
					{#if player.t}
						{player.t}
					{/if}
				</div>
			</div>
		{:else}
			<div class="playerAvatar"></div>
			<div class="playerDetails">
				<div class="playerName">Unknown Player</div>
			</div>
		{/if}
	</div>

	<div class="teamInfo">
		<img class="teamAvatar" src={team.avatar} alt="{team.name} avatar" />
		<span class="teamName">{team.name}</span>
	</div>

	{#if pick.amount}
		<span class="amount">${pick.amount}</span>
	{/if}
</div>
