/**
 * NLCA Prompt Configuration Store
 * Manages editable prompt settings for Neural-Linguistic Cellular Automata
 */

import type { PromptConfig } from '$lib/nlca/prompt.js';

// ============================================================================
// PROMPT PRESETS
// ============================================================================

export type PresetCategory = 'basic' | 'complex' | 'patterns' | 'scenes' | 'meta';

export interface PromptPreset {
	id: string;
	name: string;
	category: PresetCategory;
	description: string;
	task: string;
}

/**
 * Library of preset prompts for various shapes and patterns.
 * Each preset provides a complete task description that cells follow.
 */
export const PROMPT_PRESETS: PromptPreset[] = [
	// ─────────────────────────────────────────────────────────────────────────
	// BASIC SHAPES
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: 'filled-square',
		name: 'Filled Square',
		category: 'basic',
		description: 'Solid square in the center of the grid',
		task: `Form a filled square in the center of the grid.

Rules:
1. If your x coordinate is between 3 and 7 (inclusive) AND your y coordinate is between 3 and 7 (inclusive) → output 1
2. Otherwise → output 0
3. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'hollow-square',
		name: 'Hollow Square',
		category: 'basic',
		description: 'Square border/outline only',
		task: `Form a hollow square (border only) in the center of the grid.

Rules:
1. Calculate if you're on the border of a square from (2,2) to (8,8)
2. If (x == 2 OR x == 8) AND (y >= 2 AND y <= 8) → output 1 (left/right edges)
3. If (y == 2 OR y == 8) AND (x >= 2 AND x <= 8) → output 1 (top/bottom edges)
4. Otherwise → output 0
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'filled-circle',
		name: 'Filled Circle',
		category: 'basic',
		description: 'Circle based on distance from center',
		task: `Form a filled circle centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. Calculate your distance from center: distance = sqrt((x - centerX)² + (y - centerY)²)
3. The radius should be about 1/3 of the smaller grid dimension, so radius = floor(min(gridWidth, gridHeight) / 3)
4. If distance <= radius → output 1
5. Otherwise → output 0
6. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'ring',
		name: 'Ring',
		category: 'basic',
		description: 'Hollow circle (donut shape)',
		task: `Form a ring (hollow circle) centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. Calculate your distance from center: distance = sqrt((x - centerX)² + (y - centerY)²)
3. Inner radius = 2, outer radius = 4
4. If distance >= innerRadius AND distance <= outerRadius → output 1
5. Otherwise → output 0
6. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'diamond',
		name: 'Diamond',
		category: 'basic',
		description: 'Rotated square (45 degrees)',
		task: `Form a diamond shape (rotated square) centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. Calculate your Manhattan distance from center: distance = |x - centerX| + |y - centerY|
3. The diamond radius should be about 1/3 of the smaller grid dimension
4. If distance <= radius (e.g., 3 or 4) → output 1
5. Otherwise → output 0
6. Your previous state does not matter - only your position determines your state`
	},

	// ─────────────────────────────────────────────────────────────────────────
	// COMPLEX SHAPES
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: 'cross',
		name: 'Cross (+)',
		category: 'complex',
		description: 'Plus sign through the center',
		task: `Form a cross (plus sign) centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. The cross arms should be 1-2 cells thick
3. If x == centerX AND y is between 1 and gridHeight-2 → output 1 (vertical arm)
4. If y == centerY AND x is between 1 and gridWidth-2 → output 1 (horizontal arm)
5. Otherwise → output 0
6. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'x-shape',
		name: 'X Shape',
		category: 'complex',
		description: 'Diagonal cross through the center',
		task: `Form an X shape (diagonal cross) centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. You are on a diagonal if your offset from center satisfies: |x - centerX| == |y - centerY|
3. If |x - centerX| == |y - centerY| AND your position is within the grid bounds → output 1
4. Otherwise → output 0
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'triangle',
		name: 'Triangle',
		category: 'complex',
		description: 'Upward-pointing triangle',
		task: `Form an upward-pointing filled triangle.

Rules:
1. The triangle apex (top point) is at the center-top: (centerX, 1) where centerX = floor(gridWidth/2)
2. The base spans the lower portion of the grid
3. For each row y, the triangle widens: cells within |x - centerX| <= (y - 1) should be alive
4. If y >= 1 AND y <= gridHeight - 2 AND |x - centerX| <= (y - 1) → output 1
5. Otherwise → output 0
6. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'heart',
		name: 'Heart',
		category: 'complex',
		description: 'Heart shape (challenging)',
		task: `Form a heart shape centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. A heart can be approximated: the top half has two bumps, the bottom comes to a point
