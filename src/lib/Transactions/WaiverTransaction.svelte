<script>
	import { gotoManager } from '$lib/utils/helper';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let transaction, players, leagueTeamManagers;

    const owner = transaction.rosters[0];
    let expanded = false;

    const getAvatar = (pos, player) => {
        if(pos == 'DEF') {
            return `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${player.toLowerCase()}.png)`;
        }
        return `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${player}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`;
    }

    const toggleExpand = (e) => {
        e.stopPropagation();
        expanded = !expanded;
    }

    // Get all bids (winner + competing) sorted by amount
    $: allBids = [
        {
            rosterId: owner,
            bid: transaction.moves[0]?.[0]?.bid || 0,
            isWinner: true
        },
        ...(transaction.competingBids || []).map(b => ({ ...b, isWinner: false }))
    ].sort((a, b) => b.bid - a.bid);

    // Get detailed move info for expanded view
    $: moveDetails = transaction.moves.map(move => {
        const playerData = move[0];
        const player = players[playerData.player];
        return {
            type: playerData.type,
            playerId: playerData.player,
            name: player ? `${player.fn} ${player.ln}` : 'Unknown',
            pos: player?.pos || '',
            team: player?.t || '',
            bid: playerData.bid
        };
    });
</script>

<style>
    .waiverTransaction {
        display: flex;
        flex-direction: column;
        margin-bottom: 1em;
    }
    
    .name {
        position: relative;
    }

    .core {
        display: flex;
        flex-direction: column;
        border-radius: 0 0 0 40px;
        border: 1px solid var(--ddd);
        border-left: 2px solid var(--blueTwo);
        border-bottom: none;
        background-color: var(--fff);
    }

    .avatarAndDetails {
        display: flex;
        padding: 25px 0 0;
        flex-direction: column;
        justify-content: end;
    }

    .avatar {
        position: absolute;
        left: 0px;
        top: 6px;
        border-radius: 50%;
        height: 40px;
        width: 40px;
        border: 2px solid var(--blueTwo);
        background-color: var(--fff);
    }

    .ownerName {
        display: inline-block;
        border-bottom: 2px solid var(--blueTwo);
        margin: 0 0 0 22px;
        padding-right: 30px;
        padding-left: 30px;
    }

    .playerAvatar {
        display: inline-block;
        vertical-align: middle;
        height: 50px;
        width: 50px;
        background-position: center;
        border: 2px solid;
        border-radius: 100%;
        background-repeat: no-repeat;
        background-size: auto 50px;
        position: relative;
    }

    .currentOwner {
        font-style: italic;
        color: var(--aaa);
    }

    .clickable {
        cursor: pointer;
    }

    .details {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 80%;
        padding: 0 10%;
    }

    .player {
        display: flex;
    }

    .playerName {
        font-size: 0.8em;
        line-height: 1em;
        text-align: center;
    }

    .playerInfo {
        font-size: 0.6em;
        color: var(--g555);
        line-height: 1em;
    }

    .add {
        color: #00ceb8;
    }

    .drop {
        color: #ff2a6d;
    }

    .indicator {
        position: absolute;
        bottom: -8px;
        right: -8px;
    }

    .nameHolder {
        display: flex;
        flex-direction: column;
        padding-left: 0.5em;
        justify-content: center;
        align-items: center;
    }

    .bid {
        color: #fff;
        font-weight: 700;
        background-color: #f57c00;
        padding: 0.15em 0.5em;
        border-radius: 4px;
        margin-left: 0.3em;
        font-size: 0.95em;
    }

    .date {
        color: var(--g999);
        font-style: italic;
        font-size: 0.7em;
        text-align: center;
        margin-top: 0.7em;
    }

    .competingBids {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5em;
        padding: 0.5em 1em;
        background-color: var(--f5f5);
        border-top: 1px solid var(--eee);
        font-size: 0.75em;
    }

    .competingBidsLabel {
        color: var(--g999);
        font-style: italic;
        width: 100%;
        text-align: center;
        margin-bottom: 0.25em;
    }

    .competingBid {
        display: inline-flex;
        align-items: center;
        gap: 0.25em;
        padding: 0.2em 0.5em;
        background-color: var(--fff);
        border: 1px solid var(--ddd);
        border-radius: 12px;
    }

    .competingBidAvatar {
        width: 18px;
        height: 18px;
        border-radius: 50%;
    }

    .competingBidAmount {
        color: #f57c00;
        font-weight: 600;
    }

    @media (max-width: 410px) {
        .player {
            flex-direction: column;
            align-items: center;
        }

        .details {
            width: 90%;
            padding: 0 5%;
        }

        .nameHolder {
            margin-top: 0.5em;
            padding-left: 0;
            font-size: 0.9em;
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
        border-top: 1px solid var(--eee);
        padding: 1em;
    }

    .expandedSection {
        margin-bottom: 1em;
    }

    .expandedSection:last-child {
        margin-bottom: 0;
    }

    .sectionTitle {
        font-size: 0.8em;
        font-weight: 600;
        color: var(--g555);
        margin-bottom: 0.5em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .bidsList {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }

    .bidRow {
        display: flex;
        align-items: center;
        gap: 0.75em;
        padding: 0.5em 0.75em;
        background-color: var(--fff);
        border-radius: 6px;
        border: 1px solid var(--ddd);
    }

    .bidRow.winner {
        border: 2px solid #00ceb8;
        background-color: rgba(0, 206, 184, 0.05);
    }

    .bidRank {
        font-weight: 700;
        font-size: 0.9em;
        color: var(--g999);
        min-width: 24px;
    }

    .bidRow.winner .bidRank {
        color: #00ceb8;
    }

    .bidTeamAvatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid var(--ddd);
    }

    .bidTeamName {
        flex: 1;
        font-size: 0.9em;
    }

    .bidAmount {
        font-weight: 700;
        font-size: 1em;
        color: #f57c00;
        background-color: rgba(245, 124, 0, 0.1);
        padding: 0.2em 0.5em;
        border-radius: 4px;
    }

    .winnerBadge {
        font-size: 0.7em;
        background-color: #00ceb8;
        color: #fff;
        padding: 0.15em 0.4em;
        border-radius: 3px;
        font-weight: 600;
    }

    .movesList {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }

    .moveRow {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.5em;
        background-color: var(--fff);
        border-radius: 6px;
    }

    .moveRow.added {
        border-left: 3px solid #00ceb8;
    }

    .moveRow.dropped {
        border-left: 3px solid #ff2a6d;
    }

    .moveIcon {
        font-size: 20px;
    }

    .moveIcon.add {
        color: #00ceb8;
    }

    .moveIcon.drop {
        color: #ff2a6d;
    }

    .movePlayerAvatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-size: cover;
        background-position: center;
        background-color: var(--eee);
    }

    .movePlayerInfo {
        flex: 1;
    }

    .movePlayerName {
        font-weight: 500;
        font-size: 0.9em;
    }

    .movePlayerMeta {
        font-size: 0.75em;
        color: var(--g999);
    }
