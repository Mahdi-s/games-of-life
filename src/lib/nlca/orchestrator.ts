import { base } from '$app/paths';
import type { NlcaCellRequest, NlcaOrchestratorConfig, CellColorStatus, CellState01 } from './types.js';
import { buildCellSystemPrompt, buildCellUserPrompt, parseCellResponse, type PromptConfig } from './prompt.js';
import type { CellAgent } from './agentManager.js';

export interface CellDecisionResult {
	state: CellState01;
	confidence?: number;
	colorHex?: string;
	colorStatus?: CellColorStatus;
	latencyMs: number;
	raw: string;
	success: boolean;
	inputTokens?: number;
	outputTokens?: number;
	cost?: number;
}

export interface DebugLogEntry {
	timestamp: number;
	cellId: number;
	x: number;
	y: number;
	generation: number;
	input: string; // User prompt (for backward compatibility)
	fullPrompt: string; // Full prompt including system message
	output: string;
	latencyMs: number;
	success: boolean;
	cost?: number;
}

export interface NlcaCostStats {
	totalCost: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	callCount: number;
}

type ProxyResult = {
	cellId: number;
	ok: boolean;
	content?: string;
	latencyMs?: number;
	usage?: { prompt_tokens?: number; completion_tokens?: number };
	error?: string;
	status?: number;
};

export class NlcaOrchestrator {
	private cfg: NlcaOrchestratorConfig;
	private effectiveConcurrency: number;
	private callCount = 0;
	private costStats: NlcaCostStats = {
		totalCost: 0,
		totalInputTokens: 0,
		totalOutputTokens: 0,
		callCount: 0
	};
	private debugLog: DebugLogEntry[] = [];
	private maxDebugLogSize = 500; // Keep last 500 entries
	private debugEnabled = true;

	constructor(cfg: NlcaOrchestratorConfig) {
		this.cfg = cfg;
		this.effectiveConcurrency = Math.max(1, cfg.maxConcurrency);
		console.log(`[NLCA] Orchestrator initialized with model: ${cfg.model.model}`);
	}

	updateConfig(partial: Partial<NlcaOrchestratorConfig>) {
		this.cfg = { ...this.cfg, ...partial };
		if (partial.apiKey || partial.model || partial.cellTimeoutMs) {
			console.log(`[NLCA] Orchestrator config updated, model: ${this.cfg.model.model}`);
		}
		if (typeof partial.maxConcurrency === 'number' && Number.isFinite(partial.maxConcurrency)) {
			this.effectiveConcurrency = Math.max(1, Math.floor(partial.maxConcurrency));
		}
	}

	/** Get total LLM calls made */
	getCallCount(): number {
		return this.callCount;
	}

	/** Reset call counter and cost stats */
	resetCallCount(): void {
		this.callCount = 0;
		this.costStats = {
			totalCost: 0,
			totalInputTokens: 0,
			totalOutputTokens: 0,
			callCount: 0
		};
	}

	/** Get accumulated cost statistics */
	getCostStats(): NlcaCostStats {
		return { ...this.costStats };
	}

	/** Get debug log entries */
	getDebugLog(): DebugLogEntry[] {
		return [...this.debugLog];
	}

	/** Clear debug log */
	clearDebugLog(): void {
		this.debugLog = [];
	}

	/** Enable/disable debug logging */
	setDebugEnabled(enabled: boolean): void {
		this.debugEnabled = enabled;
	}

	/** Check if debug logging is enabled */
	isDebugEnabled(): boolean {
		return this.debugEnabled;
	}

	private pushDebug(agent: CellAgent, req: NlcaCellRequest, raw: string, latencyMs: number, success: boolean): void {
		if (!this.debugEnabled) return;

		const userPrompt = buildCellUserPrompt(req);
		const systemPrompt = agent.getHistory().find((m) => m.role === 'system')?.content || '';
		const fullPrompt = systemPrompt ? `[SYSTEM PROMPT]\n${systemPrompt}\n\n[USER PROMPT]\n${userPrompt}` : userPrompt;

		const entry: DebugLogEntry = {
			timestamp: Date.now(),
			cellId: agent.cellId,
			x: agent.x,
			y: agent.y,
			generation: req.generation,
			input: userPrompt,
			fullPrompt,
			output: raw,
			latencyMs,
			success
		};
		this.debugLog.push(entry);
		if (this.debugLog.length > this.maxDebugLogSize) {
			this.debugLog = this.debugLog.slice(-this.maxDebugLogSize);
		}
	}