3. For the top half (y < centerY): two circles centered at (centerX - 2, centerY - 1) and (centerX + 2, centerY - 1) with radius ~2
4. For the bottom half (y >= centerY): a triangular region pointing down
5. Use these conditions combined: if in either top circle OR in the bottom triangle region → output 1
6. This is approximate - do your best to form a recognizable heart shape
7. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'star',
		name: 'Star',
		category: 'complex',
		description: 'Five-pointed star shape',
		task: `Form a five-pointed star centered on the grid.

Rules:
1. The center of the grid is at (centerX, centerY) where centerX = floor(gridWidth/2), centerY = floor(gridHeight/2)
2. A star has 5 points radiating outward and 5 inner valleys
3. One approach: combine a small inner pentagon with 5 triangular points
4. Points should be at angles 90°, 162°, 234°, 306°, 18° from center (every 72°, starting at top)
5. If your position falls within a triangular region pointing to one of these angles → output 1
6. This is geometric - approximate as best you can based on your coordinates
7. Your previous state does not matter - only your position determines your state`
	},

	// ─────────────────────────────────────────────────────────────────────────
	// PATTERNS
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: 'checkerboard',
		name: 'Checkerboard',
		category: 'patterns',
		description: 'Alternating cells like a chess board',
		task: `Form a checkerboard pattern across the entire grid.

Rules:
1. Checkerboard means alternating cells: (x + y) determines the color
2. If (x + y) is even → output 1
3. If (x + y) is odd → output 0
4. This creates a classic checkerboard/chess board pattern
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'vertical-stripes',
		name: 'Vertical Stripes',
		category: 'patterns',
		description: 'Vertical lines across the grid',
		task: `Form vertical stripes across the grid.

Rules:
1. Stripes should be 2 cells wide, alternating on/off
2. If floor(x / 2) is even → output 1
3. If floor(x / 2) is odd → output 0
4. This creates alternating vertical bands
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'horizontal-stripes',
		name: 'Horizontal Stripes',
		category: 'patterns',
		description: 'Horizontal lines across the grid',
		task: `Form horizontal stripes across the grid.

Rules:
1. Stripes should be 2 cells wide, alternating on/off
2. If floor(y / 2) is even → output 1
3. If floor(y / 2) is odd → output 0
4. This creates alternating horizontal bands
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'diagonal-stripes',
		name: 'Diagonal Stripes',
		category: 'patterns',
		description: 'Diagonal lines across the grid',
		task: `Form diagonal stripes across the grid (from top-left to bottom-right).

Rules:
1. Diagonal stripes follow lines where (x + y) is constant
2. If floor((x + y) / 2) is even → output 1
3. If floor((x + y) / 2) is odd → output 0
4. This creates diagonal bands running from top-left to bottom-right
5. Your previous state does not matter - only your position determines your state`
	},
	{
		id: 'gradient',
		name: 'Gradient',
		category: 'patterns',
		description: 'Density increases left to right',
		task: `Form a horizontal gradient: sparse on left, dense on right.

Rules:
1. Your probability of being alive increases with your x coordinate
2. Calculate probability: p = x / gridWidth
3. Use a deterministic rule based on position: if (x * 7 + y * 13) mod gridWidth < x → output 1
4. Otherwise → output 0
5. This creates a pattern that is sparse on the left and dense on the right
6. Your previous state does not matter - only your position determines your state`
	},

	// ─────────────────────────────────────────────────────────────────────────
	// SCENES (COLOR OUTPUT)
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: 'scene-landscape-tree',
		name: 'Landscape: Tree + Mountains',
		category: 'scenes',
		description: 'A simple landscape: sky gradient, mountains, ground, and a tree',
		task: `You are painting a pixel-art scene by choosing your cell's color.

