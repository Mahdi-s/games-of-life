# Audio Sonification V2: Maximalist Parallel Sound

**Version 2 - Revised Proposal**

This document supersedes the brainstorming in V1 with a focused, implementation-ready design that aligns with the project's philosophy: maximalist parallelism, clever abstractions, and beautiful compact UI.

---

## Design Philosophy

### Core Principles

1. **Sonify the Entire Viewport** - Every visible cell contributes to the sound
2. **Parallel-First Architecture** - GPU computes everything; CPU just plays
3. **Curve-Based Abstraction** - One curve replaces many discrete modes
4. **Compact, Graphical UI** - No scrolling, visual controls, theme-aware
5. **Modular Library Extension** - Clean addition to `@games-of-life` packages

### Inspiration: The Vitality Curve Paradigm

Your vitality curve is the perfect abstraction model. Before: 6 discrete modes (none, threshold, ghost, sigmoid, decay, curve). After: One curve editor that can represent ALL of them.

**For audio, we apply the same thinking:**

| Before (Many Controls) | After (Curve-Based) |
|------------------------|---------------------|
| Base frequency slider | **Pitch Curve**: Y → Frequency |
| Volume slider | **Amplitude Curve**: Vitality → Loudness |
| Filter cutoff | **Timbre Curve**: Neighbors → Brightness |
| Stereo pan | **Spatial Curve**: X → Pan |
| Waveform selector | **Wave Curve**: Vitality → Waveform shape |

Each curve is a unified abstraction that provides infinite expressivity with a single visual control.

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WebGPU Pipeline                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Cell Buffer]  →  [Spectral Aggregation Shader]  →  [Spectrum Buffer]      │
│       ↑                       ↓                           ↓                 │
│   Existing               Computes per-bin            256 frequency bins     │
│   simulation             amplitude & phase           + metadata             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                            GPU → CPU Transfer
                            (256 bins × 4 bytes = 1KB per frame)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AudioWorklet                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Spectrum Buffer]  →  [IFFT Synthesis]  →  [Stereo Output]                 │
│                                                                             │
│  Converts frequency-domain data to time-domain audio samples                │
│  Applies window function, overlap-add for smooth transitions                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Insight: Spectral Synthesis Instead of Oscillator Bank

**Problem with oscillators:** 1M cells → 1M oscillators → impossible

**Solution: Spectral aggregation**
- GPU aggregates all cells into ~256 frequency bins
- Each bin represents energy at that frequency
- IFFT in AudioWorklet converts spectrum to waveform
- Result: True sonification of ALL cells, not just sampled subset

This is mathematically equivalent to having 1M oscillators but computationally tractable!

---

## The Five Curves

### 1. Pitch Curve (Y → Frequency)

Maps cell Y-position to frequency bin.

```
Frequency
    ↑
2kHz├────────────────────●
    │                  ╱
    │               ╱
    │            ╱
    │         ●
    │       ╱
80Hz├──────●───────────────→ Y-Position
    0                    Height
```

**Presets:**
- **Linear**: Even distribution (default)
- **Log**: Musical octave spacing
- **Reverse**: High → Low (bass at top)
- **Narrow**: Focus on mid frequencies
- **Wide**: Full audible range

### 2. Amplitude Curve (Vitality → Loudness)

Maps cell vitality to contribution amplitude. Reuses existing `InfluenceCurveEditor` component!

```
Amplitude
    ↑
 1.0├─────────────────────●
    │                   ╱
    │                 ╱
    │              ╱
    │           ╱
    │        ●
 0.0├──────●──────────────→ Vitality
    Dead            Alive
```

**Presets:**
- **Linear**: Direct mapping
- **Exponential**: Emphasize alive cells
- **Gate**: Threshold at 50%
- **Inverse**: Dying cells louder (eerie effect)

### 3. Timbre Curve (Neighbors → Harmonics)

Maps neighbor count to harmonic richness / filter brightness.

```
Brightness
    ↑
Full├─────────────────────●
    │                   ╱
    │                ╱
    │            ●
    │          ╱
    │       ╱
Dark├──────●──────────────→ Neighbors
    0              Max
```

**Effect:** Isolated cells sound dark/muffled; clustered cells sound bright/rich.

### 4. Spatial Curve (X → Pan)

