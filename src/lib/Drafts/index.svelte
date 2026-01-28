<script>
	import { waitForAll, calculateDraftGrades, getGradeFromValue } from '$lib/utils/helper';
    import LinearProgress from '@smui/linear-progress';
    import Button, { Label } from '@smui/button';
    import Draft from './Draft.svelte';
    import DraftGradesSummary from '$lib/Transactions/DraftGradesSummary.svelte';
    import DraftGradesTable from '$lib/Transactions/DraftGradesTable.svelte';
    import DraftAnalytics from '$lib/Transactions/DraftAnalytics.svelte';
    import GradeColorKey from '$lib/Transactions/GradeColorKey.svelte';

    export let upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData;

    // Selected season (null = show upcoming draft section)
    let selectedSeason = null;

    // Analysis mode state per draft year
    let analysisModes = {};
    let gradesDataCache = {};
    let loadingGrades = {};

    // Store references for recalculation
    let cachedDrafts = {};
    let cachedLeagueTeamManagers = null;
    let cachedPlayers = null;

    // View mode and filter state
    let viewMode = 'totalPoints';
    let hideUnder7Games = false;

    const toggleAnalysis = async (year, draftData, leagueTeamManagers, players) => {
        // Store references for later recalculation
        cachedDrafts[year] = draftData;
        cachedLeagueTeamManagers = leagueTeamManagers;
        cachedPlayers = players;

        analysisModes[year] = !analysisModes[year];
        analysisModes = analysisModes; // trigger reactivity

        // Load grades if not cached and analysis mode is on
        if (analysisModes[year] && !gradesDataCache[year]) {
            await loadGradesForYear(year, draftData, leagueTeamManagers, players);
        }
    };

    const loadGradesForYear = async (year, draftData, leagueTeamManagers, players) => {
        loadingGrades[year] = true;
        loadingGrades = loadingGrades;
        try {
            const grades = await calculateDraftGrades(draftData, players, leagueTeamManagers, { viewMode });
            gradesDataCache[year] = grades;
            gradesDataCache = gradesDataCache;
        } catch (e) {
            console.error(`Failed to load grades for ${year}:`, e);
        } finally {
            loadingGrades[year] = false;
            loadingGrades = loadingGrades;
        }
    };

    const handleViewModeChange = async (e) => {
        viewMode = e.detail;
        // Clear cache and recalculate for active analysis modes
        gradesDataCache = {};

        // Recalculate grades for any year that has analysis mode on
        for (const year of Object.keys(analysisModes)) {
            if (analysisModes[year] && cachedDrafts[year] && cachedLeagueTeamManagers && cachedPlayers) {
                await loadGradesForYear(parseInt(year), cachedDrafts[year], cachedLeagueTeamManagers, cachedPlayers);
            }
        }
    };

    // Filter picks excluding K and DEF, and optionally <7 games
    const filterSkillPositions = (picks, hideUnder7) => {
        if (!picks) return [];
        let filtered = picks.filter(p => p.position !== 'K' && p.position !== 'DEF');
        if (hideUnder7) {
            filtered = filtered.filter(p => !p.flagged);
        }
        return filtered;
    };

    // Filter team grades excluding K and DEF picks, and optionally <7 games
    const getFilteredTeamGrades = (gradesData, hideUnder7) => {
        if (!gradesData?.teamGrades) return [];
        return Object.values(gradesData.teamGrades)
            .map(team => {
                let skillPicks = team.picks.filter(p => p.position !== 'K' && p.position !== 'DEF');
                if (hideUnder7) {
                    skillPicks = skillPicks.filter(p => !p.flagged);
                }
                const validPicks = skillPicks.filter(p => p.overallValue !== null);

                // Use gradeValue (adjusted value with finish bonus) for team calculations
                const totalValue = validPicks.reduce((sum, p) => sum + (p.gradeValue || 0), 0);
                const avgValue = validPicks.length > 0 ? Math.round((totalValue / validPicks.length) * 10) / 10 : 0;

                // Recalculate best/worst picks from filtered data (using gradeValue for context-aware ranking)
                const sortedByValue = [...validPicks].sort((a, b) => (b.gradeValue || 0) - (a.gradeValue || 0));
                const bestPick = sortedByValue[0] || null;
                const worstPick = sortedByValue[sortedByValue.length - 1] || null;

                // Recalculate grade from filtered data
                const avgGrade = getGradeFromValue(avgValue);

                return {
                    ...team,
                    picks: skillPicks,
                    totalValue,
                    avgValue,
                    avgGrade,
                    bestPick,
                    worstPick,
                    sleeperCount: skillPicks.filter(p => p.isSleeper).length,
                    bustCount: skillPicks.filter(p => p.isBust).length
                };
            })
            .sort((a, b) => b.totalValue - a.totalValue);
    };