Goal: Draw a landscape with mountains and a tree.

Color mode rules (IMPORTANT):
1. If you are part of the scene, output {"state":1,"color":"#RRGGBB"}.
2. If you are not part of the scene (leave as empty background), output {"state":0,"color":"#RRGGBB"}.
3. Use ONLY uppercase hex colors like "#1A2B3C".

Scene composition (use your x,y and grid size):
- Sky: for y in the top ~45% of the grid, create a vertical gradient (lighter near top, slightly darker near horizon).
- Mountains: add 2–3 triangular silhouettes near the horizon (around y ~40–60%).
  - Give mountains a darker base color and add a lighter ridge line on one edge.
- Ground: for y below the horizon, use a dark green/brown.
- Tree: place a tree near the left-third or right-third of the grid:
  - Trunk: a vertical brown column 1–2 cells wide.
  - Canopy: a round-ish green blob above the trunk with a few lighter highlight pixels.

Hint: Use simple geometry (distance, slopes, and thresholds). Keep it recognizable, not perfect.`
	},
	{
		id: 'scene-sunset-hills',
		name: 'Scene: Sunset Hills',
		category: 'scenes',
		description: 'Sunset gradient with layered rolling hills',
		task: `You are painting a pixel-art scene by choosing your cell's color.

Color mode rules (IMPORTANT):
1. If you are part of the scene, output {"state":1,"color":"#RRGGBB"}.
2. If you are not part of the scene, output {"state":0,"color":"#RRGGBB"}.
3. Use ONLY uppercase hex colors like "#FF8800".

Scene:
- Sky gradient: top = deep blue/purple, horizon = warm orange/pink.
- Sun: a small bright circle near the horizon.
- Hills: 2–3 rolling hill layers (sin-like or parabolic curves) with darker colors for nearer hills.

Keep it simple and coherent.`
	},
	{
		id: 'scene-ocean-moon',
		name: 'Scene: Ocean + Moon',
		category: 'scenes',
		description: 'Night sky with moon and ocean reflection',
		task: `You are painting a pixel-art scene by choosing your cell's color.

Color mode rules (IMPORTANT):
1. If you are part of the scene, output {"state":1,"color":"#RRGGBB"}.
2. If you are not part of the scene, output {"state":0,"color":"#RRGGBB"}.
3. Use ONLY uppercase hex colors like "#C0D8FF".

Scene:
- Night sky: dark blue gradient at top.
- Moon: a bright circle in the upper half.
- Ocean: darker band in the bottom half.
- Reflection: a vertical shimmering stripe below the moon (alternating bright/dim pixels).
`
	},

	// ─────────────────────────────────────────────────────────────────────────
	// META
	// ─────────────────────────────────────────────────────────────────────────
	{
		id: 'custom',
		name: 'Custom',
		category: 'meta',
		description: 'Start with a blank slate',
		task: `Describe your custom task here.

Rules:
1. Define clear conditions for when a cell should output 1 (alive)
2. Define when a cell should output 0 (dead)
3. Use your position (x, y) and the grid dimensions to make decisions
4. Your previous state does not matter unless you want temporal behavior`
	}
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): PromptPreset[] {
	return PROMPT_PRESETS.filter(p => p.category === category);
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): PromptPreset | undefined {
	return PROMPT_PRESETS.find(p => p.id === id);
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

// Default task description (matches 'filled-square' preset)
const DEFAULT_TASK = `Form a filled square in the center of the grid.

Rules:
1. If your x coordinate is between 3 and 7 (inclusive) AND your y coordinate is between 3 and 7 (inclusive) → output 1
2. Otherwise → output 0
3. Your previous state does not matter - only your position determines your state`;

// Default advanced template with placeholders - provides full CA context
const DEFAULT_TEMPLATE = `You are an autonomous cell agent in a cellular automaton simulation.

== YOUR IDENTITY ==
Position: ({{CELL_X}}, {{CELL_Y}}) on a {{GRID_WIDTH}}×{{GRID_HEIGHT}} grid
Coordinate system: x increases rightward (0 to {{MAX_X}}), y increases downward (0 to {{MAX_Y}})