Maps cell X-position to stereo field.

```
Pan
    ↑
Right├─────────────────────●
     │                   ╱
Center├────────────●────────
     │          ╱
Left ├─────────●───────────→ X-Position
     0               Width
```

**Presets:**
- **Full Stereo**: Hard left-to-right
- **Narrow**: 80% center
- **Mono**: All center
- **Inverted**: Right-to-left

### 5. Wave Curve (Vitality → Waveform)

Maps vitality to waveform shape (harmonic content).

```
Harmonic Richness
    ↑
Saw  ├─────────────────────●  (all harmonics)
     │                   ╱
Tri  ├────────────●──────── (odd harmonics only)
     │          ╱
Sine ├─────────●──────────→ Vitality
     Dead            Alive
     (pure)          (complex)
```

**Effect:** Dying cells sound pure/ethereal; alive cells sound rich/present.

---

## Compact UI Design

### Audio Panel (No Scroll, ~200px tall)

```
┌──────────────────────────────────────────────────────────┐
│ 🔊 Audio                                              ✕  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────┐  Master ━━○━━ 75%│
│  │ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                   │  ┌──────────────┐│
│  │ ░░░░░░░░░░░░░░░░░░░               │  │[🔇][▶ Enable]││
│  │ Real-time Spectrum Visualization  │  └──────────────┘│
│  └────────────────────────────────────┘                  │
│                                                          │
│  Pitch ━━━━━━━━━●━━━━━━  Amp ━━━●━━━━━━━━━  Scale [P▼]  │
│  ┌──────────────────┐   ┌──────────────────┐            │
│  │  ╱               │   │      ___/        │ Timbre     │
│  │ ●                │   │  ___/            │ ━━━━●━━━━━ │
│  └──────────────────┘   └──────────────────┘            │
│                                                          │
│  Space ━━━●━━━━━━━━━━  Wave ━━━━━━━━●━━━━  Soft ━━○━━━  │
│                                                          │
│  Presets: [Ambient] [Bright] [Drone] [Rhythm] [Custom]   │
└──────────────────────────────────────────────────────────┘
```

### UI Components Breakdown

#### 1. Header Row
- Title with speaker icon
- Close button
- Uses theme accent color

#### 2. Spectrum Visualizer (Mini)
- 120×40px real-time spectrum display
- Shows what frequencies are active
- Direct feedback of curve effects

#### 3. Master Controls (Right side)
- Volume slider (compact horizontal)
- Mute button
- Enable/disable toggle

#### 4. Curve Mini-Editors (2 rows)
- Each curve: 60×30px mini canvas
- Click to expand full editor (modal-in-modal)
- Shows curve shape at a glance
- Slider below for quick preset morphing

#### 5. Quick Controls
- **Scale**: Dropdown for musical scale (Pentatonic, Major, Chromatic, Free)
- **Timbre**: Slider for global brightness
- **Soft**: Toggle for low-pass smoothing

#### 6. Presets Row
- 4-5 curated preset buttons
- One "Custom" that represents current state

### Expanded Curve Editor (On Click)

When user clicks a mini curve, show full editor:

```
┌────────────────────────────────────────────────────┐
│ Pitch Curve                                      ✕ │
├────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐
│ │                              ●                  │
│ │                           ╱                     │
│ │                        ╱                        │
│ │                     ●                           │
│ │                  ╱                              │
│ │               ╱                                 │
│ │            ●                                    │
│ │         ╱                                       │
│ │      ●                                          │
│ │   ╱                                             │
│ │ ●                                               │
│ └──────────────────────────────────────────────────┘
│  Range: [80▼] Hz — [2000▼] Hz                      │
│  Profile: [Linear▼]                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │Linear│ │ Log  │ │Narrow│ │ Wide │ │Custom│     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
└────────────────────────────────────────────────────┘
```

Reuses the same curve editor component as vitality influence!

---

## Library Extension Design

### Package Structure

