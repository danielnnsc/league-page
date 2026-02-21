<script>
	import { getGradeColor, COMBINED_WEIGHTS } from '$lib/utils/helper';

	export let teamGrades = [];

	// Track tooltip visibility per card and per element
	let activeTooltip = null; // Format: "rosterID-type" or null

	const showTooltip = (rosterID, type) => {
		activeTooltip = `${rosterID}-${type}`;
	};

	const hideTooltip = () => {
		activeTooltip = null;
	};

	const getTeamAvatar = (team) => {
		if (team?.avatar) {
			return `https://sleepercdn.com/avatars/thumbs/${team.avatar}`;
		}
		return 'https://sleepercdn.com/images/v2/icons/player_default.webp';
	};

	// Calculate position bar width (0-100%)
	const getPositionBarWidth = (posData) => {
		if (!posData || !posData.efficiency) return 0;
		// Cap at 100%, scale efficiency (1.0 = 50%, 2.0 = 100%)
		return Math.min(100, posData.efficiency * 50);
	};

	// Get position bar color based on efficiency
	const getPositionBarColor = (posData) => {
		if (!posData) return '#9ca3af';
		const eff = posData.efficiency || 0;
		if (eff >= 1.5) return '#059669';
		if (eff >= 1.0) return '#84cc16';
		if (eff >= 0.7) return '#f59e0b';
		return '#ef4444';
	};
</script>

