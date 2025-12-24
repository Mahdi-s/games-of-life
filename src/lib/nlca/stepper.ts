import type { BoundaryMode } from '$lib/stores/simulation.svelte.js';
import type { CellContext, NlcaCellMetricsFrame, NlcaCellRequest, NlcaOrchestratorConfig, NlcaStepResult, NlcaNeighborhood, CellState01 } from './types.js';
import { extractCellContext } from './neighborhood.js';
import { NlcaOrchestrator, type CellDecisionResult, type NlcaCostStats, type DebugLogEntry } from './orchestrator.js';
import { CellAgentManager } from './agentManager.js';

export interface NlcaStepperConfig {
	runId: string;
	neighborhood: NlcaNeighborhood;
	boundary: BoundaryMode;
	orchestrator: NlcaOrchestratorConfig;
}

export interface NlcaProgressCallback {
	/** Called after each cell decision completes */
	onCellComplete?: (cellId: number, result: CellDecisionResult, completed: number, total: number) => void;
	/** Called periodically with batch progress (for UI updates) */
	onBatchProgress?: (completed: number, total: number, partialGrid: Uint32Array) => void;
}

async function asyncPool<T, R>(
	concurrency: number,
	items: readonly T[],
	fn: (item: T, idx: number) => Promise<R>,
	onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;
	let completedCount = 0;

	const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
		while (true) {
			const i = nextIndex++;
			if (i >= items.length) return;
			results[i] = await fn(items[i]!, i);
			completedCount++;
			onProgress?.(completedCount, items.length);
		}
	});

	await Promise.all(workers);
	return results;
}

function latencyToU8(ms: number): number {
	// 0..255 where each unit is ~10ms (cap at 2550ms).
	if (!Number.isFinite(ms) || ms <= 0) return 0;
	return Math.max(1, Math.min(255, Math.round(ms / 10)));
}

export class NlcaStepper {
	private orchestrator: NlcaOrchestrator;
	private agentManager: CellAgentManager;
	private cfg: NlcaStepperConfig;

	constructor(cfg: NlcaStepperConfig, agentManager: CellAgentManager) {
		this.cfg = cfg;
		this.agentManager = agentManager;
		this.orchestrator = new NlcaOrchestrator(cfg.orchestrator);
		console.log(`[NLCA] Stepper initialized - runId: ${cfg.runId}, neighborhood: ${cfg.neighborhood}`);
	}

	updateOrchestratorConfig(partial: Partial<NlcaOrchestratorConfig>) {
		this.cfg = { ...this.cfg, orchestrator: { ...this.cfg.orchestrator, ...partial } };
		this.orchestrator.updateConfig(this.cfg.orchestrator);
	}

	updateNeighborhood(neighborhood: NlcaNeighborhood) {
		this.cfg = { ...this.cfg, neighborhood };
		console.log(`[NLCA] Neighborhood updated to: ${neighborhood}`);
	}

	updateBoundary(boundary: BoundaryMode) {
		this.cfg = { ...this.cfg, boundary };
		console.log(`[NLCA] Boundary updated to: ${boundary}`);
	}

	updateRunId(runId: string) {
		this.cfg = { ...this.cfg, runId };
		// Clear agent history for new run
		this.agentManager.clearAllHistory();
		this.orchestrator.resetCallCount();
		console.log(`[NLCA] New run started: ${runId}`);
	}

	/** Get cost statistics from orchestrator */
	getCostStats(): NlcaCostStats {
		return this.orchestrator.getCostStats();
	}

	/** Get debug log from orchestrator */
	getDebugLog(): DebugLogEntry[] {
		return this.orchestrator.getDebugLog();
	}

	/** Clear debug log */
	clearDebugLog(): void {
		this.orchestrator.clearDebugLog();
	}

	/** Enable/disable debug logging */
	setDebugEnabled(enabled: boolean): void {
		this.orchestrator.setDebugEnabled(enabled);
	}

	/** Check if debug is enabled */
	isDebugEnabled(): boolean {
		return this.orchestrator.isDebugEnabled();
	}

