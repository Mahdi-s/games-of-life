<script lang="ts">
	import { onMount } from 'svelte';
	import CanvasNlca from '$lib/components/Canvas-nlca.svelte';
	import ControlsNlca from '$lib/components/ControlsNlca.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import AboutModal from '$lib/components/AboutModal.svelte';
	import ClickHint from '$lib/components/ClickHint.svelte';
	import InfoOverlay from '$lib/components/InfoOverlay.svelte';
	import InitializeModal from '$lib/components/InitializeModal.svelte';
	import NlcaSettingsModal from '$lib/components/NlcaSettingsModal.svelte';
	import NlcaPlaybackModal from '$lib/components/NlcaPlaybackModal.svelte';

	import { getSimulationState, getUIState } from '$lib/stores/simulation.svelte.js';
	import { getModalStates, toggleModal, closeModal } from '$lib/stores/modalManager.svelte.js';

	const simState = getSimulationState();
	const uiState = getUIState();

	const modalStates = $derived(getModalStates());
	const showHelp = $derived(modalStates.help.isOpen);
	const showInitialize = $derived(modalStates.initialize.isOpen);
	const showAbout = $derived(modalStates.about.isOpen);
	const showSettings = $derived(modalStates.settings.isOpen);
	const showNlcaSettings = $derived(modalStates.nlcaSettings.isOpen);
	const showNlcaPlayback = $derived(modalStates.nlcaPlayback.isOpen);

	let canvas: CanvasNlca;

	function handleClear() {
		canvas.clear();
	}
	function handleInitialize() {
		toggleModal('initialize');
	}
	function handleStep() {
		canvas.stepOnce();
	}
	function handleResetView() {
		canvas.resetView();
	}
	function handleRecord() {
		canvas.toggleRecording();
	}

	// Poll recording state from canvas (matches existing MainApp pattern).
	let isRecording = $state(false);
	onMount(() => {
		const interval = setInterval(() => {
			if (canvas) isRecording = canvas.getIsRecording();
		}, 100);
		return () => clearInterval(interval);
	});

	function openHelp() {
		toggleModal('help');
	}
	function openAbout() {
		toggleModal('about');
	}
	function openSettingsModal() {
		toggleModal('settings');
	}
	function openNlcaSettingsModal() {
		toggleModal('nlcaSettings');
	}
	function openNlcaPlaybackModal() {
		toggleModal('nlcaPlayback');
	}
</script>

<CanvasNlca bind:this={canvas} />

<ControlsNlca
	onclear={handleClear}
	oninitialize={handleInitialize}
	onstep={handleStep}
	onresetview={handleResetView}
	onrecord={handleRecord}
	isRecording={isRecording}
	onhelp={openHelp}
	onabout={openAbout}
	onnlcasettings={openNlcaSettingsModal}
	onnlcaplayback={openNlcaPlaybackModal}
	onsettings={openSettingsModal}
	showHelp={showHelp}
	showInitialize={showInitialize}
	showAbout={showAbout}
/>

{#if !simState.hasInteracted}
	<ClickHint />
{/if}

<InfoOverlay />

{#if showHelp}
	<HelpOverlay onclose={() => closeModal('help')} />
{/if}

{#if showAbout}
	<AboutModal onclose={() => closeModal('about')} />
{/if}

{#if showSettings}
	<Settings onclose={() => closeModal('settings')} />
{/if}

{#if showInitialize}
	<InitializeModal onclose={() => closeModal('initialize')} oninitialize={(e) => canvas.initialize(e.detail.type, e.detail.options)} />
{/if}

{#if showNlcaSettings}
	<NlcaSettingsModal onclose={() => closeModal('nlcaSettings')} />
{/if}

{#if showNlcaPlayback}
	<NlcaPlaybackModal onclose={() => closeModal('nlcaPlayback')} />
{/if}

