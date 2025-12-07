<script lang="ts">
	import './layout.css';
	
	let { children } = $props();
	const siteTitle = 'Games of Life — WebGPU Cellular Automata';
	const siteDescription = 'GPU-accelerated cellular automata playground with hex and square grids, multi-state rules, and vivid spectra.';
	const thumbnailUrl = 'https://neovand.github.io/games-of-life/thumbnail.jpg';
</script>

<svelte:head>
	<title>{siteTitle}</title>
	<meta name="description" content={siteDescription} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={siteTitle} />
	<meta property="og:description" content={siteDescription} />
	<meta property="og:image" content={thumbnailUrl} />
	<meta property="og:image:alt" content="Colorful hexagonal cellular automaton pattern" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={siteTitle} />
	<meta name="twitter:description" content={siteDescription} />
	<meta name="twitter:image" content={thumbnailUrl} />
</svelte:head>

{@render children()}
