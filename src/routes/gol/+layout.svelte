<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';

	let { children } = $props();

	const sections = [
		{ id: 'top', title: 'Library Overview' },
		{ id: 'intro', title: 'What is CA?' },
		{ id: 'svelte', title: 'Svelte Quickstart' },
		{ id: 'rules', title: 'Defining Rules' },
		{ id: 'hex', title: 'Hexagonal Grids' },
		{ id: 'gallery', title: 'Gallery' }
	];

	let activeSection = $state('top');

	function scrollTo(id: string) {
		activeSection = id;
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
	}

	onMount(() => {
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					activeSection = entry.target.id;
				}
			}
		}, { threshold: 0.5 });

		sections.forEach(s => {
			const el = document.getElementById(s.id);
			if (el) observer.observe(el);
		});

		return () => observer.disconnect();
	});
</script>

<div class="gol-shell">
	<aside class="sidebar">
		<div class="brand">
			<div class="brand-title">GoL Guide</div>
			<div class="brand-sub">Documentation</div>
		</div>

		<nav class="nav">
			<div class="nav-section">
				<div class="nav-section-title">Contents</div>
				{#each sections as section}
					<button 
						class="nav-item" 
						class:active={activeSection === section.id}
						type="button"
						onclick={() => scrollTo(section.id)}
					>
						{section.title}
					</button>
				{/each}
			</div>
		</nav>

		<div class="sidebar-footer">
			<a class="sidebar-link" href={`${base}/`}>← Back to app</a>
		</div>
	</aside>

	<div class="main">
		<header class="topbar">
			<a class="topbar-back" href={`${base}/`}>← Back to app</a>
			<div class="topbar-spacer"></div>
			<a class="topbar-link" href="https://github.com/NeoVand/games-of-life" target="_blank" rel="noopener noreferrer">GitHub</a>
		</header>

		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.gol-shell {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: 280px 1fr;
		background:
			radial-gradient(1200px 600px at 20% -10%, var(--ui-accent-bg), transparent 55%),
			radial-gradient(900px 500px at 90% 10%, var(--ui-accent-bg), transparent 55%),
			var(--color-bg);
		z-index: 1000; /* Over the dimmed app */
	}

	.sidebar {
		border-right: 1px solid var(--ui-border);
		background: var(--ui-bg);
		backdrop-filter: blur(18px);
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
	}

	.brand {
		padding: 0 0.5rem 1.5rem;
	}

	.brand-title {
		font-weight: 900;
		letter-spacing: -0.03em;
		font-size: 1.2rem;
		color: var(--color-text);
	}

	.brand-sub {
		margin-top: 0.15rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.nav {
		flex: 1;
	}

	.nav-section-title {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		margin: 0 0 0.8rem 0.5rem;
	}

	.nav-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.6rem 0.8rem;
		border-radius: 12px;
		text-decoration: none;
		color: var(--color-text-muted);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.95rem;
		transition: all 0.2s;
	}

	.nav-item:hover {
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-text);
	}

	.nav-item.active {
		background: var(--ui-accent-bg);
		color: var(--ui-accent);
		border: 1px solid var(--ui-accent-border);
	}

	.sidebar-footer {
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.sidebar-link {
		display: block;
		padding: 0.6rem 0.8rem;
		color: var(--color-text);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.main {
		display: grid;
		grid-template-rows: auto 1fr;
		overflow: hidden;
	}

	.topbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.2rem;
		border-bottom: 1px solid var(--ui-border);
		background: var(--ui-bg);
		backdrop-filter: blur(18px);
	}

	.topbar-back,
	.topbar-link {
		color: var(--ui-text);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.9rem;
		padding: 0.45rem 0.8rem;
		border-radius: 12px;
		border: 1px solid var(--ui-border);
		background: var(--btn-bg);
	}

	.topbar-back:hover,
	.topbar-link:hover {
		border-color: var(--ui-accent);
		background: var(--btn-bg-hover);
		color: var(--ui-text-hover);
	}

	.topbar-spacer {
		flex: 1;
	}

	.content {
		overflow: auto;
		padding: 2rem;
		scroll-behavior: smooth;
	}

	@media (max-width: 920px) {
		.gol-shell {
			grid-template-columns: 1fr;
		}
		.sidebar {
			display: none;
		}
	}
</style>
