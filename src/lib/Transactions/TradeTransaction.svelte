<script>
	import { gotoManager } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
	import TransactionMove from './TransactionMove.svelte';

	export let transaction, players, leagueTeamManagers;

	// Color scheme for multi-team trades (up to 4 teams)
	const teamColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

	// Get color for a specific team index
	const getTeamColor = (index) => teamColors[index % teamColors.length];

	let expanded = false;

	const toggleExpand = (e) => {
		e.stopPropagation();
		expanded = !expanded;
	}

	// Build a summary of what each team gave and received
	const buildTradeSummary = () => {
		const summary = {};

		// Initialize each team
		transaction.rosters.forEach((rosterId, idx) => {
			summary[rosterId] = {
				rosterId,
				teamIndex: idx,
				team: getTeamFromTeamManagers(leagueTeamManagers, rosterId, transaction.season),
				gave: [],
				received: []
			};
		});

		// Process each move
		for (const move of transaction.moves) {
			// Find origin (who gave) and destination (who received)
			let originIdx = -1;
			let destIdx = -1;
			let asset = null;

			for (let i = 0; i < move.length; i++) {
				const col = move[i];
				if (col === 'origin') {
					originIdx = i;
				} else if (col && col !== 'origin') {
					destIdx = i;
					asset = col;
				}
			}

			if (asset && destIdx >= 0) {
				const destRosterId = transaction.rosters[destIdx];
				const originRosterId = originIdx >= 0 ? transaction.rosters[originIdx] : null;

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
					const originalOwner = asset.pick.original_owner
						? getTeamFromTeamManagers(leagueTeamManagers, asset.pick.original_owner, transaction.season).name
						: null;
					assetInfo = {
						type: 'pick',
						season: asset.pick.season,
						round: asset.pick.round,
						originalOwner
					};
				} else if (asset.budget) {
					assetInfo = {
						type: 'faab',
						amount: asset.budget.amount
					};
				}

				if (assetInfo) {
					// Add to receiver's "received" list
					if (summary[destRosterId]) {
						summary[destRosterId].received.push(assetInfo);
					}

					// Add to giver's "gave" list (if origin found)
					if (originRosterId && summary[originRosterId]) {
						summary[originRosterId].gave.push(assetInfo);
					}
				}
			}
		}

		return Object.values(summary);
	}

	$: tradeSummary = buildTradeSummary();

	const getPlayerAvatar = (pos, playerId) => {
		if (pos === 'DEF') {
			return `https://sleepercdn.com/images/team_logos/nfl/${playerId.toLowerCase()}.png`;
		}
		return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
	}
</script>

