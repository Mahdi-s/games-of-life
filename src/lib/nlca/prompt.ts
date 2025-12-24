import type { NlcaCellRequest, NlcaCellResponse, CellState01 } from './types.js';

/**
 * Prompt strategy for NLCA (Neural-Linguistic Cellular Automata):
 * 
 * Goal: Cells collectively form an MNIST-style handwritten digit "3".
 * 
 * Each cell is a binary agent that outputs ONLY 0 or 1:
 * - 1 = ON (part of the digit stroke)
 * - 0 = OFF (background)
 * 
 * The digit "3" shape reference (on a normalized grid):
 * - Two curved horizontal strokes stacked vertically
 * - Top curve: arc from top-left through top-center to middle-right
 * - Bottom curve: arc from middle-right through bottom-center to bottom-left
 * - Both curves meet at the right side, around mid-height
 * 
 * Cells decide based on:
 * 1. Their position (x,y) relative to where the "3" stroke should be
 * 2. Their neighbors' states (to maintain stroke continuity)
 */

/**
 * Build the system prompt for a cell agent.
 * Kept minimal for token efficiency - OpenRouter caches system prompts.
 */
export function buildCellSystemPrompt(cellId: number, x: number, y: number, width: number, height: number): string {
	// Normalize position to 0-1 range for position-aware decisions
	const nx = (x / (width - 1)).toFixed(2);
	const ny = (y / (height - 1)).toFixed(2);
	
	return `You are cell (${x},${y}) on a ${width}x${height} grid. Normalized position: (${nx},${ny}).

TASK: Output 1 if you should be part of the digit "3" stroke, else 0.

MNIST "3" shape guide (normalized coords):
- Top arc: y≈0.1-0.3, curves from x≈0.3 to x≈0.7
- Middle: y≈0.4-0.6, stroke at x≈0.5-0.7 (where curves meet)
- Bottom arc: y≈0.7-0.9, curves from x≈0.7 to x≈0.3
- Stroke width: ~2-3 cells

Rules:
1. If your position is ON the "3" stroke path → output 1
2. If neighbors form a continuous stroke and you connect them → output 1
3. Otherwise → output 0

OUTPUT FORMAT: {"state":0} or {"state":1} — nothing else.`;
}

/**
 * Build the user prompt for a single cell's decision.
 * Compact JSON format to minimize tokens.
 */
export function buildCellUserPrompt(req: NlcaCellRequest): string {
	// Count alive neighbors for quick context
	const aliveCount = req.neighbors.filter(n => n.state === 1).length;
	
	// Compact format: generation, self state, alive neighbor count, neighbor details
	const payload = {
		g: req.generation,
		s: req.self,
		alive: aliveCount,
		n: req.neighbors.map((nn) => [nn.dx, nn.dy, nn.state])
	};
	return JSON.stringify(payload);
}

/**
 * Parse the response from a single cell agent.
 * Handles various response formats gracefully.
 */
export function parseCellResponse(text: string): NlcaCellResponse | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	try {
		// Try to extract JSON from the response (handle markdown code blocks)
		let jsonStr = trimmed;
		
		// Remove markdown code blocks if present
		const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
		if (jsonMatch) {
			jsonStr = jsonMatch[1] ?? trimmed;
		}

		const obj = JSON.parse(jsonStr) as Record<string, unknown>;
		if (!obj || typeof obj !== 'object') return null;

		// Accept "state" or "s" as the key
		const stateRaw = obj.state ?? obj.s;
		const stateNum = Number(stateRaw);
		
		if (!Number.isFinite(stateNum)) return null;
		
		const state: CellState01 = stateNum === 1 ? 1 : 0;

		// Optional confidence
		const confidenceRaw = obj.confidence ?? obj.c;
		const confidence =
			typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
				? Math.max(0, Math.min(1, confidenceRaw))
				: undefined;

		return confidence === undefined ? { state } : { state, confidence };
	} catch {
		// Fallback: try to find just 0 or 1 in the response
		if (/\b1\b/.test(trimmed) && !/\b0\b/.test(trimmed)) {
			return { state: 1 };
		}
		if (/\b0\b/.test(trimmed) && !/\b1\b/.test(trimmed)) {
			return { state: 0 };
		}
		return null;
	}
}


