<script lang="ts">
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import { LifeCanvas } from '@games-of-life/svelte';
	import { spectrumModeToIndex } from '@games-of-life/core';

	const globalSimState = getSimulationState();

	// Star Wars rule for interesting visuals
	const demoRule = {
		birthMask: 0b0000_0010_0,   // B2
		surviveMask: 0b0001_1100_0, // S345
		numStates: 4,
		neighborhood: 'moore' as const
	};

	// Audio state (local, not connected to main app audio)
	let isAudioEnabled = $state(false);
	let volume = $state(0.5);
	let minFreq = $state(80);
	let maxFreq = $state(1500);
	let softening = $state(0.6);
	let selectedScale = $state<'pentatonic' | 'major' | 'minor' | 'chromatic' | 'wholeTone' | 'free'>('pentatonic');
	
	// Simulated spectrum visualization (since we can't run actual audio in docs demo)
	let spectrumBars = $state<number[]>(new Array(32).fill(0).map(() => Math.random()));
	
	$effect(() => {
		if (!isAudioEnabled) return;
		
		// Simulate spectrum animation
		const interval = setInterval(() => {
			spectrumBars = spectrumBars.map((v, i) => {
				const target = Math.random() * 0.8 + 0.2;
				return v * 0.7 + target * 0.3;
			});
		}, 50);
		
		return () => clearInterval(interval);
	});

	const neighborShadingIndex = $derived(
		globalSimState.neighborShading === 'off' ? 0 : globalSimState.neighborShading === 'alive' ? 1 : 2
	);

	let canvasApi: { reset: () => void; paintDisk: (r: number) => void } | null = $state(null);

	function handleReset() {
		canvasApi?.reset();
	}

	function toggleAudio() {
		isAudioEnabled = !isAudioEnabled;
	}

	const scales = ['pentatonic', 'major', 'minor', 'chromatic', 'wholeTone', 'free'] as const;
	const scaleLabels = ['Penta', 'Major', 'Minor', 'Chrom', 'Whole', 'Free'];
</script>