	private buildContexts(prev: Uint32Array, width: number, height: number): CellContext[] {
		const cells: CellContext[] = [];
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				cells.push(extractCellContext(prev, width, height, x, y, this.cfg.neighborhood, this.cfg.boundary));
			}
		}
		return cells;
	}

	private async decideCells(
		cells: readonly CellContext[],
		width: number,
		height: number,
		generation: number,
		latency8: Uint8Array,
		prev: Uint32Array,
		callbacks?: NlcaProgressCallback
	): Promise<Map<number, CellState01>> {
		const maxConcurrency = Math.max(1, this.cfg.orchestrator.maxConcurrency);
		const decisions = new Map<number, CellState01>();
		const totalCells = cells.length;

		let successCount = 0;
		let failCount = 0;
		let totalLatency = 0;
		let lastLogTime = Date.now();
		let lastBatchTime = Date.now();
		const logInterval = 2000; // Log progress every 2 seconds
		const batchUpdateInterval = 500; // Update UI every 500ms

		console.log(`[NLCA] Generation ${generation} starting - ${totalCells} cells, concurrency: ${maxConcurrency}`);
		const genStartTime = performance.now();

		// Create a working grid for streaming updates
		const workingGrid = new Uint32Array(prev);

		await asyncPool(
			maxConcurrency,
			cells,
			async (cell, idx) => {
				const agent = this.agentManager.getAgent(cell.id);

				const req: NlcaCellRequest = {
					cellId: cell.id,
					x: cell.x,
					y: cell.y,
					self: cell.self,
					neighbors: cell.neighbors,
					generation,
					runId: this.cfg.runId,
					width,
					height
				};

				const result = await this.orchestrator.decideCell(agent, req);

				decisions.set(cell.id, result.state);
				workingGrid[cell.id] = result.state;
				latency8[cell.id] = latencyToU8(result.latencyMs);
				totalLatency += result.latencyMs;

				if (result.success) {
					successCount++;
				} else {
					failCount++;
				}

				// Notify per-cell callback
				callbacks?.onCellComplete?.(cell.id, result, successCount + failCount, totalCells);

				return result;
			},
			(completed, total) => {
				// Log progress periodically
				const now = Date.now();
				if (now - lastLogTime >= logInterval) {
					const pct = ((completed / total) * 100).toFixed(1);
					console.log(`[NLCA] Progress: ${completed}/${total} cells (${pct}%)`);
					lastLogTime = now;
				}

				// Send batch progress for UI updates
				if (callbacks?.onBatchProgress && now - lastBatchTime >= batchUpdateInterval) {
					callbacks.onBatchProgress(completed, total, workingGrid);
					lastBatchTime = now;
				}
			}
		);

		// Final batch progress update
		callbacks?.onBatchProgress?.(totalCells, totalCells, workingGrid);

		const genDuration = performance.now() - genStartTime;
		const avgLatency = totalLatency / totalCells;

		console.log(
			`[NLCA] Generation ${generation} complete - ` +
			`${successCount} success, ${failCount} failed, ` +
			`avg latency: ${avgLatency.toFixed(0)}ms, ` +
			`total time: ${(genDuration / 1000).toFixed(1)}s`
		);

		return decisions;
	}

	async step(
		prev: Uint32Array,
		width: number,
		height: number,
		generation: number,
		callbacks?: NlcaProgressCallback
	): Promise<NlcaStepResult> {
		const expected = width * height;
		if (prev.length !== expected) {
			throw new Error(`NLCA stepper: grid length mismatch (have ${prev.length}, expected ${expected})`);
		}

		// Ensure agent manager has correct dimensions
		const dims = this.agentManager.getDimensions();
		if (dims.width !== width || dims.height !== height) {
			this.agentManager.reset(width, height);
		}

		const contexts = this.buildContexts(prev, width, height);

		const latency8 = new Uint8Array(expected);
		const changed01 = new Uint8Array(expected);

		const decisionMap = await this.decideCells(contexts, width, height, generation, latency8, prev, callbacks);

		const next = new Uint32Array(expected);
		let changedCount = 0;

		for (let i = 0; i < expected; i++) {
			const self: CellState01 = (prev[i] ?? 0) === 0 ? 0 : 1;
			const v = decisionMap.get(i) ?? self;
			next[i] = v;
			if (v !== self) {
				changed01[i] = 1;
				changedCount++;
			} else {
				changed01[i] = 0;
			}
		}

		console.log(`[NLCA] Generation ${generation}: ${changedCount} cells changed state`);

		const metrics: NlcaCellMetricsFrame = { latency8, changed01 };
		return { next, metrics };
	}
}


