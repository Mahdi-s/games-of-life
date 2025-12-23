import type { NeighborhoodId } from '@games-of-life/core';

export type NlcaNeighborhood = Extract<NeighborhoodId, 'moore' | 'vonNeumann' | 'extendedMoore'>;

export type CellState01 = 0 | 1;

export interface NeighborSample {
	/** Relative X offset (dx) */
	dx: number;
	/** Relative Y offset (dy) */
	dy: number;
	/** Neighbor state from previous frame (0/1) */
	state: CellState01;
}

export interface CellContext {
	/** Stable index into the grid buffer: idx = x + y*width */
	id: number;
	x: number;
	y: number;
	self: CellState01;
	neighbors: NeighborSample[];
}

/** Single-cell request for individual agent calls */
export interface NlcaCellRequest {
	cellId: number;
	x: number;
	y: number;
	self: CellState01;
	neighbors: NeighborSample[];
	generation: number;
	runId: string;
	width: number;
	height: number;
}

/** Single-cell response from an agent */
export interface NlcaCellResponse {
	state: CellState01;
	confidence?: number;
}

/** Conversation message for agent history */
export interface AgentMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface NlcaModelConfig {
	/** OpenRouter model id, e.g. `openai/gpt-4.1-mini` */
	model: string;
	/** 0 = deterministic */
	temperature: number;
	/** Hard cap to keep responses tiny */
	maxOutputTokens: number;
}

export interface NlcaOrchestratorConfig {
	apiKey: string;
	model: NlcaModelConfig;
	/** Max concurrent LLM calls (one per cell) */
	maxConcurrency: number;
	/** Abort a cell call if it exceeds this */
	cellTimeoutMs: number;
}

export interface NlcaRunConfig {
	runId: string;
	createdAt: number;
	width: number;
	height: number;
	neighborhood: NlcaNeighborhood;
	model: string;
	/** Max concurrent calls */
	maxConcurrency: number;
	seed?: string;
	notes?: string;
}

export interface NlcaCellMetricsFrame {
	/**
	 * 0..255 latency bucket for each cell, length = width*height.
	 * 0 means “unknown/not measured”.
	 */
	latency8: Uint8Array;
	/**
	 * 0/1 per cell: did this cell change vs previous frame.
	 */
	changed01: Uint8Array;
}

export interface NlcaStepResult {
	next: Uint32Array;
	metrics?: NlcaCellMetricsFrame;
}


