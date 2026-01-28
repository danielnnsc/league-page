<script>
	export let compact = false;

	let showTooltip = false;
</script>

<style>
	.colorKey {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.5em 1em;
		background-color: var(--f5f5);
		border-radius: 8px;
		font-size: 0.8em;
	}

	.colorKey.compact {
		padding: 0.3em 0.6em;
		font-size: 0.75em;
		gap: 0.5em;
	}

	.keyLabel {
		color: var(--g555);
		font-weight: 500;
	}

	.gradeBar {
		display: flex;
		align-items: center;
		height: 24px;
		border-radius: 4px;
		overflow: hidden;
	}

	.compact .gradeBar {
		height: 20px;
	}

	.gradeSegment {
		padding: 0.2em 0.6em;
		color: white;
		font-weight: 600;
		font-size: 0.85em;
		text-align: center;
	}

	.compact .gradeSegment {
		padding: 0.15em 0.4em;
		font-size: 0.8em;
	}

	.infoWrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.infoIcon {
		font-size: 18px;
		color: var(--g999);
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.compact .infoIcon {
		font-size: 16px;
	}

	.infoIcon:hover {
		color: var(--blueOne);
	}

	.tooltip {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 320px;
		padding: 1em;
		background-color: var(--fff);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		font-size: 0.85rem;
		line-height: 1.5;
	}

	.tooltipTitle {
		font-weight: 600;
		color: var(--g333);
		margin-bottom: 0.75em;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.tooltipTitle i {
		font-size: 16px;
		color: var(--blueOne);
	}

	.tooltipSection {
		margin-bottom: 0.75em;
	}

	.tooltipSection:last-child {
		margin-bottom: 0;
	}

	.tooltipLabel {
		font-weight: 500;
		color: var(--g555);
		font-size: 0.9em;
		margin-bottom: 0.25em;
	}

	.tooltipText {
		color: var(--g555);
		font-size: 0.85em;
	}

	.thresholdList {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25em 0.75em;
		font-size: 0.85em;
	}

	.thresholdGrade {
		font-weight: 600;
	}

	.thresholdGrade.a { color: #059669; }
	.thresholdGrade.b { color: #84cc16; }
	.thresholdGrade.c { color: #f59e0b; }
	.thresholdGrade.d { color: #f87171; }
	.thresholdGrade.f { color: #dc2626; }

	.thresholdValue {
		color: var(--g555);
	}

	.bonusList {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15em 0.5em;
		font-size: 0.85em;
		color: var(--g555);
	}

	.bonusRound {
		font-weight: 500;
	}

	@media (max-width: 600px) {
		.tooltip {
			width: 280px;
			right: -50px;
		}
	}
</style>

<div class="colorKey" class:compact>
	<span class="keyLabel">Grade:</span>
	<div class="gradeBar">
		<div class="gradeSegment" style="background: #059669;">A</div>
		<div class="gradeSegment" style="background: #84cc16;">B</div>
		<div class="gradeSegment" style="background: #f59e0b;">C</div>
		<div class="gradeSegment" style="background: #f87171;">D</div>
		<div class="gradeSegment" style="background: #dc2626;">F</div>
	</div>
	<div class="infoWrapper">
		<i
			class="material-icons infoIcon"
			on:mouseenter={() => showTooltip = true}
			on:mouseleave={() => showTooltip = false}
			on:click={() => showTooltip = !showTooltip}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && (showTooltip = !showTooltip)}
		>info_outline</i>
		{#if showTooltip}
			<div class="tooltip" on:mouseenter={() => showTooltip = true} on:mouseleave={() => showTooltip = false}>
				<div class="tooltipTitle">
					<i class="material-icons">calculate</i>
					How Grades Are Calculated
				</div>

				<div class="tooltipSection">
					<div class="tooltipLabel">Score Formula</div>
					<div class="tooltipText">
						Score = Draft Value + Finish Bonus<br>
						<em>Draft Value</em> = Pick # - Finish #<br>
						<em>Finish Bonus</em> = (Total Picks - Finish #) × 2.5
					</div>
				</div>

				<div class="tooltipSection">
					<div class="tooltipLabel">Why This Formula?</div>
					<div class="tooltipText">
						Rewards both outperforming draft position AND actual impact.
						A late-round sleeper who becomes a starter gets credit for both.
						An early-round hit who performs as expected is properly valued.
					</div>
				</div>

				<div class="tooltipSection">
					<div class="tooltipLabel">Grade Thresholds</div>
					<div class="thresholdList">
						<span class="thresholdGrade a">A</span>
						<span class="thresholdValue">460+ (elite picks)</span>
						<span class="thresholdGrade b">B</span>
						<span class="thresholdValue">400-459 (very good)</span>
						<span class="thresholdGrade c">C</span>
						<span class="thresholdValue">300-399 (average)</span>
						<span class="thresholdGrade d">D</span>
						<span class="thresholdValue">100-299 (below average)</span>
						<span class="thresholdGrade f">F</span>
						<span class="thresholdValue">Below 100 (poor)</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
