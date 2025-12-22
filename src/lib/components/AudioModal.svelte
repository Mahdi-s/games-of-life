<script lang="ts">
	import { 
		getAudioState, 
		toggleAudio, 
		setVolume, 
		setFrequencyRange, 
		setSoftening, 
		setScale, 
		updateAudioConfig 
	} from '../stores/audio.svelte.js';
	import { draggable } from '../utils/draggable.js';
	import { bringToFront, setModalPosition, getModalState } from '../stores/modalManager.svelte.js';
	import { AUDIO_PRESETS, type MusicalScale } from '@games-of-life/audio';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const audioState = getAudioState();
	
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
	let selectedPreset = $state<string | null>(null);
	let selectedScale = $state<MusicalScale>(audioState.config.scale);

	// Musical scales for the selector
	const SCALES: { id: MusicalScale; name: string; description: string }[] = [
		{ id: 'pentatonic', name: 'Pentatonic', description: 'Pleasant, no dissonance' },
		{ id: 'major', name: 'Major', description: 'Happy, bright' },
		{ id: 'minor', name: 'Minor', description: 'Melancholic, dark' },
		{ id: 'chromatic', name: 'Chromatic', description: 'All 12 notes' },
		{ id: 'whole-tone', name: 'Whole Tone', description: 'Dreamy, ethereal' },
		{ id: 'free', name: 'Free', description: 'No quantization' },
	];

	// Event handlers for sliders - update audio engine on input
	function handleVolumeChange() {
		setVolume(volume);
		selectedPreset = null;
	}

	function handleFreqChange() {
		setFrequencyRange(minFreq, maxFreq);
		selectedPreset = null;
	}

	function handleSofteningChange() {
		setSoftening(softening);
		selectedPreset = null;
	}

	// Apply preset
	function applyPreset(presetId: string) {
		const preset = AUDIO_PRESETS.find(p => p.id === presetId);
		if (!preset) return;
		
		selectedPreset = presetId;
		
		// Apply all preset values
		if (preset.config.masterVolume !== undefined) volume = preset.config.masterVolume;
		if (preset.config.minFreq !== undefined) minFreq = preset.config.minFreq;
		if (preset.config.maxFreq !== undefined) maxFreq = preset.config.maxFreq;
		if (preset.config.softening !== undefined) softening = preset.config.softening;
		if (preset.config.scale !== undefined) selectedScale = preset.config.scale;
		
		// Apply full config to engine
		updateAudioConfig(preset.config);
	}

	// Handle scale selection
	function handleScaleChange(scale: MusicalScale) {
		selectedScale = scale;
		setScale(scale);
		selectedPreset = null;
	}

	// Get frequency display
	function formatFreq(hz: number): string {
		if (hz >= 1000) return `${(hz / 1000).toFixed(1)}kHz`;
		return `${Math.round(hz)}Hz`;
	}

	// Generate preview gradient for frequency range
	function getFreqGradient(): string {
		return `linear-gradient(to right, 
			hsl(20, 80%, 50%), 
			hsl(45, 90%, 55%), 
			hsl(120, 70%, 45%), 
			hsl(200, 80%, 50%), 
			hsl(280, 70%, 55%)
		)`;
	}
</script>

<div
	class="audio-modal"
	style:z-index={modalState.zIndex}
	style:left={modalState.position ? `${modalState.position.x}px` : '50%'}
	style:top={modalState.position ? `${modalState.position.y}px` : '50%'}
	style:transform={modalState.position ? 'none' : 'translate(-50%, -50%)'}
	role="dialog"
	tabindex="-1"
	aria-label="Audio Settings"
	onclick={handleModalClick}
	onkeydown={() => {}}
	use:draggable={{
		handle: '.modal-header',
		initialPosition: modalState.position,
		onDragEnd: handleDragEnd
	}}