== CELLULAR AUTOMATA CONTEXT ==
You are one of {{GRID_WIDTH}}×{{GRID_HEIGHT}} cells operating in parallel.
Each generation, every cell simultaneously decides its next state based on:
- Its position on the grid
- Its current state (0=dead/off, 1=alive/on)
- The states of neighboring cells

This is a synchronous update: all cells read the current state, then all cells update at once.

== YOUR TASK ==
{{TASK}}

== INPUT FORMAT (provided each generation) ==
You will receive a JSON object with:
- "generation": Current time step (0, 1, 2, ...)
- "state": Your current state (0 or 1)
- "neighbors": Count of alive neighbors (0-8 for Moore neighborhood)
- "neighborhood": Array of [dx, dy, state] for each neighbor
  - dx, dy: relative offset from your position (e.g., [-1, -1] is top-left)
  - state: that neighbor's current state (0 or 1)

== OUTPUT FORMAT ==
{{OUTPUT_CONTRACT}}`;

// Placeholders that will be replaced by the system
export const SYSTEM_PLACEHOLDERS = [
	{ key: '{{CELL_X}}', description: 'Cell X coordinate', editable: false },
	{ key: '{{CELL_Y}}', description: 'Cell Y coordinate', editable: false },
	{ key: '{{GRID_WIDTH}}', description: 'Grid width', editable: false },
	{ key: '{{GRID_HEIGHT}}', description: 'Grid height', editable: false },
	{ key: '{{MAX_X}}', description: 'Maximum X (width - 1)', editable: false },
	{ key: '{{MAX_Y}}', description: 'Maximum Y (height - 1)', editable: false },
	{ key: '{{OUTPUT_CONTRACT}}', description: 'Output contract (auto-generated)', editable: false },
] as const;

// Placeholders that are user-editable
export const USER_PLACEHOLDERS = [
	{ key: '{{TASK}}', description: 'Your task description', editable: true },
] as const;

export interface NlcaPromptConfig {
	/** Simple mode: task description only */
	taskDescription: string;
	/** Whether to use advanced template mode */
	useAdvancedMode: boolean;
	/** Full template with placeholders (advanced mode) */
	advancedTemplate: string;
	/** Request the model to output a deterministic hex color for this cell */
	cellColorHexEnabled: boolean;
	/** Currently selected preset ID (null = custom/modified) */
	selectedPresetId: string | null;
}

// Reactive state
let taskDescription = $state(DEFAULT_TASK);
let useAdvancedMode = $state(false);
let advancedTemplate = $state(DEFAULT_TEMPLATE);
let cellColorHexEnabled = $state(false);
let selectedPresetId = $state<string | null>('filled-square'); // Default to filled-square preset

// LocalStorage persistence key
const STORAGE_KEY = 'nlca-prompt-config';

/**
 * Load saved prompt config from localStorage
 */
function loadFromStorage(): void {
	if (typeof window === 'undefined') return;
	
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const config = JSON.parse(saved) as Partial<NlcaPromptConfig>;
			if (config.taskDescription) taskDescription = config.taskDescription;
			if (config.useAdvancedMode !== undefined) useAdvancedMode = config.useAdvancedMode;
			if (config.advancedTemplate) advancedTemplate = config.advancedTemplate;
			if (config.cellColorHexEnabled !== undefined) cellColorHexEnabled = config.cellColorHexEnabled;
			if (config.selectedPresetId !== undefined) selectedPresetId = config.selectedPresetId;
		}
	} catch (e) {
		console.warn('[NLCA Prompt] Failed to load saved config:', e);
	}
}

/**
 * Save current prompt config to localStorage
 */
function saveToStorage(): void {
	if (typeof window === 'undefined') return;
	
	try {
		const config: NlcaPromptConfig = {
			taskDescription,
			useAdvancedMode,
			advancedTemplate,
			cellColorHexEnabled,
			selectedPresetId
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch (e) {
		console.warn('[NLCA Prompt] Failed to save config:', e);
	}
}

// Initialize from storage on first access
let initialized = false;
function ensureInitialized() {
	if (!initialized) {
		initialized = true;
		loadFromStorage();
	}
}

/**
 * Get the NLCA prompt state (reactive)
 */
export function getNlcaPromptState() {
	ensureInitialized();
	
	return {
		// Getters
		get taskDescription() { return taskDescription; },
		get useAdvancedMode() { return useAdvancedMode; },
		get advancedTemplate() { return advancedTemplate; },
		get cellColorHexEnabled() { return cellColorHexEnabled; },
		get selectedPresetId() { return selectedPresetId; },
		get defaultTask() { return DEFAULT_TASK; },
		get defaultTemplate() { return DEFAULT_TEMPLATE; },
		
		/**
		 * Check if the current task has been modified from the selected preset
		 */
		get isModifiedFromPreset(): boolean {
			if (!selectedPresetId) return false;
			const preset = getPresetById(selectedPresetId);
			if (!preset) return false;
			return taskDescription !== preset.task;
		},
		
		/**
		 * Get the currently selected preset object
		 */
		get currentPreset(): PromptPreset | undefined {
			return selectedPresetId ? getPresetById(selectedPresetId) : undefined;
		},
		
		// Setters
		set taskDescription(value: string) {
			taskDescription = value;
			saveToStorage();
		},
		set useAdvancedMode(value: boolean) {
			useAdvancedMode = value;
			saveToStorage();
		},
		set advancedTemplate(value: string) {
			advancedTemplate = value;
			saveToStorage();
		},
		set cellColorHexEnabled(value: boolean) {
			cellColorHexEnabled = value;
			saveToStorage();
		},
		set selectedPresetId(value: string | null) {
			selectedPresetId = value;
			saveToStorage();
		},
		
		// Actions
		toPromptConfig(): PromptConfig {
			return {
				taskDescription,
				useAdvancedMode,
				advancedTemplate,
				cellColorHexEnabled
			};
		},
		
		/**
		 * Select a preset and populate the task description with its content
		 */
		selectPreset(presetId: string) {
			const preset = getPresetById(presetId);
			if (preset) {
				selectedPresetId = presetId;
				taskDescription = preset.task;
				saveToStorage();
			}
		},
		
		/**
		 * Reset to the currently selected preset's original task
		 */
		resetToPreset() {
			if (selectedPresetId) {
				const preset = getPresetById(selectedPresetId);
				if (preset) {
					taskDescription = preset.task;
					saveToStorage();
				}
			}
		},
		
		resetToDefaults() {
			selectedPresetId = 'filled-square';
			taskDescription = DEFAULT_TASK;
			useAdvancedMode = false;
			advancedTemplate = DEFAULT_TEMPLATE;
			cellColorHexEnabled = false;
			saveToStorage();
		},
		
		resetTaskOnly() {
			// Reset to current preset's task if one is selected, otherwise default
			if (selectedPresetId) {
				const preset = getPresetById(selectedPresetId);
				if (preset) {
					taskDescription = preset.task;
					saveToStorage();
					return;
				}
			}
			taskDescription = DEFAULT_TASK;
			saveToStorage();
		},
		
		resetTemplateOnly() {
			advancedTemplate = DEFAULT_TEMPLATE;
			saveToStorage();
		},
		
		/**
		 * Build the final system prompt by replacing placeholders
		 */
		buildSystemPrompt(cellX: number, cellY: number, gridWidth: number, gridHeight: number): string {
			const template = useAdvancedMode ? advancedTemplate : DEFAULT_TEMPLATE;
			const task = taskDescription;
			
			return template
				.replace(/\{\{CELL_X\}\}/g, String(cellX))
				.replace(/\{\{CELL_Y\}\}/g, String(cellY))
				.replace(/\{\{GRID_WIDTH\}\}/g, String(gridWidth))
				.replace(/\{\{GRID_HEIGHT\}\}/g, String(gridHeight))
				.replace(/\{\{MAX_X\}\}/g, String(gridWidth - 1))
				.replace(/\{\{MAX_Y\}\}/g, String(gridHeight - 1))
				.replace(/\{\{TASK\}\}/g, task);
		},
		
		/**
		 * Get a preview of the prompt with sample values
		 */
		getPreview(sampleX = 5, sampleY = 5, width = 10, height = 10): string {
			return this.buildSystemPrompt(sampleX, sampleY, width, height);
		}
	};
}

// Export default values for reference
export { DEFAULT_TASK, DEFAULT_TEMPLATE };

