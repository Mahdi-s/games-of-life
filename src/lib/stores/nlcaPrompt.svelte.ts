/**
 * NLCA Prompt Configuration Store
 * Manages editable prompt settings for Neural-Linguistic Cellular Automata
 */

// Default task description
const DEFAULT_TASK = `Work with your neighbors to form a square border around the grid.

Rules:
1. If you are on an edge (x=0, x=max, y=0, or y=max) → output 1
2. If you are in the interior (not on any edge) → output 0
3. Coordinate with neighbors: if they're forming a continuous border and you connect them → output 1`;

// Default advanced template with placeholders
const DEFAULT_TEMPLATE = `You are cell ({{CELL_X}},{{CELL_Y}}) on a {{GRID_WIDTH}}x{{GRID_HEIGHT}} grid.

TASK: {{TASK}}

OUTPUT FORMAT: {"state":0} or {"state":1} — nothing else.`;

// Placeholders that will be replaced by the system
export const SYSTEM_PLACEHOLDERS = [
	{ key: '{{CELL_X}}', description: 'Cell X coordinate', editable: false },
	{ key: '{{CELL_Y}}', description: 'Cell Y coordinate', editable: false },
	{ key: '{{GRID_WIDTH}}', description: 'Grid width', editable: false },
	{ key: '{{GRID_HEIGHT}}', description: 'Grid height', editable: false },
	{ key: '{{MAX_X}}', description: 'Maximum X (width - 1)', editable: false },
	{ key: '{{MAX_Y}}', description: 'Maximum Y (height - 1)', editable: false },
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
}

// Reactive state
let taskDescription = $state(DEFAULT_TASK);
let useAdvancedMode = $state(false);
let advancedTemplate = $state(DEFAULT_TEMPLATE);

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
			advancedTemplate
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
		get defaultTask() { return DEFAULT_TASK; },
		get defaultTemplate() { return DEFAULT_TEMPLATE; },
		
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
		
		// Actions
		resetToDefaults() {
			taskDescription = DEFAULT_TASK;
			useAdvancedMode = false;
			advancedTemplate = DEFAULT_TEMPLATE;
			saveToStorage();
		},
		
		resetTaskOnly() {
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