</style>

<div class="waiverTransaction clickable" on:click={() => gotoManager({year: transaction.season, leagueTeamManagers, rosterID: owner})}>
    <div class="name">
        <span class="ownerName">
            {getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name}
            {#if getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name != getTeamFromTeamManagers(leagueTeamManagers, owner).name}
                <span class="currentOwner">({getTeamFromTeamManagers(leagueTeamManagers, owner).name})</span>
            {/if}
            {#if transaction.moves[0][0].bid}
                <span class="bid">
                    ${transaction.moves[0][0].bid}
                </span>
            {/if}
        </span>
        <img class="avatar" src="{getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).avatar}" alt="{getTeamFromTeamManagers(leagueTeamManagers, owner, transaction.season).name} avatar"/>
    </div>
    <div class="core">
        <div class="avatarAndDetails">
            <div class="details">
                {#each transaction.moves as move}
                    <div class="player">
                        <div class="playerAvatar" style="border-color: var(--{players[move[0].player].pos}); background-color: var(--{move[0].type == "Added" ? "waiverAdd" : "waiverDrop"}); {getAvatar(players[move[0].player].pos, move[0].player)}">
                            {#if move[0].type == "Added"}
                                <i class="add indicator material-icons" aria-hidden="true">add_circle</i>
                            {:else if move[0].type == "Dropped"}
                                <i class="drop indicator material-icons" aria-hidden="true">do_not_disturb_on</i>
                            {/if}
                        </div>
                        <span class="nameHolder">
                            <span class="playerName">{`${players[move[0].player].fn} ${players[move[0].player].ln}`}</span>
                            <span class="playerInfo">
                                <span>{players[move[0].player].pos}</span>
                                {#if players[move[0].player].t}
                                    -
                                    <span>{players[move[0].player].t}</span> 
                                {/if}
                            </span>
                        </span>
                    </div>
                {/each}
            </div>
        </div>
        <span class="date">
            {transaction.date}
        </span>

        <!-- Expand Toggle -->
        <div class="expandToggle" class:expanded on:click={toggleExpand}>
            <i class="material-icons">expand_more</i>
            <span>{expanded ? 'Hide details' : 'Show details'}</span>
        </div>

        <!-- Expanded Details -->
        {#if expanded}
            <div class="expandedDetails">
                <!-- Transaction Details -->
                <div class="expandedSection">
                    <div class="sectionTitle">Transaction Details</div>
                    <div class="movesList">
                        {#each moveDetails as move}
                            <div class="moveRow" class:added={move.type === 'Added'} class:dropped={move.type === 'Dropped'}>
                                <i class="material-icons moveIcon" class:add={move.type === 'Added'} class:drop={move.type === 'Dropped'}>
                                    {move.type === 'Added' ? 'add_circle' : 'remove_circle'}
                                </i>
                                <div class="movePlayerAvatar" style="background-image: url({move.pos === 'DEF' ? `https://sleepercdn.com/images/team_logos/nfl/${move.playerId.toLowerCase()}.png` : `https://sleepercdn.com/content/nfl/players/thumb/${move.playerId}.jpg`}), url(https://sleepercdn.com/images/v2/icons/player_default.webp);"></div>
                                <div class="movePlayerInfo">
                                    <div class="movePlayerName">{move.name}</div>
                                    <div class="movePlayerMeta">{move.pos}{move.team ? ` - ${move.team}` : ''}</div>
                                </div>
                                <span style="font-size: 0.85em; color: var(--g555);">{move.type}</span>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- All Bids (if FAAB league) -->
                {#if allBids.some(b => b.bid > 0)}
                    <div class="expandedSection">
                        <div class="sectionTitle">All Waiver Bids ({allBids.length})</div>
                        <div class="bidsList">
                            {#each allBids as bid, i}
                                <div class="bidRow" class:winner={bid.isWinner}>
                                    <span class="bidRank">#{i + 1}</span>
                                    <img class="bidTeamAvatar" src="{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).avatar}" alt="team" />
                                    <span class="bidTeamName">{getTeamFromTeamManagers(leagueTeamManagers, bid.rosterId, transaction.season).name}</span>
                                    <span class="bidAmount">${bid.bid}</span>
                                    {#if bid.isWinner}
                                        <span class="winnerBadge">WINNER</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
