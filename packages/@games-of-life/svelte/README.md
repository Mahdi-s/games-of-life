# @games-of-life/svelte

Svelte 5 components for embedding **Games of Life** simulations anywhere.

## `LifeCanvas`

Drop-in component that mounts a WebGPU `Simulation` into a `<canvas>` and runs a render/step loop.

```svelte
<script lang="ts">
  import { LifeCanvas } from '@games-of-life/svelte';
  import { getDefaultRule } from '$lib/utils/rules.js';

  const rule = getDefaultRule();
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


