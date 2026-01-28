<script>
	import { getValueColor } from '$lib/utils/helper';

	export let teamGrades = [];
	export let picks = [];

	// Calculate league-wide position breakdown
	$: positionStats = calculatePositionStats(picks);

	const calculatePositionStats = (allPicks) => {
		const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
		const stats = {};

		for (const pos of positions) {
			const posPicks = allPicks.filter(p => p.position === pos);
			if (posPicks.length === 0) continue;

			const totalDraftCapital = posPicks.reduce((sum, p) => sum + (allPicks.length - p.overallPick + 1), 0);
			const totalPoints = posPicks.reduce((sum, p) => sum + p.totalPoints, 0);
			const validPicks = posPicks.filter(p => p.overallValue !== null);
			const totalValue = validPicks.reduce((sum, p) => sum + p.overallValue, 0);
			const avgValue = validPicks.length > 0 ? totalValue / validPicks.length : 0;

			stats[pos] = {
				picks: posPicks.length,
				draftCapital: totalDraftCapital,
				totalPoints: Math.round(totalPoints),
				avgValue: Math.round(avgValue * 10) / 10,
				efficiency: totalDraftCapital > 0 ? Math.round((totalPoints / totalDraftCapital) * 100) / 100 : 0,
				sleepers: posPicks.filter(p => p.isSleeper).length,
				busts: posPicks.filter(p => p.isBust).length
			};
		}

		return stats;
	};

	// Sort teams by efficiency
	$: rankedByEfficiency = [...teamGrades].sort((a, b) => b.efficiency - a.efficiency);

	// Get position color
	const positionColors = {
		'QB': '#ef4444',
		'RB': '#22c55e',
		'WR': '#3b82f6',
		'TE': '#f97316',
		'K': '#8b5cf6',
		'DEF': '#6b7280'
	};
</script>

