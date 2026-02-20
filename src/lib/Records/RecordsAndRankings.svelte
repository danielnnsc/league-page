<script>
    import Button, { Group, Label } from '@smui/button';
    import { generateGraph, gotoManager, round } from '$lib/utils/helper';

  	import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
	import RecordTeam from './RecordTeam.svelte';
	import BarChart from '$lib/BarChart.svelte';

    export let key, tradesData, waiversData, weekRecords, weekLows, seasonLongRecords, seasonLongLows, showTies, winPercentages, fptsHistories, lineupIQs, prefix, blowouts, closestMatchups, allTime=false, leagueTeamManagers;

    let graphs = [];
    let curTable = 0;
    let curGraph = 0;

    let iqOffset = 0;
    let lossesOffset = 0; // 1 when Losses graph is shown (toilet bowl only)

    // Sorting state for each table
    let sortState = {
        lineupIQ: { column: 'iq', direction: 'desc' },
        winPct: { column: 'percentage', direction: 'desc' },
        fpts: { column: 'fptsFor', direction: 'desc' },
        transactions: { column: 'trades', direction: 'desc' }
    };

    // Generic sort function
    const sortData = (data, column, direction) => {
        return [...data].sort((a, b) => {
            const aVal = a[column] ?? 0;
            const bVal = b[column] ?? 0;
            if (direction === 'asc') {
                return aVal - bVal;
            }
            return bVal - aVal;
        });
    };

    // Handle header click for sorting
    const handleSort = (table, column) => {
        if (sortState[table].column === column) {
            // Toggle direction if same column
            sortState[table].direction = sortState[table].direction === 'desc' ? 'asc' : 'desc';
        } else {
            // New column, default to descending
            sortState[table].column = column;
            sortState[table].direction = 'desc';
        }
        sortState = sortState; // Trigger reactivity
    };

    // Reset sort state when key changes
    const resetSortState = (k) => {
        sortState = {
            lineupIQ: { column: 'iq', direction: 'desc' },
            winPct: { column: 'percentage', direction: 'desc' },
            fpts: { column: 'fptsFor', direction: 'desc' },
            transactions: { column: 'trades', direction: 'desc' }
        };
    };
    $: resetSortState(key);

    // Sorted data arrays
    $: sortedLineupIQs = sortData(lineupIQs, sortState.lineupIQ.column, sortState.lineupIQ.direction);
    $: sortedWinPercentages = sortData(winPercentages, sortState.winPct.column, sortState.winPct.direction);
    $: sortedFptsHistories = sortData(fptsHistories, sortState.fpts.column, sortState.fpts.direction);
    $: sortedTransactions = sortData(transactions, sortState.transactions.column, sortState.transactions.direction);

    let tables = [
        "Win Percentages",
        "Points",
        "Transactions",
    ]

    const year = allTime ? null : prefix;

    const changeTable = (newGraph) => {
        // Graph indices (when all present): IQ(0), Wins(1), Losses(2)*, WinPct(3), FPts(4), PotPts(5), Trades(6), Waivers(7)
        // * Losses only for toilet bowl
        // iqOffset removes IQ, lossesOffset accounts for Losses being added
        const adjustedGraph = newGraph + iqOffset - lossesOffset;

        switch (adjustedGraph) {
            case 0: // IQ graph -> Lineup IQs table
                curTable = 0;
                break;
            case 1: // Wins graph -> Win Percentages table
            case 2: // WinPct graph -> Win Percentages table
                curTable = iqOffset ? 0 : 1;
                break;
            case 3: // FPts graph -> Points table
                curTable = iqOffset ? 1 : 2;
                break;
            case 4: // PotPts graph -> Lineup IQs table
                curTable = 0;
                break;
            case 5: // Trades graph -> Transactions table
            case 6: // Waivers graph -> Transactions table
                curTable = iqOffset ? 2 : 3;
                break;
            default:
                curTable = 0;
                break;
        }

        // Handle Losses graph separately (toilet bowl) - maps to Win Percentages table
        if (lossesOffset && newGraph === (iqOffset ? 1 : 2)) {
            curTable = iqOffset ? 0 : 1;
        }
    }

    const changeGraph = (newTable) => {
        // Tables: Lineup IQs(0), Win Percentages(1), Points(2), Transactions(3)
        // iqOffset removes Lineup IQs table
        const adjustedTable = newTable + iqOffset;

        switch (adjustedTable) {
            case 0: // Lineup IQs table
                if(curGraph == 0 || curGraph == (4 - iqOffset + lossesOffset)) {
                    break;
                }
                curGraph = 0;
                break;
            case 1: // Win Percentages table
                {
                    const winsIdx = 1 - iqOffset;
                    const winPctIdx = 2 - iqOffset + lossesOffset;
                    if(curGraph == winsIdx || curGraph == winPctIdx || (lossesOffset && curGraph == winsIdx + 1)) {
                        break;
                    }
                    curGraph = winsIdx;
                }
                break;
            case 2: // Points table
                curGraph = 3 - iqOffset + lossesOffset;
                break;
            case 3: // Transactions table
                {
                    const tradesIdx = 5 - (2 * iqOffset) + lossesOffset;
                    const waiversIdx = 6 - (2 * iqOffset) + lossesOffset;
                    if(curGraph == tradesIdx || curGraph == waiversIdx) {
                        break;
                    }
                    curGraph = tradesIdx;
                }
                break;
            default:
                curGraph = 0;
                break;
        }
    }

    const setGraphs = (wD) => {
        const lineupIQGraph = {
            stats: lineupIQs,
            x: "Lineup IQ",
            stat: "%",
            header: "Manager Lineup IQ",
            field: "iq",
            short: "Lineup IQ"
        }

        const potentialPointsGraph = {
            stats: lineupIQs,
            x: "Points",
            stat: "",
            header: "Potential Points vs Points",
            field: "potentialPoints",
            secondField: "fpts",
            short: "Potential Points"
        }

        const winsGraph = {
            stats: winPercentages,
            x: "Wins",
            stat: "",
            header: "Team Wins",
            field: "wins",
            short: "Wins"
        }

        const lossesGraph = {
            stats: winPercentages,
            x: "Losses",
            stat: "",
            header: "Team Losses",
            field: "losses",
            short: "Losses"
        }

        const winPercentagesGraph = {
            stats: winPercentages,
            x: "Win Percentage",
            stat: "%",
            header: "Team Win Percentages",
            field: "percentage",
            short: "Win Percentage"
        }

        const fptsHistoriesGraph = {
            stats: fptsHistories,
            x: "Fantasy Points",
            stat: "",
            header: "Team Fantasy Points",
            field: "fptsFor",
            short: "Fantasy Points"
        }

        const tradesGraph = {
            stats: tradesData,
            x: "# of trades",
            stat: "",
            header: "Number of Trades Managers Have Made",
            field: "trades",
            short: "Trades"
        }

        const waiversGraph = {
            stats: wD,
            x: "# of Waiver Moves",
            stat: "",
            header: "Waivers Moves Managers Have Made",
            field: "waivers",
            short: "Waivers"
        }
        const gs = [];

        if(lineupIQs[0]?.potentialPoints) {
            gs.push(generateGraph(lineupIQGraph, year));
        }
        gs.push(generateGraph(winsGraph, year, 5));
        if(key == "toiletBowlData") {
            lossesOffset = 1;
            gs.push(generateGraph(lossesGraph, year, 5));
        } else {
            lossesOffset = 0;
        }
        gs.push(generateGraph(winPercentagesGraph, year));
        gs.push(generateGraph(fptsHistoriesGraph, year));
        if(lineupIQs[0]?.potentialPoints) {
            gs.push(generateGraph(potentialPointsGraph, year, 10, 0));
        }
        if(key == "regularSeasonData") {
            gs.push(generateGraph(tradesGraph, year));
            gs.push(generateGraph(waiversGraph, year));
        }

        curGraph = 0;
        graphs = gs;
    }

    const setTransactionsAndGraphs = (wD, _winPercentages, _lineupIQs, _fptsHistories, _tradesData, _key) => {
        if(wD[0].rosterID) {
            for(let i = 1; i <= waiversData.length; i++) {
                if(!tradesData.find(t => t.rosterID == i)) {
                    tradesData.push({
                        rosterID: i,
                        trades: 0,
                    })
                }
            }
        }
        if(wD[0].managerID) {
            for(const userID in leagueTeamManagers.users) {
                if(!tradesData.find(t => t.managerID == userID)) {
                    tradesData.push({
                        managerID: userID,
                        trades: 0,
                    })
                }
            }
        }
        const transactions = [];

        for(const w of wD) {
            let trades = 0;
            if(tradesData[0].managerID) {
                trades = tradesData.find(t => t.managerID == w.managerID)?.trades || 0;
            } else if(tradesData[0].rosterID) {
                trades = tradesData.find(t => t.rosterID == w.rosterID)?.trades || 0;
            }
            const waivers = w.waivers;
            transactions.push({
                rosterID: w.rosterID,
                managerID: w.managerID,
                trades,
                waivers,
            })
        }

        setGraphs(wD)
        return transactions;
    }

    const setTables = (lIQs) => {
        const t = [
            "Win Percentages",
            "Points",
        ]
        if(key == "regularSeasonData") {
            t.push("Transactions")
        }
        if(!lIQs[0]?.potentialPoints) {
            iqOffset = 1;
        } else {
            t.unshift('Lineup IQs');
        }
        tables = t
    }

    $: transactions =  setTransactionsAndGraphs(waiversData, winPercentages, lineupIQs, fptsHistories, tradesData, key)
    $: changeTable(curGraph);
    $: changeGraph(curTable);
    $: setTables(lineupIQs)
    
    let innerWidth;

