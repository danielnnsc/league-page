<script>
	import { Row, Cell } from '@smui/data-table';
	import { gotoManager } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
	import { createEventDispatcher } from 'svelte';

	export let transaction, players, leagueTeamManagers;

	const dispatch = createEventDispatcher();

	// Color scheme for multi-team trades
	const teamColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
	const getTeamColor = (index) => teamColors[index % teamColors.length];

	let expanded = false;

	const toggleExpand = (e) => {
		e.stopPropagation();
		expanded = !expanded;
		dispatch('expand', { transaction, expanded });
	}

	const getPlayerName = (playerId) => {
		if (!players[playerId]) return 'Unknown';
		return `${players[playerId].fn} ${players[playerId].ln}`;
	}

	const getPlayerInfo = (playerId) => {
		if (!players[playerId]) return '';
		const p = players[playerId];
		return p.t ? `${p.pos} - ${p.t}` : p.pos;
	}

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	}

	// Build trade summary for expanded view
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
			bid: transaction.moves[0]?.[0]?.bid || 0,
			isWinner: true
		},
		...(transaction.competingBids || []).map(b => ({ ...b, isWinner: false }))
	].sort((a, b) => b.bid - a.bid) : [];

	$: tradeSummary = buildTradeSummary();

	const getTransactionDetails = (transaction) => {
		const details = [];

		// Handle draft transactions
		if (transaction.type === 'draft' && transaction.draftPick) {
			const pick = transaction.draftPick;
			const playerName = getPlayerName(pick.player);
			const p = players[pick.player];
			const posInfo = p ? ` (${p.pos})` : '';
			details.push({
				type: 'draft',
				text: `Rd ${pick.round}, Pick ${pick.pickNumber}: ${playerName}${posInfo}`,
				amount: pick.amount,
				teamIndex: 0
			});
			return details;
		}

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

	.draft {
		color: #9c27b0;
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

	.draftDetail {
		background-color: rgba(156, 39, 176, 0.15);
		color: #9c27b0;
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

	.expandBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: var(--f5f5);
		border: 1px solid var(--ddd);
		cursor: pointer;
		margin-left: 0.5em;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.expandBtn:hover {
		background-color: var(--eee);
	}

	.expandBtn i {
		font-size: 16px;
		color: var(--g555);
		transition: transform 0.2s ease;
	}

	.expandBtn.expanded i {
		transform: rotate(180deg);
	}

	:global(.expandedRow) {
		background-color: var(--f5f5) !important;
	}

	:global(.expandedRow td) {
		padding-top: 0 !important;
		padding-bottom: 1em !important;
	}

	.expandedContent {
		padding: 0.75em;
		background-color: var(--fff);
		border-radius: 6px;
		border: 1px solid var(--eee);
	}

	.expandedGrid {
		display: flex;
		flex-wrap: wrap;
		gap: 1em;
	}

	.expandedSection {
		flex: 1;
		min-width: 200px;
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
		padding: 0.4em;
		background-color: var(--f5f5);
		border-radius: 4px;
		font-size: 0.85em;
	}

	.expandedItem.winner {
		border: 1px solid #00ceb8;
		background-color: rgba(0, 206, 184, 0.1);
	}

	.expandedAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-size: cover;
		background-position: center;
		background-color: var(--eee);
		flex-shrink: 0;
	}

	.expandedItemName {
		flex: 1;
	}

	.expandedBidAmount {
		font-weight: 600;
		color: #f57c00;
	}

	.winnerLabel {
		font-size: 0.7em;
		background-color: #00ceb8;
		color: #fff;
		padding: 0.1em 0.3em;
		border-radius: 2px;
	}

	.teamBox {
		border: 1px solid var(--eee);
		border-radius: 6px;
		overflow: hidden;
		margin-bottom: 0.5em;
	}

	.teamBoxHeader {
		display: flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.4em 0.6em;
		font-size: 0.8em;
		font-weight: 600;
		color: #fff;
	}

	.teamBoxHeader img {
		width: 20px;
		height: 20px;
		border-radius: 50%;
	}

	.teamBoxBody {
		padding: 0.5em;
		font-size: 0.8em;
	}

	.receivedItem {
		display: flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.25em 0;
	}

	.receivedItem img {
		width: 20px;
		height: 20px;
		border-radius: 50%;
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
					<span class="detailChip {detail.type === 'add' ? 'add' : detail.type === 'drop' ? 'drop' : detail.type === 'trade' ? 'tradeDetail' : detail.type === 'pick' ? 'pick' : detail.type === 'draft' ? 'draftDetail' : 'budget'}">
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
						{:else if detail.type === 'draft'}
							<i class="material-icons" style="font-size: 14px;">how_to_vote</i>
						{/if}
						{detail.text}
						{#if detail.bid}
							<span class="bid">(${detail.bid})</span>
						{/if}
						{#if detail.amount}
							<span class="bid">${detail.amount}</span>
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
			<!-- Expand Button -->
			{#if transaction.type !== 'draft'}
				<button class="expandBtn" class:expanded on:click={toggleExpand} title="{expanded ? 'Hide details' : 'Show details'}">
					<i class="material-icons">expand_more</i>
				</button>
			{/if}
		</div>
	</Cell>
</Row>

<!-- Expanded Details Row -->
{#if expanded}
	<Row class="expandedRow">
		<Cell colspan="4">
			<div class="expandedContent">
				{#if transaction.type === 'waiver' && allBids.some(b => b.bid > 0)}
					<!-- Waiver Bids -->
					<div class="expandedSection">
						<div class="expandedSectionTitle">All Waiver Bids ({allBids.length})</div>
						<div class="expandedList">
							{#each allBids as bid, i}
								<div class="expandedItem" class:winner={bid.isWinner}>
									<span style="font-weight: 600; color: var(--g999); min-width: 20px;">#{i + 1}</span>
									<img class="expandedAvatar" src="{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).avatar}" alt="team" />
									<span class="expandedItemName">{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).name}</span>
									<span class="expandedBidAmount">${bid.bid}</span>
									{#if bid.isWinner}
										<span class="winnerLabel">WON</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else if transaction.type === 'trade'}
					<!-- Trade Summary -->
					<div class="expandedSectionTitle">Trade Summary</div>
					<div class="expandedGrid">
						{#each tradeSummary as teamData}
							<div class="teamBox">
								<div class="teamBoxHeader" style="background-color: {getTeamColor(teamData.teamIndex)};">
									<img src={teamData.team.avatar} alt="{teamData.team.name}" />
									<span>{teamData.team.name} receives:</span>
								</div>
								<div class="teamBoxBody">
									{#if teamData.received.length > 0}
										{#each teamData.received as asset}
											<div class="receivedItem">
												{#if asset.type === 'player'}
													<img src="{getPlayerAvatar(asset.pos, asset.playerId)}" alt="{asset.name}" onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'" />
													<span>{asset.name} <span style="color: var(--g999);">({asset.pos})</span></span>
												{:else if asset.type === 'pick'}
													<i class="material-icons" style="font-size: 16px; color: #9c27b0;">emoji_events</i>
													<span>{asset.text}</span>
												{:else if asset.type === 'faab'}
													<i class="material-icons" style="font-size: 16px; color: #f57c00;">attach_money</i>
													<span>${asset.amount} FAAB</span>
												{/if}
											</div>
										{/each}
									{:else}
										<span style="color: var(--g999); font-style: italic;">Nothing</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- Waiver without FAAB -->
					<div class="expandedSectionTitle">Transaction Details</div>
					<div class="expandedList">
						{#each details as detail}
							<div class="expandedItem">
								<i class="material-icons" style="font-size: 16px; color: {detail.type === 'add' ? '#00a894' : '#ff2a6d'};">
									{detail.type === 'add' ? 'add_circle' : 'remove_circle'}
								</i>
								<span>{detail.text}</span>
								<span style="color: var(--g999);">{detail.type === 'add' ? 'Added' : 'Dropped'}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Cell>
	</Row>
{/if}