<style>
	.analyticsContainer {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5em;
	}

	.analyticsCard {
		background-color: var(--fff);
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.cardHeader {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.75em 1em;
		background-color: var(--f5f5);
		border-bottom: 1px solid var(--eee);
		font-weight: 600;
		font-size: 0.95em;
		color: var(--g333);
	}

	.cardHeader i {
		color: var(--blueOne);
		font-size: 20px;
	}

	.cardBody {
		padding: 1em;
	}

	/* Efficiency Leaderboard */
	.efficiencyList {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.efficiencyItem {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.5em 0;
		border-bottom: 1px solid var(--eee);
	}

	.efficiencyItem:last-child {
		border-bottom: none;
	}

	.rank {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 0.75em;
		font-weight: 600;
		background-color: var(--f5f5);
		color: var(--g555);
	}

	.rank.top3 {
		background-color: #fef3c7;
		color: #d97706;
	}

	.teamName {
		flex: 1;
		font-weight: 500;
		font-size: 0.9em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.efficiencyValue {
		font-weight: 600;
		font-size: 0.9em;
		padding: 0.25em 0.5em;
		border-radius: 4px;
		background-color: var(--f5f5);
	}

	.efficiencyValue.high {
		background-color: rgba(0, 168, 148, 0.15);
		color: #00a894;
	}

	.efficiencyValue.low {
		background-color: rgba(255, 42, 109, 0.15);
		color: #ff2a6d;
	}

	/* Position Strategy */
	.positionTable {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85em;
	}

	.positionTable th {
		text-align: left;
		padding: 0.5em;
		border-bottom: 2px solid var(--eee);
		color: var(--g999);
		font-weight: 500;
		font-size: 0.9em;
	}

	.positionTable th:not(:first-child) {
		text-align: center;
	}

	.positionTable td {
		padding: 0.5em;
		border-bottom: 1px solid var(--eee);
	}

	.positionTable td:not(:first-child) {
		text-align: center;
	}

	.positionTable tr:last-child td {
		border-bottom: none;
	}

	.positionBadge {
		display: inline-block;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		font-weight: 600;
		color: white;
		font-size: 0.85em;
	}

	.valueCell {
		font-weight: 600;
	}

	.valueCell.positive {
		color: #00a894;
	}

	.valueCell.negative {
		color: #ff2a6d;
	}

	/* Sleeper/Bust Summary */
	.highlightGrid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1em;
	}

	.highlightSection {
		background-color: var(--f5f5);
		border-radius: 8px;
		padding: 0.75em;
	}

	.highlightTitle {
		display: flex;
		align-items: center;
		gap: 0.5em;
		font-weight: 600;
		font-size: 0.85em;
		margin-bottom: 0.5em;
	}

	.highlightTitle.sleeper {
		color: #d97706;
	}

	.highlightTitle.bust {
		color: #dc2626;
	}

	.highlightTitle i {
		font-size: 16px;
	}

	.highlightList {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.highlightList li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25em 0;
		font-size: 0.8em;
	}

	.playerName {
		color: var(--g333);
	}

	.pickInfo {
		color: var(--g999);
		font-size: 0.9em;
	}

	.emptyState {
		color: var(--g999);
		font-style: italic;
		font-size: 0.85em;
		text-align: center;
		padding: 0.5em;
	}
</style>

<div class="analyticsContainer">
	<!-- Efficiency Leaderboard -->
	<div class="analyticsCard">
		<div class="cardHeader">
			<i class="material-icons">speed</i>
			Draft Efficiency Rankings
		</div>
		<div class="cardBody">
			<ul class="efficiencyList">
				{#each rankedByEfficiency as team, i}
					<li class="efficiencyItem">
						<span class="rank" class:top3={i < 3}>{i + 1}</span>
						<span class="teamName">{team.team?.name || `Team ${team.rosterID}`}</span>
						<span class="efficiencyValue" class:high={team.efficiency >= 1.1} class:low={team.efficiency <= 0.7}>
							{team.efficiency}x
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- Position Strategy -->
	<div class="analyticsCard">
		<div class="cardHeader">
			<i class="material-icons">category</i>
			Position Analysis
		</div>
		<div class="cardBody">
			<table class="positionTable">
				<thead>
					<tr>
						<th>Position</th>
						<th>Picks</th>
						<th>Avg Value</th>
						<th>Pts/Cap</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(positionStats) as [pos, stats]}
						<tr>
							<td>
								<span class="positionBadge" style="background-color: {positionColors[pos]};">
									{pos}
								</span>
							</td>
							<td>{stats.picks}</td>
							<td class="valueCell" class:positive={stats.avgValue > 0} class:negative={stats.avgValue < 0}>
								{stats.avgValue > 0 ? '+' : ''}{stats.avgValue}
							</td>
							<td>{stats.efficiency}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Sleepers and Busts -->
	<div class="analyticsCard">
		<div class="cardHeader">
			<i class="material-icons">insights</i>
			Sleepers & Busts
		</div>
		<div class="cardBody">
			<div class="highlightGrid">
				<div class="highlightSection">
					<div class="highlightTitle sleeper">
						<i class="material-icons">star</i>
						Top Sleepers
					</div>
					<ul class="highlightList">
						{#each picks.filter(p => p.isSleeper).sort((a, b) => (b.overallValue || 0) - (a.overallValue || 0)).slice(0, 5) as pick}
							<li>
								<span class="playerName">{pick.playerName}</span>
								<span class="pickInfo">Rd {pick.round} → #{pick.actualOverallRank}</span>
							</li>
						{:else}
							<li class="emptyState">No sleepers found</li>
						{/each}
					</ul>
				</div>
				<div class="highlightSection">
					<div class="highlightTitle bust">
						<i class="material-icons">trending_down</i>
						Biggest Busts
					</div>
					<ul class="highlightList">
						{#each picks.filter(p => p.isBust).sort((a, b) => (a.overallValue || 0) - (b.overallValue || 0)).slice(0, 5) as pick}
							<li>
								<span class="playerName">{pick.playerName}</span>
								<span class="pickInfo">Rd {pick.round} → #{pick.actualOverallRank || 'N/A'}</span>
							</li>
						{:else}
							<li class="emptyState">No busts found</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
