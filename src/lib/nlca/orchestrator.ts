import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { NlcaCellRequest, NlcaCellResponse, NlcaOrchestratorConfig, CellState01 } from './types.js';
import { buildCellSystemPrompt, buildCellUserPrompt, parseCellResponse } from './prompt.js';
import { CellAgent } from './agentManager.js';

export interface CellDecisionResult {
	state: CellState01;
	confidence?: number;
	latencyMs: number;
	raw: string;
	success: boolean;
}

export class NlcaOrchestrator {
	private llm: ChatOpenAI;
	private cfg: NlcaOrchestratorConfig;
	private callCount = 0;

	constructor(cfg: NlcaOrchestratorConfig) {
		this.cfg = cfg;
		this.llm = this.createLLM();
		console.log(`[NLCA] Orchestrator initialized with model: ${cfg.model.model}`);
	}

	private createLLM(): ChatOpenAI {
		return new ChatOpenAI({
			apiKey: this.cfg.apiKey,
			model: this.cfg.model.model,
			temperature: this.cfg.model.temperature,
			maxTokens: this.cfg.model.maxOutputTokens,
			timeout: this.cfg.cellTimeoutMs,
			maxRetries: 2,
			configuration: {
				baseURL: 'https://openrouter.ai/api/v1',
				defaultHeaders: {
					'HTTP-Referer': 'http://localhost',
					'X-Title': 'games-of-life-nlca'
				}
			}
		});
	}

	updateConfig(partial: Partial<NlcaOrchestratorConfig>) {
		this.cfg = { ...this.cfg, ...partial };
		if (partial.apiKey || partial.model || partial.cellTimeoutMs) {
			this.llm = this.createLLM();
			console.log(`[NLCA] Orchestrator config updated, model: ${this.cfg.model.model}`);
		}
	}

	/** Get total LLM calls made */
	getCallCount(): number {
		return this.callCount;
	}

	/** Reset call counter */
	resetCallCount(): void {
		this.callCount = 0;
	}

	/**
	 * Execute a single cell's decision.
	 * Uses the agent's conversation history for context.
	 */
	async decideCell(agent: CellAgent, req: NlcaCellRequest): Promise<CellDecisionResult> {
		this.callCount++;

		// Build system prompt if not already in history
		if (!agent.hasSystemPrompt()) {
			const systemPrompt = buildCellSystemPrompt(
				agent.cellId,
				agent.x,
				agent.y,
				req.width,
				req.height
			);
			agent.addMessage({ role: 'system', content: systemPrompt });
		}

		// Build user prompt for this generation
		const userPrompt = buildCellUserPrompt(req);
		agent.addMessage({ role: 'user', content: userPrompt });

		// Build LangChain messages from history
		const messages = agent.getHistory().map((msg) => {
			switch (msg.role) {
				case 'system':
					return new SystemMessage(msg.content);
				case 'user':
					return new HumanMessage(msg.content);
				case 'assistant':
					return new AIMessage(msg.content);
			}
		});

		const t0 = performance.now();
		let raw = '';
		let success = false;
		let state: CellState01 = req.self; // Default: keep current state
		let confidence: number | undefined;

		try {
			const res = await this.llm.invoke(messages);
			raw = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);

			const parsed = parseCellResponse(raw);
			if (parsed) {
				state = parsed.state;
				confidence = parsed.confidence;
				success = true;
			} else {
				console.warn(`[NLCA] Cell ${agent.cellId} (${agent.x},${agent.y}): Failed to parse response: ${raw}`);
			}
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			console.error(`[NLCA] Cell ${agent.cellId} (${agent.x},${agent.y}): LLM error: ${errMsg}`);
			raw = `ERROR: ${errMsg}`;
		}

		const latencyMs = performance.now() - t0;

		// Add assistant response to history
		agent.addMessage({ role: 'assistant', content: raw || `{"state":${state}}` });

		return { state, confidence, latencyMs, raw, success };
	}
}


