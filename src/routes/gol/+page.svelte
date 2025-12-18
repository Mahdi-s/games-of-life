<script lang="ts">
	import GuideDemo from '$lib/gol/components/GuideDemo.svelte';
	import CALab from '$lib/gol/components/CALab.svelte';
	import VitalityLab from '$lib/gol/components/VitalityLab.svelte';
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

	const starWarsRule = $derived.by(() => {
		const r = byName("Star Wars");
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
			The library handles the heavy lifting of neighbor counting and rule application using 
			high-performance GPU shaders, allowing for massive grids and complex rules.
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

	<section class="section" id="generations">
		<h2>Generations: Life with Trails</h2>
		<p>
			Standard CA has only two states: dead and alive. GoL supports "Generations," where 
			cells don't die instantly. Instead, they transition through a series of "decay" states, 
			creating beautiful trails and color spectrums.
		</p>

		<GuideDemo
			title="More Than Two States"
			description="When numStates > 2, alive cells transition to state 2 instead of dying. This example uses 4 states, creating a brief color trail."
			codeHtml={data.snippets.generations}
			codeTitle="generations.ts"
			rule={starWarsRule}
			seed={{ kind: 'random', density: 0.25, includeSpectrum: true }}
		/>
	</section>

	<section class="section" id="vitality">
		<h2>Vitality Influence</h2>
		<p>
			GoL generalizes Cellular Automata further with <strong>Vitality Influence</strong>. 
			In standard CA, only fully "alive" cells count toward a neighbor's birth or survival. 
			In GoL, even cells in decay states can contribute to the neighbor count.
		</p>
		
		<VitalityLab />

		<p>
			By defining an <strong>Influence Curve</strong>, you can control exactly how much 
			influence a cell has at every stage of its life cycle. This leads to the discovery 
			of organic, material-like behaviors rule types.
		</p>
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
			seed={{ kind: 'disk', radius: 35 }}
			gridWidth={160}
			gridHeight={185}
			speed={8}
			showControls={true}
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
					defaultDensity={1.0}
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
					defaultDensity={1.0}
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
					seedKind="disk"
					defaultDensity={1.0}
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
		font-size: 3.5rem;
		margin: 0 0 1.2rem;
		letter-spacing: -0.04em;
		line-height: 1.1;
		color: var(--color-text);
	}

	.lead {
		font-size: 1.4rem;
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
		padding: 1.5rem;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		transition: all 0.3s;
	}

	.meta-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: var(--ui-accent-border);
		transform: translateY(-2px);
	}

	.meta-card strong {
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.meta-card span {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.section {
		margin-bottom: 8rem;
		padding: 0 1rem;
	}

	.section-head {
		margin-bottom: 3rem;
	}

	h2 {
		font-size: 2.5rem;
		margin: 0 0 1.5rem;
		letter-spacing: -0.03em;
		color: var(--color-text);
	}

	p {
		font-size: 1.2rem;
		color: var(--color-text-muted);
		line-height: 1.7;
		margin-bottom: 2rem;
		max-width: 80ch;
	}

	.gallery-grid {
		display: grid;
		gap: 4rem;
	}

	.group {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.group h3 {
		grid-column: span 3;
		font-size: 1.8rem;
		margin: 0 0 0.5rem;
		color: var(--ui-accent);
		opacity: 0.8;
	}

	.footer {
		margin-top: 6rem;
		text-align: center;
		padding: 5rem 2rem;
		border-top: 1px solid var(--ui-border);
		background: rgba(0, 0, 0, 0.1);
		border-radius: 40px 40px 0 0;
	}

	.back-btn {
		display: inline-block;
		margin-top: 2rem;
		padding: 1rem 3rem;
		border-radius: 20px;
		background: var(--ui-accent, #2dd4bf);
		color: #000;
		font-weight: 900;
		font-size: 1.1rem;
		text-decoration: none;
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
		box-shadow: 0 10px 30px var(--ui-accent-bg);
	}

	.back-btn:hover {
		transform: translateY(-3px) scale(1.02);
		box-shadow: 0 15px 40px var(--ui-accent-bg);
	}

	@media (max-width: 1200px) {
		.group { grid-template-columns: repeat(2, 1fr); }
		.group h3 { grid-column: span 2; }
	}

	@media (max-width: 800px) {
		h1 { font-size: 2.5rem; }
		.meta-grid { grid-template-columns: 1fr; }
		.group { grid-template-columns: 1fr; }
		.group h3 { grid-column: span 1; }
		.hero { padding: 3rem 1.5rem; }
	}
</style>
