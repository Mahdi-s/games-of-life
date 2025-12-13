# @games-of-life/webgpu

WebGPU runtime for **Games of Life**.

This package owns:

- `initWebGPU(canvas)` context creation
- WGSL shaders (compute + render)
- `Simulation` (double-buffered compute + render, brush preview, seeding helpers)

It is **framework-agnostic** — you can use it from Svelte, React, vanilla, etc.

## Quick usage

```ts
import { initWebGPU, Simulation } from '@games-of-life/webgpu';

const res = await initWebGPU(canvas);
if (!res.ok) throw new Error(res.error.message);

const sim = new Simulation(res.value, { width: 256, height: 256, rule: { birthMask: 0b1000, surviveMask: 0b1100, numStates: 2 } });
sim.randomize(0.25);

function frame() {
  sim.step();
  sim.render(canvas.width, canvas.height);
  requestAnimationFrame(frame);
}
frame();
```


