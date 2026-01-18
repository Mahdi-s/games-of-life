import type { BoundaryMode } from '$lib/stores/simulation.svelte.js';
import type { CellContext, NlcaCellMetricsFrame, NlcaCellRequest, NlcaOrchestratorConfig, NlcaStepResult, NlcaNeighborhood, CellState01 } from './types.js';
import { extractCellContext } from './neighborhood.js';
import { NlcaOrchestrator, type CellDecisionResult, type NlcaCostStats, type DebugLogEntry } from './orchestrator.js';
import { CellAgentManager } from './agentManager.js';
import type { PromptConfig } from './prompt.js';

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

	/**
	 * Reset agent sessions when prompt configuration changes.
	 * This clears all agent history so the new prompt takes effect.
	 */
	resetAgentSessions(): void {
		this.agentManager.clearAllHistory();
		this.orchestrator.clearDebugLog();
		console.log(`[NLCA] Agent sessions reset - new prompt will take effect`);
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
		callbacks?: NlcaProgressCallback,
		promptConfig?: PromptConfig
	): Promise<{
		decisionMap: Map<number, CellState01>;
		colorsHex?: Array<string | null>;
		colorStatus8?: Uint8Array;
	}> {
		const decisions = new Map<number, CellState01>();
		const totalCells = cells.length;

		const wantColor = promptConfig?.cellColorHexEnabled === true;
		const colorsHex = wantColor ? new Array<string | null>(totalCells).fill(null) : undefined;
		const colorStatus8 = wantColor ? new Uint8Array(totalCells) : undefined; // 0=missing, 1=valid, 2=invalid

		let successCount = 0;
		let failCount = 0;
		let totalLatency = 0;
		let lastLogTime = Date.now();
		let lastBatchTime = Date.now();
		let completedCount = 0;
		const logInterval = 2000; // Log progress every 2 seconds
		const batchUpdateInterval = 500; // Update UI every 500ms

		const maxConcurrency = Math.max(1, this.cfg.orchestrator.maxConcurrency);
		const batchSize = Math.max(1, Math.floor(this.cfg.orchestrator.batchSize || totalCells));

		console.log(
			`[NLCA] Generation ${generation} starting - ${totalCells} cells, ` +
				`batchSize: ${batchSize}, upstream concurrency: ${maxConcurrency}`
		);
		const genStartTime = performance.now();

		// Create a working grid for streaming updates
		const workingGrid = new Uint32Array(prev);

		for (let start = 0; start < cells.length; start += batchSize) {
			const chunk = cells.slice(start, Math.min(cells.length, start + batchSize));

			const items = chunk.map((cell) => {
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
				return { agent, req };
			});

			const resultMap = await this.orchestrator.decideCellsBatch(items, promptConfig);

			for (const cell of chunk) {
				const result = resultMap.get(cell.id);
				if (!result) continue;

				decisions.set(cell.id, result.state);
				workingGrid[cell.id] = result.state;
				latency8[cell.id] = latencyToU8(result.latencyMs);
				totalLatency += result.latencyMs;

				if (wantColor && colorsHex && colorStatus8) {
					if (result.colorHex) colorsHex[cell.id] = result.colorHex;
					switch (result.colorStatus) {
						case 'valid':
							colorStatus8[cell.id] = 1;
							break;
						case 'invalid':
							colorStatus8[cell.id] = 2;
							break;
						case 'missing':
						default:
							colorStatus8[cell.id] = 0;
							break;
					}
				}

				if (result.success) successCount++;
				else failCount++;

				completedCount++;
				callbacks?.onCellComplete?.(cell.id, result, completedCount, totalCells);
			}

			// Log progress periodically
			const now = Date.now();
			if (now - lastLogTime >= logInterval) {
				const pct = ((completedCount / totalCells) * 100).toFixed(1);
				console.log(`[NLCA] Progress: ${completedCount}/${totalCells} cells (${pct}%)`);
				lastLogTime = now;
			}

			// Send batch progress for UI updates (streaming grid)
			if (callbacks?.onBatchProgress && now - lastBatchTime >= batchUpdateInterval) {
				callbacks.onBatchProgress(completedCount, totalCells, workingGrid);
				lastBatchTime = now;
			}
		}

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

		return { decisionMap: decisions, colorsHex, colorStatus8 };
	}

	async step(
		prev: Uint32Array,
		width: number,
		height: number,
		generation: number,
		callbacks?: NlcaProgressCallback,
		promptConfig?: PromptConfig
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

		const { decisionMap, colorsHex, colorStatus8 } = await this.decideCells(
			contexts,
			width,
			height,
			generation,
			latency8,
			prev,
			callbacks,
			promptConfig
		);

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
		return { next, metrics, colorsHex, colorStatus8 };
	}
}


