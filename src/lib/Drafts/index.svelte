<script>
	import { waitForAll, calculateDraftGrades, calculateCombinedScores, getGradeFromValue } from '$lib/utils/helper';
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
    let showWarningTooltip = false;
    let showMethodologyTooltip = false;

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
            // Apply combined scoring to team grades for summary cards
            if (grades?.teamGrades) {
                grades.teamGrades = calculateCombinedScores(grades.teamGrades);
            }
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

                // Use positive-only gradeValue (rewards sleepers, ignores busts)
                let positiveValueSum = 0;
                for (const p of validPicks) {
                    const val = p.gradeValue || 0;
                    if (val > 0) {
                        positiveValueSum += val;
                    }
                }
                const totalValue = positiveValueSum;
                const avgValue = totalValue;  // Keep as sum, not average

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
        cursor: help;
    }

    .warningWrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
    }

    .warningTooltip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        width: 220px;
        padding: 0.6em 0.8em;
        background-color: #1f2937;
        color: white;
        font-size: 0.75em;
        line-height: 1.4;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        text-align: center;
    }

    .warningTooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: #1f2937;
    }

    .infoWrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: 0.25em;
    }

    .infoIcon {
        font-size: 18px;
        color: var(--g999);
        cursor: pointer;
        transition: color 0.15s ease;
    }

    .infoIcon:hover {
        color: var(--blueOne);
    }

    .methodologyTooltip {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        width: 380px;
        padding: 1em;
        background-color: #1f2937;
        color: white;
        font-size: 0.8em;
        line-height: 1.5;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 1000;
        text-align: left;
    }

    .methodologyTooltip::after {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-bottom-color: #1f2937;
    }

    .methodologyTooltip .tooltipHeader {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 0.75em;
        padding-bottom: 0.5em;
        border-bottom: 1px solid rgba(255,255,255,0.2);
    }

    .methodologyTooltip .tooltipHeader i {
        font-size: 18px;
        color: #60a5fa;
    }

    .methodologyTooltip .tooltipSection {
        margin-bottom: 0.75em;
    }

    .methodologyTooltip .tooltipSection:last-child {
        margin-bottom: 0;
    }

    .methodologyTooltip .tooltipSection strong {
        color: #93c5fd;
        display: block;
        margin-bottom: 0.25em;
    }

    .methodologyTooltip .tooltipSection p {
        margin: 0.15em 0;
        color: rgba(255,255,255,0.85);
    }

    .methodologyTooltip .tooltipSection em {
        color: rgba(255,255,255,0.65);
        font-size: 0.9em;
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
								<span class="infoWrapper">
									<i
										class="material-icons infoIcon"
										on:mouseenter={() => showMethodologyTooltip = true}
										on:mouseleave={() => showMethodologyTooltip = false}
										on:click={() => showMethodologyTooltip = !showMethodologyTooltip}
									>info_outline</i>
									{#if showMethodologyTooltip}
										<div class="methodologyTooltip">
											<div class="tooltipHeader">
												<i class="material-icons">calculate</i>
												Draft Grade Methodology
											</div>

											<div class="tooltipSection">
												<strong>Skill Positions Only</strong>
												<p>All grades exclude K and DEF — only QB, RB, WR, TE are counted.</p>
											</div>

											<div class="tooltipSection">
												<strong>Value (35% weight)</strong>
												<p>Sum of positive value picks only (sleepers).</p>
												<p><em>Value = Draft Position − Actual Finish</em></p>
												<p><em>Early round bonus: Rd1 +12, Rd2 +6, Rd3 +3</em></p>
												<p><em>Busts (negative value) are ignored.</em></p>
											</div>

											<div class="tooltipSection">
												<strong>Points (40% weight)</strong>
												<p>Total fantasy points produced by all skill position picks.</p>
											</div>

											<div class="tooltipSection">
												<strong>Efficiency (25% weight)</strong>
												<p>Positional Rank Score / Draft Capital.</p>
												<p><em>Rank Score: #1 at position = 24pts, #12 = 13pts, #24+ = 0pts</em></p>
												<p><em>Draft Capital: Pick 1 costs 156, Pick 156 costs 1</em></p>
												<p><em>Rewards getting top positional talent efficiently</em></p>
											</div>

											<div class="tooltipSection">
												<strong>Overall Grade</strong>
												<p>Weighted average normalized to 0-100 scale across all teams.</p>
												<p><em>A+: 90+ | A: 80+ | B: 65+ | C: 45+ | D: 30+ | F: &lt;30</em></p>
											</div>
										</div>
									{/if}
								</span>
								<label class="checkboxLabel">
									<input
										type="checkbox"
										checked={hideUnder7Games}
										on:change={() => hideUnder7Games = !hideUnder7Games}
									/>
									<span class="warningWrapper">
										<i
											class="material-icons warningIcon"
											on:mouseenter={() => showWarningTooltip = true}
											on:mouseleave={() => showWarningTooltip = false}
										>warning</i>
										{#if showWarningTooltip}
											<div class="warningTooltip">
												Players with fewer than 7 games played have unreliable stats. Check this to exclude them from grade calculations.
											</div>
										{/if}
									</span>
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