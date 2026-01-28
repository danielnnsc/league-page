<script>
  	import { getTeamNameFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
    import { getValueColor, getValueTextColor } from '$lib/utils/helper';
    import {Row, Cell } from '@smui/data-table';
    export let draftRow, draftType, row, reversalRound, previous=false, players, year, leagueTeamManagers;
    export let analysisMode = false;
    export let gradeMap = {};

    const formatValue = (value) => {
        if (value === null || value === undefined) return '-';
        return value > 0 ? `+${value}` : value.toString();
    };

    // Calculate overall pick number
    const getOverallPick = (col) => {
        const teamsCount = draftRow.length;
        const basePick = (row - 1) * teamsCount;

        if (draftType === "snake") {
            if (!reversalRound) {
                // Standard snake: odd rounds normal, even rounds reversed
                if (row % 2 === 0) {
                    return basePick + (teamsCount - col);
                } else {
                    return basePick + col + 1;
                }
            } else {
                // Snake with reversal round
                if ((row < reversalRound && row % 2 === 0) || (row >= reversalRound && row % 2 === 1)) {
                    return basePick + (teamsCount - col);
                } else {
                    return basePick + col + 1;
                }
            }
        } else {
            // Linear/auction draft
            return basePick + col + 1;
        }
    };
</script>

<style>
    :global(.draftCell) {
        position: relative;
    }

    :global(.changedHands) {
        background-color: var(--draftSwapped);
    }

    .draftPos {
        position: absolute;
        top: 0.3em;
        left: 0.3em;
        font-style: italic;
        color: #aaa;
    }

    .draftPosPrev {
        position: absolute;
        top: 0.1em;
        left: 0.1em;
        font-style: italic;
        color: #444;
    }

    .newOwner {
        font-style: italic;
        color: #444;
        text-align: center;
        white-space: break-spaces;
        line-height: 1.2em;
    }

	:global(.prevQB) {
		background-color: var(--QBfade);
	}

	:global(.prevWR) {
		background-color: var(--WRfade);
	}

	:global(.prevRB) {
		background-color: var(--RBfade);
	}

	:global(.prevTE) {
		background-color: var(--TEfade);
	}

	:global(.prevK) {
		background-color: var(--Kfade);
	}

	:global(.prevDEF) {
		background-color: var(--DEfadeFfade);
	}

    :global(.prevCB) {
        background-color: var(--CBfade);
    }

    :global(.prevSS) {
        background-color: var(--SSfade);
    }

    :global(.prevFS) {
        background-color: var(--FSfade);
    }

    :global(.prevDE) {
        background-color: var(--DEfade);
    }

    :global(.prevDL) {
        background-color: var(--DLfade);
    }

    :global(.prevLB) {
        background-color: var(--LBfade);
    }

	.playerAvatar {
		display: inline-block;
        position: absolute;
        transform: translate(-50%, -50%);
        left: 50%;
        top: 45%;
		height: 25px;
		width: 25px;
		background-position: center;
		border-radius: 100%;
		background-repeat: no-repeat;
		background-size: auto 25px;
	}

    .name {
        display: block;
        width: 100%;
        text-align: center;
        position: absolute;
        left: 0;
        white-space: break-spaces;
        line-height: 1em;
        bottom: 0.5em;
        color: rgba(0, 0, 0, 0.87);
    }

    .valueOverlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 0.3em 0.5em;
        border-radius: 4px;
        font-weight: 700;
        font-size: 1.1em;
        z-index: 10;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .rankOverlay {
        position: absolute;
        top: 0.2em;
        right: 0.2em;
        font-weight: 700;
        font-size: 1.1em;
        padding: 0.2em 0.4em;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.4);
        line-height: 1.2;
        text-align: right;
    }

    .rankOverlay .overall {
        color: #1f2937;
    }

    .rankOverlay .positional {
        font-size: 0.8em;
        color: #374151;
    }

    .rankOverlay .value {
        font-size: 0.85em;
        margin-left: 0.2em;
        font-weight: 600;
    }

    .rankOverlay .value.positive {
        color: #047857;
    }

    .rankOverlay .value.negative {
        color: #be123c;
    }

    :global(.analysisCell) {
        position: relative;
    }
