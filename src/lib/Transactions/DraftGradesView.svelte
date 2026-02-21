<script>
	import { calculateDraftGrades, calculateCombinedScores } from '$lib/utils/helper';
	import DraftGradeFilters from './DraftGradeFilters.svelte';
	import DraftGradesTable from './DraftGradesTable.svelte';
	import DraftGradesSummary from './DraftGradesSummary.svelte';
	import DraftAnalytics from './DraftAnalytics.svelte';
	import OwnerDraftHistory from './OwnerDraftHistory.svelte';

	export let drafts = [];
	export let players = {};
	export let leagueTeamManagers = {};
	export let selectedTeam = 'all';
	export let selectedSeason = null;

	let viewMode = 'totalPoints';
	let hideUnder7Games = false;
	let gradesData = null;
	let loading = true;
	let error = null;

	// Check if showing all seasons (historical view)
	$: showHistorical = selectedSeason === 'all';

	// Get the draft for the selected season
	$: selectedDraft = selectedSeason && selectedSeason !== 'all'
		? drafts.find(d => d.year == selectedSeason)
		: drafts[0]; // Default to most recent

	// Calculate grades when draft or options change
	$: if (selectedDraft && players && Object.keys(players).length > 0) {
		loadGrades(selectedDraft);
	}

	const loadGrades = async (draft) => {
		if (!draft) {
			gradesData = null;
			loading = false;
			return;
		}

		loading = true;
		error = null;

		try {
			const grades = await calculateDraftGrades(draft, players, leagueTeamManagers, {
				viewMode,
				minGames: 0
			});
			// Apply combined scoring to team grades for summary cards
			if (grades?.teamGrades) {
				grades.teamGrades = calculateCombinedScores(grades.teamGrades);
			}
			gradesData = grades;
		} catch (e) {
			console.error('Failed to calculate draft grades:', e);
			error = e.message || 'Failed to load draft grades';
			gradesData = null;
		} finally {
			loading = false;
		}
	};

	// Filter picks by selected team
	$: filteredPicks = gradesData?.picks
		? selectedTeam === 'all'
			? gradesData.picks
			: gradesData.picks.filter(p => p.rosterID == selectedTeam)
		: [];

	// Get team grades for summary
	$: teamGradesArray = gradesData?.teamGrades
		? Object.values(gradesData.teamGrades).sort((a, b) => b.totalValue - a.totalValue)
		: [];

	// Filter team grades by selected team
	$: filteredTeamGrades = selectedTeam === 'all'
		? teamGradesArray
		: teamGradesArray.filter(t => t.rosterID == selectedTeam);

	const handleViewModeChange = (e) => {
		viewMode = e.detail;
		// Recalculate grades with new view mode
		if (selectedDraft) {
			loadGrades(selectedDraft);
		}
	};

	const handleHideUnder7Change = (e) => {
		hideUnder7Games = e.detail;
	};
</script>

<style>
	.gradesContainer {
		padding: 0;
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
		margin: 1em 0;
	}

	.errorState i {
		font-size: 2em;
		margin-bottom: 0.5em;
	}

	.noDataState {
		text-align: center;
		padding: 2em;
		color: var(--g999);
		font-style: italic;
	}

	.draftHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1em;
		flex-wrap: wrap;
		gap: 1em;
	}

	.draftTitle {
		font-size: 1.2em;
		font-weight: 600;
		color: var(--g333);
	}

	.draftMeta {
		font-size: 0.85em;
		color: var(--g999);
	}

	.statsRow {
		display: flex;
		gap: 1.5em;
		flex-wrap: wrap;
	}

	.statItem {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.statValue {
		font-size: 1.1em;
		font-weight: 600;
		color: var(--g333);
	}

	.statLabel {
		font-size: 0.75em;
		color: var(--g999);
	}

	.section {
		margin-bottom: 2em;
	}

	.sectionTitle {
		font-size: 1em;
		font-weight: 600;
		color: var(--g555);
		margin-bottom: 0.75em;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.sectionTitle i {
		font-size: 18px;
		color: var(--g999);
	}
</style>

<div class="gradesContainer">
	{#if showHistorical}
		<!-- Historical View: All Seasons -->
		<OwnerDraftHistory
			{drafts}
			{players}
			{leagueTeamManagers}
		/>
	{:else if loading}
		<div class="loadingState">
			<div class="spinner"></div>
			<span class="loadingText">Calculating draft grades...</span>
		</div>
	{:else if error}
		<div class="errorState">
			<i class="material-icons">error_outline</i>
			<p>{error}</p>
		</div>
	{:else if !gradesData}
		<div class="noDataState">
			<p>No draft data available for this season.</p>
		</div>
	{:else}
		<div class="draftHeader">
			<div>
				<div class="draftTitle">{gradesData.year} Draft Grades</div>
				<div class="draftMeta">
					{gradesData.draftType === 'snake' ? 'Snake' : 'Auction'} Draft
					&bull; {gradesData.totalPicks} picks
				</div>
			</div>
			<div class="statsRow">
				<div class="statItem">
					<span class="statValue">{filteredPicks.filter(p => p.isSleeper).length}</span>
					<span class="statLabel">Sleepers</span>
				</div>
				<div class="statItem">
					<span class="statValue">{filteredPicks.filter(p => p.isBust).length}</span>
					<span class="statLabel">Busts</span>
				</div>
				<div class="statItem">
					<span class="statValue">{filteredPicks.filter(p => p.flagged).length}</span>
					<span class="statLabel">&lt;7 Games</span>
				</div>
			</div>
		</div>

		<DraftGradeFilters
			{viewMode}
			{hideUnder7Games}
			on:viewModeChange={handleViewModeChange}
			on:hideUnder7Change={handleHideUnder7Change}
		/>

		{#if filteredTeamGrades.length > 0}
			<div class="section">
				<div class="sectionTitle">
					<i class="material-icons">leaderboard</i>
					Team Draft Grades
				</div>
				<DraftGradesSummary teamGrades={filteredTeamGrades} />
			</div>
		{/if}

		<div class="section">
			<div class="sectionTitle">
				<i class="material-icons">analytics</i>
				Draft Analytics
			</div>
			<DraftAnalytics
				teamGrades={filteredTeamGrades}
				picks={filteredPicks}
			/>
		</div>

		<div class="section">
			<div class="sectionTitle">
				<i class="material-icons">format_list_numbered</i>
				All Picks
			</div>
			<DraftGradesTable
				picks={filteredPicks}
				{viewMode}
				{hideUnder7Games}
			/>
		</div>
	{/if}
</div>
