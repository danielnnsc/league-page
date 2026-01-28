<script>
	import { calculateOwnerDraftHistory, getValueColor } from '$lib/utils/helper';

	export let drafts = [];
	export let players = {};
	export let leagueTeamManagers = {};

	let ownerHistory = null;
	let loading = true;
	let error = null;

	// Load owner history when component mounts
	$: if (drafts.length > 0 && players && Object.keys(players).length > 0) {
		loadOwnerHistory();
	}

	const loadOwnerHistory = async () => {
		loading = true;
		error = null;

		try {
			ownerHistory = await calculateOwnerDraftHistory(drafts, players, leagueTeamManagers);
		} catch (e) {
			console.error('Failed to load owner draft history:', e);
			error = e.message || 'Failed to load historical data';
			ownerHistory = null;
		} finally {
			loading = false;
		}
	};

	// Convert to sorted array
	$: ownersList = ownerHistory
		? Object.values(ownerHistory).sort((a, b) => b.avgValue - a.avgValue)
		: [];

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

	const getOwnerAvatar = (owner) => {
		if (owner?.avatar) {
			return `https://sleepercdn.com/avatars/thumbs/${owner.avatar}`;
		}
		return 'https://sleepercdn.com/images/v2/icons/player_default.webp';
	};
</script>

<style>
	.historyContainer {
		padding: 1em 0;
	}

	.loadingState {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3em;
		gap: 1em;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--eee);
		border-top-color: var(--blueOne);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loadingText {
		color: var(--g555);
		font-size: 0.9em;
	}

	.errorState {
		text-align: center;
		padding: 2em;
		color: #dc2626;
		background-color: #fef2f2;
		border-radius: 8px;
	}

	.sectionTitle {
		font-size: 1.1em;
		font-weight: 600;
		color: var(--g333);
		margin-bottom: 1em;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.sectionTitle i {
		color: var(--blueOne);
	}

	.ownerGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1em;
	}

	.ownerCard {
		background-color: var(--fff);
		border-radius: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.cardHeader {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.75em 1em;
		background-color: var(--f5f5);
		border-bottom: 1px solid var(--eee);
	}

	.ownerAvatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.ownerInfo {
		flex: 1;
		min-width: 0;
	}

	.ownerName {
		font-weight: 600;
		font-size: 0.95em;
		color: var(--g333);
	}

	.ownerMeta {
		font-size: 0.75em;
		color: var(--g999);
	}

	.gradeBox {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 50px;
		height: 50px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.3em;
		color: white;
	}

	.gradeLabel {
		font-size: 0.4em;
		font-weight: 400;
		opacity: 0.9;
	}

	.cardBody {
		padding: 0.75em 1em;
	}

	.statsRow {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5em;
		margin-bottom: 0.75em;
	}

	.statBox {
		text-align: center;
		padding: 0.4em;
		background-color: var(--f5f5);
		border-radius: 6px;
	}

	.statValue {
		font-weight: 600;
		font-size: 0.95em;
		color: var(--g333);
	}

	.statLabel {
		font-size: 0.65em;
		color: var(--g999);
	}

	.historySection {
		margin-top: 0.75em;
	}

	.historyTitle {
		font-size: 0.75em;
		font-weight: 600;
		color: var(--g555);
		margin-bottom: 0.4em;
	}

	.yearBadges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3em;
	}

	.yearBadge {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.2em 0.4em;
		border-radius: 4px;
		font-size: 0.7em;
		font-weight: 500;
		background-color: var(--f5f5);
	}

	.yearBadge .grade {
		font-weight: 700;
	}

	.highlightRow {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5em;
		margin-top: 0.75em;
	}

	.highlightBox {
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
		font-size: 0.9em;
		color: var(--g999);
		margin-bottom: 0.2em;
	}

	.highlightPlayer {
		font-weight: 500;
		color: var(--g333);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.highlightMeta {
		font-size: 0.85em;
		color: var(--g999);
	}

	.positionBreakdown {
		margin-top: 0.75em;
		padding-top: 0.75em;
		border-top: 1px solid var(--eee);
	}

	.positionGrid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em;
	}

	.positionStat {
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		padding: 0.2em 0.4em;
		border-radius: 4px;
		font-size: 0.7em;
		background-color: var(--f5f5);
	}

	.positionStat .pos {
		font-weight: 600;
	}

	.positionStat .value {
		font-weight: 500;
	}

	.positionStat .value.positive {
		color: #00a894;
	}

	.positionStat .value.negative {
		color: #ff2a6d;
	}

	@media (max-width: 600px) {
		.ownerGrid {
			grid-template-columns: 1fr;
		}
	}