```
packages/@games-of-life/
├── core/           (existing)
├── svelte/         (existing)
├── webgpu/         (existing)
└── audio/          (NEW)
    ├── package.json
    ├── README.md
    ├── src/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── curves/
    │   │   ├── index.ts
    │   │   ├── pitch-curve.ts
    │   │   ├── amplitude-curve.ts
    │   │   ├── timbre-curve.ts
    │   │   ├── spatial-curve.ts
    │   │   └── wave-curve.ts
    │   ├── synthesis/
    │   │   ├── index.ts
    │   │   ├── spectral-synth.ts        # IFFT-based synthesis
    │   │   └── audio-worklet.ts
    │   ├── gpu/
    │   │   ├── index.ts
    │   │   ├── spectral-aggregate.wgsl  # GPU shader
    │   │   └── audio-pipeline.ts        # GPU pipeline management
    │   └── presets/
    │       ├── index.ts
    │       └── audio-presets.ts
    └── tsconfig.json
```

### Core Types

```typescript
// types.ts

import type { CurvePoint } from '@games-of-life/core';

/** Curve sample count (matches vitality curve) */
export const AUDIO_CURVE_SAMPLES = 128;

/** Musical scales for pitch quantization */
export type MusicalScale = 
  | 'chromatic' 
  | 'pentatonic' 
  | 'major' 
  | 'minor' 
  | 'whole-tone'
  | 'free'; // No quantization

/** Audio configuration state */
export interface AudioConfig {
  // Master
  enabled: boolean;
  masterVolume: number; // 0-1
  muted: boolean;
  
  // Curves (each is array of CurvePoint from @games-of-life/core)
  pitchCurve: CurvePoint[];
  amplitudeCurve: CurvePoint[];
  timbreCurve: CurvePoint[];
  spatialCurve: CurvePoint[];
  waveCurve: CurvePoint[];
  
  // Quick controls
  scale: MusicalScale;
  rootNote: number; // MIDI note (60 = C4)
  softening: number; // 0-1, low-pass filter amount
  
  // Frequency range
  minFreq: number; // Hz
  maxFreq: number; // Hz
}

/** Preset definition */
export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<AudioConfig>;
}

/** Spectral bin from GPU */
export interface SpectralBin {
  amplitude: number;
  phase: number;
  panPosition: number; // -1 to +1
}
```

### GPU Shader: Spectral Aggregation

