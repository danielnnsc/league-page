<script>
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let transaction, players, leagueTeamManagers;

	// Color scheme for multi-team trades
	const teamColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
	const getTeamColor = (index) => teamColors[index % teamColors.length];

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	};

	// Build trade summary - what each team received
	const buildTradeSummary = () => {
		const summary = {};
		transaction.rosters.forEach((rosterId, idx) => {
			summary[rosterId] = {
				rosterId,
				teamIndex: idx,
				team: getTeamFromTeamManagers(leagueTeamManagers, rosterId, transaction.season),
				received: []
			};
		});

		for (const move of transaction.moves) {
			let destIdx = -1;
			let asset = null;

			for (let i = 0; i < move.length; i++) {
				const col = move[i];
				if (col && col !== 'origin') {
					destIdx = i;
					asset = col;
					break;
				}
			}

			if (asset && destIdx >= 0) {
				const destRosterId = transaction.rosters[destIdx];
				let assetInfo = null;

				if (asset.player) {
					const p = players[asset.player];
					assetInfo = {
						type: 'player',
						playerId: asset.player,
						name: p ? `${p.fn} ${p.ln}` : 'Unknown',
						pos: p?.pos || '',
						team: p?.t || ''
					};
				} else if (asset.pick) {
					assetInfo = {
						type: 'pick',
						text: `${asset.pick.season} Round ${asset.pick.round}`,
						originalOwner: asset.pick.original_owner
							? getTeamFromTeamManagers(leagueTeamManagers, asset.pick.original_owner, transaction.season).name
							: null
					};
				} else if (asset.budget) {
					assetInfo = {
						type: 'faab',
						amount: asset.budget.amount
					};
				}

				if (assetInfo && summary[destRosterId]) {
					summary[destRosterId].received.push(assetInfo);
				}
			}
		}

		return Object.values(summary);
	};

	$: tradeSummary = buildTradeSummary();
</script>

<style>
	.tradeSummaryCard {
		background-color: var(--fff);
		border-radius: 10px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		margin-bottom: 1em;
		overflow: hidden;
	}

	.tradeHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75em 1em;
		background-color: var(--f5f5);
		border-bottom: 1px solid var(--eee);
	}

	.tradeDate {
		font-size: 0.85em;
		color: var(--g555);
		font-weight: 500;
	}

	.tradeSeason {
		font-size: 0.75em;
		color: var(--g999);
		background-color: var(--eee);
		padding: 0.2em 0.5em;
		border-radius: 4px;
	}

	.tradeGrid {
		display: flex;
		flex-wrap: wrap;
		padding: 0.75em;
		gap: 0.75em;
	}

	.tradeTeamBox {
		flex: 1;
		min-width: 200px;
		border: 1px solid var(--eee);
		border-radius: 8px;
		overflow: hidden;
		background-color: var(--fff);
	}

	.tradeTeamHeader {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.5em 0.75em;
		font-size: 0.9em;
		font-weight: 600;
		color: #fff;
	}

	.tradeTeamHeader img {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.3);
	}

	.tradeTeamBody {
		padding: 0.5em 0.75em;
	}

	.tradeAsset {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.4em 0;
		border-bottom: 1px solid var(--f5f5);
	}

	.tradeAsset:last-child {
		border-bottom: none;
	}

	.tradeAsset img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
	}

	.tradeAsset i {
		font-size: 20px;
	}

	.assetInfo {
		flex: 1;
	}

	.assetName {
		font-size: 0.9em;
		font-weight: 500;
	}

	.assetMeta {
		font-size: 0.75em;
		color: var(--g999);
	}

	.pickFrom {
		font-size: 0.7em;
		color: var(--g999);
		font-style: italic;
	}

	.emptyReceived {
		color: var(--g999);
		font-style: italic;
		font-size: 0.85em;
		padding: 0.5em 0;
	}

	@media (max-width: 500px) {
		.tradeTeamBox {
			min-width: 100%;
		}
	}
</style>

<div class="tradeSummaryCard">
	<div class="tradeHeader">
		<span class="tradeDate">{transaction.date}</span>
		<span class="tradeSeason">{transaction.season}</span>
	</div>
	<div class="tradeGrid">
		{#each tradeSummary as teamData}
			<div class="tradeTeamBox">
				<div class="tradeTeamHeader" style="background-color: {getTeamColor(teamData.teamIndex)};">
					<img src={teamData.team.avatar} alt="{teamData.team.name}" />
					<span>{teamData.team.name} receives:</span>
				</div>
				<div class="tradeTeamBody">
					{#if teamData.received.length > 0}
						{#each teamData.received as asset}
							<div class="tradeAsset">
								{#if asset.type === 'player'}
									<img src="{getPlayerAvatar(asset.pos, asset.playerId)}" alt="" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'" />
									<div class="assetInfo">
										<div class="assetName">{asset.name}</div>
										<div class="assetMeta">{asset.pos} - {asset.team || 'FA'}</div>
									</div>
								{:else if asset.type === 'pick'}
									<i class="material-icons" style="color: #9c27b0;">emoji_events</i>
									<div class="assetInfo">
										<div class="assetName">{asset.text}</div>
										{#if asset.originalOwner}
											<div class="pickFrom">via {asset.originalOwner}</div>
										{/if}
									</div>
								{:else if asset.type === 'faab'}
									<i class="material-icons" style="color: #f57c00;">attach_money</i>
									<div class="assetInfo">
										<div class="assetName">${asset.amount} FAAB</div>
									</div>
								{/if}
							</div>
						{/each}
					{:else}
						<div class="emptyReceived">Nothing</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