</style>

<Row>
    {#each draftRow as draftCol, col}
        {#if !previous || draftCol}
            {@const pickGrade = draftCol?.player ? gradeMap[draftCol.player] : null}
            {@const cellBgStyle = analysisMode && pickGrade?.gradeValue !== null && pickGrade?.gradeValue !== undefined
                ? `background-color: ${getValueColor(pickGrade.gradeValue)} !important;`
                : ''}
            <Cell class="draftCell{draftCol ? ' changedHands' : ''}{previous ? ` prev${players[draftCol.player].pos}` : ''}{analysisMode ? ' analysisCell' : ''}" style={cellBgStyle}>
                <span class="draftPos{previous ? "Prev" : ""}">
                    {#if draftType == "auction" && previous}
                        ${draftCol.amount}
                    {:else if draftType == "snake" && !reversalRound}
                        {row}.{row % 2 == 0 ? draftRow.length - col : col + 1}{draftCol?.newOwner ? ` ${getTeamNameFromTeamManagers(leagueTeamManagers, draftCol.newOwner, year)}` : ''}
                    {:else if draftType == "snake" && reversalRound}
                        {#if (row < reversalRound && row % 2 == 0) || (row >= reversalRound && row % 2 == 1)}
                            {row}.{draftRow.length - col}
                        {:else}
                            {row}.{col + 1}
                        {/if}
                        {draftCol?.newOwner ? ` ${getTeamNameFromTeamManagers(leagueTeamManagers, draftCol.newOwner, year)}` : ''}
                    {:else}
                        {#if !reversalRound || row < reversalRound}
                            {row}.{col+1}{draftCol?.newOwner ? ` ${getTeamNameFromTeamManagers(leagueTeamManagers, draftCol.newOwner, year)}` : ''}
                        {:else}
                            {row}.{draftRow.length - col}{draftCol?.newOwner ? ` ${getTeamNameFromTeamManagers(leagueTeamManagers, draftCol.newOwner, year)}` : ''}
                        {/if}
                    {/if}
                </span>
                {#if draftCol && !previous}
                    <div class="newOwner">{getTeamNameFromTeamManagers(leagueTeamManagers, draftCol)}</div>
                {/if}
                {#if previous}
                    <div class="playerAvatar" style="{players[draftCol.player].pos == "DEF" ? `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${draftCol.player.toLowerCase()}.png)` : `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${draftCol.player}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`}" />
                    <br />
                    <div class="name">{`${players[draftCol.player].fn} ${players[draftCol.player].ln}`}{players[draftCol.player].pos == "DEF" ? "" : ` (${players[draftCol.player].t})`}</div>
                    {#if analysisMode && pickGrade}
                        <span class="rankOverlay">
                            <span class="overall">#{pickGrade.actualOverallRank || '-'}</span>
                            {#if pickGrade.overallValue !== null}
                                <span class="value {pickGrade.overallValue >= 0 ? 'positive' : 'negative'}">({pickGrade.overallValue > 0 ? '+' : ''}{pickGrade.overallValue})</span>
                            {/if}
                            <br />
                            <span class="positional">{pickGrade.position}{pickGrade.actualPositionalRank || '-'}</span>
                            {#if pickGrade.positionalValue !== null}
                                <span class="value {pickGrade.positionalValue >= 0 ? 'positive' : 'negative'}">({pickGrade.positionalValue > 0 ? '+' : ''}{pickGrade.positionalValue})</span>
                            {/if}
                        </span>
                    {/if}
                {/if}
            </Cell>
        {/if}
    {/each}
</Row>