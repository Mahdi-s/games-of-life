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
		gridHeight = 128
	}: Props = $props();

	const simState = getSimulationState();

	const neighborShadingIndex = $derived(
		simState.neighborShading === 'off' ? 0 : simState.neighborShading === 'alive' ? 1 : 2
	);
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
			</div>
		</div>
	</div>
</div>

<style>
	.guide-demo {
		margin: 2rem 0;
		display: grid;
		gap: 1.2rem;
	}

	.info h3 {
		margin: 0 0 0.5rem;
		font-size: 1.2rem;
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
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
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
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
		padding: 1rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	}

	:global(.guide-canvas) {
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.4);
	}

	@media (max-width: 960px) {
		.layout {
			grid-template-columns: 1fr;
		}
		
		.canvas-side {
			order: -1;
		}
	}
</style>

