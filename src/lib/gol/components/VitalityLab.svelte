<script lang="ts">
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import { DEFAULT_VITALITY } from '$lib/utils/rules.js';
	import { sampleVitalityCurve } from '@games-of-life/core';
	import InfluenceCurveEditor from '$lib/components/InfluenceCurveEditor.svelte';
	import { LifeCanvas } from '@games-of-life/svelte';
	import { spectrumModeToIndex } from '@games-of-life/core';

	const globalSimState = getSimulationState();

	// Diagonal Growth rule
	const diagonalRule = {
		birthMask: 2148, // B2,5,6,11
		surviveMask: 2592, // S5,9,11
		numStates: 48,
		neighborhood: 'extendedHexagonal' as const
	};

	// Local vitality state to avoid affecting the main app
	let vitalityMode = $state<any>('curve');
	let vitalityCurvePoints = $state<any[]>([
		{ x: 0, y: 0 },
		{ x: 0.372, y: -0.746 },
		{ x: 0.531, y: 0.321 },
		{ x: 0.695, y: -0.669 },
		{ x: 1, y: -1 }
	]);
	
	let vitalityCurveSamples = $derived.by(() => {
		if (vitalityMode === 'none') return new Array(128).fill(0);
		if (vitalityCurvePoints.length >= 2) {
			return sampleVitalityCurve(vitalityCurvePoints);
		}
		return new Array(128).fill(0);
	});

	// Mock state object for InfluenceCurveEditor to ensure app-wide isolation
	const localState = {
		get vitalityMode() { return vitalityMode; },
		set vitalityMode(v) { vitalityMode = v; },
		get vitalityCurvePoints() { return vitalityCurvePoints; },
		set vitalityCurvePoints(v) { vitalityCurvePoints = v; },
		get isLightTheme() { return globalSimState.isLightTheme; },
		get aliveColor() { return globalSimState.aliveColor; },
		get spectrumMode() { return globalSimState.spectrumMode; },
		get spectrumFrequency() { return globalSimState.spectrumFrequency; },
		get vitalityThreshold() { return globalSimState.vitalityThreshold; },
		get vitalityGhostFactor() { return globalSimState.vitalityGhostFactor; },
		get vitalitySigmoidSharpness() { return globalSimState.vitalitySigmoidSharpness; },
		get vitalityDecayPower() { return globalSimState.vitalityDecayPower; },
		setVitalitySettings(s: any) {
			if (s) {
				vitalityMode = s.mode;
				vitalityCurvePoints = s.curvePoints || [];
			} else {
				vitalityMode = DEFAULT_VITALITY.mode;
				vitalityCurvePoints = DEFAULT_VITALITY.curvePoints || [];
			}
		}
	};

	const neighborShadingIndex = $derived(
		globalSimState.neighborShading === 'off' ? 0 : globalSimState.neighborShading === 'alive' ? 1 : 2
	);

	let canvasApi: { reset: () => void; paintDisk: (r: number) => void } | null = $state(null);

	function handleReset() {
		canvasApi?.reset();
	}

	function handlePulse() {
		canvasApi?.paintDisk(25);
	}
</script>

<div class="vitality-lab">
	<div class="lab-grid">
		<div class="demo-side">
			<div class="card canvas-card">
				<div class="lab-actions top">
					<button class="btn secondary" onclick={handlePulse}>
						<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>
						Pulse Seed
					</button>
					<button class="btn secondary" onclick={handleReset}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4v5h.6m14.8 2A8 8 0 004.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 01-15.2-2M19.4 15H15" /></svg>
						Reset Sim
					</button>
				</div>
				<div class="canvas-wrap">
					<LifeCanvas
						bind:this={canvasApi}
						width={360}
						height={360}
						gridWidth={160}
						gridHeight={185}
						rule={diagonalRule}
						seed={{ kind: 'disk', radius: 30 }}
						speed={15}
						neighborShading={neighborShadingIndex}
						spectrumMode={spectrumModeToIndex(globalSimState.spectrumMode)}
						spectrumFrequency={globalSimState.spectrumFrequency}
						isLightTheme={globalSimState.isLightTheme}
						aliveColor={globalSimState.aliveColor}
						vitalityCurve={vitalityCurveSamples}
						className="lab-canvas"
					/>
				</div>
			</div>
		</div>

		<div class="chart-side">
			<div class="card chart-card">
				<div class="card-head">
					<span class="badge">Influence Controller</span>
					<p class="chart-hint">Drag points to edit • Applied in real-time</p>
				</div>
				<div class="editor-wrap">
					<InfluenceCurveEditor width={600} height={280} stateOverride={localState} />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.vitality-lab {
		margin: 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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

	.chart-hint {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.editor-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		padding: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.canvas-card {
		align-items: center;
		justify-content: flex-start;
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

	.lab-actions.top {
		margin-bottom: 0.25rem;
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
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.btn:hover {
		border-color: var(--ui-accent);
		background: var(--btn-bg-hover);
		color: var(--ui-text-hover);
		transform: translateY(-2px);
	}

	.btn svg {
		width: 14px;
		height: 14px;
	}

	@media (max-width: 1200px) {
		.lab-grid {
			grid-template-columns: 1fr;
		}
		.demo-side {
			order: 1;
		}
		.card-head { flex-direction: column; gap: 0.5rem; }
	}
</style>