<style>
	.summaryGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1em;
	}

	.teamCard {
		background-color: var(--fff);
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: visible;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.teamCard:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.cardHeader {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.75em 1em;
		background-color: var(--f5f5);
		border-bottom: 1px solid var(--eee);
		border-radius: 10px 10px 0 0;
	}

	.teamAvatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		object-fit: cover;
	}

	.teamInfo {
		flex: 1;
		min-width: 0;
	}

	.teamName {
		font-weight: 600;
		font-size: 0.9em;
		color: var(--g333);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.teamMeta {
		font-size: 0.75em;
		color: var(--g999);
	}

	.gradeBoxWrapper {
		position: relative;
	}

	.gradeBox {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.2em;
		color: white;
		cursor: pointer;
	}

	.gradeLabel {
		font-size: 0.5em;
		font-weight: 400;
		opacity: 0.9;
	}

	.cardBody {
		padding: 0.75em 1em;
	}

	/* 3-column grade boxes */
	.gradeGrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5em;
		margin-bottom: 0.75em;
	}

	.gradeStatWrapper {
		position: relative;
	}

	.gradeStat {
		text-align: center;
		padding: 0.5em;
		background-color: var(--f5f5);
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.gradeStat:hover {
		background-color: var(--eee);
	}

	.gradeStatValue {
		font-weight: 700;
		font-size: 1.1em;
		padding: 0.15em 0.4em;
		border-radius: 4px;
		color: white;
	}

	.gradeStatLabel {
		font-size: 0.7em;
		color: var(--g999);
		margin-top: 0.25em;
	}

	/* Position breakdown bars */
	.positionSection {
		margin-bottom: 0.75em;
	}

	.positionLabel {
		font-size: 0.7em;
		color: var(--g999);
		margin-bottom: 0.35em;
	}

	.positionBars {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.35em 0.75em;
	}

	.posBar {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	.posName {
		font-size: 0.65em;
		font-weight: 600;
		color: var(--g666);
		width: 24px;
	}

	.posBarTrack {
		flex: 1;
		height: 6px;
		background-color: var(--eee);
		border-radius: 3px;
		overflow: hidden;
	}

	.posBarFill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	/* Tooltips */
	.tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		background-color: #1f2937;
		color: white;
		padding: 0.6em 0.8em;
		border-radius: 6px;
		font-size: 0.75em;
		white-space: nowrap;
		z-index: 100;
		margin-bottom: 8px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.3);
	}

	.tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: #1f2937;
	}

	.tooltipTitle {
		font-weight: 600;
		margin-bottom: 0.4em;
		padding-bottom: 0.3em;
		border-bottom: 1px solid rgba(255,255,255,0.2);
	}

	.tooltipRow {
		display: flex;
		justify-content: space-between;
		gap: 1em;
		margin: 0.2em 0;
	}

	.tooltipLabel {
		color: rgba(255,255,255,0.7);
	}

	.tooltipValue {
		font-weight: 500;
	}

	.tooltipDivider {
		border-top: 1px solid rgba(255,255,255,0.2);
		margin: 0.4em 0;
	}

	.tooltipMeta {
		font-size: 0.9em;
		color: rgba(255,255,255,0.6);
		margin-top: 0.3em;
	}

	.highlightSection {
		display: flex;
		gap: 0.5em;
	}

	.highlightBox {
		flex: 1;
		padding: 0.5em;
		border-radius: 6px;
		font-size: 0.75em;
	}

	.highlightBox.best {
		background-color: rgba(0, 168, 148, 0.1);
		border: 1px solid rgba(0, 168, 148, 0.2);
	}

	.highlightBox.worst {
		background-color: rgba(255, 42, 109, 0.1);
		border: 1px solid rgba(255, 42, 109, 0.2);
	}

	.highlightLabel {
		font-size: 0.85em;
		color: var(--g999);
		margin-bottom: 0.25em;
	}

	.highlightPlayer {
		font-weight: 500;
		color: var(--g333);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.highlightValue {
		font-weight: 600;
	}

	.highlightValue.positive {
		color: #00a894;
	}

	.highlightValue.negative {
		color: #ff2a6d;
	}

	.badges {
		display: flex;
		gap: 0.5em;
		margin-top: 0.5em;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		font-size: 0.7em;
		font-weight: 500;
	}

	.badge.sleeper {
		background-color: #fef3c7;
		color: #d97706;
	}

	.badge.bust {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.badge i {
		font-size: 12px;
	}

	@media (max-width: 600px) {
		.summaryGrid {
			grid-template-columns: 1fr;
		}
	}
</style>

<div class="summaryGrid">
	{#each teamGrades as team (team.rosterID)}
		<div class="teamCard">
			<div class="cardHeader">
				<img
					class="teamAvatar"
					src={getTeamAvatar(team.team)}
					alt=""
					onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'"
				/>
				<div class="teamInfo">
					<div class="teamName">{team.team?.name || `Team ${team.rosterID}`}</div>
					<div class="teamMeta">{team.picks.length} picks</div>
				</div>
				<div class="gradeBoxWrapper">
					<div
						class="gradeBox"
						style="background-color: {getGradeColor(team.combinedGrade || team.avgGrade)};"
						on:mouseenter={() => showTooltip(team.rosterID, 'overall')}
						on:mouseleave={hideTooltip}
					>
						{team.combinedGrade || team.avgGrade}
						<span class="gradeLabel">Grade</span>
					</div>
					{#if activeTooltip === `${team.rosterID}-overall`}
						<div class="tooltip">
							<div class="tooltipTitle">Overall Grade: {team.combinedGrade || team.avgGrade} ({team.combinedScore || '—'}/100)</div>
							<div class="tooltipRow">
								<span class="tooltipLabel">Value</span>
								<span class="tooltipValue">{team.valueGrade || '—'} ({team.valueScore || '—'}/100) × {COMBINED_WEIGHTS.value * 100}%</span>
							</div>
							<div class="tooltipRow">
								<span class="tooltipLabel">Points</span>
								<span class="tooltipValue">{team.pointsGrade || '—'} ({team.pointsScore || '—'}/100) × {COMBINED_WEIGHTS.points * 100}%</span>
							</div>
							<div class="tooltipRow">
								<span class="tooltipLabel">Efficiency</span>
								<span class="tooltipValue">{team.efficiencyGrade || '—'} ({team.efficiencyScore || '—'}/100) × {COMBINED_WEIGHTS.efficiency * 100}%</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div class="cardBody">
				<!-- 3 Letter Grade Boxes -->
				<div class="gradeGrid">
					<div class="gradeStatWrapper">
						<div
							class="gradeStat"
							on:mouseenter={() => showTooltip(team.rosterID, 'value')}
							on:mouseleave={hideTooltip}
						>
							<div class="gradeStatValue" style="background-color: {getGradeColor(team.valueGrade || 'C')};">
								{team.valueGrade || '—'}
							</div>
							<div class="gradeStatLabel">Value</div>
						</div>
						{#if activeTooltip === `${team.rosterID}-value`}
							<div class="tooltip">
								<div class="tooltipTitle">Value Grade: {team.valueGrade || '—'}</div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Formula</span>
									<span class="tooltipValue">draftPos - actualFinish</span>
								</div>
								<div class="tooltipDivider"></div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Your Avg Value</span>
									<span class="tooltipValue">{team.avgValue >= 0 ? '+' : ''}{team.avgValue}</span>
								</div>
								<div class="tooltipRow">
									<span class="tooltipLabel">League Range</span>
									<span class="tooltipValue">{team.leagueMinValue} to {team.leagueMaxValue}</span>
								</div>
							</div>
						{/if}
					</div>

					<div class="gradeStatWrapper">
						<div
							class="gradeStat"
							on:mouseenter={() => showTooltip(team.rosterID, 'points')}
							on:mouseleave={hideTooltip}
						>
							<div class="gradeStatValue" style="background-color: {getGradeColor(team.pointsGrade || 'C')};">
								{team.pointsGrade || '—'}
							</div>
							<div class="gradeStatLabel">Points</div>
						</div>
						{#if activeTooltip === `${team.rosterID}-points`}
							<div class="tooltip">
								<div class="tooltipTitle">Points Grade: {team.pointsGrade || '—'}</div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Formula</span>
									<span class="tooltipValue">Total fantasy points</span>
								</div>
								<div class="tooltipDivider"></div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Your Total</span>
									<span class="tooltipValue">{Math.round(team.totalPoints || 0)} pts</span>
								</div>
								<div class="tooltipRow">
									<span class="tooltipLabel">League Range</span>
									<span class="tooltipValue">{team.leagueMinPoints} to {team.leagueMaxPoints}</span>
								</div>
							</div>
						{/if}
					</div>

					<div class="gradeStatWrapper">
						<div
							class="gradeStat"
							on:mouseenter={() => showTooltip(team.rosterID, 'efficiency')}
							on:mouseleave={hideTooltip}
						>
							<div class="gradeStatValue" style="background-color: {getGradeColor(team.efficiencyGrade || 'C')};">
								{team.efficiencyGrade || '—'}
							</div>
							<div class="gradeStatLabel">Efficiency</div>
						</div>
						{#if activeTooltip === `${team.rosterID}-efficiency`}
							<div class="tooltip">
								<div class="tooltipTitle">Efficiency Grade: {team.efficiencyGrade || '—'}</div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Formula</span>
									<span class="tooltipValue">Finish Quality × Value Multiplier</span>
								</div>
								<div class="tooltipDivider"></div>
								<div class="tooltipRow">
									<span class="tooltipLabel">Avg Eff Score</span>
									<span class="tooltipValue">{team.avgEfficiencyScore || '—'}</span>
								</div>
								<div class="tooltipMeta">Early picks held to higher standards</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Position Performance Bars -->
				{#if team.positionBreakdown && Object.keys(team.positionBreakdown).length > 0}
					<div class="positionSection">
						<div class="positionLabel">Position Performance</div>
						<div class="positionBars">
							{#each ['QB', 'RB', 'WR', 'TE'] as pos}
								{#if team.positionBreakdown[pos]}
									<div class="posBar">
										<span class="posName">{pos}</span>
										<div class="posBarTrack">
											<div
												class="posBarFill"
												style="width: {getPositionBarWidth(team.positionBreakdown[pos])}%; background-color: {getPositionBarColor(team.positionBreakdown[pos])};"
											></div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="highlightSection">
					{#if team.bestPick}
						<div class="highlightBox best">
							<div class="highlightLabel">Best Pick</div>
							<div class="highlightPlayer">{team.bestPick.playerName}</div>
							<span class="highlightValue positive">+{team.bestPick.overallValue}</span>
						</div>
					{/if}
					{#if team.worstPick}
						<div class="highlightBox worst">
							<div class="highlightLabel">Worst Pick</div>
							<div class="highlightPlayer">{team.worstPick.playerName}</div>
							<span class="highlightValue negative">{team.worstPick.overallValue}</span>
						</div>
					{/if}
				</div>

				{#if team.sleeperCount > 0 || team.bustCount > 0}
					<div class="badges">
						{#if team.sleeperCount > 0}
							<span class="badge sleeper">
								<i class="material-icons">star</i>
								{team.sleeperCount} Sleeper{team.sleeperCount > 1 ? 's' : ''}
							</span>
						{/if}
						{#if team.bustCount > 0}
							<span class="badge bust">
								<i class="material-icons">trending_down</i>
								{team.bustCount} Bust{team.bustCount > 1 ? 's' : ''}
							</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