</script>

<svelte:window bind:innerWidth={innerWidth} />

<style>
    :global(.headerPrimary) {
        background-color: var(--headerPrimary);
        text-align: center;
    }

    .italic {
        display: block;
        font-style: italic;
        font-size: 0.9em;
        color: var(--g999);
    }

    :global(.recordTable) {
        box-shadow: 0px 3px 3px -2px var(--boxShadowOne), 0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
        margin: 2em;
    }

    :global(.rankingTable) {
        display: table;
        box-shadow: 0px 3px 3px -2px var(--boxShadowOne), 0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
        margin: 2em auto 0.5em;
    }

    .fullFlex {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        margin: 3em auto 5em;
    }

    .rankingHolder {
        display: block;
        width: 100%;
        overflow-x: hidden;
    }

    .subTitle {
        font-style: italic;
        font-size: 0.7em;
        color: #888;
        line-height: 1.2em;
    }

    h4 {
        text-align: center;
        margin: 2em 0 1em;
    }

    .rankingTableWrapper {
        width: 25%;
    }

    .rankingInner {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        width: 400%;
		transition: margin-left 0.8s;
    }

    .buttonHolder {
        text-align: center;
        margin: 2em 0 4em;
    }

    :global(.cellName) {
        cursor: pointer;
        line-height: 1.2em;
        padding-left: 8px;
    }

    :global(.sortableHeader) {
        cursor: pointer;
        user-select: none;
    }

    :global(.sortableHeader:hover) {
        background-color: var(--headerHover, rgba(0,0,0,0.04));
    }

    .sortIndicator {
        display: inline-block;
        margin-left: 4px;
        font-size: 0.8em;
    }

    :global(.differentialName) {
        padding: 0.7em 0;
    }

    :global(.rank) {
        padding-right: 0;
    }

    .vs {
        padding-left: 0.6em;
        margin: 0.5em 0;
    }

    :global(.mdc-data-table__cell, .mdc-data-table__header-cell) {
        border-bottom-color: var(--borderOverride);
    }

    /* Start button resizing */

    @media (max-width: 540px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.6em;
        }
    }

    @media (max-width: 415px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.5em;
            padding: 0 6px;
            height: 30px;
        }
    }

    @media (max-width: 315px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.45em;
            padding: 0 3px;
        }
    }

    @media (max-width: 265px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.4em;
            padding: 0 2px;
            height: 24px;
            min-width: 40px;
        }
    }

    /* End button resizing */

    /* Start record table resizing */

    @media (max-width: 510px) {
        :global(.recordTable th) {
            font-size: 0.8em;
            padding: 1px 12px;
        }
        :global(.recordTable td) {
            font-size: 0.8em;
            padding: 1px 12px;
        }

        .vsRecord {
            margin: .6em 0;
        }
    }

    @media (max-width: 480px) {
        :global(.rank) {
            padding: 1px 0 1px 5px !important;
        }
        :global(.rank) {
            padding: 1px 0 1px 5px !important;
        }
    }

    @media (max-width: 460px) {
        :global(.recordTable th) {
            font-size: 0.6em;
            padding: 1px 12px;
        }
        :global(.recordTable td) {
            font-size: 0.6em;
            padding: 1px 12px;
        }
    }

    @media (max-width: 365px) {
        :global(.recordTable th) {
            font-size: 0.5em;
            padding: 1px 8px;
        }
        :global(.recordTable td) {
            font-size: 0.5em;
            padding: 1px 8px;
        }
    }

    @media (max-width: 265px) {
        :global(.recordTable th) {
            font-size: 0.4em;
            padding: 1px 5px;
        }
        :global(.recordTable td) {
            font-size: 0.4em;
            padding: 1px 5px;
        }
    }

    /* END record table resizing */

    /* Start ranking table resizing */

    @media (max-width: 570px) {
        :global(.rankingTable th) {
            font-size: 0.8em;
            max-width: 110px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
        :global(.rankingTable td) {
            font-size: 0.8em;
            max-width: 110px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
    }

    @media (max-width: 410px) {
        :global(.rankingTable th) {
            font-size: 0.6em;
            max-width: 90px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
        :global(.rankingTable td) {
            font-size: 0.6em;
            max-width: 90px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
    }

    @media (max-width: 340px) {
        :global(.rankingTable th) {
            font-size: 0.55em;
            max-width: 80px;
            white-space: break-spaces;
            padding: 1px 6px;
        }
        :global(.rankingTable td) {
            font-size: 0.55em;
            max-width: 80px;
            white-space: break-spaces;
            padding: 1px 6px;
        }
    }

    /* END ranking table resizing */
</style>

<h4>{prefix} Records</h4>

<div class="fullFlex">
    {#if weekRecords && weekRecords.length}
        <DataTable class="recordTable">
            <Head>
                <Row class="rTableHeader">
                    <Cell class="header headerPrimary" colspan=4>{prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Single Week Scoring Records</Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Manager</Cell>
                    <Cell class="header">Week</Cell>
                    <Cell class="header">Total Points</Cell>
                </Row>
            </Head>
            <Body>
                {#each weekRecords as leagueWeekRecord, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName" on:click={() => gotoManager({year: leagueWeekRecord.year || prefix, leagueTeamManagers, rosterID: leagueWeekRecord.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leagueWeekRecord.rosterID} year={allTime ? leagueWeekRecord.year : prefix} />
                        </Cell>
                        <Cell>{allTime ? leagueWeekRecord.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{leagueWeekRecord.week}</Cell>
                        <Cell>{round(leagueWeekRecord.fpts)}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}

    {#if weekLows && weekLows.length}
        <DataTable class="recordTable">
            <Head>
                <Row>
                    <Cell class="header headerPrimary" colspan=4>{prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Single Week Scoring Lows</Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Manager</Cell>
                    <Cell class="header">Week</Cell>
                    <Cell class="header">Total Points</Cell>
                </Row>
            </Head>
            <Body>
                {#each weekLows as leagueWeekLow, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName" on:click={() => gotoManager({year: leagueWeekLow.year || prefix, leagueTeamManagers, rosterID: leagueWeekLow.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leagueWeekLow.rosterID} year={allTime ? leagueWeekLow.year : prefix} />
                        </Cell>
                        <Cell>{allTime ? leagueWeekLow.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{leagueWeekLow.week}</Cell>
                        <Cell>{round(leagueWeekLow.fpts)}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}

    {#if allTime && key == "regularSeasonData"}
        <DataTable class="recordTable">
            <Head>
                <Row>
                    <Cell class="header headerPrimary" colspan=5>All-Time Highest Season Points<span class="italic">Ranked by PPG</span></Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Manager</Cell>
                    <Cell class="header">Year</Cell>
                    <Cell class="header">Total Points</Cell>
                    <Cell class="header">PPG</Cell>
                </Row>
            </Head>
            <Body>
                {#each seasonLongRecords as mostSeasonLongPoint, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName" on:click={() => gotoManager({year: mostSeasonLongPoint.year, leagueTeamManagers, rosterID: mostSeasonLongPoint.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={mostSeasonLongPoint.rosterID} year={mostSeasonLongPoint.year} />
                        </Cell>
                        <Cell>{mostSeasonLongPoint.year}</Cell>
                        <Cell>{round(mostSeasonLongPoint.fpts)}</Cell>
                        <Cell>{mostSeasonLongPoint.fptsPerGame}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}
    
    {#if allTime && key == "regularSeasonData"}
        <DataTable class="recordTable">
            <Head>
                <Row>
                    <Cell class="header headerPrimary" colspan=5>All-Time Lowest Season Points<span class="italic">Ranked by PPG</span></Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Manager</Cell>
                    <Cell class="header">Year</Cell>
                    <Cell class="header">Total Points</Cell>
                    <Cell class="header">PPG</Cell>
                </Row>
            </Head>
            <Body>
                {#each seasonLongLows as leastSeasonLongPoint, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName" on:click={() => gotoManager({year: leastSeasonLongPoint.year, leagueTeamManagers, rosterID: leastSeasonLongPoint.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leastSeasonLongPoint.rosterID} year={leastSeasonLongPoint.year} />
                        </Cell>
                        <Cell>{leastSeasonLongPoint.year}</Cell>
                        <Cell>{round(leastSeasonLongPoint.fpts)}</Cell>
                        <Cell>{leastSeasonLongPoint.fptsPerGame}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}

    {#if blowouts && blowouts.length}
        <DataTable class="recordTable">
            <Head>
                <Row>
                    <Cell class="header headerPrimary" colspan=4>{prefix} Largest {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Blowouts</Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Matchup</Cell>
                    <Cell class="header">Week</Cell>
                    <Cell class="header">Differential</Cell>
                </Row>
            </Head>
            <Body>
                {#each blowouts as blowout, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName differentialName">
                            <div class="vsRecord">
                                <div on:click={() => gotoManager({year: blowout.year || prefix, leagueTeamManagers, rosterID: blowout.home.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={blowout.home.rosterID} year={allTime ? blowout.year : prefix} compressed={true} points={round(blowout.home.fpts)} />
                                </div>
                                <p class="vs">
                                    vs
                                </p>
                                <div on:click={() => gotoManager({year: blowout.year || prefix, leagueTeamManagers, rosterID: blowout.away.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={blowout.away.rosterID} year={allTime ? blowout.year : prefix} compressed={true} points={round(blowout.away.fpts)} />
                                </div>
                            </div>
                        </Cell>
                        <Cell>{allTime ? blowout.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{blowout.week}</Cell>
                        <Cell>{round(blowout.differential)}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}

    {#if closestMatchups && closestMatchups.length}
        <DataTable class="recordTable">
            <Head>
                <Row>
                    <Cell class="header headerPrimary" colspan=4>{prefix} Narrowest {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Wins</Cell>
                </Row>
                <Row>
                    <Cell class="header rank"></Cell>
                    <Cell class="header">Matchup</Cell>
                    <Cell class="header">Week</Cell>
                    <Cell class="header">Differential</Cell>
                </Row>
            </Head>
            <Body>
                {#each closestMatchups as closestMatchup, ix}
                    <Row>
                        <Cell class="rank">{ix + 1}</Cell>
                        <Cell class="cellName differentialName">
                            <div class="vsRecord">
                                <div on:click={() => gotoManager({year: closestMatchup.year || prefix, leagueTeamManagers, rosterID: closestMatchup.home.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={closestMatchup.home.rosterID} year={allTime ? closestMatchup.year : prefix} compressed={true} points={round(closestMatchup.home.fpts)} />
                                </div>
                                <p class="vs">
                                    vs
                                </p>
                                <div on:click={() => gotoManager({year: closestMatchup.year || prefix, leagueTeamManagers, rosterID: closestMatchup.away.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={closestMatchup.away.rosterID} year={allTime ? closestMatchup.year : prefix} compressed={true} points={round(closestMatchup.away.fpts)} />
                                </div>
                            </div>
                        </Cell>
                        <Cell>{allTime ? closestMatchup.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{closestMatchup.week}</Cell>
                        <Cell>{round(closestMatchup.differential)}</Cell>
                    </Row>
                {/each}
            </Body>
        </DataTable>
    {/if}
</div>

<h4>{prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Rankings</h4>

{#if graphs.length}
    <BarChart {graphs} bind:curGraph={curGraph} {leagueTeamManagers} />
{/if}

<div class="rankingHolder">
    <div class="rankingInner" style="margin-left: -{100 * curTable}%;">
        {#if lineupIQs[0]?.potentialPoints}
            <div class="rankingTableWrapper">
                <DataTable class="rankingTable">
                    <Head>
                        <Row>
                            <Cell class="header headerPrimary" colspan=5>
                                {prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Lineup IQ Rankings
                                <div class="subTitle">
                                    The percentage of potential points each manager has captured
                                </div>
                            </Cell>
                        </Row>
                        <Row>
                            <Cell class="header">#</Cell>
                            <Cell class="header">Manager</Cell>
                            <Cell class="header sortableHeader" on:click={() => handleSort('lineupIQ', 'iq')}>
                                Lineup IQ
                                {#if sortState.lineupIQ.column === 'iq'}
                                    <span class="sortIndicator">{sortState.lineupIQ.direction === 'desc' ? '▼' : '▲'}</span>
                                {/if}
                            </Cell>
                            <Cell class="header sortableHeader" on:click={() => handleSort('lineupIQ', 'fpts')}>
                                Points
                                {#if sortState.lineupIQ.column === 'fpts'}
                                    <span class="sortIndicator">{sortState.lineupIQ.direction === 'desc' ? '▼' : '▲'}</span>
                                {/if}
                            </Cell>
                            <Cell class="header sortableHeader" on:click={() => handleSort('lineupIQ', 'potentialPoints')}>
                                Potential Points
                                {#if sortState.lineupIQ.column === 'potentialPoints'}
                                    <span class="sortIndicator">{sortState.lineupIQ.direction === 'desc' ? '▼' : '▲'}</span>
                                {/if}
                            </Cell>
                        </Row>
                    </Head>
                    <Body>
                        {#each sortedLineupIQs as lineupIQ, ix}
                            <Row>
                                <Cell>{ix + 1}</Cell>
                                <Cell class="cellName" on:click={() => gotoManager({year: lineupIQ.year || prefix, leagueTeamManagers, managerID: lineupIQ.managerID, rosterID: lineupIQ.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} managerID={lineupIQ.managerID} rosterID={lineupIQ.rosterID} year={allTime ? lineupIQ.year : prefix} />
                                </Cell>
                                <Cell>{lineupIQ.iq}%</Cell>
                                <Cell>{round(lineupIQ.fpts)}</Cell>
                                <Cell>{round(lineupIQ.potentialPoints)}</Cell>
                            </Row>
                        {/each}
                    </Body>
                </DataTable>
            </div>
        {/if}

        <div class="rankingTableWrapper">
            <DataTable class="rankingTable">
                <Head>
                    <Row>
                        <Cell class="header headerPrimary" colspan=6>{prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Win Percentages Rankings</Cell>
                    </Row>
                    <Row>
                        <Cell class="header">#</Cell>
                        <Cell class="header">Manager</Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('winPct', 'percentage')}>
                            Win %
                            {#if sortState.winPct.column === 'percentage'}
                                <span class="sortIndicator">{sortState.winPct.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('winPct', 'wins')}>
                            Wins
                            {#if sortState.winPct.column === 'wins'}
                                <span class="sortIndicator">{sortState.winPct.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                        {#if showTies}
                            <Cell class="header sortableHeader" on:click={() => handleSort('winPct', 'ties')}>
                                Ties
                                {#if sortState.winPct.column === 'ties'}
                                    <span class="sortIndicator">{sortState.winPct.direction === 'desc' ? '▼' : '▲'}</span>
                                {/if}
                            </Cell>
                        {/if}
                        <Cell class="header sortableHeader" on:click={() => handleSort('winPct', 'losses')}>
                            Losses
                            {#if sortState.winPct.column === 'losses'}
                                <span class="sortIndicator">{sortState.winPct.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                    </Row>
                </Head>
                <Body>
                    {#each sortedWinPercentages as winPercentage, ix (winPercentage.rosterID + '-' + ix + '-' + key)}
                        <Row>
                            <Cell>{ix + 1}</Cell>
                            <Cell class="cellName" on:click={() => gotoManager({year: winPercentage.year || prefix, leagueTeamManagers, rosterID: winPercentage.rosterID, managerID: winPercentage.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={winPercentage.managerID} rosterID={winPercentage.rosterID} year={allTime ? winPercentage.year : prefix} />
                            </Cell>
                            <Cell>{winPercentage.percentage}%</Cell>
                            <Cell>{winPercentage.wins}</Cell>
                            {#if showTies}
                                <Cell>{winPercentage.ties}</Cell>
                            {/if}
                            <Cell>{winPercentage.losses}</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>

        <div class="rankingTableWrapper">
            <DataTable class="rankingTable">
                <Head>
                    <Row>
                        <Cell class="header headerPrimary" colspan=5>
                            {prefix} {key == "playoffData" ? "Playoff " : key == "toiletBowlData" ? "Toilet Bowl " : ""}Fantasy Points Rankings
                        </Cell>
                    </Row>
                    <Row>
                        <Cell class="header">#</Cell>
                        <Cell class="header">Manager</Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('fpts', 'fptsFor')}>
                            Points For
                            {#if sortState.fpts.column === 'fptsFor'}
                                <span class="sortIndicator">{sortState.fpts.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('fpts', 'fptsAgainst')}>
                            Points Against
                            {#if sortState.fpts.column === 'fptsAgainst'}
                                <span class="sortIndicator">{sortState.fpts.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('fpts', 'fptsPerGame')}>
                            Points Per Game
                            {#if sortState.fpts.column === 'fptsPerGame'}
                                <span class="sortIndicator">{sortState.fpts.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                    </Row>
                </Head>
                <Body>
                    {#each sortedFptsHistories as fptsHistory, ix}
                        <Row>
                            <Cell>{ix + 1}</Cell>
                            <Cell class="cellName" on:click={() => gotoManager({year: fptsHistory.year || prefix, leagueTeamManagers, rosterID: fptsHistory.rosterID, managerID: fptsHistory.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={fptsHistory.managerID} rosterID={fptsHistory.rosterID} year={allTime ? fptsHistory.year : prefix} />
                            </Cell>
                            <Cell>{round(fptsHistory.fptsFor)}</Cell>
                            <Cell>{round(fptsHistory.fptsAgainst)}</Cell>
                            <Cell>{round(fptsHistory.fptsPerGame)}</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>

        <div class="rankingTableWrapper">
            <DataTable class="rankingTable">
                <Head>
                    <Row>
                        <Cell class="header headerPrimary" colspan=4>
                            {prefix} Transaction Totals
                        </Cell>
                    </Row>
                    <Row>
                        <Cell class="header">#</Cell>
                        <Cell class="header">Manager</Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('transactions', 'trades')}>
                            Trades
                            {#if sortState.transactions.column === 'trades'}
                                <span class="sortIndicator">{sortState.transactions.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                        <Cell class="header sortableHeader" on:click={() => handleSort('transactions', 'waivers')}>
                            Waivers
                            {#if sortState.transactions.column === 'waivers'}
                                <span class="sortIndicator">{sortState.transactions.direction === 'desc' ? '▼' : '▲'}</span>
                            {/if}
                        </Cell>
                    </Row>
                </Head>
                <Body>
                    {#each sortedTransactions as transaction, ix}
                        <Row>
                            <Cell>{ix + 1}</Cell>
                            <Cell class="cellName" on:click={() => gotoManager({year: transaction.year || prefix, leagueTeamManagers, rosterID: transaction.rosterID, managerID: transaction.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={transaction.managerID} rosterID={transaction.rosterID} year={allTime ? transaction.year : prefix} />
                            </Cell>
                            <Cell>{transaction.trades}</Cell>
                            <Cell>{transaction.waivers}</Cell>
                        </Row>
                    {/each}
                </Body>
            </DataTable>
        </div>

    </div>
</div>

<div class="buttonHolder">
    <Group variant="outlined">
        {#each tables as table, ix}
            <Button class="selectionButtons" on:click={() => curTable = ix} variant="{curTable == ix ? "raised" : "outlined"}">
                <Label>{table}</Label>
            </Button>
        {/each}
    </Group>
</div>