```wgsl
// spectral-aggregate.wgsl
//
// Aggregates visible cells into frequency spectrum bins
// Each workgroup processes a tile of cells and atomically adds to spectrum

struct AudioParams {
    // Viewport bounds (which cells are visible)
    viewport_x: f32,
    viewport_y: f32,
    viewport_width: f32,
    viewport_height: f32,
    
    // Grid dimensions
    grid_width: u32,
    grid_height: u32,
    num_states: u32,
    
    // Spectrum params
    num_bins: u32,
    min_freq: f32,
    max_freq: f32,
    
    // Curve indices into sample buffers
    _padding: u32,
}

struct SpectralOutput {
    amplitude: f32,
    phase: f32,
    pan_left: f32,
    pan_right: f32,
}

@group(0) @binding(0) var<uniform> params: AudioParams;
@group(0) @binding(1) var<storage, read> cells: array<u32>;
@group(0) @binding(2) var<storage, read> pitch_curve: array<f32>;      // 128 samples
@group(0) @binding(3) var<storage, read> amplitude_curve: array<f32>;  // 128 samples
@group(0) @binding(4) var<storage, read> timbre_curve: array<f32>;     // 128 samples
@group(0) @binding(5) var<storage, read> spatial_curve: array<f32>;    // 128 samples
@group(0) @binding(6) var<storage, read> wave_curve: array<f32>;       // 128 samples
@group(0) @binding(7) var<storage, read_write> spectrum: array<SpectralOutput>;

// Workgroup shared memory for local aggregation
var<workgroup> local_spectrum: array<SpectralOutput, 256>;

fn get_vitality(state: u32) -> f32 {
    if (state == 0u) { return 0.0; }
    if (state == 1u) { return 1.0; }
    return f32(params.num_states - state) / f32(params.num_states - 1u);
}

fn sample_curve(curve: ptr<storage, array<f32>, read>, t: f32) -> f32 {
    let idx = clamp(t * 127.0, 0.0, 127.0);
    let i0 = u32(floor(idx));
    let i1 = min(i0 + 1u, 127u);
    let frac = idx - f32(i0);
    return mix((*curve)[i0], (*curve)[i1], frac);
}

fn count_alive_neighbors(x: i32, y: i32) -> f32 {
    var count: f32 = 0.0;
    let w = i32(params.grid_width);
    let h = i32(params.grid_height);
    
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) { continue; }
            let nx = (x + dx + w) % w;
            let ny = (y + dy + h) % h;
            let idx = u32(nx) + u32(ny) * params.grid_width;
            if (cells[idx] == 1u) { count += 1.0; }
        }
    }
    return count / 8.0; // Normalize to 0-1
}

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(local_invocation_index) local_idx: u32
) {
    // Initialize local spectrum
    if (local_idx < params.num_bins) {
        local_spectrum[local_idx] = SpectralOutput(0.0, 0.0, 0.0, 0.0);
    }
    workgroupBarrier();
    
    // Calculate cell coordinates from viewport
    let cell_x = params.viewport_x + f32(global_id.x);
    let cell_y = params.viewport_y + f32(global_id.y);
    
    // Bounds check
    if (cell_x >= f32(params.grid_width) || cell_y >= f32(params.grid_height)) {
        return;
    }
    if (f32(global_id.x) >= params.viewport_width || f32(global_id.y) >= params.viewport_height) {
        return;
    }
    
    let cell_idx = u32(cell_x) + u32(cell_y) * params.grid_width;
    let state = cells[cell_idx];
    let vitality = get_vitality(state);
    
    // Skip dead cells
    if (vitality < 0.001) {
        return;
    }
    
    // Sample curves
    let y_normalized = f32(global_id.y) / params.viewport_height;
    let x_normalized = f32(global_id.x) / params.viewport_width;
    let neighbors = count_alive_neighbors(i32(cell_x), i32(cell_y));
    
    // Pitch: Y position → frequency bin
    let pitch_t = sample_curve(&pitch_curve, y_normalized);
    let freq_bin = u32(clamp(pitch_t * f32(params.num_bins - 1u), 0.0, f32(params.num_bins - 1u)));
    
    // Amplitude: vitality → loudness
    let amplitude = sample_curve(&amplitude_curve, vitality);
    
    // Timbre: neighbors → harmonic spread (adds to adjacent bins too)
    let timbre = sample_curve(&timbre_curve, neighbors);
    
    // Spatial: X position → stereo pan
    let pan = sample_curve(&spatial_curve, x_normalized) * 2.0 - 1.0; // -1 to +1
    let pan_left = sqrt(0.5 * (1.0 - pan));
    let pan_right = sqrt(0.5 * (1.0 + pan));
    
    // Wave: vitality → phase variation (creates waveform complexity)
    let wave_phase = sample_curve(&wave_curve, vitality) * 6.28318; // 0-2π
    
    // Add to spectrum (atomic would be ideal, but we use workgroup reduction)
    // Main bin
    atomicAdd(&local_spectrum[freq_bin].amplitude, amplitude);
    atomicAdd(&local_spectrum[freq_bin].phase, wave_phase);
    atomicAdd(&local_spectrum[freq_bin].pan_left, amplitude * pan_left);
    atomicAdd(&local_spectrum[freq_bin].pan_right, amplitude * pan_right);
    
    // Harmonic spread based on timbre
    if (timbre > 0.1) {
        let spread = u32(timbre * 3.0); // 0-3 adjacent bins
        for (var d: u32 = 1u; d <= spread; d++) {
            let harmonic_amp = amplitude * (1.0 - f32(d) * 0.3);
            if (freq_bin + d < params.num_bins) {
                atomicAdd(&local_spectrum[freq_bin + d].amplitude, harmonic_amp * 0.5);
            }
            if (freq_bin >= d) {
                atomicAdd(&local_spectrum[freq_bin - d].amplitude, harmonic_amp * 0.3);
            }
        }
    }
    
    workgroupBarrier();
    
    // Reduce to global spectrum (one thread per bin)
    if (local_idx < params.num_bins) {
        atomicAdd(&spectrum[local_idx].amplitude, local_spectrum[local_idx].amplitude);
        atomicAdd(&spectrum[local_idx].phase, local_spectrum[local_idx].phase);
        atomicAdd(&spectrum[local_idx].pan_left, local_spectrum[local_idx].pan_left);
        atomicAdd(&spectrum[local_idx].pan_right, local_spectrum[local_idx].pan_right);
    }
}
```

### AudioWorklet Synthesizer

