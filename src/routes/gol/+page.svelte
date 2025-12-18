<script lang="ts">
	import GuideDemo from '$lib/gol/components/GuideDemo.svelte';
	import CALab from '$lib/gol/components/CALab.svelte';
	import DemoCard from '$lib/gol/components/DemoCard.svelte';
	import { GALLERY_RULES } from '$lib/sims/gallery-rules.js';
	import { base } from '$app/paths';

	let { data } = $props();

	const byName = (name: string) => GALLERY_RULES.find((r) => r.name === name)!;

	const mandalaRule = $derived.by(() => {
		const r = byName("Hex Neo Mandala 1");
		return {
			birthMask: r.birthMask,
			surviveMask: r.surviveMask,
			numStates: r.numStates,
			neighborhood: r.neighborhood
		};
	});
</script>

<div class="guide">
	<header class="hero" id="top">
		<div class="kicker">The Official Guide</div>
		<h1>Games of Life (GoL) Library</h1>
		<p class="lead">
			A suite of high-performance WebGPU packages for building, simulating, and rendering 
			Complex Systems and Cellular Automata.
		</p>
		
		<div class="meta-grid">
			<div class="meta-card">
				<strong>@games-of-life/core</strong>
				<span>Specs & CPU fallback</span>
			</div>
			<div class="meta-card">
				<strong>@games-of-life/webgpu</strong>
				<span>Compute & Render Shaders</span>
			</div>
			<div class="meta-card">
				<strong>@games-of-life/svelte</strong>
				<span>Reactive LifeCanvas</span>
			</div>
		</div>
	</header>

	<section class="section" id="intro">
		<h2>What is Cellular Automata?</h2>
		<p>
			A cellular automaton consists of a regular grid of cells, each in one of a finite number of states. 
			The state of each cell changes according to a fixed rule based on the states of its neighbors. 
		</p>
		
		<CALab />

		<p>
			In GoL, we focus on 2D grids with support for both square and hexagonal geometries. 
			The library handles the heavy lifting of neighbor counting and rule application using 
			high-performance GPU shaders.
		</p>
	</section>

	<section class="section" id="svelte">
		<h2>Quickstart: Svelte</h2>
		<p>
			The easiest way to get started is with the Svelte package. It provides a declarative 
			<code>&lt;LifeCanvas /&gt;</code> component that handles WebGPU initialization, 
			the simulation loop, and rendering for you.
		</p>

		<GuideDemo
			title="Conway’s Life in 10 lines"
			description="Simply provide a rule and a seed. The component handles the rest."
			codeHtml={data.snippets.svelte}
			codeTitle="App.svelte"
			rule={byName("Conway's Life")}
		/>
	</section>

	<section class="section" id="rules">
		<h2>Defining Rules</h2>
		<p>
			Rules in GoL are defined using <strong>Birth</strong> and <strong>Survival</strong> bitmasks. 
			This allows for classic B/S rules (like B3/S23) as well as complex multi-state "Generations" rules.
		</p>

		<GuideDemo
			title="Birth/Survive Masks"
			description="A bitmask determines if a cell is born or survives based on its neighbor count. Bit 3 = 1 means 'if 3 neighbors, then action'."
			codeHtml={data.snippets.rules}
			codeTitle="rules.ts"
			rule={byName("Conway's Life")}
			seed={{ kind: 'random', density: 0.15 }}
		/>
	</section>

	<section class="section" id="hex">
		<h2>Hexagonal Grids</h2>
		<p>
			GoL isn't limited to squares. By changing the neighborhood to <code>hexagonal</code> or 
			<code>extendedHexagonal</code>, the entire coordinate system and rendering engine 
			switches to a high-performance hex grid.
		</p>

		<GuideDemo
			title="Hex Generations"
			description="Hex grids often produce more organic, symmetric patterns. Combined with many states, they create fluid-like motion."
			codeHtml={data.snippets.hex}
			codeTitle="hexRule.ts"
			rule={mandalaRule}
			seed={{ kind: 'random', density: 0.4, includeSpectrum: true }}
			gridWidth={160}
			gridHeight={185}
			speed={8}
		/>
	</section>

	<section class="section" id="gallery">
		<div class="section-head">
			<h2>The Showcase Gallery</h2>
			<p>Explore 9 core simulations that demonstrate the breadth of the library.</p>
		</div>

		<div class="gallery-grid">
			<div class="group">
				<h3>Foundations</h3>
				<DemoCard
					title="Conway’s Life"
					teach="The classic binary rule. B3/S23."
					rule={byName("Conway's Life")}
					defaultSpeed={16}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={128}
				/>
				<DemoCard
					title="Star Wars"
					teach="Generations rule with 4 states."
					rule={byName('Star Wars')}
					defaultSpeed={18}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={128}
				/>
				<DemoCard
					title="Brian’s Brain"
					teach="3-state rule with no survival."
					rule={byName("Brian's Brain")}
					defaultSpeed={18}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={128}
				/>
			</div>

			<div class="group">
				<h3>Hex & Vitality</h3>
				<DemoCard
					title="Diagonal Growth"
					teach="Extended hex with vitality curves."
					rule={byName('Hex2 Neo Diagonal Growth')}
					defaultSpeed={14}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={148}
					seedKind="disk"
				/>
				<DemoCard
					title="Mandala 1"
					teach="Symmetric pattern language."
					rule={byName('Hex Neo Mandala 1')}
					defaultSpeed={12}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={148}
					seedKind="disk"
				/>
				<DemoCard
					title="Slime Mold"
					teach="Organic growth without curves."
					rule={byName('Hex Neo Slime Mold')}
					defaultSpeed={16}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={148}
				/>
			</div>

			<div class="group">
				<h3>Extended Moore</h3>
				<DemoCard
					title="Neo Waves"
					teach="Large-scale macroscopic waves."
					rule={byName('Ext24 Neo Waves')}
					defaultSpeed={16}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={128}
				/>
				<DemoCard
					title="Neo Coral"
					teach="256 states + soft boundaries."
					rule={byName('Ext24 Neo Coral')}
					defaultSpeed={14}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={128}
					seedKind="disk"
				/>
				<DemoCard
					title="Neo Brain 2"
					teach="High-complexity extended hex."
					rule={byName('Hex2 Neo Brain 2')}
					defaultSpeed={14}
					width={280}
					height={200}
					gridWidth={128}
					gridHeight={148}
					seedKind="disk"
				/>
			</div>
		</div>
	</section>

	<footer class="footer">
		<p>Ready to build? Check out the <a href="https://github.com/NeoVand/games-of-life" target="_blank" rel="noopener noreferrer">GitHub repository</a>.</p>
		<a href={`${base}/`} class="back-btn">Return to Simulation</a>
	</footer>