	/**
	 * Execute a batch of cells via the server proxy.
	 * The proxy fans out to OpenRouter with concurrency + retries.
	 */
	async decideCellsBatch(items: Array<{ agent: CellAgent; req: NlcaCellRequest }>, promptConfig?: PromptConfig): Promise<Map<number, CellDecisionResult>> {
		const byCellId = new Map<number, CellDecisionResult>();

		const cells = items.map(({ agent, req }) => {
			this.callCount++;

			if (!agent.hasSystemPrompt()) {
				const systemPrompt = buildCellSystemPrompt(agent.cellId, agent.x, agent.y, req.width, req.height, promptConfig);
				agent.addMessage({ role: 'system', content: systemPrompt });
			}

			const userPrompt = buildCellUserPrompt(req);
			agent.addMessage({ role: 'user', content: userPrompt });

			return { cellId: agent.cellId, messages: agent.getHistory() };
		});

		let proxyResults: ProxyResult[] = [];
		let proxyError: string | null = null;
		const t0 = performance.now();

		try {
			const res = await fetch(`${base}/api/nlca/decide`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: this.cfg.apiKey,
					model: this.cfg.model.model,
					temperature: this.cfg.model.temperature,
					maxOutputTokens: this.cfg.model.maxOutputTokens,
					timeoutMs: this.cfg.cellTimeoutMs,
					maxConcurrency: this.effectiveConcurrency,
					cells
				})
			});
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(text || `NLCA proxy failed (${res.status})`);
			}
			const obj = (await res.json()) as { results?: ProxyResult[]; stats?: { rateLimited?: number; errors?: number } };
			proxyResults = Array.isArray(obj?.results) ? obj.results : [];

			// Adaptive concurrency (AIMD-ish): back off hard on 429s, otherwise ramp slowly up to target.
			const rateLimited = Number(obj?.stats?.rateLimited ?? 0);
			const errors = Number(obj?.stats?.errors ?? 0);
			const target = Math.max(1, Math.floor(this.cfg.maxConcurrency));
			if (Number.isFinite(rateLimited) && rateLimited > 0) {
				this.effectiveConcurrency = Math.max(1, Math.floor(this.effectiveConcurrency * 0.5));
			} else if (Number.isFinite(errors) && errors > 0) {
				this.effectiveConcurrency = Math.max(1, Math.floor(this.effectiveConcurrency * 0.8));
			} else if (this.effectiveConcurrency < target) {
				this.effectiveConcurrency = Math.min(target, this.effectiveConcurrency + 1);
			}
		} catch (e) {
			proxyError = e instanceof Error ? e.message : String(e);
		}

		const byId = new Map<number, ProxyResult>();
		for (const r of proxyResults) byId.set(r.cellId, r);

		for (const { agent, req } of items) {
			const r = byId.get(agent.cellId);
			const latencyMs = typeof r?.latencyMs === 'number' && Number.isFinite(r.latencyMs) ? r.latencyMs : performance.now() - t0;

			let raw = '';
			let success = false;
			let state: CellState01 = req.self;
			let confidence: number | undefined;
			let colorHex: string | undefined;
			let colorStatus: CellColorStatus | undefined;
			let inputTokens: number | undefined;
			let outputTokens: number | undefined;

			if (proxyError) {
				raw = `ERROR: ${proxyError}`;
			} else if (r?.ok) {
				raw = typeof r.content === 'string' ? r.content : '';

				const usage = r.usage;
				if (usage) {
					inputTokens = usage.prompt_tokens;
					outputTokens = usage.completion_tokens;
					this.costStats.totalInputTokens += inputTokens ?? 0;
					this.costStats.totalOutputTokens += outputTokens ?? 0;
					this.costStats.callCount++;
				}

				const parsed = parseCellResponse(raw);
				if (parsed) {
					state = parsed.state;
					confidence = parsed.confidence;
					if (promptConfig?.cellColorHexEnabled) {
						colorHex = parsed.colorHex;
						colorStatus = parsed.colorStatus ?? 'missing';
					}
					success = true;
				} else {
					console.warn(`[NLCA] Cell ${agent.cellId} (${agent.x},${agent.y}): Failed to parse response: ${raw}`);
				}
			} else {
				const errText = r?.error ? String(r.error) : r?.status ? `HTTP ${r.status}` : 'Unknown error';
				raw = typeof r?.content === 'string' && r.content ? r.content : `ERROR: ${errText}`;
			}

			agent.addMessage({ role: 'assistant', content: raw || `{\"state\":${state}}` });
			this.pushDebug(agent, req, raw, latencyMs, success);

			byCellId.set(agent.cellId, {
				state,
				confidence,
				colorHex,
				colorStatus,
				latencyMs,
				raw,
				success,
				inputTokens,
				outputTokens
			});
		}

		return byCellId;
	}

	/** Back-compat: single cell decision, proxied. */
	async decideCell(agent: CellAgent, req: NlcaCellRequest, promptConfig?: PromptConfig): Promise<CellDecisionResult> {
		const map = await this.decideCellsBatch([{ agent, req }], promptConfig);
		return map.get(agent.cellId) ?? { state: req.self, latencyMs: 0, raw: 'ERROR: missing result', success: false };
	}
}

