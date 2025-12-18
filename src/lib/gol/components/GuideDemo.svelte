<script lang="ts">
	import { LifeCanvas } from '@games-of-life/svelte';
	import { spectrumModeToIndex } from '@games-of-life/core';
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import CodeBlock from './CodeBlock.svelte';

	interface Props {
		title: string;
		description?: string;
		codeHtml: string;
		codeTitle?: string;
		rule: any;
		seed?: any;
		speed?: number;
		width?: number;
		height?: number;
		gridWidth?: number;
		gridHeight?: number;
		showControls?: boolean;
	}

	let {
		title,
		description,
		codeHtml,
		codeTitle = 'Code',
		rule,
		seed = { kind: 'random', density: 0.22, includeSpectrum: true },
		speed = 12,
		width = 320,
		height = 320,
		gridWidth = 128,
		gridHeight = 128,
		showControls = false
	}: Props = $props();

	const simState = getSimulationState();

	const neighborShadingIndex = $derived(
		simState.neighborShading === 'off' ? 0 : simState.neighborShading === 'alive' ? 1 : 2
	);

	let canvasApi: { reset: () => void; paintDisk: (r?: number) => void } | null = $state(null);

	function handlePulse() {
		// Additive pulse
		canvasApi?.paintDisk(Math.floor(Math.min(gridWidth, gridHeight) * 0.15));
	}
</script>

<div class="guide-demo">
	<div class="info">
		<h3>{title}</h3>
		{#if description}
			<p>{description}</p>
		{/if}
	</div>

	<div class="layout">
		<div class="code-side">
			<CodeBlock title={codeTitle} html={codeHtml} />
		</div>
		<div class="canvas-side">
			<div class="canvas-wrap">
				<LifeCanvas
					bind:this={canvasApi}
					{width}
					{height}
					{gridWidth}
					{gridHeight}
					{rule}
					{seed}
					{speed}
					neighborShading={neighborShadingIndex}
					spectrumMode={spectrumModeToIndex(simState.spectrumMode)}
					spectrumFrequency={simState.spectrumFrequency}
					isLightTheme={simState.isLightTheme}
					aliveColor={simState.aliveColor}
					className="guide-canvas"
				/>
				{#if showControls}
					<div class="canvas-actions">
						<button class="pulse-btn" onclick={handlePulse}>
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
								<circle cx="12" cy="12" r="5"/>
							</svg>
							Pulse Seed
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.guide-demo {
		margin: 2.5rem 0;
		display: grid;
		gap: 1.5rem;
	}

	.info h3 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.info p {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.6;
		max-width: 70ch;
	}

	.layout {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	.code-side {
		min-width: 0;
	}

	.canvas-side {
		display: grid;
		place-items: center;
	}

	.canvas-wrap {
		position: relative;
		border-radius: 24px;
		border: 1px solid var(--ui-border);
		background: rgba(0, 0, 0, 0.2);
		padding: 1rem;
		box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
	}

	:global(.guide-canvas) {
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.4);
	}

	.canvas-actions {
		margin-top: 1rem;
		display: flex;
		justify-content: center;
	}

	.pulse-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.2rem;
		border-radius: 12px;
		background: var(--ui-accent-bg);
		color: var(--ui-accent);
		border: 1px solid var(--ui-accent-border);
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
	}

	.pulse-btn:hover {
		background: var(--ui-accent-bg-hover);
		transform: translateY(-1px);
	}

	.pulse-btn svg {
		width: 18px;
		height: 18px;
	}

	@media (max-width: 1024px) {
		.layout {
			grid-template-columns: 1fr;
		}
		
		.canvas-side {
			order: -1;
		}
	}
</style>