</style>

<div class="historyContainer">
	{#if loading}
		<div class="loadingState">
			<div class="spinner"></div>
			<span class="loadingText">Loading draft history...</span>
		</div>
	{:else if error}
		<div class="errorState">
			<p>{error}</p>
		</div>
	{:else if ownersList.length === 0}
		<div class="loadingState">
			<span class="loadingText">No draft history available</span>
		</div>
	{:else}
		<div class="sectionTitle">
			<i class="material-icons">history</i>
			All-Time Draft Performance
		</div>

		<div class="ownerGrid">
			{#each ownersList as owner (owner.managerID)}
				<div class="ownerCard">
					<div class="cardHeader">
						<img
							class="ownerAvatar"
							src={getOwnerAvatar(owner)}
							alt=""
							onerror="this.src='https://sleepercdn.com/images/v2/icons/player_default.webp'"
						/>
						<div class="ownerInfo">
							<div class="ownerName">{owner.name}</div>
							<div class="ownerMeta">{owner.totalDrafts} draft{owner.totalDrafts > 1 ? 's' : ''} &bull; {owner.totalPicks} picks</div>
						</div>
						<div class="gradeBox" style="background-color: {getGradeColor(owner.averageGrade)};">
							{owner.averageGrade}
							<span class="gradeLabel">Career</span>
						</div>
					</div>

					<div class="cardBody">
						<div class="statsRow">
							<div class="statBox">
								<div class="statValue" style="color: {owner.totalValue >= 0 ? '#00a894' : '#ff2a6d'};">
									{owner.totalValue >= 0 ? '+' : ''}{owner.totalValue}
								</div>
								<div class="statLabel">Total Value</div>
							</div>
							<div class="statBox">
								<div class="statValue">{owner.avgValue >= 0 ? '+' : ''}{owner.avgValue}</div>
								<div class="statLabel">Avg Value</div>
							</div>
							<div class="statBox">
								<div class="statValue">{owner.totalPicks}</div>
								<div class="statLabel">Total Picks</div>
							</div>
						</div>

						{#if owner.gradeHistory && owner.gradeHistory.length > 0}
							<div class="historySection">
								<div class="historyTitle">Season History</div>
								<div class="yearBadges">
									{#each owner.gradeHistory.sort((a, b) => b.year - a.year) as history}
										<span class="yearBadge">
											{history.year}:
											<span class="grade" style="color: {getGradeColor(history.grade)};">{history.grade}</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}

						{#if owner.bestPick || owner.worstPick}
							<div class="highlightRow">
								{#if owner.bestPick}
									<div class="highlightBox best">
										<div class="highlightLabel">Best Pick</div>
										<div class="highlightPlayer">{owner.bestPick.playerName}</div>
										<div class="highlightMeta">{owner.bestPick.year} Rd {owner.bestPick.round}</div>
									</div>
								{/if}
								{#if owner.worstPick}
									<div class="highlightBox worst">
										<div class="highlightLabel">Worst Pick</div>
										<div class="highlightPlayer">{owner.worstPick.playerName}</div>
										<div class="highlightMeta">{owner.worstPick.year} Rd {owner.worstPick.round}</div>
									</div>
								{/if}
							</div>
						{/if}

						{#if owner.positionBreakdown && Object.keys(owner.positionBreakdown).length > 0}
							<div class="positionBreakdown">
								<div class="historyTitle">Position Avg Value</div>
								<div class="positionGrid">
									{#each Object.entries(owner.positionBreakdown).sort((a, b) => b[1].avgValue - a[1].avgValue) as [pos, data]}
										<span class="positionStat">
											<span class="pos">{pos}:</span>
											<span class="value" class:positive={data.avgValue > 0} class:negative={data.avgValue < 0}>
												{data.avgValue > 0 ? '+' : ''}{data.avgValue}
											</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
