<script lang="ts">
	import { LifeCanvas } from '@games-of-life/svelte';
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import { spectrumModeToIndex, type NeighborhoodId } from '@games-of-life/core';
	import { goto } from '$app/navigation';

	const simState = getSimulationState();

	type Rule = {
		name: string;
		birthMask: number;
		surviveMask: number;
		numStates: number;
		neighborhood: NeighborhoodId;
	};

	const rules = {
		life: {
			name: "Conway's Life",
			birthMask: 0b0000_1000,
			surviveMask: 0b0000_1100,
			numStates: 2,
			neighborhood: 'moore'
		} satisfies Rule,
		highlife: {
			name: 'HighLife',
			birthMask: 0b0100_1000, // B36
			surviveMask: 0b0000_1100, // S23
			numStates: 2,
			neighborhood: 'moore'
		} satisfies Rule,
		hexGenerations: {
			name: 'Hex Generations',
			birthMask: 0b0001_1010_00, // (tuned for visual richness)
			surviveMask: 0b0111_1000_00,
			numStates: 96,
			neighborhood: 'extendedHexagonal'
		} satisfies Rule
	} as const;

	let isLifePlaying = $state(true);
	let isButtonPlaying = $state(true);
	let isHexPlaying = $state(true);

	const isLightTheme = $derived(simState.isLightTheme);
	const aliveColor = $derived(simState.aliveColor);
	const spectrumModeIndex = $derived(spectrumModeToIndex(simState.spectrumMode));
	const spectrumFrequency = $derived(simState.spectrumFrequency);
	const neighborShadingIndex = $derived(
		simState.neighborShading === 'off' ? 0 : simState.neighborShading === 'alive' ? 1 : 2
	);
	const speed = $derived(Math.min(60, simState.speed));

	function handleBack() {
		goto('/');
	}
</script>

<div class="library-page">
	<header class="header">
		<button class="back" type="button" onclick={handleBack}>
			<span aria-hidden="true">←</span> Back to app
		</button>
		<div class="title">
			<h1>Games of Life Library</h1>
			<p class="subtitle">
				A reusable WebGPU cellular automaton engine you can embed anywhere — from tiny UI elements to full-screen canvases.
			</p>
		</div>
	</header>

	<main class="content">
		<section class="panel">
			<h2>What you’re looking at</h2>
			<p>
				This app is built on the same internal packages we’re extracting into a standalone library:
				<code>@games-of-life/core</code>, <code>@games-of-life/webgpu</code>, <code>@games-of-life/svelte</code>.
				This page is the beginning of the docs/tutorial experience (temporary, while the library lives inside this repo).
			</p>
		</section>

		<section class="grid">
			<div class="panel">
				<div class="panel-head">
					<h2>Drop-in canvas (Svelte)</h2>
					<button class="mini-btn" type="button" onclick={() => (isLifePlaying = !isLifePlaying)}>
						{isLifePlaying ? 'Pause' : 'Play'}
					</button>
				</div>

				<div class="demo">
					<LifeCanvas
						width={220}
						height={220}
						gridWidth={128}
						gridHeight={128}
						rule={rules.life}
						speed={speed}
						playing={isLifePlaying}
						seed={{ kind: 'random', density: 0.22, includeSpectrum: true }}
						neighborShading={neighborShadingIndex}
						spectrumMode={spectrumModeIndex}
						spectrumFrequency={spectrumFrequency}
						isLightTheme={isLightTheme}
						aliveColor={aliveColor}
						className="library-canvas"
					/>
				</div>

				<details class="snippet">
					<summary>Show snippet</summary>
					<pre><code>import { LifeCanvas } from '@games-of-life/svelte';

&lt;LifeCanvas
  width={220}
  height={220}
  gridWidth={128}
  gridHeight={128}
  rule={{ birthMask: 0b1000, surviveMask: 0b1100, numStates: 2, neighborhood: 'moore' }}
  seed={{ kind: 'random', density: 0.22, includeSpectrum: true }}
