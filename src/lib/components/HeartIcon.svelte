<script lang="ts">
	import { getSimulationState } from '../stores/simulation.svelte.js';
	
	interface Props {
		size?: number;
		animated?: boolean;
		class?: string;
	}

	let { size = 18, animated = true, class: className = '' }: Props = $props();
	
	const simState = getSimulationState();
	
	// Get the accent color as a CSS color string
	const accentColor = $derived.by(() => {
		const [r, g, b] = simState.aliveColor;
		return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
	});
</script>

<svg 
	viewBox="0 0 16 16" 
	class="heart-icon {className}"
	class:animated
	style="width: {size}px; height: {size}px; display: block;"
>
	<style>
		.layer-1 { animation: wave 1.8s ease-in-out infinite 0s; }
		.layer-2 { animation: wave 1.8s ease-in-out infinite 0.15s; }
		.layer-3 { animation: wave 1.8s ease-in-out infinite 0.3s; }
		.layer-4 { animation: wave 1.8s ease-in-out infinite 0.45s; }
		@keyframes wave {
			0%, 100% { opacity: 0.2; }
			40%, 60% { opacity: 0.55; }
		}
	</style>
	
	<!-- OUTLINE -->
	<rect x="3" y="2" width="3" height="1" fill={accentColor}/>
	<rect x="10" y="2" width="3" height="1" fill={accentColor}/>
	<rect x="2" y="3" width="1" height="1" fill={accentColor}/>
	<rect x="6" y="3" width="1" height="1" fill={accentColor}/>
	<rect x="9" y="3" width="1" height="1" fill={accentColor}/>
	<rect x="13" y="3" width="1" height="1" fill={accentColor}/>
	<rect x="2" y="4" width="1" height="1" fill={accentColor}/>
	<rect x="7" y="4" width="2" height="1" fill={accentColor}/>
	<rect x="13" y="4" width="1" height="1" fill={accentColor}/>
	<rect x="2" y="5" width="1" height="2" fill={accentColor}/>
	<rect x="13" y="5" width="1" height="2" fill={accentColor}/>
	<rect x="3" y="7" width="1" height="1" fill={accentColor}/>
	<rect x="12" y="7" width="1" height="1" fill={accentColor}/>
	<rect x="4" y="8" width="1" height="1" fill={accentColor}/>
	<rect x="11" y="8" width="1" height="1" fill={accentColor}/>
	<rect x="5" y="9" width="1" height="1" fill={accentColor}/>
	<rect x="10" y="9" width="1" height="1" fill={accentColor}/>
	<rect x="6" y="10" width="1" height="1" fill={accentColor}/>
	<rect x="9" y="10" width="1" height="1" fill={accentColor}/>
	<rect x="7" y="11" width="2" height="1" fill={accentColor}/>
	
	<!-- INNER FILL -->
	<rect class={animated ? "layer-1" : ""} x="3" y="3" width="3" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-1" : ""} x="10" y="3" width="3" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-1" : ""} x="3" y="4" width="4" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-1" : ""} x="9" y="4" width="4" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-2" : ""} x="3" y="5" width="10" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-2" : ""} x="3" y="6" width="10" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-3" : ""} x="4" y="7" width="8" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-3" : ""} x="5" y="8" width="6" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-4" : ""} x="6" y="9" width="4" height="1" fill={accentColor} opacity="0.3"/>
	<rect class={animated ? "layer-4" : ""} x="7" y="10" width="2" height="1" fill={accentColor} opacity="0.3"/>
</svg>
