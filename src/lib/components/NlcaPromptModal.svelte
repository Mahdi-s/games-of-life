<script lang="ts">
	import { draggable } from '$lib/utils/draggable.js';
	import { bringToFront, setModalPosition, getModalState } from '$lib/stores/modalManager.svelte.js';
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';
	import { buildCellSystemPrompt, buildCellUserPrompt } from '$lib/nlca/prompt.js';
	import type { NlcaCellRequest } from '$lib/nlca/types.js';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
	const modalState = $derived(getModalState('nlcaPrompt'));
	const simState = getSimulationState();

	// Sample cell position for preview
	let sampleX = $state(12);
	let sampleY = $state(12);

	// Generate sample prompts based on current grid size
	const systemPrompt = $derived(
		buildCellSystemPrompt(
			sampleY * simState.gridWidth + sampleX,
			sampleX,
			sampleY,
			simState.gridWidth || 25,
			simState.gridHeight || 25
		)
	);

	const sampleUserPrompt = $derived(() => {
		// Create a sample request with mock neighbor data
		const mockRequest: NlcaCellRequest = {
			cellId: sampleY * (simState.gridWidth || 25) + sampleX,
			x: sampleX,
			y: sampleY,
			width: simState.gridWidth || 25,
			height: simState.gridHeight || 25,
			generation: 0,
			self: 0,
			neighbors: [
				{ dx: -1, dy: -1, state: 0 },
				{ dx: 0, dy: -1, state: 1 },
				{ dx: 1, dy: -1, state: 0 },
				{ dx: -1, dy: 0, state: 0 },
				{ dx: 1, dy: 0, state: 1 },
				{ dx: -1, dy: 1, state: 0 },
				{ dx: 0, dy: 1, state: 0 },
				{ dx: 1, dy: 1, state: 0 }
			]
		};
		return buildCellUserPrompt(mockRequest);
	});

	function handleModalClick() {
		bringToFront('nlcaPrompt');
	}
	function handleDragEnd(position: { x: number; y: number }) {
		setModalPosition('nlcaPrompt', position);
	}
</script>

<div class="modal-backdrop" role="presentation" style="z-index: {modalState.zIndex};">
	<div
		class="modal"
		role="dialog"
		aria-label="NLCA Prompt Viewer"
		tabindex="0"
		use:draggable={{ id: 'nlcaPrompt', onDragEnd: handleDragEnd }}
		onclick={handleModalClick}
		onkeydown={() => {}}
		style={modalState.position ? `transform: translate(${modalState.position.x}px, ${modalState.position.y}px);` : ''}
	>
		<div class="header">
			<h3>NLCA Prompt Templates</h3>
			<button class="close" onclick={onclose} aria-label="Close">×</button>
		</div>

		<div class="content">
			<p class="description">
				These are the prompts sent to the LLM for each cell decision. The system prompt is cached per cell, 
				and the user prompt is sent each generation with current state.
			</p>

			<div class="sample-controls">
				<label>
					<span>Sample cell X:</span>
					<input type="number" min="0" max={Math.max(0, (simState.gridWidth || 25) - 1)} bind:value={sampleX} />
				</label>
				<label>
					<span>Sample cell Y:</span>
					<input type="number" min="0" max={Math.max(0, (simState.gridHeight || 25) - 1)} bind:value={sampleY} />
				</label>
			</div>

			<div class="prompt-section">
				<h4>System Prompt <span class="badge">Cached per cell</span></h4>
				<pre class="prompt-code">{systemPrompt}</pre>
			</div>

			<div class="prompt-section">
				<h4>User Prompt <span class="badge">Sent each generation</span></h4>
				<pre class="prompt-code">{sampleUserPrompt()}</pre>
				<div class="format-legend">
					<span><code>g</code> = generation</span>
					<span><code>s</code> = self state</span>
					<span><code>alive</code> = alive neighbor count</span>
					<span><code>n</code> = neighbors [dx, dy, state]</span>
				</div>
			</div>

			<div class="prompt-section">
				<h4>Expected Response</h4>
				<pre class="prompt-code example">{"{"}"state": 0{"}"} or {"{"}"state": 1{"}"}</pre>
			</div>
		</div>

		<div class="footer">
			<button class="btn primary" onclick={onclose}>Close</button>
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
		top: 10%;
		transform: translate(-50%, 0);
		width: min(680px, calc(100vw - 24px));
		max-height: calc(100vh - 100px);
		overflow-y: auto;
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
		position: sticky;
		top: 0;
		background: var(--ui-bg);
		z-index: 1;
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
		gap: 16px;
	}
	.description {
		color: var(--ui-text);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0;
	}
	.sample-controls {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}
	.sample-controls label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sample-controls input {
		width: 70px;
		border-radius: 8px;
		border: 1px solid var(--ui-border);
		background: var(--ui-input-bg);
		color: var(--ui-text-hover);
		padding: 6px 10px;
	}
	.prompt-section {
		display: grid;
		gap: 8px;
	}
	.prompt-section h4 {
		margin: 0;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.badge {
		font-size: 0.7rem;
		padding: 2px 8px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		font-weight: normal;
		color: var(--ui-text);
	}
	.prompt-code {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--ui-border);
		border-radius: 10px;
		padding: 12px;
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0;
		color: #a8dadc;
	}
	.prompt-code.example {
		background: rgba(100, 200, 100, 0.1);
		color: #98c379;
	}
	.format-legend {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		font-size: 0.75rem;
		color: var(--ui-text);
	}
	.format-legend code {
		background: rgba(255, 255, 255, 0.1);
		padding: 1px 5px;
		border-radius: 4px;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}
	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 14px 16px;
		border-top: 1px solid var(--ui-border);
		position: sticky;
		bottom: 0;
		background: var(--ui-bg);
	}
	.btn {
		height: 38px;
		padding: 0 16px;
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
</style>