```typescript
// synthesis/spectral-synth.ts

export interface SpectralSynthOptions {
  numBins: number;
  sampleRate: number;
  bufferSize: number;
}

export class SpectralSynthProcessor extends AudioWorkletProcessor {
  private numBins: number;
  private spectrum: Float32Array;
  private phases: Float32Array;
  private smoothingFactor: number = 0.9;
  
  constructor(options: AudioWorkletNodeOptions) {
    super();
    
    this.numBins = options.processorOptions?.numBins ?? 256;
    this.spectrum = new Float32Array(this.numBins * 4); // amp, phase, panL, panR
    this.phases = new Float32Array(this.numBins);
    
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.spectrum) {
        // Smooth transition to new spectrum
        const newSpectrum = e.data.spectrum as Float32Array;
        for (let i = 0; i < this.spectrum.length; i++) {
          this.spectrum[i] = this.spectrum[i] * this.smoothingFactor + 
                             newSpectrum[i] * (1 - this.smoothingFactor);
        }
      }
      if (e.data.softening !== undefined) {
        this.smoothingFactor = 0.8 + e.data.softening * 0.15; // 0.8 to 0.95
      }
    };
  }
  
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || output.length < 2) return true;
    
    const left = output[0];
    const right = output[1];
    const bufferSize = left.length;
    
    // Generate audio using additive synthesis
    for (let i = 0; i < bufferSize; i++) {
      let sumL = 0;
      let sumR = 0;
      
      for (let bin = 0; bin < this.numBins; bin++) {
        const offset = bin * 4;
        const amplitude = this.spectrum[offset];
        const phase = this.spectrum[offset + 1];
        const panL = this.spectrum[offset + 2];
        const panR = this.spectrum[offset + 3];
        
        if (amplitude < 0.001) continue;
        
        // Calculate frequency for this bin (log scale)
        const minFreq = 80;
        const maxFreq = 4000;
        const freq = minFreq * Math.pow(maxFreq / minFreq, bin / (this.numBins - 1));
        
        // Update phase
        this.phases[bin] += freq / sampleRate;
        if (this.phases[bin] > 1) this.phases[bin] -= 1;
        
        // Generate sample (sine wave with phase offset)
        const sample = Math.sin((this.phases[bin] + phase / 6.28318) * Math.PI * 2);
        const scaledAmp = amplitude * 0.1 / Math.sqrt(this.numBins); // Normalize
        
        sumL += sample * scaledAmp * panL;
        sumR += sample * scaledAmp * panR;
      }
      
      // Soft clip
      left[i] = Math.tanh(sumL);
      right[i] = Math.tanh(sumR);
    }
    
    return true;
  }
}

registerProcessor('spectral-synth', SpectralSynthProcessor);
```

---

## Presets

### Built-in Presets