<div class="audio-lab">
	<div class="lab-grid">
		<!-- Canvas Side -->
		<div class="demo-side">
			<div class="card canvas-card">
				<div class="lab-actions">
					<button class="btn toggle-btn" class:active={isAudioEnabled} onclick={toggleAudio}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 5L6 9H2v6h4l5 4V5z" />
							{#if isAudioEnabled}
								<path d="M15.54 8.46a5 5 0 010 7.07" />
								<path d="M19.07 4.93a10 10 0 010 14.14" />
							{/if}
						</svg>
						{isAudioEnabled ? 'Audio On' : 'Audio Off'}
					</button>
					<button class="btn secondary" onclick={handleReset}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M4 4v5h.6m14.8 2A8 8 0 004.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 01-15.2-2M19.4 15H15" />
						</svg>
						Reset
					</button>
				</div>
				<div class="canvas-wrap">
					<LifeCanvas
						bind:this={canvasApi}
						width={340}
						height={260}
						gridWidth={128}
						gridHeight={128}
						rule={demoRule}
						seed={{ kind: 'random', density: 0.25, includeSpectrum: true }}
						speed={15}
						neighborShading={neighborShadingIndex}
						spectrumMode={spectrumModeToIndex(globalSimState.spectrumMode)}
						spectrumFrequency={globalSimState.spectrumFrequency}
						isLightTheme={globalSimState.isLightTheme}
						aliveColor={globalSimState.aliveColor}
						className="lab-canvas"
					/>
				</div>
				
				<!-- Spectrum Visualizer -->
				<div class="spectrum-viz" class:active={isAudioEnabled}>
					{#each spectrumBars as bar, i}
						<div 
							class="bar" 
							style="height: {isAudioEnabled ? bar * 100 : 10}%; opacity: {isAudioEnabled ? 0.8 : 0.2}"
						></div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Controls Side -->
		<div class="controls-side">
			<div class="card controls-card">
				<div class="card-head">
					<span class="badge">Audio Controls</span>
					<span class="hint">GPU spectral synthesis</span>
				</div>
				
				<!-- Volume -->
				<div class="control-row">
					<label>Volume</label>
					<div class="slider-wrap">
						<input type="range" min="0" max="100" bind:value={volume} />
						<span class="value">{Math.round(volume * 100)}%</span>
					</div>
				</div>
				
				<!-- Frequency Range -->
				<div class="control-row">
					<label>Freq Range</label>
					<div class="freq-display">
						<span class="freq-value">{minFreq}Hz – {maxFreq >= 1000 ? (maxFreq / 1000).toFixed(1) + 'kHz' : maxFreq + 'Hz'}</span>
					</div>
					<div class="freq-track">
						<div 
							class="freq-fill"
							style="left: {(minFreq - 20) / (8000 - 20) * 100}%; right: {100 - (maxFreq - 20) / (8000 - 20) * 100}%"
						></div>
					</div>
				</div>
				
				<!-- Softening -->
				<div class="control-row">
					<label>Softening</label>
					<div class="slider-wrap">
						<input type="range" min="0" max="100" value={softening * 100} oninput={(e) => softening = Number(e.currentTarget.value) / 100} />
						<span class="value">{Math.round(softening * 100)}%</span>
					</div>
				</div>
				
				<!-- Musical Scale -->
				<div class="control-row">
					<label>Scale</label>
					<div class="scale-buttons">
						{#each scales as scale, i}
							<button 
								class="scale-btn" 
								class:active={selectedScale === scale}
								onclick={() => selectedScale = scale}
							>
								{scaleLabels[i]}
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Info Box -->
				<div class="info-box">
					<svg viewBox="0 0 24 24" fill="currentColor" class="info-icon">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
					</svg>
					<p>
						Each visible cell contributes to a 256-bin frequency spectrum. 
						The GPU aggregates cell states → spectrum, then an AudioWorklet 
						synthesizes the waveform in real-time.
					</p>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Data Flow Diagram -->
	<div class="flow-diagram">
		<div class="flow-step">
			<div class="flow-icon">📊</div>
			<div class="flow-label">Cell States</div>
			<div class="flow-desc">Vitality & position</div>
		</div>
		<div class="flow-arrow">→</div>
		<div class="flow-step">
			<div class="flow-icon">⚡</div>
			<div class="flow-label">GPU Shader</div>
			<div class="flow-desc">Spectral aggregation</div>
		</div>
		<div class="flow-arrow">→</div>
		<div class="flow-step">
			<div class="flow-icon">📈</div>
			<div class="flow-label">Spectrum</div>
			<div class="flow-desc">256 frequency bins</div>
		</div>
		<div class="flow-arrow">→</div>
		<div class="flow-step">
			<div class="flow-icon">🔊</div>
			<div class="flow-label">AudioWorklet</div>
			<div class="flow-desc">Additive synthesis</div>
		</div>
	</div>
</div>

<style>
	.audio-lab {
		margin: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.lab-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-items: stretch;
	}

	.card {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--ui-border);
		border-radius: 24px;
		padding: 1.2rem;
		backdrop-filter: blur(20px);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.5rem;
	}

	.badge {
		font-size: 0.6rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.6rem;
		border-radius: 100px;
		background: var(--ui-accent-bg);
		color: var(--ui-accent);
		border: 1px solid var(--ui-accent-border);
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.canvas-card {
		align-items: center;
	}

	.canvas-wrap {
		border-radius: 20px;
		background: rgba(0, 0, 0, 0.4);
		padding: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
	}

	:global(.lab-canvas) {
		border-radius: 14px;
	}

	.lab-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.btn {
		flex: 1;
		height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0 0.7rem;
		border-radius: 12px;
		background: var(--btn-bg);
		color: var(--ui-text);
		border: 1px solid var(--ui-border);
		font-weight: 800;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.btn:hover {
		border-color: var(--ui-accent);
		background: var(--btn-bg-hover);
		transform: translateY(-1px);
	}

	.btn svg {
		width: 16px;
		height: 16px;
	}

	.toggle-btn.active {
		background: var(--ui-accent-bg);
		border-color: var(--ui-accent);
		color: var(--ui-accent);
	}

	/* Spectrum Visualizer */
	.spectrum-viz {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 40px;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		width: 100%;
	}

	.spectrum-viz .bar {
		flex: 1;
		background: linear-gradient(to top, var(--ui-accent), var(--ui-accent-light, var(--ui-accent)));
		border-radius: 2px;
		transition: height 0.05s, opacity 0.3s;
		min-height: 3px;
	}

	/* Controls */
	.controls-card {
		gap: 1rem;
	}

	.control-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.control-row label {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.slider-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.slider-wrap input[type="range"] {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		-webkit-appearance: none;
		cursor: pointer;
	}

	.slider-wrap input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--ui-accent);
		border: none;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}

	.slider-wrap .value {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--ui-accent);
		min-width: 3rem;
		text-align: right;
	}

	.freq-display {
		text-align: right;
	}

	.freq-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--ui-accent);
	}

	.freq-track {
		position: relative;
		height: 8px;
		background: linear-gradient(to right, 
			hsl(20, 80%, 35%), 
			hsl(45, 90%, 40%), 
			hsl(120, 70%, 35%), 
			hsl(200, 80%, 40%), 
			hsl(280, 70%, 45%)
		);
		border-radius: 4px;
		opacity: 0.4;
	}

	.freq-fill {
		position: absolute;
		top: 0;
		bottom: 0;
		background: linear-gradient(to right, 
			hsl(20, 80%, 45%), 
			hsl(45, 90%, 50%), 
			hsl(120, 70%, 45%), 
			hsl(200, 80%, 50%), 
			hsl(280, 70%, 55%)
		);
		border-radius: 4px;
		opacity: 1;
	}

	.scale-buttons {
		display: flex;
		gap: 0.3rem;
	}

	.scale-btn {
		flex: 1;
		padding: 0.4rem 0.5rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--ui-border);
		color: var(--color-text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.scale-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--ui-accent-border);
	}

	.scale-btn.active {
		background: var(--ui-accent-bg);
		border-color: var(--ui-accent);
		color: var(--ui-accent);
	}

	.info-box {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.info-icon {
		width: 20px;
		height: 20px;
		color: var(--ui-accent);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.info-box p {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	/* Data Flow Diagram */
	.flow-diagram {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 20px;
		border: 1px solid var(--ui-border);
		flex-wrap: wrap;
	}

	.flow-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		min-width: 100px;
	}

	.flow-icon {
		font-size: 1.5rem;
	}

	.flow-label {
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--color-text);
	}

	.flow-desc {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.flow-arrow {
		font-size: 1.5rem;
		color: var(--ui-accent);
		opacity: 0.5;
	}

	@media (max-width: 1200px) {
		.lab-grid {
			grid-template-columns: 1fr;
		}
		.demo-side {
			order: 1;
		}
	}

	@media (max-width: 600px) {
		.flow-diagram {
			flex-direction: column;
		}
		.flow-arrow {
			transform: rotate(90deg);
		}
	}
</style>

