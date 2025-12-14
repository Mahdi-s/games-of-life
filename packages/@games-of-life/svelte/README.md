# @games-of-life/svelte

Svelte 5 components for embedding **Games of Life** simulations anywhere.

## `LifeCanvas`

Drop-in component that mounts a WebGPU `Simulation` into a `<canvas>` and runs a render/step loop.

```svelte
<script lang="ts">
  import { LifeCanvas } from '@games-of-life/svelte';
  import type { RuleSpec } from '@games-of-life/core';

  const rule: RuleSpec = {
    name: "Conway's Life",
    birthMask: 0b0000_1000,   // B3
    surviveMask: 0b0000_1100, // S23
    numStates: 2,
    neighborhood: 'moore'
  };
  let playing = true;
</script>

<LifeCanvas
  width={108}
  height={108}
  gridWidth={20}
  gridHeight={20}
  {rule}
  speed={8}
  bind:playing
  seed={{ kind: 'random', density: 0.3, includeSpectrum: true }}
/>
```

## Notes

- `@games-of-life/svelte` depends on `@games-of-life/webgpu` (WebGPU runtime) and `@games-of-life/core` (spec/types).
- For non-Svelte usage, use `@games-of-life/webgpu` directly.


