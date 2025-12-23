import type { PageServerLoad } from './$types';
import { highlight } from '$lib/gol/docs/shiki.server.js';

const snippets = {
	svelte: `<script lang="ts">
  import { LifeCanvas } from '@games-of-life/svelte';
</script>

<LifeCanvas
  width={320}
  height={320}
  rule={{ 
    birthMask: 0b1000, 
    surviveMask: 0b1100, 
    numStates: 2, 
    neighborhood: 'moore' 
  }}
  seed={{ kind: 'random', density: 0.22 }}
/>`,
	webgpu: `import { initWebGPU, Simulation } from '@games-of-life/webgpu';

const res = await initWebGPU(canvas);
const sim = new Simulation(res.value, {
  width: 256,
  height: 256,
  rule: conwaysLife
});

function frame() {
  sim.step();
  sim.render(canvas.width, canvas.height);
  requestAnimationFrame(frame);
}
frame();`,
	rules: `const conwaysLife = {
  birthMask: 0b0000_1000,    // B3
  surviveMask: 0b0000_1100,  // S23
  numStates: 2,
  neighborhood: 'moore'
};`,
	hex: `const hexGenerations = {
  birthMask: 0b0001_1010_00,
  surviveMask: 0b0111_1000_00,
  numStates: 96,
  neighborhood: 'extendedHexagonal'
};`,
	generations: `const starWars = {
  birthMask: 0b0000_0010_0,   // B2
  surviveMask: 0b0001_1100_0, // S345
  numStates: 4,               // 2 extra decay states
  neighborhood: 'moore'
};`,
	audioEngine: `import { AudioEngine } from '@games-of-life/audio';

// Initialize after WebGPU & Simulation
const engine = new AudioEngine();
await engine.initialize(device, simulation, basePath);

// Enable audio (first call must be from user gesture)
await engine.setEnabled(true);

// In your render loop
engine.update(canvasWidth, canvasHeight);`,
	audioConfig: `const config = {
  enabled: true,
  masterVolume: 0.5,
  minFreq: 80,        // Bass frequencies
  maxFreq: 2000,      // Upper range
  softening: 0.6,     // Smooth transitions
  scale: 'pentatonic' // Musical scale
};

engine.updateConfig(config);`,
	audioSpectral: `// GPU Shader: Aggregate cells → spectrum
// Each cell contributes to frequency bins

// Cell Y-position → frequency bin
let bin = u32(y_norm * f32(NUM_BINS));

// Vitality → amplitude contribution
let amp = sample_curve(AMPLITUDE, vitality);

// Atomic accumulation (fixed-point)
atomicAdd(&spectrum[bin].amplitude, i32(amp * FP_SCALE));`
};

export const load: PageServerLoad = async () => {
	const highlighted: Record<string, string> = {};
	
	for (const [key, code] of Object.entries(snippets)) {
		// Determine language based on snippet type
		let lang = 'ts';
		if (key === 'svelte') lang = 'svelte';
		if (key === 'audioSpectral') lang = 'wgsl';
		
		highlighted[key] = await highlight(code, lang);
	}

	return {
		snippets: highlighted
	};
};
