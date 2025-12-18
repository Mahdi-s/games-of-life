<script lang="ts">
	import { initWebGPU, Simulation, type WebGPUError } from '@games-of-life/webgpu';
	import type { NeighborhoodId } from '@games-of-life/core';

	/** Minimal rule shape required by the WebGPU simulation. */
	type CARuleLike = {
		birthMask: number;
		surviveMask: number;
		numStates: number;
		neighborhood?: NeighborhoodId;
	};

	type Seed =
		| { kind: 'random'; density?: number; includeSpectrum?: boolean }
		| { kind: 'blank' }
		| { kind: 'disk'; radius?: number; density?: number; state?: number }
		| {
				kind: 'cells';
				/** Relative [dx, dy] from center. */
				cells: [number, number][];
				/** When true, repeat the pattern across the preview grid. */
				tiled?: boolean;
				/** Spacing between tile centers (in preview grid cells). */
				spacing?: number;
				/** State to stamp (defaults to 1). */
				state?: number;
		  };

	interface Props {
		/** Canvas bitmap size (pixels). */
		width: number;
		height: number;
		/** Grid size (cells). */
		gridWidth?: number;
		gridHeight?: number;
		/** Simulation rule (compatible with `@games-of-life/webgpu`). */
		rule: CARuleLike;
		/** Steps per second. */
		speed?: number;
		/** Whether the sim is playing (bindable). */
		playing?: boolean;
		/** Initial fill/reset behavior. */
		seed?: Seed;
		/** Render settings. */
		showGrid?: boolean;
		neighborShading?: 0 | 1 | 2;
		spectrumMode?: number;
		spectrumFrequency?: number;
		isLightTheme?: boolean;
		aliveColor?: [number, number, number];
		/** Optional class for the <canvas>. */
		className?: string;
		/** Optional vitality curve samples (128 f32 values). If provided, overrides default curve. */
		vitalityCurve?: number[];
	}

	let {
		width,
		height,
		gridWidth = 64,
		gridHeight = 64,
		rule,
		speed = 30,
		playing = $bindable(true),
		seed = { kind: 'random', density: 0.22, includeSpectrum: true },
		showGrid = false,
		neighborShading = 1,
		spectrumMode = 1,
		spectrumFrequency = 1.0,
		isLightTheme = false,
		aliveColor = [0.2, 0.9, 0.95],
		className,
		vitalityCurve
	}: Props = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let simulation: Simulation | null = $state(null);
	let initError: WebGPUError | null = $state(null);

	let rafId: number | null = $state(null);
	let lastT = 0;
	let accMs = 0;

	function applyViewDefaults() {
		if (!simulation) return;
		simulation.setView({
			showGrid,
			neighborShading,
			spectrumMode,
			spectrumFrequency,
			isLightTheme,
			aliveColor,
			// Hide brush in previews unless parent enables it later
			brushRadius: -1,
			// Apply custom curve if provided
			vitalityMode: vitalityCurve ? 'curve' : undefined,
			vitalityCurveSamples: vitalityCurve
		});
	}

	export function stepOnce() {
		if (!simulation) return;
		simulation.step();
		simulation.render(width, height);
	}

	/**
	 * Manually paint a disk of cells at the center of the grid.
	 * This adds to the existing grid rather than replacing it.
	 */
	export function paintDisk(radius?: number, state: number = 1, density: number = 1.0) {
		if (!simulation) return;
		const r = radius ?? Math.floor(Math.min(gridWidth, gridHeight) * 0.2);
		simulation.paintBrush(gridWidth / 2, gridHeight / 2, r, state, 'solid', { 
			density,
			shape: 'circle' 
		});
	}

	export function reset() {
		if (!simulation) return;
		if (seed.kind === 'blank') {
			simulation.clear();
		} else if (seed.kind === 'random') {
			simulation.randomize(seed.density ?? 0.22, seed.includeSpectrum ?? true);
		} else if (seed.kind === 'disk') {
			simulation.clear();
			paintDisk(seed.radius, seed.state, seed.density);
		} else {
			simulation.clear();
			const state = seed.state ?? 1;
			const spacing = Math.max(1, seed.spacing ?? 10);
			const cx = Math.floor(gridWidth / 2);
			const cy = Math.floor(gridHeight / 2);

			const stampAt = (tx: number, ty: number) => {
				for (const [dx, dy] of seed.cells) {
					simulation?.setCell(tx + dx, ty + dy, state);
				}
			};

			if (seed.tiled) {
				const startOffset = Math.floor(spacing / 2) % spacing;
				for (let ty = startOffset; ty < gridHeight; ty += spacing) {
					for (let tx = startOffset; tx < gridWidth; tx += spacing) {
						stampAt(tx, ty);
					}
				}
			} else {
				stampAt(cx, cy);
			}
		}
		simulation.render(width, height);
	}

	$effect(() => {
		if (!canvas) return;
		if (typeof window === 'undefined') return;

		let cancelled = false;
		let destroyed = false;

		(async () => {
			const res = await initWebGPU(canvas);
			if (cancelled) return;
			if (!res.ok) {
				initError = res.error;
				return;
			}

			const sim = new Simulation(res.value, { width: gridWidth, height: gridHeight, rule });
			simulation = sim;
			initError = null;

			applyViewDefaults();
			
			// For hex grids, ensure we reset view to handle centering correctly
			const isHex = rule.neighborhood === 'hexagonal' || rule.neighborhood === 'extendedHexagonal';
			if (isHex) {
				sim.resetView(width, height, false);
			}

			reset();

			const loop = (t: number) => {
				if (destroyed) return;
				if (!simulation) return;

				if (playing) {
					if (lastT === 0) lastT = t;
					const dt = t - lastT;
					lastT = t;
					accMs += dt;

					const stepMs = 1000 / Math.max(1, speed);
					let steps = 0;
					while (accMs >= stepMs && steps < 8) {
						simulation.step();
						accMs -= stepMs;
						steps++;
					}
				}

				simulation.render(width, height);
				rafId = requestAnimationFrame(loop);
			};

			rafId = requestAnimationFrame(loop);
		})();

		return () => {
			cancelled = true;
			destroyed = true;
			if (rafId) cancelAnimationFrame(rafId);
			rafId = null;
			lastT = 0;
			accMs = 0;
			simulation?.destroy();
			simulation = null;
		};
	});

	$effect(() => {
		if (!simulation) return;
		const oldNeighborhood = simulation.getRule().neighborhood;
		simulation.setRule(rule);
		if (rule.neighborhood !== oldNeighborhood) {
			const isHex = rule.neighborhood === 'hexagonal' || rule.neighborhood === 'extendedHexagonal';
			if (isHex) {
				simulation.resetView(width, height, false);
			}
			reset();
		}
	});

	$effect(() => {
		applyViewDefaults();
	});

	$effect(() => {
		// If the seed settings change, reset for determinism.
		if (!simulation) return;
		reset();
	});
</script>

{#if initError}
	<div class="gol-life-canvas-error">
		{initError.message}
	</div>
{:else}
	<canvas bind:this={canvas} class={className} width={width} height={height}></canvas>
{/if}

<style>
	.gol-life-canvas-error {
		font-size: 12px;
		line-height: 1.2;
		padding: 8px;
		border-radius: 8px;
		border: 1px solid rgba(128, 128, 128, 0.35);
		background: rgba(0, 0, 0, 0.06);
	}
</style>