</script>

<style>
	.loading {
		display: block;
		width: 85%;
		max-width: 500px;
		margin: 80px auto;
	}

    h4 {
        text-align: center;
    }

    h6 {
        text-align: center;
    }

    .seasonSelector {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5em;
        margin: 1.5em auto;
        max-width: 800px;
    }

    :global(.seasonSelector .mdc-button) {
        min-width: 80px;
    }

    .draftHeader {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1em;
        flex-wrap: wrap;
        margin: 1.5em 0 0.5em;
    }

    .analysisToggle {
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.4em 0.8em;
        border-radius: 6px;
        border: 1px solid var(--blueOne);
        background-color: var(--fff);
        cursor: pointer;
        font-size: 0.85em;
        color: var(--blueOne);
        transition: all 0.15s ease;
    }

    .analysisToggle:hover {
        background-color: var(--f5f5);
    }

    .analysisToggle.active {
        background-color: var(--blueOne);
        color: white;
    }

    .analysisToggle i {
        font-size: 18px;
    }

    .viewToggle {
        display: flex;
        background-color: var(--f5f5);
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid var(--eee);
    }

    .viewButton {
        padding: 0.4em 0.75em;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.85em;
        color: var(--g555);
        transition: all 0.15s ease;
    }

    .viewButton:hover {
        background-color: var(--eee);
    }

    .viewButton.active {
        background-color: var(--blueOne);
        color: white;
    }

    .filterLabel {
        font-size: 0.85em;
        color: var(--g555);
        font-weight: 500;
    }

    .headerControls {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }

    .checkboxLabel {
        display: flex;
        align-items: center;
        gap: 0.4em;
        cursor: pointer;
        font-size: 0.85em;
        color: var(--g555);
    }

    .checkboxLabel input {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .warningIcon {
        font-size: 14px;
        color: #f59e0b;
    }

    .analysisSection {
        max-width: 95%;
        margin: 1em auto 2em;
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

    .loadingGrades {
        text-align: center;
        padding: 2em;
        color: var(--g555);
    }

    .loadingGrades .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid var(--eee);
        border-top-color: var(--blueOne);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1em;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .colorKeyWrapper {
        display: flex;
        justify-content: center;
        margin: 1em 0;
    }
</style>


{#await waitForAll(upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData) }
	<div class="loading">
		<p>Retrieving drafts...</p>
		<br />
		<LinearProgress indeterminate />
	</div>
{:then [upcomingDraft, previousDrafts, leagueTeamManagers, {players}] }
	<!-- Season Selector -->
	<div class="seasonSelector">
		{#if upcomingDraft?.year}
			<Button
				color="primary"
				variant={selectedSeason === null ? 'raised' : 'outlined'}
				on:click={() => selectedSeason = null}
			>
				<Label>{upcomingDraft.year} (Upcoming)</Label>
			</Button>
		{/if}
		{#each previousDrafts as draft}
			<Button
				color="primary"
				variant={selectedSeason === draft.year ? 'raised' : 'outlined'}
				on:click={() => selectedSeason = draft.year}
			>
				<Label>{draft.year}</Label>
			</Button>
		{/each}
	</div>

	<!-- Upcoming Draft -->
	{#if selectedSeason === null && upcomingDraft?.year}
		<h4>Upcoming {upcomingDraft.year} Draft</h4>
		<Draft draftData={upcomingDraft} {leagueTeamManagers} year={upcomingDraft.year} {players} />
	{/if}

	<!-- Selected Previous Draft -->
	{#if selectedSeason !== null}
		{@const selectedDraft = previousDrafts.find(d => d.year === selectedSeason)}
		{#if selectedDraft}
			<div class="draftHeader">
				<h4 style="margin: 0;">{selectedDraft.year} Draft</h4>
				<button
					class="analysisToggle"
					class:active={analysisModes[selectedDraft.year]}
					on:click={() => toggleAnalysis(selectedDraft.year, selectedDraft, leagueTeamManagers, players)}
				>
					<i class="material-icons">{analysisModes[selectedDraft.year] ? 'analytics' : 'bar_chart'}</i>
					{analysisModes[selectedDraft.year] ? 'Hide Analysis' : 'Show Analysis'}
				</button>
				{#if analysisModes[selectedDraft.year]}
					<div class="headerControls">
						<span class="filterLabel">Rank by:</span>
						<div class="viewToggle">
							<button
								class="viewButton"
								class:active={viewMode === 'totalPoints'}
								on:click={() => handleViewModeChange({ detail: 'totalPoints' })}
							>
								Total Pts
							</button>
							<button
								class="viewButton"
								class:active={viewMode === 'ppg'}
								on:click={() => handleViewModeChange({ detail: 'ppg' })}
							>
								Pts/Game
							</button>
						</div>
					</div>
				{/if}
			</div>

			{#if analysisModes[selectedDraft.year]}
				<div class="colorKeyWrapper">
					<GradeColorKey />
				</div>
			{/if}

			<Draft
				draftData={selectedDraft}
				previous={true}
				{leagueTeamManagers}
				year={selectedDraft.year}
				{players}
				analysisMode={analysisModes[selectedDraft.year]}
				gradesData={gradesDataCache[selectedDraft.year]}
			/>

			{#if analysisModes[selectedDraft.year]}
				<div class="analysisSection">
					{#if loadingGrades[selectedDraft.year]}
						<div class="loadingGrades">
							<div class="spinner"></div>
							<p>Calculating draft grades...</p>
						</div>
					{:else if gradesDataCache[selectedDraft.year]}
						<div class="section">
							<div class="sectionTitle">
								<i class="material-icons">leaderboard</i>
								Team Draft Grades
								<label class="checkboxLabel">
									<input
										type="checkbox"
										checked={hideUnder7Games}
										on:change={() => hideUnder7Games = !hideUnder7Games}
									/>
									<i class="material-icons warningIcon">warning</i>
									Hide &lt;7 games
								</label>
							</div>
							<DraftGradesSummary teamGrades={getFilteredTeamGrades(gradesDataCache[selectedDraft.year], hideUnder7Games)} />
						</div>

						<div class="section">
							<div class="sectionTitle">
								<i class="material-icons">analytics</i>
								Draft Analytics
							</div>
							<DraftAnalytics
								teamGrades={getFilteredTeamGrades(gradesDataCache[selectedDraft.year], hideUnder7Games)}
								picks={filterSkillPositions(gradesDataCache[selectedDraft.year]?.picks, hideUnder7Games)}
							/>
						</div>

						<div class="section">
							<div class="sectionTitle">
								<i class="material-icons">format_list_numbered</i>
								All Picks
							</div>
							<DraftGradesTable
								picks={filterSkillPositions(gradesDataCache[selectedDraft.year]?.picks, hideUnder7Games)}
								{viewMode}
							/>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
{:catch error}
	<!-- promise was rejected -->
	<p>Something went wrong: {error.message}</p>
{/await}