<style>
    .tradeTransaction {
        display: flex;
        position: relative;
        flex-direction: column;
        margin-bottom: 1em;
    }
    
    .name {
        position: relative;
        text-align: center;
    }

    .avatar {
        border-radius: 50%;
        height: 40px;
        width: 40px;
        border: 2px solid;
        background-color: var(--fff);
    }

    .ownerName {
        display: inline-block;
        font-weight: normal;
        line-height: 1em;
        margin: 0.2em;
    }

    .currentOwner {
        font-style: italic;
        color: var(--aaa);
        font-size: 0.7em;
    }

    .clickable {
        cursor: pointer;
    }

    .date {
        color: var(--g999);
        font-style: italic;
        font-size: 0.7em;
        text-align: center;
        padding: 0.7em 0 1em;
        background-color: var(--fff);
        border-radius: 0 0 0 40px;
        border-right: 1px solid var(--ddd);
        margin-bottom: 2em;
    }

    .date.hasExpand {
        margin-bottom: 0;
        border-radius: 0;
    }

    .teamHeader {
        border-bottom: 3px solid;
        padding-bottom: 0.5em;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        /*
            the height setting is ignored, but
            allows the holder class div to have
            a height of 100%
        */
        height: 1px;
    }

    tbody {
        background-color: var(--fff);
        border-right: 1px solid var(--ddd);
    }

    .holder {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        height: 100%;
    }

    @media (max-width: 420px) {
        .ownerName {
            font-size: 0.8em;
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
        font-size: 0.75em;
        color: var(--g555);
        transition: background-color 0.15s ease;
        border-right: 1px solid var(--ddd);
    }

    .expandToggle:hover {
        background-color: var(--eee);
    }

    .expandToggle i {
        font-size: 18px;
        transition: transform 0.2s ease;
    }

    .expandToggle.expanded i {
        transform: rotate(180deg);
    }

    .expandedDetails {
        background-color: var(--f5f5);
        border: 1px solid var(--ddd);
        border-top: none;
        padding: 1em;
    }

    .tradeSummaryTitle {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--g555);
        margin-bottom: 1em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
    }

    .teamSummaries {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        justify-content: center;
    }

    .teamSummary {
        flex: 1;
        min-width: 200px;
        max-width: 300px;
        background-color: var(--fff);
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid;
    }

    .teamSummaryHeader {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.5em 0.75em;
        color: #fff;
    }

    .teamSummaryAvatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.5);
    }

    .teamSummaryName {
        font-weight: 600;
        font-size: 0.9em;
    }

    .teamSummaryBody {
        padding: 0.75em;
    }

    .assetSection {
        margin-bottom: 0.75em;
    }

    .assetSection:last-child {
        margin-bottom: 0;
    }

    .assetSectionTitle {
        font-size: 0.7em;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--g999);
        margin-bottom: 0.4em;
        display: flex;
        align-items: center;
        gap: 0.25em;
    }

    .assetSectionTitle.received {
        color: #00a894;
    }

    .assetSectionTitle.gave {
        color: #ff2a6d;
    }

    .assetList {
        display: flex;
        flex-direction: column;
        gap: 0.4em;
    }

    .assetItem {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.4em;
        background-color: var(--f5f5);
        border-radius: 4px;
        font-size: 0.85em;
    }

    .assetAvatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-size: cover;
        background-position: center;
        background-color: var(--eee);
        flex-shrink: 0;
    }

    .assetInfo {
        flex: 1;
    }

    .assetName {
        font-weight: 500;
    }

    .assetMeta {
        font-size: 0.8em;
        color: var(--g999);
    }

    .pickAsset {
        display: flex;
        align-items: center;
        gap: 0.4em;
    }

    .pickAsset i {
        color: #9c27b0;
        font-size: 18px;
    }

    .faabAsset {
        display: flex;
        align-items: center;
        gap: 0.4em;
    }

    .faabAsset i {
        color: #f57c00;
        font-size: 18px;
    }

    .emptyAssets {
        font-style: italic;
        color: var(--g999);
        font-size: 0.8em;
    }
</style>

