<script>
	import { createEventDispatcher } from 'svelte';

	export let viewMode = 'timeline';

	const dispatch = createEventDispatcher();

	const setViewMode = (mode) => {
		dispatch('viewChange', mode);
	}
</script>

<style>
	.viewToggle {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5em;
		margin: 0.5em auto 1em;
	}

	.viewButtons {
		display: flex;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.viewButton {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5em 1em;
		cursor: pointer;
		background-color: var(--fff);
		border: none;
		color: var(--g555);
		transition: all 0.2s ease;
		gap: 0.3em;
		font-size: 0.85em;
	}

	.viewButton:hover {
		background-color: var(--f5f5);
		color: var(--blueOne);
	}

	.viewButton.active {
		background-color: var(--blueOne);
		color: white;
	}

	.viewButton i {
		font-size: 1.2em;
	}

	@media (max-width: 500px) {
		.buttonLabel {
			display: none;
		}
	}
</style>

<div class="viewToggle">
	<div class="viewButtons">
		<button class="viewButton" class:active={viewMode === 'timeline'} on:click={() => setViewMode('timeline')}>
			<i class="material-icons">timeline</i>
			<span class="buttonLabel">Timeline</span>
		</button>
		<button class="viewButton" class:active={viewMode === 'compact'} on:click={() => setViewMode('compact')}>
			<i class="material-icons">view_list</i>
			<span class="buttonLabel">Compact</span>
		</button>
	</div>
</div>