```typescript
// presets/audio-presets.ts

import type { AudioPreset } from '../types';

export const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Soft, atmospheric drone',
    config: {
      pitchCurve: [{ x: 0, y: 0.1 }, { x: 1, y: 0.4 }], // Narrow, low range
      amplitudeCurve: [{ x: 0, y: 0 }, { x: 0.5, y: 0.3 }, { x: 1, y: 0.5 }],
      timbreCurve: [{ x: 0, y: 0.1 }, { x: 1, y: 0.3 }], // Dark
      spatialCurve: [{ x: 0, y: 0.3 }, { x: 1, y: 0.7 }], // Narrow stereo
      waveCurve: [{ x: 0, y: 0 }, { x: 1, y: 0.2 }], // Mostly sine
      scale: 'pentatonic',
      softening: 0.8,
      minFreq: 80,
      maxFreq: 800,
    }
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Shimmering, active sound',
    config: {
      pitchCurve: [{ x: 0, y: 0.2 }, { x: 1, y: 0.9 }], // Wide range
      amplitudeCurve: [{ x: 0, y: 0 }, { x: 0.3, y: 0.8 }, { x: 1, y: 1 }],
      timbreCurve: [{ x: 0, y: 0.3 }, { x: 1, y: 1 }], // Bright
      spatialCurve: [{ x: 0, y: 0 }, { x: 1, y: 1 }], // Full stereo
      waveCurve: [{ x: 0, y: 0.2 }, { x: 1, y: 0.6 }],
      scale: 'major',
      softening: 0.3,
      minFreq: 200,
      maxFreq: 3000,
    }
  },
  {
    id: 'drone',
    name: 'Drone',
    description: 'Deep, sustained bass',
    config: {
      pitchCurve: [{ x: 0, y: 0.05 }, { x: 1, y: 0.15 }], // Very narrow, low
      amplitudeCurve: [{ x: 0, y: 0.2 }, { x: 0.3, y: 0.5 }, { x: 1, y: 0.7 }],
      timbreCurve: [{ x: 0, y: 0.5 }, { x: 1, y: 0.8 }],
      spatialCurve: [{ x: 0, y: 0.4 }, { x: 1, y: 0.6 }], // Center-ish
      waveCurve: [{ x: 0, y: 0.3 }, { x: 1, y: 0.5 }],
      scale: 'free',
      softening: 0.7,
      minFreq: 40,
      maxFreq: 200,
    }
  },
  {
    id: 'glitch',
    name: 'Glitch',
    description: 'Chaotic, digital texture',
    config: {
      pitchCurve: [{ x: 0, y: 0.8 }, { x: 0.5, y: 0.2 }, { x: 1, y: 0.9 }], // Erratic
      amplitudeCurve: [{ x: 0, y: 0 }, { x: 0.2, y: 1 }, { x: 0.8, y: 0.3 }, { x: 1, y: 0.8 }],
      timbreCurve: [{ x: 0, y: 1 }, { x: 1, y: 0.5 }], // Inverse
      spatialCurve: [{ x: 0, y: 1 }, { x: 1, y: 0 }], // Inverted stereo
      waveCurve: [{ x: 0, y: 0.8 }, { x: 1, y: 0.2 }],
      scale: 'chromatic',
      softening: 0.1,
      minFreq: 100,
      maxFreq: 5000,
    }
  },
];
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Create `@games-of-life/audio` package**
   - Package structure
   - Type definitions
   - Curve sampling utilities (reuse from core)

2. **Implement AudioWorklet synthesizer**
   - Basic spectral synthesis
   - Port-based parameter updates
   - Stereo output

3. **Add audio toggle to toolbar**
   - Simple on/off button
   - Fixed preset (Ambient)

### Phase 2: GPU Pipeline (Week 2)

4. **Spectral aggregation shader**
   - Full WGSL implementation
   - Bind to existing cell buffers
   - Viewport-aware bounds

5. **GPU → AudioWorklet bridge**
   - Spectrum buffer readback
   - Triple buffering for smooth updates
   - MessagePort integration

### Phase 3: UI & Curves (Week 3)

6. **Audio modal component**
   - Compact layout
   - Spectrum visualizer
   - Mini curve displays

7. **Curve editors**
   - Reuse `InfluenceCurveEditor`
   - Add pitch/timbre/spatial/wave variants
   - Preset profiles

8. **Presets & persistence**
   - Built-in presets
   - Save/load custom
   - URL state support

### Phase 4: Polish (Week 4)

9. **Musical scale quantization**
   - Scale type selector
   - Root note selector

10. **Testing & optimization**
    - Performance profiling
    - Cross-browser testing
    - Mobile fallback

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Latency | <50ms | Acceptable for ambient/drone |
| GPU overhead | <2ms/frame | Minimal impact on simulation |
| CPU (AudioWorklet) | <5% | Background audio |
| Spectrum bins | 256 | Balance resolution/performance |
| Update rate | 30Hz | Matches visual perception |
| Buffer size | 256 samples | Low latency, smooth |

---

## Key Differences from V1

| Aspect | V1 | V2 |
|--------|----|----|
| Cell coverage | Aggregated N voices | **Entire viewport via spectral** |
| Abstraction | Many discrete controls | **5 curves** |
| Synthesis | Oscillator bank | **IFFT spectral** |
| UI height | 400px+ (scrollable) | **<200px (no scroll)** |
| Voice count | 32-256 | **Infinite (spectral)** |
| Code location | Mixed | **@games-of-life/audio package** |

---

## Open Questions (Fewer Now)

1. **Scale UI:** Should scale selector be dropdown or pill buttons?
2. **Curve click behavior:** Expand in-modal or open separate modal?
3. **Recording:** Include audio in video recording export?

---

*Document Version: 2.0*
*Created: December 2024*

