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
};`
};

export const load: PageServerLoad = async () => {
	const highlighted: Record<string, string> = {};
	
	for (const [key, code] of Object.entries(snippets)) {
		highlighted[key] = await highlight(code, key === 'webgpu' || key === 'rules' || key === 'hex' ? 'ts' : 'svelte');
	}

	return {
		snippets: highlighted
	};
};

