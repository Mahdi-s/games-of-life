<script lang="ts">
	import { onMount } from 'svelte';
	import { draggable } from '$lib/utils/draggable.js';
	import { bringToFront, setModalPosition, getModalState } from '$lib/stores/modalManager.svelte.js';
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import type { NlcaNeighborhood } from '$lib/nlca/types.js';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
	const modalState = $derived(getModalState('nlcaSettings'));
	const simState = getSimulationState();

	let apiKey = $state('');
	let model = $state('openai/gpt-4.1-mini');
	let maxConcurrency = $state(50);
	let gridWidth = $state(25);
	let gridHeight = $state(25);
	let neighborhood = $state<NlcaNeighborhood>('moore');

	onMount(() => {
		try {
			// Use env vars as defaults, then localStorage, then fallback defaults
			const envApiKey = import.meta.env.VITE_NLCA_OPENROUTER_API_KEY ?? '';
			const envModel = import.meta.env.VITE_NLCA_MODEL ?? 'openai/gpt-4.1-mini';
			
			apiKey = localStorage.getItem('nlca_openrouter_api_key') ?? envApiKey;
			model = localStorage.getItem('nlca_model') ?? envModel;
			maxConcurrency = Number(localStorage.getItem('nlca_max_concurrency') ?? '50') || 50;
			const nbh = (localStorage.getItem('nlca_neighborhood') ?? 'moore') as NlcaNeighborhood;
			neighborhood = nbh === 'vonNeumann' || nbh === 'extendedMoore' || nbh === 'moore' ? nbh : 'moore';
		} catch {
			// ignore
		}

		// Default to 25x25 for NLCA, or current sim dimensions if already set
		if (simState.gridWidth === 0 || simState.gridHeight === 0) {
			gridWidth = 25;
			gridHeight = 25;
		} else {
			gridWidth = simState.gridWidth;
			gridHeight = simState.gridHeight;
		}
	});

	function handleModalClick() {
		bringToFront('nlcaSettings');
	}
	function handleDragEnd(position: { x: number; y: number }) {
		setModalPosition('nlcaSettings', position);
	}
	function save() {
		try {
			localStorage.setItem('nlca_openrouter_api_key', apiKey);
			localStorage.setItem('nlca_model', model);
			localStorage.setItem('nlca_max_concurrency', String(maxConcurrency));
			localStorage.setItem('nlca_neighborhood', neighborhood);
		} catch {
			// ignore
		}

		window.dispatchEvent(
			new CustomEvent('nlca-config-changed', {
				detail: {
					apiKey,
					model,
					maxConcurrency,
					neighborhood,
					gridWidth,
					gridHeight
				}
			})
		);
		onclose();
	}
</script>

<div class="modal-backdrop" role="presentation" style="z-index: {modalState.zIndex};">
	<div
		class="modal"
		role="dialog"
		aria-label="NLCA Settings"
		tabindex="0"
		use:draggable={{ id: 'nlcaSettings', onDragEnd: handleDragEnd }}
		onclick={handleModalClick}
		onkeydown={() => {}}
		style={modalState.position ? `transform: translate(${modalState.position.x}px, ${modalState.position.y}px);` : ''}
	>
		<div class="header">
			<h3>NLCA Settings</h3>
			<button class="close" onclick={onclose} aria-label="Close">×</button>
		</div>

		<div class="content">
			<label>
				<span>OpenRouter API Key</span>
				<input type="password" bind:value={apiKey} placeholder="sk-or-..." />
			</label>
			<label>
				<span>Model</span>
				<input type="text" bind:value={model} />
			</label>
			<label>
				<span>Neighborhood</span>
				<select bind:value={neighborhood}>
					<option value="moore">Moore (8)</option>
					<option value="vonNeumann">Von Neumann (4)</option>
					<option value="extendedMoore">Extended Moore (24)</option>
				</select>
			</label>
			<label>
				<span>Max Concurrency</span>
				<input type="number" min="1" max="200" bind:value={maxConcurrency} />
				<small style="color: var(--ui-text); opacity: 0.7;">Parallel LLM calls (higher = faster but more rate limits)</small>
			</label>
			<div class="row">
				<label>
					<span>Grid width</span>
					<input type="number" min="8" max="512" bind:value={gridWidth} />
				</label>
				<label>
					<span>Grid height</span>
					<input type="number" min="8" max="512" bind:value={gridHeight} />
				</label>
			</div>
		</div>

		<div class="footer">
			<button class="btn" onclick={onclose}>Cancel</button>
			<button class="btn primary" onclick={save}>Save</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
	}
	.modal {
		position: absolute;
		left: 50%;
		top: 18%;
		transform: translate(-50%, 0);
		width: min(520px, calc(100vw - 24px));
		background: var(--ui-bg);
		border: 1px solid var(--ui-border);
		border-radius: 18px;
		backdrop-filter: blur(18px);
		color: var(--ui-text-hover);
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--ui-border);
	}
	.close {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		border: 1px solid var(--ui-border);
		background: var(--btn-bg);
		color: var(--ui-text-hover);
		cursor: pointer;
	}
	.content {
		padding: 14px 16px;
		display: grid;
		gap: 12px;
	}
	label {
		display: grid;
		gap: 6px;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	input {
		width: 100%;
		border-radius: 12px;
		border: 1px solid var(--ui-border);
		background: var(--ui-input-bg);
		color: var(--ui-text-hover);
		padding: 10px 12px;
	}
	select {
		width: 100%;
		border-radius: 12px;
		border: 1px solid var(--ui-border);
		background: var(--ui-input-bg);
		color: var(--ui-text-hover);
		padding: 10px 12px;
	}
	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 16px;
		border-top: 1px solid var(--ui-border);
	}
	.btn {
		height: 38px;
		padding: 0 12px;
		border-radius: 12px;
		border: 1px solid var(--ui-border);
		background: var(--btn-bg);
		color: var(--ui-text-hover);
		cursor: pointer;
	}
	.btn.primary {
		background: var(--ui-accent);
		color: #000;
		border-color: transparent;
	}
	@media (max-width: 520px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>


