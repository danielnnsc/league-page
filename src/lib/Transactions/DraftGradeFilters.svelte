<script>
	import { createEventDispatcher } from 'svelte';
	import GradeColorKey from './GradeColorKey.svelte';

	export let viewMode = 'totalPoints';
	export let hideUnder7Games = false;

	const dispatch = createEventDispatcher();

	const setViewMode = (mode) => {
		dispatch('viewModeChange', mode);
	};

	const toggleHideUnder7 = () => {
		dispatch('hideUnder7Change', !hideUnder7Games);
	};
</script>

<style>
	.gradeFilters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
		padding: 0.75em 1em;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 1em;
	}

	.filterGroup {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.filterLabel {
		font-size: 0.85em;
		color: var(--g555);
		font-weight: 500;
	}

	.viewToggle {
		display: flex;
		background-color: var(--f5f5);
		border-radius: 6px;
		overflow: hidden;
	}

	.viewButton {
		padding: 0.4em 0.75em;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.8em;
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

	@media (max-width: 600px) {
		.gradeFilters {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>

<div class="gradeFilters">
	<div class="filterGroup">
		<span class="filterLabel">Rank by:</span>
		<div class="viewToggle">
			<button
				class="viewButton"
				class:active={viewMode === 'totalPoints'}
				on:click={() => setViewMode('totalPoints')}
			>
				Total Points
			</button>
			<button
				class="viewButton"
				class:active={viewMode === 'ppg'}
				on:click={() => setViewMode('ppg')}
			>
				Points/Game
			</button>
		</div>
	</div>

	<GradeColorKey compact={true} />

	<div class="filterGroup">
		<label class="checkboxLabel">
			<input
				type="checkbox"
				checked={hideUnder7Games}
				on:change={toggleHideUnder7}
			/>
			<i class="material-icons warningIcon">warning</i>
			Hide &lt;7 games
		</label>
	</div>
</div>
