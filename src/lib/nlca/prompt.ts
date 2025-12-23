import type { NlcaCellRequest, NlcaCellResponse, CellState01 } from './types.js';

/**
 * Prompt strategy for individual cell agents:
 * - Each cell is its own agent with conversation history
 * - Minimal prompt focused on collaborative goal: "make the number 3"
 * - Strict JSON output for reliable parsing
 */

/**
 * Build the system prompt for a cell agent.
 * This is cached via KV by OpenRouter for efficiency.
 */
export function buildCellSystemPrompt(cellId: number, x: number, y: number, width: number, height: number): string {
	return `You are cell ${cellId} at position (${x},${y}) on a ${width}x${height} grid.
You and your neighbors are working together to display the number "3".
Based on your neighbors' states, decide: should you be ON (1) or OFF (0)?
Reply with JSON only: {"state":0} or {"state":1}`;
}

/**
 * Build the user prompt for a single cell's decision.
 * Compact format to minimize tokens.
 */
export function buildCellUserPrompt(req: NlcaCellRequest): string {
	// Compact format: gen, self state, neighbors as [dx,dy,state] tuples
	const payload = {
		g: req.generation,
		s: req.self,
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