>
	<div class="modal-header">
		<h2>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="header-icon">
				<path d="M11 5L6 9H2v6h4l5 4V5z" />
				<path d="M15.54 8.46a5 5 0 010 7.07" />
				<path d="M19.07 4.93a10 10 0 010 14.14" />
			</svg>
			Audio
		</h2>
		<button class="close-btn" onclick={onclose} aria-label="Close">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="modal-content">
		<!-- Enable/Disable Toggle -->
		<div class="section">
			<div class="toggle-row">
				<span class="toggle-label">Audio {audioState.isEnabled ? 'On' : 'Off'}</span>
				<button 
					class="power-btn" 
					class:active={audioState.isEnabled}
					onclick={() => toggleAudio()}
					aria-label={audioState.isEnabled ? 'Disable audio' : 'Enable audio'}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18.36 6.64a9 9 0 11-12.73 0" />
						<line x1="12" y1="2" x2="12" y2="12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Volume Slider -->
		<div class="section">
			<div class="section-label">
				<span>Volume</span>
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

		<!-- Presets -->
		<div class="section">
			<div class="section-label">Presets</div>
			<div class="preset-grid">
				{#each AUDIO_PRESETS as preset}
					<button
						class="preset-btn"
						class:selected={selectedPreset === preset.id}
						onclick={() => applyPreset(preset.id)}
						title={preset.description}
					>
						{preset.name}
					</button>
				{/each}
			</div>
		</div>

		<!-- Frequency Range -->
		<div class="section">
			<div class="section-label">
				<span>Frequency Range</span>
				<span class="value">{formatFreq(minFreq)} - {formatFreq(maxFreq)}</span>
			</div>
			<div class="freq-preview" style:background={getFreqGradient()}></div>
			<div class="dual-slider">
				<div class="slider-row">
					<span class="slider-label">Low</span>
					<input 
						type="range" 
						min="20" 
						max="500" 
						step="10"
						bind:value={minFreq}
						oninput={handleFreqChange}
						class="slider"
						aria-label="Minimum frequency"
					/>
				</div>
				<div class="slider-row">
					<span class="slider-label">High</span>
					<input 
						type="range" 
						min="200" 
						max="8000" 
						step="100"
						bind:value={maxFreq}
						oninput={handleFreqChange}
						class="slider"
						aria-label="Maximum frequency"
					/>
				</div>
			</div>
		</div>

		<!-- Softening (smoothing) -->
		<div class="section">
			<div class="section-label">
				<span>Softening</span>
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
			<div class="hint">Higher = smoother, more ambient sound</div>
		</div>

		<!-- Scale Selection -->
		<div class="section">
			<div class="section-label">Musical Scale</div>
			<div class="scale-grid">
				{#each SCALES as scale}
					<button
						class="scale-btn"
						class:selected={selectedScale === scale.id}
						onclick={() => handleScaleChange(scale.id)}
						title={scale.description}
					>
						{scale.name}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.audio-modal {
		position: fixed;
		background: rgba(18, 18, 24, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		width: 320px;
		max-height: 85vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(12px);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		cursor: grab;
		user-select: none;
		background: rgba(255, 255, 255, 0.03);
	}

	.modal-header:active {
		cursor: grabbing;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #e0e0e0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-icon {
		width: 18px;
		height: 18px;
		color: #9c7aff;
	}

	.close-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: #888;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.close-btn svg {
		width: 16px;
		height: 16px;
	}

	.modal-content {
		padding: 16px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-label .value {
		color: #9c7aff;
		font-weight: 500;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.toggle-label {
		font-size: 14px;
		color: #e0e0e0;
		font-weight: 500;
	}

	.power-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: #666;
	}

	.power-btn:hover {
		border-color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.1);
	}

	.power-btn.active {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.15);
		color: #4ade80;
	}

	.power-btn svg {
		width: 20px;
		height: 20px;
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #9c7aff;
		cursor: pointer;
		border: 2px solid rgba(255, 255, 255, 0.2);
		transition: transform 0.1s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #9c7aff;
		cursor: pointer;
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.preset-btn {
		padding: 8px 4px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #aaa;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		color: #fff;
	}

	.preset-btn.selected {
		background: rgba(156, 122, 255, 0.2);
		border-color: #9c7aff;
		color: #fff;
	}

	.freq-preview {
		height: 8px;
		border-radius: 4px;
		opacity: 0.8;
	}

	.dual-slider {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.slider-label {
		font-size: 10px;
		color: #666;
		width: 30px;
		flex-shrink: 0;
	}

	.scale-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.scale-btn {
		padding: 8px 4px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		color: #aaa;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.scale-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		color: #fff;
	}

	.scale-btn.selected {
		background: rgba(156, 122, 255, 0.2);
		border-color: #9c7aff;
		color: #fff;
	}

	.hint {
		font-size: 10px;
		color: #555;
		font-style: italic;
	}
</style>