</div>

<style>
	.guide {
		max-width: 1100px;
		margin: 0 auto;
		padding-bottom: 5rem;
	}

	.hero {
		padding: 5rem 2rem;
		border-radius: 40px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(30px);
		margin-bottom: 5rem;
		text-align: center;
		box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
	}

	.kicker {
		color: var(--ui-accent, rgba(45, 212, 191, 0.9));
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 2.8rem;
		margin: 0 0 1.2rem;
		letter-spacing: -0.04em;
		line-height: 1.1;
	}

	.lead {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		max-width: 60ch;
		margin: 0 auto 2.5rem;
		line-height: 1.5;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.meta-card {
		padding: 1.2rem;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.meta-card strong {
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.meta-card span {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.section {
		margin-bottom: 5rem;
		padding: 0 1rem;
	}

	.section-head {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 2rem;
		margin: 0 0 1.2rem;
		letter-spacing: -0.03em;
	}

	p {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		line-height: 1.7;
		margin-bottom: 1.5rem;
		max-width: 80ch;
	}

	.gallery-grid {
		display: grid;
		gap: 3rem;
	}

	.group {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.group h3 {
		grid-column: span 3;
		font-size: 1.4rem;
		margin: 0;
		color: var(--ui-accent);
		opacity: 0.8;
	}

	@media (max-width: 1200px) {
		.group { grid-template-columns: repeat(2, 1fr); }
		.group h3 { grid-column: span 2; }
	}

	@media (max-width: 800px) {
		.group { grid-template-columns: 1fr; }
		.group h3 { grid-column: span 1; }
	}

	.footer {
		margin-top: 4rem;
		text-align: center;
		padding: 3rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.back-btn {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.8rem 2rem;
		border-radius: 16px;
		background: var(--ui-accent, #2dd4bf);
		color: #000;
		font-weight: 900;
		text-decoration: none;
		transition: transform 0.2s;
	}

	.back-btn:hover {
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		h1 { font-size: 2rem; }
		.meta-grid { grid-template-columns: 1fr; }
	}
</style>
