<script lang="ts">
	import { 
		getAudioState, 
		toggleAudio, 
		setVolume, 
		setFrequencyRange, 
		setSoftening, 
		updateAudioConfig 
	} from '../stores/audio.svelte.js';
	import { getSimulationState } from '../stores/simulation.svelte.js';
	import { draggable } from '../utils/draggable.js';
	import { bringToFront, setModalPosition, getModalState } from '../stores/modalManager.svelte.js';
	import InfluenceCurveEditor from './InfluenceCurveEditor.svelte';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const audioState = getAudioState();
	const simState = getSimulationState();
	
	// Modal dragging state
	const modalState = $derived(getModalState('audio'));
	
	function handleDragEnd(position: { x: number; y: number }) {
		setModalPosition('audio', position);
	}
	
	function handleModalClick() {
		bringToFront('audio');
	}

	// Local state for UI (synced from store config)
	let volume = $state(audioState.config.masterVolume);
	let minFreq = $state(audioState.config.minFreq);
	let maxFreq = $state(audioState.config.maxFreq);
	let softening = $state(audioState.config.softening);
	type CurvePoint = { x: number; y: number };
	let neighborAmpDepth = $state(audioState.config.neighborVitalityAmpDepth);
	let neighborTimbreDepth = $state(audioState.config.neighborVitalityTimbreDepth);
	let neighborWaveDepth = $state(audioState.config.neighborVitalityWaveDepth);
	let neighborInvert = $state(audioState.config.neighborVitalityInvert);
	let activeRoute = $state<'amp' | 'timbre' | 'wave'>('amp');

	const VITALITY_PRESETS: Array<{
		id: string;
		name: string;
		description: string;
		curve: CurvePoint[];
		ampDepth: number;
		timbreDepth: number;
		waveDepth: number;
		invert: boolean;
	}> = [
		{
			id: 'neutral',
			name: 'Neutral',
			description: 'No neighbor vitality modulation',
			curve: [
				{ x: 0, y: 0 },
				{ x: 1, y: 0 }
			],
			ampDepth: 1.0,
			timbreDepth: 0.0,
			waveDepth: 0.0,
			invert: false
		},
		{
			id: 'swarm',
			name: 'Swarm Pulse',
			description: 'Dense neighborhoods swell louder + brighter',
			curve: [
				{ x: 0, y: 0 },
				{ x: 0.25, y: -0.35 },
				{ x: 0.6, y: 0.35 },
				{ x: 1, y: 1.15 }
			],
			ampDepth: 0.85,
			timbreDepth: 0.7,
			waveDepth: 0.15,
			invert: false
		},
		{
			id: 'ghost-choir',
			name: 'Ghost Choir',
			description: 'Mid-vital neighborhoods sing; phase shimmers',
			curve: [
				{ x: 0, y: 0 },
				{ x: 0.22, y: 1.35 },
				{ x: 0.55, y: 0.15 },
				{ x: 1, y: -0.65 }
			],
			ampDepth: 0.65,
			timbreDepth: 0.25,
			waveDepth: 0.8,
			invert: false
		},
		{
			id: 'antisocial',
			name: 'Anti-social',
			description: 'Isolated cells pop; clusters duck',
			curve: [
				{ x: 0, y: 0 },
				{ x: 0.25, y: -0.2 },
				{ x: 1, y: 1.0 }
			],
			ampDepth: 0.8,
			timbreDepth: 0.55,
			waveDepth: 0.25,
			invert: true
		}
	];

	// Local state object for InfluenceCurveEditor (audio neighbor vitality → loudness gain)
	// We reuse the exact same curve editor by presenting an object that looks like simState.
	const neighborVitalityGainState = $state({
		// Curve editor expects vitality settings fields
		vitalityMode: (audioState.config.neighborVitalityCurve?.length ?? 0) >= 2 ? 'curve' : 'none',
		vitalityCurvePoints: (audioState.config.neighborVitalityCurve ?? []).map((p) => ({ x: p.x, y: p.y })),
		vitalityGhostFactor: 0,
		vitalityThreshold: 1.0,
		vitalitySigmoidSharpness: 10.0,
		vitalityDecayPower: 1.0,

		// For spectrum gradient coloring (matches canvas theme)
		aliveColor: simState.aliveColor,
		isLightTheme: simState.isLightTheme,
		spectrumMode: simState.spectrumMode,
		spectrumFrequency: simState.spectrumFrequency
	});

	$effect(() => {
		neighborVitalityGainState.aliveColor = simState.aliveColor;
		neighborVitalityGainState.isLightTheme = simState.isLightTheme;
		neighborVitalityGainState.spectrumMode = simState.spectrumMode;
		neighborVitalityGainState.spectrumFrequency = simState.spectrumFrequency;
	});

	// Event handlers for sliders
	function handleVolumeChange() {
		setVolume(volume);
	}

	function handleFreqChange() {
		setFrequencyRange(minFreq, maxFreq);
	}

	function handleSofteningChange() {
		setSoftening(softening);
	}

	function applyVitalityPreset(preset: (typeof VITALITY_PRESETS)[number]) {
		neighborInvert = preset.invert;
		neighborAmpDepth = preset.ampDepth;
		neighborTimbreDepth = preset.timbreDepth;
		neighborWaveDepth = preset.waveDepth;

		neighborVitalityGainState.vitalityMode = 'curve';
		neighborVitalityGainState.vitalityCurvePoints = preset.curve.map((p) => ({ x: p.x, y: p.y }));

		updateAudioConfig({
			neighborVitalityCurve: preset.curve,
			neighborVitalityAmpDepth: preset.ampDepth,
			neighborVitalityTimbreDepth: preset.timbreDepth,
			neighborVitalityWaveDepth: preset.waveDepth,
			neighborVitalityInvert: preset.invert
		});
	}

	// Get frequency display
	function formatFreq(hz: number): string {
		if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
		return `${Math.round(hz)}`;
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="backdrop" style="z-index: {modalState.zIndex};" onwheel={(e) => {
	if (e.target !== e.currentTarget) return;
	const canvas = document.querySelector('canvas');
	if (canvas) {
		canvas.dispatchEvent(new WheelEvent('wheel', {
			deltaY: e.deltaY,
			deltaX: e.deltaX,
			clientX: e.clientX,
			clientY: e.clientY,
			bubbles: true
		}));
	}
}}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div 
		class="panel"
		onclick={handleModalClick}
		use:draggable={{ 
			handle: '.header', 
			bounds: true,
			initialPosition: modalState.position,
			onDragEnd: handleDragEnd
		}}
	>
		<div class="header">
			<span class="title">
				<svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M11 5L6 9H2v6h4l5 4V5z" />
					<path d="M15.54 8.46a5 5 0 010 7.07" />
					<path d="M19.07 4.93a10 10 0 010 14.14" />
				</svg>
				Audio
			</span>
			<button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
		</div>

		<div class="content">
			<!-- Power Toggle -->
			<div class="row">
				<span class="label">Audio</span>
				<button 
					class="toggle" 
					class:on={audioState.isEnabled}
					onclick={() => toggleAudio()}
					aria-label={audioState.isEnabled ? 'Disable audio' : 'Enable audio'}
				>
					<span class="track"><span class="thumb"></span></span>
				</button>
			</div>

			<!-- Volume -->
			<div class="row col">
				<div class="row-header">
					<span class="label">Volume</span>
					<span class="value">{Math.round(volume * 100)}%</span>
				</div>
				<input 
					type="range" 
					min="0" 
					max="1" 
					step="0.01"
					bind:value={volume}
					oninput={handleVolumeChange}
					class="slider"
					aria-label="Volume"
				/>
			</div>

			<!-- Frequency Range (dual-knob slider) -->
			<div class="row col">
				<div class="row-header">
					<span class="label">Freq Range</span>
					<span class="value">{formatFreq(minFreq)}Hz – {formatFreq(maxFreq)}Hz</span>
				</div>
				<div class="range-slider-container">
					<!-- Track background with colored active region -->
					<div class="range-track">
						<div 
							class="range-active" 
							style="left: {((minFreq - 20) / (8000 - 20)) * 100}%; right: {100 - ((maxFreq - 20) / (8000 - 20)) * 100}%"
						></div>
					</div>
					<!-- Two overlapping range inputs -->
					<input 
						type="range" 
						min="20" 
						max="8000" 
						step="10"
						bind:value={minFreq}
						oninput={() => { if (minFreq > maxFreq - 100) minFreq = maxFreq - 100; handleFreqChange(); }}
						class="range-input range-min"
						aria-label="Minimum frequency"
					/>
					<input 
						type="range" 
						min="20" 
						max="8000" 
						step="10"
						bind:value={maxFreq}
						oninput={() => { if (maxFreq < minFreq + 100) maxFreq = minFreq + 100; handleFreqChange(); }}
						class="range-input range-max"
						aria-label="Maximum frequency"
					/>
				</div>
			</div>

			<!-- Softening -->
			<div class="row col">
				<div class="row-header">
					<span class="label">Softening</span>
					<span class="value">{Math.round(softening * 100)}%</span>
				</div>
				<input 
					type="range" 
					min="0" 
					max="1" 
					step="0.01"
					bind:value={softening}
					oninput={handleSofteningChange}
					class="slider"
					aria-label="Softening"
				/>
			</div>

			<!-- Vitality Sonification (Neighbor Vitality → Audio Modulation) -->
			<div class="row col vitality-sonification">
				<div class="section-head">
					<span class="label">Vitality Sonification</span>
					<span class="value">neighbor vitality</span>
				</div>

				<div class="vitality-panel">
					<div class="vitality-presets" aria-label="Vitality presets">
						{#each VITALITY_PRESETS as vp (vp.id)}
							<button class="vitality-preset" onclick={() => applyVitalityPreset(vp)} title={vp.description}>
								{vp.name}
							</button>
						{/each}
					</div>

					<div class="routing-compact">
						<div class="tabs">
							<button class="tab" class:active={activeRoute === 'amp'} onclick={() => (activeRoute = 'amp')}>
								Amp
							</button>
							<button class="tab" class:active={activeRoute === 'timbre'} onclick={() => (activeRoute = 'timbre')}>
								Timbre
							</button>
							<button class="tab" class:active={activeRoute === 'wave'} onclick={() => (activeRoute = 'wave')}>
								Wave
							</button>
							<button
								class="invert-btn"
								class:active={neighborInvert}
								onclick={() => {
									neighborInvert = !neighborInvert;
									updateAudioConfig({ neighborVitalityInvert: neighborInvert });
								}}
								title="Invert neighbor vitality modulation"
							>
								Inv {neighborInvert ? 'On' : 'Off'}
							</button>
						</div>

						<div class="depth-row">
							<span class="route-label">Depth</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={activeRoute === 'amp' ? neighborAmpDepth : activeRoute === 'timbre' ? neighborTimbreDepth : neighborWaveDepth}
								oninput={(e) => {
									const v = parseFloat((e.currentTarget as HTMLInputElement).value);
									if (activeRoute === 'amp') {
										neighborAmpDepth = v;
										updateAudioConfig({ neighborVitalityAmpDepth: v });
									} else if (activeRoute === 'timbre') {
										neighborTimbreDepth = v;
										updateAudioConfig({ neighborVitalityTimbreDepth: v });
									} else {
										neighborWaveDepth = v;
										updateAudioConfig({ neighborVitalityWaveDepth: v });
									}
								}}
								aria-label="Routing depth"
							/>
							<span class="route-value">
								{Math.round(
									(activeRoute === 'amp'
										? neighborAmpDepth
										: activeRoute === 'timbre'
											? neighborTimbreDepth
											: neighborWaveDepth) * 100
								)}%
							</span>
						</div>
					</div>

					<div class="curve-block">
						<InfluenceCurveEditor
							width={360}
							height={140}
							compact={true}
							title="Neighbor Vitality → Curve (y = log2)"
							stateOverride={neighborVitalityGainState}
							onChange={(mode: string, points: CurvePoint[]) => {
								updateAudioConfig({
									neighborVitalityCurve: mode === 'curve' && points.length >= 2 ? points : []
								});
							}}
						/>
						<div class="curve-help">
							y is log2 gain. Depth routes it into amp / timbre / wave.
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.panel {
		pointer-events: auto;
		background: var(--ui-panel-bg, rgba(20, 20, 28, 0.95));
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		border-radius: 8px;
		padding: 0.6rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		width: 320px;
		backdrop-filter: blur(12px);
		max-width: calc(100vw - 24px);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
		cursor: grab;
		user-select: none;
	}

	.header:active {
		cursor: grabbing;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--ui-text-bright, #e0e0e0);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.header-icon {
		width: 14px;
		height: 14px;
		color: var(--ui-accent, #2dd4bf);
	}

	.close-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--ui-text, #555);
		font-size: 0.8rem;
		cursor: pointer;
		border-radius: 3px;
	}

	.close-btn:hover {
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		color: var(--ui-text-hover, #fff);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: calc(100vh - 140px);
		overflow: auto;
		padding-right: 0.15rem;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.row.col {
		flex-direction: column;
		align-items: stretch;
		gap: 0.3rem;
	}

	.row-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.label {
		font-size: 0.7rem;
		color: var(--ui-text, #888);
	}

	.value {
		font-size: 0.65rem;
		color: var(--ui-accent, #2dd4bf);
		font-weight: 500;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.1rem 0.1rem 0.15rem;
	}

	.vitality-panel {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.vitality-presets {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.25rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 0.1rem;
	}

	.vitality-preset {
		-webkit-tap-highlight-color: transparent;
		padding: 0.3rem 0.4rem;
		border-radius: 5px;
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		background: var(--ui-border, rgba(255, 255, 255, 0.03));
		color: var(--ui-text, #888);
		font-size: 0.6rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.vitality-preset:hover {
		background: var(--ui-border-hover, rgba(255, 255, 255, 0.08));
		color: var(--ui-text-hover, #fff);
	}

	@media (max-width: 420px) {
		.curve-help {
			display: none;
		}
	}

	.routing-compact {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.35rem 0.4rem;
		border-radius: 6px;
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
		background: rgba(0, 0, 0, 0.12);
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		align-items: center;
	}

	.tab {
		-webkit-tap-highlight-color: transparent;
		padding: 0.25rem 0.4rem;
		border-radius: 999px;
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		background: var(--ui-border, rgba(255, 255, 255, 0.03));
		color: var(--ui-text, #888);
		font-size: 0.6rem;
		font-weight: 700;
		cursor: pointer;
	}

	.tab.active {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.15));
		border-color: var(--ui-accent-border, rgba(45, 212, 191, 0.3));
		color: var(--ui-accent, #2dd4bf);
	}

	.depth-row {
		display: grid;
		grid-template-columns: 44px 1fr 44px;
		align-items: center;
		gap: 0.4rem;
	}

	.route-label {
		font-size: 0.6rem;
		color: var(--ui-text, #777);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.route-value {
		font-size: 0.6rem;
		color: var(--ui-accent, #2dd4bf);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.depth-row input[type="range"] {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.depth-row input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--ui-accent, #2dd4bf);
		border: none;
	}

	.invert-btn {
		-webkit-tap-highlight-color: transparent;
		height: 22px;
		padding: 0 0.5rem;
		border-radius: 999px;
		border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
		background: var(--ui-border, rgba(255, 255, 255, 0.03));
		color: var(--ui-text, #888);
		font-size: 0.6rem;
		font-weight: 700;
		cursor: pointer;
		justify-self: start;
		margin-left: auto;
	}

	.invert-btn.active {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.15));
		border-color: var(--ui-accent-border, rgba(45, 212, 191, 0.3));
		color: var(--ui-accent, #2dd4bf);
	}

	.curve-block {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.curve-help {
		font-size: 0.6rem;
		color: var(--ui-text, #777);
		line-height: 1.35;
	}

	/* Toggle */
	.toggle {
		display: flex;
		align-items: center;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
	}

	.track {
		width: 32px;
		height: 18px;
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		border-radius: 9px;
		position: relative;
		transition: background 0.15s;
	}

	.toggle.on .track {
		background: var(--ui-accent-bg, rgba(45, 212, 191, 0.4));
	}

	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		background: var(--ui-text, #555);
		border-radius: 50%;
		transition: all 0.15s;
	}

	.toggle.on .thumb {
		left: 16px;
		background: var(--ui-accent, #2dd4bf);
	}

	/* Slider */
	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: var(--ui-border, rgba(255, 255, 255, 0.1));
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--ui-accent, #2dd4bf);
		cursor: pointer;
		border: none;
		transition: transform 0.1s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--ui-accent, #2dd4bf);
		cursor: pointer;
		border: none;
	}

	/* Dual-Knob Range Slider */
	.range-slider-container {
		position: relative;
		height: 20px;
		width: 100%;
	}

	.range-track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 6px;
		transform: translateY(-50%);
		border-radius: 3px;
		background: linear-gradient(to right, 
			hsl(20, 80%, 35%), 
			hsl(45, 90%, 40%), 
			hsl(120, 70%, 35%), 
			hsl(200, 80%, 40%), 
			hsl(280, 70%, 45%)
		);
		opacity: 0.4;
	}

	.range-active {
		position: absolute;
		top: 0;
		bottom: 0;
		background: linear-gradient(to right, 
			hsl(20, 80%, 50%), 
			hsl(45, 90%, 55%), 
			hsl(120, 70%, 45%), 
			hsl(200, 80%, 50%), 
			hsl(280, 70%, 55%)
		);
		border-radius: 3px;
		opacity: 1;
	}

	.range-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		pointer-events: none;
		margin: 0;
		padding: 0;
	}

	.range-input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--ui-accent, #2dd4bf);
		cursor: pointer;
		pointer-events: auto;
		border: 2px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		transition: transform 0.1s ease;
	}

	.range-input::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.range-input::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--ui-accent, #2dd4bf);
		cursor: pointer;
		pointer-events: auto;
		border: 2px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
	}

	/* Ensure min thumb is above on the left side */
	.range-min {
		z-index: 2;
	}

	.range-max {
		z-index: 1;
	}
</style>
