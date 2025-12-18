<script lang="ts">
	import { getSimulationState } from '$lib/stores/simulation.svelte.js';

	const simState = getSimulationState();

	let step = $state(0);
	
	// Cell states: 0=dead, 1=alive
	const grid = $state([
		[0, 0, 0, 0, 0],
		[0, 1, 1, 0, 0],
		[0, 1, 0, 0, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0]
	]);

	// Coordinates of the "target" cell we're teaching about
	const tx = 2;
	const ty = 2;

	// B3/S23 rule
	const birth = [3];
	const survive = [2, 3];

	const neighbors = [
		[1, 1], [2, 1], [3, 1],
		[1, 2],         [3, 2],
		[1, 3], [2, 3], [3, 3]
	];

	const aliveNeighbors = $derived(
		neighbors.filter(([nx, ny]) => grid[ny][nx] === 1).length
	);

	const isAlive = $derived(grid[ty][tx] === 1);
	const willBeAlive = $derived(
		isAlive ? survive.includes(aliveNeighbors) : birth.includes(aliveNeighbors)
	);

	const accentColor = $derived.by(() => {
		const [r, g, b] = simState.aliveColor;
		return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
	});

	function next() {
		if (step < 4) step++;
		else {
			// Apply result and reset
			grid[ty][tx] = willBeAlive ? 1 : 0;
			setTimeout(() => {
				step = 0;
				grid[ty][tx] = 0; // reset for next demo
			}, 1500);
		}
	}

	function reset() {
		step = 0;
		grid[ty][tx] = 0;
	}
</script>

<div class="ca-lab" style="--accent: {accentColor}">
	<div class="lab-layout">
		<div class="grid-wrap">
			<div class="grid">
				{#each grid as row, y}
					{#each row as cell, x}
						<div 
							class="cell" 
							class:alive={cell === 1}
							class:target={x === tx && y === ty}
							class:neighbor={step >= 1 && neighbors.some(([nx, ny]) => nx === x && ny === y)}
							class:highlight-neighbor={step >= 2 && neighbors.some(([nx, ny]) => nx === x && ny === y) && cell === 1}
						>
							{#if x === tx && y === ty && step >= 3}
								<span class="count">{aliveNeighbors}</span>
							{/if}
						</div>
					{/each}
				{/each}
			</div>
		</div>

		<div class="info-wrap">
			<div class="stepper">
				<div class="progress">
					{#each Array(5) as _, i}
						<div class="dot" class:active={i <= step}></div>
					{/each}
				</div>
				
				<div class="content">
					{#if step === 0}
						<h4>1. Meet the Cell</h4>
						<p>In a Cellular Automaton, every square is a "cell" that can be either dead or alive.</p>
					{:else if step === 1}
						<h4>2. The Neighborhood</h4>
						<p>A cell's future depends entirely on its 8 immediate neighbors (highlighted).</p>
					{:else if step === 2}
						<h4>3. Counting Neighbors</h4>
						<p>We count how many of those neighbors are currently alive. Here, we have <strong>{aliveNeighbors}</strong>.</p>
					{:else if step === 3}
						<h4>4. Consulting the Rule</h4>
						<p>
							Rule <strong>B3/S23</strong> says: 
							{isAlive ? "An alive cell survives if it has 2 or 3 neighbors." : "A dead cell is born if it has exactly 3 neighbors."}
						</p>
					{:else if step === 4}
						<h4>5. The Result</h4>
						<p>
							With {aliveNeighbors} neighbors, this cell will 
							<strong>{willBeAlive ? "become ALIVE" : "stay DEAD"}</strong> in the next step.
						</p>
					{/if}
				</div>

				<div class="actions">
					{#if step < 4}
						<button class="btn primary" onclick={next}>Next Step</button>
					{:else}
						<button class="btn" onclick={next}>Apply & Reset</button>
					{/if}
					<button class="btn secondary" onclick={reset}>Reset</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.ca-lab {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 2rem;
		margin: 2rem 0;
		backdrop-filter: blur(10px);
	}

	.lab-layout {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2.5rem;
		align-items: center;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(5, 50px);
		grid-template-rows: repeat(5, 50px);
		gap: 4px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px;
		border-radius: 12px;
	}

	.cell {
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.cell.alive {
		background: var(--accent);
		box-shadow: 0 0 15px var(--accent);
		opacity: 0.8;
	}

	.cell.target {
		border: 2px solid #fff;
		box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.5);
	}

	.cell.neighbor {
		border-color: rgba(255, 255, 255, 0.3);
	}

	.cell.highlight-neighbor {
		transform: scale(1.1);
		opacity: 1;
		box-shadow: 0 0 25px var(--accent);
	}

	.count {
		font-weight: 900;
		font-size: 1.2rem;
		color: #fff;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.stepper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.progress {
		display: flex;
		gap: 0.5rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		transition: all 0.3s;
	}

	.dot.active {
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}

	h4 {
		margin: 0 0 0.5rem;
		font-size: 1.4rem;
		color: var(--accent);
	}

	p {
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--color-text-muted);
	}

	strong {
		color: var(--color-text);
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	.btn {
		padding: 0.7rem 1.5rem;
		border-radius: 12px;
		font-weight: 800;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-text);
		transition: all 0.2s;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.btn.primary {
		background: var(--accent);
		color: #000;
		border: none;
	}

	@media (max-width: 768px) {
		.lab-layout {
			grid-template-columns: 1fr;
			place-items: center;
			text-align: center;
		}
		.progress { justify-content: center; }
		.actions { justify-content: center; }
	}
</style>

