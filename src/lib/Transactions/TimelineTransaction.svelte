<script>
	import { gotoManager } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let transaction, players, leagueTeamManagers;

	// Color scheme for multi-team trades
	const teamColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
	const getTeamColor = (index) => teamColors[index % teamColors.length];

	let expanded = false;

	const toggleExpand = (e) => {
		e.stopPropagation();
		expanded = !expanded;
	}

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	}

	// Build trade summary
	const buildTradeSummary = () => {
		if (transaction.type !== 'trade') return [];

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
						text: `${asset.pick.season} Rd ${asset.pick.round}`
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
	}

	// Get all bids for waiver
	$: allBids = transaction.type === 'waiver' ? [
		{
			rosterId: transaction.rosters[0],
			bid: summary.find(s => s.bid)?.bid || 0,
			isWinner: true
		},
		...(transaction.competingBids || []).map(b => ({ ...b, isWinner: false }))
	].filter(b => b.bid > 0).sort((a, b) => b.bid - a.bid) : [];

	$: winnerBid = transaction.moves[0]?.[0]?.bid || 0;
	$: allBidsWithWinner = transaction.type === 'waiver' && winnerBid > 0 ? [
		{ rosterId: transaction.rosters[0], bid: winnerBid, isWinner: true },
		...(transaction.competingBids || []).map(b => ({ ...b, isWinner: false }))
	].sort((a, b) => b.bid - a.bid) : [];

	$: tradeSummary = buildTradeSummary();

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

		// Handle draft transactions
		if (transaction.type === 'draft' && transaction.draftPick) {
			const pick = transaction.draftPick;
			const p = players[pick.player];
			items.push({
				type: 'draft',
				playerId: pick.player,
				name: getPlayerName(pick.player),
				pos: p?.pos || '',
				round: pick.round,
				pickNumber: pick.pickNumber,
				amount: pick.amount,
				teamIndex: 0
			});
			return items;
		}

		for (const move of transaction.moves) {
			// Find destination index for trades
			let destIndex = -1;
			for (let i = 0; i < move.length; i++) {
				if (move[i] && move[i] !== 'origin' && (move[i].player || move[i].pick || move[i].budget)) {
					destIndex = i;
					break;
				}
			}

			for (const col of move) {
				if (!col || col === 'origin') continue;

				if (col.player) {
					const p = players[col.player];
					items.push({
						type: col.type === 'Added' ? 'add' : col.type === 'Dropped' ? 'drop' : 'trade',
						playerId: col.player,
						name: getPlayerName(col.player),
						pos: p?.pos || '',
						bid: col.bid,
						teamIndex: destIndex
					});
				} else if (col.pick) {
					items.push({
						type: 'pick',
						name: `${col.pick.season} Rd ${col.pick.round}`,
						originalOwner: col.pick.original_owner
							? getTeamFromTeamManagers(leagueTeamManagers, col.pick.original_owner, transaction.season).name
							: null,
						teamIndex: destIndex
					});
				} else if (col.budget) {
					items.push({
						type: 'budget',
						name: `$${col.budget.amount} FAAB`,
						teamIndex: destIndex
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

	.item.draft {
		background-color: rgba(156, 39, 176, 0.15);
		color: #9c27b0;
	}

	.typeIndicator.draft {
		background-color: #9c27b0;
	}

	.itemIcon {
		font-size: 14px;
	}

	.playerThumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
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

	.competingBids {
		display: flex;
		align-items: center;
		gap: 0.4em;
		flex-wrap: wrap;
		padding-top: 0.4em;
		border-top: 1px dashed var(--eee);
		margin-top: 0.4em;
	}

	.competingLabel {
		font-size: 0.75em;
		color: var(--g999);
		font-style: italic;
	}

	.competingBid {
		display: inline-flex;
		align-items: center;
		gap: 0.2em;
		font-size: 0.75em;
		padding: 0.15em 0.4em;
		background-color: var(--f5f5);
		border-radius: 10px;
	}

	.competingBid img {
		width: 14px;
		height: 14px;
		border-radius: 50%;
	}

	.competingBid .amount {
		color: #f57c00;
		font-weight: 600;
	}

	@media (max-width: 500px) {
		.teamName {
			font-size: 0.8em;
		}

		.item {
			font-size: 0.75em;
		}
	}

	.expandToggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25em;
		padding: 0.4em;
		background-color: var(--f5f5);
		border-top: 1px solid var(--eee);
		cursor: pointer;
		font-size: 0.7em;
		color: var(--g555);
		transition: background-color 0.15s ease;
	}

	.expandToggle:hover {
		background-color: var(--eee);
	}

	.expandToggle i {
		font-size: 16px;
		transition: transform 0.2s ease;
	}

	.expandToggle.expanded i {
		transform: rotate(180deg);
	}

	.expandedContent {
		padding: 0.75em;
		background-color: var(--f5f5);
		border-top: 1px solid var(--eee);
	}

	.expandedSection {
		margin-bottom: 0.75em;
	}

	.expandedSection:last-child {
		margin-bottom: 0;
	}

	.expandedSectionTitle {
		font-size: 0.75em;
		font-weight: 600;
		color: var(--g555);
		text-transform: uppercase;
		margin-bottom: 0.5em;
	}

	.expandedList {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}

	.expandedItem {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.4em 0.5em;
		background-color: var(--fff);
		border-radius: 4px;
		font-size: 0.85em;
	}

	.expandedItem.winner {
		border: 1px solid #00ceb8;
		background-color: rgba(0, 206, 184, 0.05);
	}

	.expandedAvatar {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background-size: cover;
		background-position: center;
		background-color: var(--eee);
	}

	.expandedName {
		flex: 1;
	}

	.expandedBid {
		font-weight: 600;
		color: #f57c00;
	}

	.winnerTag {
		font-size: 0.65em;
		background-color: #00ceb8;
		color: #fff;
		padding: 0.1em 0.3em;
		border-radius: 2px;
		font-weight: 600;
	}

	.tradeGrid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5em;
	}

	.tradeTeamBox {
		flex: 1;
		min-width: 150px;
		border: 1px solid var(--eee);
		border-radius: 6px;
		overflow: hidden;
		background-color: var(--fff);
	}

	.tradeTeamHeader {
		display: flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.3em 0.5em;
		font-size: 0.75em;
		font-weight: 600;
		color: #fff;
	}

	.tradeTeamHeader img {
		width: 18px;
		height: 18px;
		border-radius: 50%;
	}

	.tradeTeamBody {
		padding: 0.4em;
		font-size: 0.8em;
	}

	.tradeAsset {
		display: flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.2em 0;
	}

	.tradeAsset img {
		width: 18px;
		height: 18px;
		border-radius: 50%;
	}

	.tradeAsset i {
		font-size: 14px;
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
		{#if transaction.type === 'trade'}
			<!-- Trade Summary Grid -->
			<div class="tradeGridInline">
				{#each tradeSummary as teamData}
					<div class="tradeTeamBoxInline">
						<div class="tradeTeamHeaderInline" style="background-color: {getTeamColor(teamData.teamIndex)};">
							<img src={teamData.team.avatar} alt="{teamData.team.name}" />
							<span>{teamData.team.name} receives:</span>
						</div>
						<div class="tradeTeamBodyInline">
							{#if teamData.received.length > 0}
								{#each teamData.received as asset}
									<div class="tradeAssetInline">
										{#if asset.type === 'player'}
											<img src="{getPlayerAvatar(asset.pos, asset.playerId)}" alt="" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'" />
											<span>{asset.name}</span>
										{:else if asset.type === 'pick'}
											<i class="material-icons" style="color: #9c27b0;">emoji_events</i>
											<span>{asset.text}</span>
										{:else if asset.type === 'faab'}
											<i class="material-icons" style="color: #f57c00;">attach_money</i>
											<span>${asset.amount} FAAB</span>
										{/if}
									</div>
								{/each}
							{:else}
								<span class="emptyReceived">Nothing</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Item chips for waivers/drafts -->
			<div class="items">
				{#each summary.slice(0, 6) as item}
					<span class="item {item.type}">
						{#if item.playerId}
							<img class="playerThumb" src={getPlayerAvatar(item.pos, item.playerId)} alt="" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'" />
						{:else if item.type === 'add'}
							<i class="material-icons itemIcon">add_circle</i>
						{:else if item.type === 'drop'}
							<i class="material-icons itemIcon">remove_circle</i>
						{:else if item.type === 'pick'}
							<i class="material-icons itemIcon">emoji_events</i>
						{:else if item.type === 'budget'}
							<i class="material-icons itemIcon">attach_money</i>
						{:else if item.type === 'draft'}
							<i class="material-icons itemIcon">how_to_vote</i>
						{/if}
						{#if item.type === 'draft'}
							Rd {item.round}, Pick {item.pickNumber}: {item.name}
							{#if item.amount}
								<span class="bid">${item.amount}</span>
							{/if}
						{:else}
							{item.name}
							{#if item.bid}
								<span class="bid">(${item.bid})</span>
							{/if}
							{#if item.originalOwner}
								<span class="pickFrom">from {item.originalOwner}</span>
							{/if}
						{/if}
					</span>
				{/each}
				{#if summary.length > 6}
					<span class="item trade">+{summary.length - 6} more</span>
				{/if}
			</div>
		{/if}
		{#if transaction.competingBids && transaction.competingBids.length > 0}
			<div class="competingBids">
				<span class="competingLabel">Other bids:</span>
				{#each transaction.competingBids.slice(0, 4) as bid}
					<span class="competingBid">
						<img src="{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).avatar}" alt="team" />
						<span class="amount">${bid.bid}</span>
					</span>
				{/each}
				{#if transaction.competingBids.length > 4}
					<span class="competingBid">+{transaction.competingBids.length - 4}</span>
				{/if}
			</div>
		{/if}

		<!-- Expand Toggle (only for waivers) -->
		{#if transaction.type === 'waiver'}
			<div class="expandToggle" class:expanded on:click={toggleExpand}>
				<i class="material-icons">expand_more</i>
				<span>{expanded ? 'Hide' : 'Details'}</span>
			</div>
		{/if}

		<!-- Expanded Content (only for waivers) -->
		{#if expanded && transaction.type === 'waiver'}
			<div class="expandedContent">
				{#if allBidsWithWinner.length > 0}
					<div class="expandedSection">
						<div class="expandedSectionTitle">All Waiver Bids</div>
						<div class="expandedList">
							{#each allBidsWithWinner as bid, i}
								<div class="expandedItem" class:winner={bid.isWinner}>
									<span style="font-weight: 600; color: var(--g999);">#{i + 1}</span>
									<img class="expandedAvatar" src="{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).avatar}" alt="team" />
									<span class="expandedName">{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).name}</span>
									<span class="expandedBid">${bid.bid}</span>
									{#if bid.isWinner}
										<span class="winnerTag">WON</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Regular waiver without FAAB -->
					<div class="expandedSectionTitle">Transaction Details</div>
					<div class="expandedList">
						{#each summary as item}
							<div class="expandedItem">
								<i class="material-icons" style="font-size: 16px; color: {item.type === 'add' ? '#00a894' : '#ff2a6d'};">
									{item.type === 'add' ? 'add_circle' : 'remove_circle'}
								</i>
								<span>{item.name}</span>
								<span style="color: var(--g999); font-size: 0.85em;">{item.type === 'add' ? 'Added' : 'Dropped'}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
