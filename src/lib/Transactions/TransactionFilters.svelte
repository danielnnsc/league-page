<script>
	import Button, { Label } from '@smui/button';
	import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

	export let show, selectedTeam, selectedSeason, leagueTeamManagers, seasons;

	// Get all teams for the dropdown (use current season for team list)
	$: teams = leagueTeamManagers?.teamManagersMap?.[leagueTeamManagers.currentSeason]
		? Object.keys(leagueTeamManagers.teamManagersMap[leagueTeamManagers.currentSeason]).map(rosterID => ({
			rosterID: parseInt(rosterID),
			...getTeamFromTeamManagers(leagueTeamManagers, parseInt(rosterID))
		}))
		: [];

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	const setShow = (val) => {
		dispatch('typeChange', val);
	}

	const setTeam = (e) => {
		const val = e.target.value === 'all' ? null : parseInt(e.target.value);
		dispatch('teamChange', val);
	}

	const setSeason = (val) => {
		dispatch('seasonChange', val);
	}
</script>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 1.5em;
		margin: 1em auto 1.5em;
		max-width: 1000px;
	}

	.filterGroup {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5em;
	}

	.filterLabel {
		font-size: 0.75em;
		color: var(--g999);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.typeButtons {
		display: flex;
		gap: 0.25em;
	}

	:global(.typeButtons .disabled) {
		pointer-events: none;
	}

	.selectContainer {
		position: relative;
		display: inline-block;
	}

	.selectInput {
		padding: 0.5em 2em 0.5em 2.5em;
		font-size: 0.95em;
		border-radius: 6px;
		background-color: var(--fff);
		appearance: none !important;
		-webkit-appearance: none !important;
		-moz-appearance: none !important;
		background-image: url(/dropdown.png);
		background-repeat: no-repeat;
		background-position: calc(100% - 8px) center;
		background-size: 16px;
		text-align: left;
		color: var(--g000);
		border: 1px solid var(--blueOne);
		min-width: 180px;
		cursor: pointer;
	}

	.selectInput:focus {
		outline: none;
		border: 2px solid var(--blueOne);
	}

	.teamAvatar {
		position: absolute;
		left: 6px;
		top: 50%;
		transform: translateY(-50%);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--ddd);
		background-color: var(--fff);
		pointer-events: none;
	}

	.seasonButtons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25em;
		justify-content: center;
	}

	@media (max-width: 700px) {
		.filters {
			flex-direction: column;
			gap: 1em;
		}

		.selectInput {
			min-width: 200px;
		}
	}

	@media (max-width: 540px) {
		:global(.typeButtons .mdc-button) {
			font-size: 0.7em;
			padding: 0 8px;
		}

		:global(.seasonButtons .mdc-button) {
			font-size: 0.65em;
			padding: 0 6px;
			min-width: auto;
		}
	}
</style>

<div class="filters">
	<!-- Type Filter -->
	<div class="filterGroup">
		<span class="filterLabel">Type</span>
		<div class="typeButtons">
			<Button class="{show === 'all' ? 'disabled' : ''}" color="primary" on:click={() => setShow('all')} variant="{show === 'all' ? 'raised' : 'outlined'}" touch>
				<Label>All</Label>
			</Button>
			<Button class="{show === 'trade' ? 'disabled' : ''}" color="primary" on:click={() => setShow('trade')} variant="{show === 'trade' ? 'raised' : 'outlined'}" touch>
				<Label>Trades</Label>
			</Button>
			<Button class="{show === 'waiver' ? 'disabled' : ''}" color="primary" on:click={() => setShow('waiver')} variant="{show === 'waiver' ? 'raised' : 'outlined'}" touch>
				<Label>Waivers</Label>
			</Button>
			<Button class="{show === 'drafts' ? 'disabled' : ''}" color="primary" on:click={() => setShow('drafts')} variant="{show === 'drafts' ? 'raised' : 'outlined'}" touch>
				<Label>Drafts</Label>
			</Button>
			<Button class="{show === 'records' ? 'disabled' : ''}" color="secondary" on:click={() => setShow('records')} variant="{show === 'records' ? 'raised' : 'outlined'}" touch>
				<Label>Records</Label>
			</Button>
		</div>
	</div>

	<!-- Team Filter -->
	<div class="filterGroup">
		<span class="filterLabel">Team</span>
		<div class="selectContainer">
			{#if selectedTeam !== null}
				<img
					class="teamAvatar"
					src="{getTeamFromTeamManagers(leagueTeamManagers, selectedTeam).avatar}"
					alt="team avatar"
				/>
			{/if}
			<select
				class="selectInput"
				style="{selectedTeam === null ? 'padding-left: 1em;' : ''}"
				value={selectedTeam ?? 'all'}
				on:change={setTeam}
			>
				<option value="all">All Teams</option>
				{#each teams as team}
					<option value={team.rosterID}>{team.name}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Season Filter -->
	<div class="filterGroup">
		<span class="filterLabel">Season</span>
		<div class="seasonButtons">
			<Button
				class="{selectedSeason === 'all' ? 'disabled' : ''}"
				color="primary"
				on:click={() => setSeason('all')}
				variant="{selectedSeason === 'all' ? 'raised' : 'outlined'}"
				touch
			>
				<Label>All</Label>
			</Button>
			{#each seasons as season}
				<Button
					class="{selectedSeason === season ? 'disabled' : ''}"
					color="primary"
					on:click={() => setSeason(season)}
					variant="{selectedSeason === season ? 'raised' : 'outlined'}"
					touch
				>
					<Label>{season}</Label>
				</Button>
			{/each}
		</div>
	</div>
</div>