/&gt;</code></pre>
				</details>
			</div>

			<div class="panel">
				<div class="panel-head">
					<h2>“CA Button”</h2>
					<button class="mini-btn" type="button" onclick={() => (isButtonPlaying = !isButtonPlaying)}>
						{isButtonPlaying ? 'Pause' : 'Play'}
					</button>
				</div>

				<p class="muted">
					The library is designed for embedding: tiny canvases inside UI controls should be easy and reliable.
				</p>

				<button class="ca-button" type="button">
					<div class="ca-bg">
						<LifeCanvas
							width={320}
							height={92}
							gridWidth={160}
							gridHeight={48}
							rule={rules.highlife}
							speed={Math.min(45, speed)}
							playing={isButtonPlaying}
							seed={{ kind: 'random', density: 0.2, includeSpectrum: true }}
							neighborShading={neighborShadingIndex}
							spectrumMode={spectrumModeIndex}
							spectrumFrequency={spectrumFrequency}
							isLightTheme={isLightTheme}
							aliveColor={aliveColor}
							className="library-canvas"
						/>
					</div>
					<span class="ca-label">Learn more</span>
					<span class="ca-sub">HighLife • WebGPU</span>
				</button>
			</div>

			<div class="panel">
				<div class="panel-head">
					<h2>Hex + Generations</h2>
					<button class="mini-btn" type="button" onclick={() => (isHexPlaying = !isHexPlaying)}>
						{isHexPlaying ? 'Pause' : 'Play'}
					</button>
				</div>
				<p class="muted">
					Hex tiling comes from the same renderer/kernel path — controlled by the rule neighborhood.
				</p>
				<div class="demo wide">
					<LifeCanvas
						width={320}
						height={220}
						gridWidth={160}
						gridHeight={92}
						rule={rules.hexGenerations}
						speed={Math.min(30, speed)}
						playing={isHexPlaying}
						seed={{ kind: 'random', density: 0.18, includeSpectrum: true }}
						neighborShading={neighborShadingIndex}
						spectrumMode={spectrumModeIndex}
						spectrumFrequency={spectrumFrequency}
						isLightTheme={isLightTheme}
						aliveColor={aliveColor}
						className="library-canvas"
					/>
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	.library-page {
		position: fixed;
		inset: 0;
		overflow: auto;
		padding: 1.25rem;
		background:
			radial-gradient(1200px 600px at 20% -10%, rgba(45, 212, 191, 0.12), transparent 55%),
			radial-gradient(900px 500px at 90% 10%, rgba(96, 165, 250, 0.10), transparent 55%),
			var(--color-bg);
	}

	.header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 0 auto 1.2rem;
		max-width: 980px;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.75rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.22);
		color: var(--color-text);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.back:hover {
		border-color: rgba(45, 212, 191, 0.4);
		background: rgba(45, 212, 191, 0.12);
	}

	.title h1 {
		margin: 0;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
	}

	.subtitle {
		margin: 0.35rem 0 0;
		color: var(--color-text-muted);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.content {
		max-width: 980px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.28);
		border-radius: 14px;
		padding: 1rem;
		backdrop-filter: blur(14px);
	}

	.panel h2 {
		margin: 0 0 0.55rem;
		font-size: 0.95rem;
		letter-spacing: -0.01em;
	}

	.panel p {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.55;
		font-size: 0.9rem;
	}

	.panel code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
		font-size: 0.86em;
		color: var(--color-text);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 0.05rem 0.45rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 1rem;
	}

	.grid > :global(.panel:nth-child(1)) {
		grid-column: span 6;
	}
	.grid > :global(.panel:nth-child(2)) {
		grid-column: span 6;
	}
	.grid > :global(.panel:nth-child(3)) {
		grid-column: span 12;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
	}

	.mini-btn {
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-text);
		padding: 0.4rem 0.65rem;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.mini-btn:hover {
		border-color: rgba(45, 212, 191, 0.35);
		background: rgba(45, 212, 191, 0.10);
	}

	.demo {
		display: grid;
		place-items: center;
		padding: 0.6rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.25);
	}

	.demo.wide {
		justify-items: center;
	}

	:global(.library-canvas) {
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.35);
	}

	.muted {
		margin: 0 0 0.75rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.ca-button {
		position: relative;
		width: 100%;
		max-width: 360px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		overflow: hidden;
		padding: 0;
		background: rgba(0, 0, 0, 0.35);
		cursor: pointer;
		text-align: left;
	}

	.ca-button:hover {
		border-color: rgba(45, 212, 191, 0.45);
	}

	.ca-bg {
		position: relative;
		height: 92px;
	}

	.ca-bg :global(canvas) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
		border-radius: 0;
	}

	.ca-label {
		display: block;
		padding: 0.75rem 0.9rem 0.15rem;
		font-weight: 800;
		color: var(--color-text);
		letter-spacing: -0.02em;
	}

	.ca-sub {
		display: block;
		padding: 0 0.9rem 0.8rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.snippet {
		margin-top: 0.75rem;
	}

	.snippet summary {
		cursor: pointer;
		color: var(--color-text);
		font-weight: 600;
		font-size: 0.85rem;
	}

	.snippet pre {
		margin: 0.6rem 0 0;
		white-space: pre-wrap;
		border-radius: 12px;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.10);
		color: var(--color-text);
		overflow: auto;
	}

	@media (max-width: 900px) {
		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.grid {
			grid-template-columns: 1fr;
		}

		.grid > :global(.panel:nth-child(1)),
		.grid > :global(.panel:nth-child(2)),
		.grid > :global(.panel:nth-child(3)) {
			grid-column: auto;
		}
	}
</style>