<div class="tradeTransaction">
    <table>
        <thead>
            <tr>
                {#each transaction.rosters as owner, idx}
                    <th class="name clickable teamHeader" style="width: {1 / transaction.rosters.length * 100}%; border-color: {getTeamColor(idx)};" on:click={() => gotoManager({year: transaction.season, leagueTeamManagers, rosterID: owner})}>
                        <div class="holder">
                            <img class="avatar" style="border-color: {getTeamColor(idx)};" src="{getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).avatar}" alt="{getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name} avatar"/>
                            <span class="ownerName">
                                {getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name}
                                {#if getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name != getTeamFromTeamManagers(leagueTeamManagers, owner).name}
                                    <br />
                                    <span class="currentOwner">({getTeamFromTeamManagers(leagueTeamManagers, owner).name})</span>
                                {/if}
                            </span>
                        </div>
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each transaction.moves as move}
                <TransactionMove {players} {move} type={transaction.type} {leagueTeamManagers} season={transaction.season} {teamColors} />
            {/each}
        </tbody>
    </table>
    <span class="date hasExpand" style="border-left: 2px solid {getTeamColor(0)};">
        {transaction.date}
    </span>

    <!-- Expand Toggle -->
    <div class="expandToggle" class:expanded on:click={toggleExpand} style="border-left: 2px solid {getTeamColor(0)}; border-radius: 0 0 0 40px;">
        <i class="material-icons">expand_more</i>
        <span>{expanded ? 'Hide details' : 'Show details'}</span>
    </div>

    <!-- Expanded Trade Summary -->
    {#if expanded}
        <div class="expandedDetails" style="border-left: 2px solid {getTeamColor(0)}; border-radius: 0 0 0 20px; margin-bottom: 2em;">
            <div class="tradeSummaryTitle">Trade Summary</div>
            <div class="teamSummaries">
                {#each tradeSummary as teamData}
                    <div class="teamSummary" style="border-color: {getTeamColor(teamData.teamIndex)};">
                        <div class="teamSummaryHeader" style="background-color: {getTeamColor(teamData.teamIndex)};">
                            <img class="teamSummaryAvatar" src={teamData.team.avatar} alt="{teamData.team.name}" />
                            <span class="teamSummaryName">{teamData.team.name}</span>
                        </div>
                        <div class="teamSummaryBody">
                            <!-- Received -->
                            <div class="assetSection">
                                <div class="assetSectionTitle received">
                                    <i class="material-icons" style="font-size: 14px;">add_circle</i>
                                    Received
                                </div>
                                {#if teamData.received.length > 0}
                                    <div class="assetList">
                                        {#each teamData.received as asset}
                                            {#if asset.type === 'player'}
                                                <div class="assetItem">
                                                    <div class="assetAvatar" style="background-image: url({getPlayerAvatar(asset.pos, asset.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
                                                    <div class="assetInfo">
                                                        <div class="assetName">{asset.name}</div>
                                                        <div class="assetMeta">{asset.pos}{asset.team ? ` - ${asset.team}` : ''}</div>
                                                    </div>
                                                </div>
                                            {:else if asset.type === 'pick'}
                                                <div class="assetItem pickAsset">
                                                    <i class="material-icons">emoji_events</i>
                                                    <div class="assetInfo">
                                                        <div class="assetName">{asset.season} Round {asset.round}</div>
                                                        {#if asset.originalOwner}
                                                            <div class="assetMeta">from {asset.originalOwner}</div>
                                                        {/if}
                                                    </div>
                                                </div>
                                            {:else if asset.type === 'faab'}
                                                <div class="assetItem faabAsset">
                                                    <i class="material-icons">attach_money</i>
                                                    <span class="assetName">${asset.amount} FAAB</span>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <span class="emptyAssets">Nothing</span>
                                {/if}
                            </div>

                            <!-- Gave -->
                            <div class="assetSection">
                                <div class="assetSectionTitle gave">
                                    <i class="material-icons" style="font-size: 14px;">remove_circle</i>
                                    Gave Up
                                </div>
                                {#if teamData.gave.length > 0}
                                    <div class="assetList">
                                        {#each teamData.gave as asset}
                                            {#if asset.type === 'player'}
                                                <div class="assetItem">
                                                    <div class="assetAvatar" style="background-image: url({getPlayerAvatar(asset.pos, asset.playerId)}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
                                                    <div class="assetInfo">
                                                        <div class="assetName">{asset.name}</div>
                                                        <div class="assetMeta">{asset.pos}{asset.team ? ` - ${asset.team}` : ''}</div>
                                                    </div>
                                                </div>
                                            {:else if asset.type === 'pick'}
                                                <div class="assetItem pickAsset">
                                                    <i class="material-icons">emoji_events</i>
                                                    <div class="assetInfo">
                                                        <div class="assetName">{asset.season} Round {asset.round}</div>
                                                        {#if asset.originalOwner}
                                                            <div class="assetMeta">from {asset.originalOwner}</div>
                                                        {/if}
                                                    </div>
                                                </div>
                                            {:else if asset.type === 'faab'}
                                                <div class="assetItem faabAsset">
                                                    <i class="material-icons">attach_money</i>
                                                    <span class="assetName">${asset.amount} FAAB</span>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                {:else}
                                    <span class="emptyAssets">Nothing</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
