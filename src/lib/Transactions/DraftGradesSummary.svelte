<script>
	import { getValueColor, getValueTextColor } from '$lib/utils/helper';

	export let teamGrades = [];

	const getGradeColor = (grade) => {
		const gradeColors = {
			'A+': '#00a894',
			'A': '#22c55e',
			'B': '#84cc16',
			'C': '#eab308',
			'D': '#f97316',
			'F': '#ef4444'
		};
		return gradeColors[grade] || '#6b7280';
	};

	const getTeamAvatar = (team) => {
		if (team?.avatar) {
			return `https://sleepercdn.com/avatars/thumbs/${team.avatar}`;
		}
		return 'https://sleepercdn.com/images/v2/icons/player_default.webp';
	};
</script>

<style>
	.summaryGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1em;
	}

	.teamCard {
		background-color: var(--fff);
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
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
	}

	.gradeLabel {
		font-size: 0.5em;
		font-weight: 400;
		opacity: 0.9;
	}

	.cardBody {
		padding: 0.75em 1em;
	}

	.statsGrid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5em;
		margin-bottom: 0.75em;
	}

	.statBox {
		text-align: center;
		padding: 0.5em;
		background-color: var(--f5f5);
		border-radius: 6px;
	}

	.statValue {
		font-weight: 600;
		font-size: 0.95em;
		color: var(--g333);
	}

	.statLabel {
		font-size: 0.7em;
		color: var(--g999);
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
				<div class="gradeBox" style="background-color: {getGradeColor(team.avgGrade)};">
					{team.avgGrade}
					<span class="gradeLabel">Grade</span>
				</div>
			</div>
			<div class="cardBody">
				<div class="statsGrid">
					<div class="statBox">
						<div class="statValue" style="color: {team.totalValue >= 0 ? '#00a894' : '#ff2a6d'};">
							{team.totalValue >= 0 ? '+' : ''}{team.totalValue}
						</div>
						<div class="statLabel">Total Value</div>
					</div>
					<div class="statBox">
						<div class="statValue">{team.avgValue >= 0 ? '+' : ''}{team.avgValue}</div>
						<div class="statLabel">Avg Value</div>
					</div>
				</div>

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
