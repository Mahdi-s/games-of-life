import { RULE_PRESETS } from '../utils/rules.js';

// Shared showcase rules used by both the Tour gallery and GoL docs demos.
// Picking up the base rule definition (masks, states, vitality) from the main registry
// ensures consistency across the whole app while allowing tour-specific overrides.

export type InitType = 'random' | 'centeredDisk' | 'symmetricCross' | 'randomLow' | 'centeredRing' | 'text';
export type SimNeighborhood = 'moore' | 'hexagonal' | 'extendedMoore' | 'extendedHexagonal';
export type VitalityMode = 'none' | 'threshold' | 'ghost' | 'sigmoid' | 'decay' | 'curve';

export interface GalleryRule {
	name: string;
	birthMask: number;
	surviveMask: number;
	numStates: number;
	neighborhood: SimNeighborhood;
	initType: InitType;
	density: number;
	seedRate: number; // Continuous seeding rate
	stimPeriod?: number; // Frames between stimulation pulses (0 = never)
	stimShape?: 'disk' | 'horizontalLine' | 'verticalLine';
	stimRevive?: 'deadOnly' | 'deadOrDying';
	stimRadius?: number; // Optional override for stimulation disk/line size (defaults to diskRadius)
	initText?: string; // For text init type
	diskRadius?: number; // Custom disk radius
	// Vitality settings (how dying cells contribute to neighbor counts)
	vitalityMode?: VitalityMode;
	ghostFactor?: number; // For ghost mode: dying cell contribution multiplier
	curvePoints?: { x: number; y: number }[]; // For curve mode
}

function getBaseRule(name: string) {
	const rule = RULE_PRESETS.find((r) => r.name === name);
	if (!rule) throw new Error(`Shared rule not found: ${name}`);
	return rule;
}

// 9 showcase rules for the gallery (3 rows of 3)
export const GALLERY_RULES: GalleryRule[] = [
	// Row 1: Classics
	{
		...getBaseRule("Conway's Life"),
		neighborhood: 'moore',
		initType: 'random',
		density: 0.25,
		seedRate: 0.001,
		vitalityMode: 'none'
	},
	{
		...getBaseRule('Star Wars'),
		neighborhood: 'moore',
		initType: 'random',
		density: 0.35,
		seedRate: 0.002,
		vitalityMode: 'none'
	},
	{
		...getBaseRule("Brian's Brain"),
		neighborhood: 'moore',
		initType: 'random',
		density: 0.15,
		seedRate: 0.003,
		vitalityMode: 'none'
	},

	// Row 2: NEO discoveries with vitality
	{
		...getBaseRule('Hex2 Neo Diagonal Growth'),
		neighborhood: 'extendedHexagonal',
		initType: 'centeredDisk',
		density: 0.5,
		seedRate: 0,
		stimPeriod: 80,
		diskRadius: 9,
		vitalityMode: 'curve',
		curvePoints: getBaseRule('Hex2 Neo Diagonal Growth').vitality?.curvePoints
	},
	{
		...getBaseRule('Hex Neo Mandala 1'),
		neighborhood: 'hexagonal',
		initType: 'centeredDisk',
		density: 1.0,
		seedRate: 0,
		stimPeriod: 100,
		diskRadius: 9,
		stimRadius: 18,
		vitalityMode: 'curve',
		curvePoints: getBaseRule('Hex Neo Mandala 1').vitality?.curvePoints
	},
	{
		...getBaseRule('Hex Neo Slime Mold'),
		neighborhood: 'hexagonal',
		initType: 'random',
		density: 0.2,
		seedRate: 0.001,
		vitalityMode: 'none'
	},

	// Row 3: More NEO (calmer, less frantic)
	{
		...getBaseRule('Ext24 Neo Waves'),
		neighborhood: 'extendedMoore',
		initType: 'random',
		density: 0.2,
		seedRate: 0.0009,
		vitalityMode: 'none'
	},
	{
		...getBaseRule('Ext24 Neo Coral'),
		neighborhood: 'extendedMoore',
		initType: 'centeredDisk',
		density: 1.0,
		seedRate: 0.0,
		stimPeriod: 120,
		stimShape: 'disk',
		stimRevive: 'deadOrDying',
		diskRadius: 8,
		vitalityMode: 'curve',
		curvePoints: getBaseRule('Ext24 Neo Coral').vitality?.curvePoints
	},
	{
		...getBaseRule('Hex2 Neo Brain 2'),
		neighborhood: 'extendedHexagonal',
		initType: 'centeredDisk',
		density: 1.0,
		seedRate: 0.0,
		stimPeriod: 100,
		stimShape: 'disk',
		stimRevive: 'deadOrDying',
		diskRadius: 10,
		stimRadius: 24,
		vitalityMode: 'none'
	}
];


