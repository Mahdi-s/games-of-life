# Cellular Automata Audio Sonification Research

## Overview

This document explores approaches to adding real-time audio generation to the Life-in-Life cellular automata visualization, leveraging WebGPU's parallel processing capabilities to produce rich, immersive soundscapes that mirror the visual complexity of the simulation.

---

## Table of Contents

1. [Current Architecture Understanding](#current-architecture-understanding)
2. [Web Audio Pipeline Options](#web-audio-pipeline-options)
3. [Sonification Approaches](#sonification-approaches)
4. [Technical Implementation Strategies](#technical-implementation-strategies)
5. [User Interface Design](#user-interface-design)
6. [Challenges & Solutions](#challenges--solutions)
7. [Proposed Architecture](#proposed-architecture)
8. [Open Questions](#open-questions)

---

## Current Architecture Understanding

### WebGPU Simulation Pipeline

The existing codebase uses a sophisticated WebGPU pipeline:

1. **Compute Shader** (`life-compute.wgsl`): Runs cellular automata rules in parallel
   - Double-buffered cell state arrays (`cellBuffers[0]` and `cellBuffers[1]`)
   - Each cell is a `u32` containing state (0=dead, 1=alive, 2+ = dying states)
   - Supports vitality modes that influence neighbor counting through custom curves
   - Workgroup size: 8×8 threads

2. **Render Shader** (`life-render.wgsl`): Visualizes cell states with color spectrums
   - Multiple spectrum modes for visual variety
   - Neighbor shading for clustering visualization
   - Vitality-based color transitions

3. **View State**: Rich configuration including:
   - 18+ spectrum modes with different color harmonies
   - Vitality influence curves (128 samples)
   - Neighbor shading modes

### Key Insight: Parallelism Potential

The simulation already processes **millions of cells per frame** in parallel. The same approach can be adapted for audio:
- Each cell → oscillator/voice
- Vitality curves → amplitude/frequency modulation
- Neighbor interactions → spatial/timbral effects

---

## Web Audio Pipeline Options

### Option A: Pure WebGPU → AudioWorklet Bridge

```
[WebGPU Compute Shader] → [GPU Buffer Readback] → [AudioWorklet] → [Audio Output]
     ↑                          ↓
  Cell States              Float32 Audio Samples
```

**Pros:**
- Maximum parallelism in GPU for audio synthesis
- Can generate millions of oscillator samples simultaneously

**Cons:**
- GPU→CPU data transfer latency (typically 10-50ms)
- Buffer underrun risk with real-time audio
- Requires double/triple buffering strategies

### Option B: WebGPU Aggregation → Web Audio Nodes

```
[WebGPU Compute Shader] → [Aggregated Audio Params] → [Web Audio API Nodes]
     ↑                          ↓
  Cell States              Frequency/Amplitude Arrays
                           (much smaller than raw audio)
```

**Pros:**
- Smaller data transfer (parameters, not samples)
- Web Audio handles actual synthesis with low latency
- Uses proven OscillatorNode, GainNode infrastructure

**Cons:**
- Limited number of concurrent oscillators (~1000 practical limit)
- Need aggregation strategy for millions of cells

### Option C: Hybrid Approach (Recommended)

```
[WebGPU Compute] → [Aggregate to N Voices] → [AudioWorklet Synthesis]
     ↑                    ↓                         ↓
  Cell States      Aggregate Params           Audio Samples
  (millions)       (~32-256 voices)           (stereo output)
```

**Pros:**
- GPU handles heavy aggregation work
- Manageable voice count for synthesis
- AudioWorklet provides low-latency synthesis
- Flexible voice allocation strategies

---

## Sonification Approaches

### Approach 1: Spatial Frequency Mapping

**Concept:** Divide the grid into spatial regions, each producing a frequency band.

```
Grid Layout (conceptual):
┌──────────┬──────────┬──────────┐
│  Low Hz  │  Mid Hz  │ High Hz  │  → Row 0 (bass)
├──────────┼──────────┼──────────┤
│  Low Hz  │  Mid Hz  │ High Hz  │  → Row N/2 (mid)
├──────────┼──────────┼──────────┤
│  Low Hz  │  Mid Hz  │ High Hz  │  → Row N (treble)
└──────────┴──────────┴──────────┘
     ↑          ↑          ↑
   Left      Center      Right  (stereo pan)
```

**Parameters:**
- Y-position → base frequency (e.g., 80Hz to 2000Hz)
- X-position → stereo pan (-1 to +1)
- Cell vitality → amplitude
- Neighbor density → filter cutoff or harmonics

**Musical Benefit:** Creates a "sound image" that mirrors the visual pattern. Gliders and spaceships would produce traveling sounds!

### Approach 2: Aggregate Voice Synthesis

**Concept:** Aggregate cells into a smaller number of voices based on spatial clustering or activity.

```javascript
// Pseudo-code for voice aggregation
voiceParams = new Float32Array(NUM_VOICES * 4); // freq, amp, pan, filter

for each region (i, j) in voiceGrid:
    cells = getCellsInRegion(i, j)
    voiceParams[idx] = {
        frequency: baseFreq + avgVitality * freqRange,
        amplitude: sum(cellVitality) / maxCells,
        pan: (j / voiceGridWidth) * 2 - 1,
        filter: neighborDensity * maxCutoff
    }
```

**Voice Count Options:**
- 8 voices: Simple but limited spatialization
- 32 voices: Good balance of complexity and manageability
- 128 voices: Rich texture, approaching computational limits
- 256 voices: Maximum practical for AudioWorklet

### Approach 3: Row Scanning (Time-Domain Sonification)

**Concept:** Scan across the grid like a sequencer, converting columns to audio events.

```
Time →
┌─────────────────────────────┐
│  ●   ●      ●  ●●   ●      │  → t0: play cells in column 0
│    ●  ●●      ●    ●●  ●   │  → t1: play cells in column 1
│  ●      ●  ●●    ●    ●●   │  → ...
└─────────────────────────────┘
```

**Parameters:**
- Scan rate: configurable (e.g., 1-60 columns per second)
- Cell position in row → pitch
- Cell vitality → note duration/amplitude
- Creates rhythmic patterns from spatial structures

**Musical Benefit:** Transforms spatial patterns into rhythmic/melodic sequences.

### Approach 4: Spectral Density Sonification

**Concept:** Treat the grid as a 2D spectrogram and convert activity to frequency content.

```javascript
// Each row contributes to a frequency band
for (let row = 0; row < height; row++) {
    const freq = mapRowToFrequency(row); // e.g., log scale 50Hz-10kHz
    const amplitude = sumRowActivity(row) / width;
    addHarmonicContent(freq, amplitude);
}
```

**Techniques:**
- FFT-inverse approach: construct spectrum, then IFFT to time domain
- Additive synthesis: sum of sinusoids at calculated frequencies
- Wavetable synthesis: use density patterns as wavetable shapes

### Approach 5: Granular Synthesis

**Concept:** Each active cell triggers a tiny sound "grain" with properties derived from cell state.

```
Grain Parameters:
├── Pitch: f(y-position, vitality)
├── Duration: 1-50ms based on numStates
├── Pan: x-position normalized
├── Amplitude: vitality value
├── Waveform: sine/saw based on neighbor count
└── Envelope: attack/decay from dying state
```

**Musical Benefit:** Creates rich, evolving textures. Dense activity = dense texture; sparse = ambient.

### Approach 6: Noise + Filter Approach

**Concept:** Generate noise and shape it with filters controlled by CA state.

```
White Noise → [Filter Bank] → [Spatial Mixer] → Output
                   ↑
              CA State Controls:
              - Filter cutoffs
              - Resonance
              - Bandwidth
```

**Parameters:**
- Overall activity → filter cutoff (more activity = brighter)
- Spatial distribution → multiple filter bands
- Vitality → resonance amount
- Neighbor clustering → filter bandwidth

**Musical Benefit:** Softer, more continuous sound that avoids harsh oscillator artifacts.

---

## Technical Implementation Strategies

### Strategy 1: Audio Aggregation Compute Shader

Add a new compute shader that aggregates cell states into audio parameters:

```wgsl
// audio-aggregate.wgsl
struct AudioVoice {
    frequency: f32,
    amplitude: f32,
    pan: f32,
    filter_cutoff: f32,
}

@group(0) @binding(0) var<storage, read> cell_state: array<u32>;
@group(0) @binding(1) var<storage, read_write> voices: array<AudioVoice>;
@group(0) @binding(2) var<uniform> params: AudioParams;

@compute @workgroup_size(8, 8)
fn aggregate_audio(@builtin(global_invocation_id) id: vec3<u32>) {
    // Each workgroup aggregates a region of cells into one voice
    // Use shared memory for efficient reduction
    
    var shared_vitality: f32 = 0.0;
    var shared_neighbor_count: f32 = 0.0;
    
    // Sum vitality in this region
    for cells in region {
        shared_vitality += get_vitality(cell_state[cell_idx]);
        shared_neighbor_count += count_alive_neighbors(cell_idx);
    }
    
    // Write aggregated voice parameters
    let voice_idx = id.x + id.y * voice_grid_width;
    voices[voice_idx] = AudioVoice(
        base_freq + shared_vitality * freq_range,
        shared_vitality / max_cells,
        (f32(id.x) / f32(voice_grid_width)) * 2.0 - 1.0,
        shared_neighbor_count * filter_scale
    );
}
```

### Strategy 2: AudioWorklet Synthesis Engine

```javascript
// audio-synth-processor.js
class CASynthProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.voices = new Float32Array(MAX_VOICES * 4);
        this.phases = new Float32Array(MAX_VOICES);
        this.port.onmessage = (e) => {
            if (e.data.voices) {
                this.voices.set(e.data.voices);
            }
        };
    }
    
    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const left = output[0];
        const right = output[1];
        
        for (let i = 0; i < left.length; i++) {
            let sumL = 0, sumR = 0;
            
            for (let v = 0; v < this.numVoices; v++) {
                const freq = this.voices[v * 4 + 0];
                const amp = this.voices[v * 4 + 1];
                const pan = this.voices[v * 4 + 2];
                
                // Oscillator
                this.phases[v] += freq / sampleRate;
                if (this.phases[v] > 1) this.phases[v] -= 1;
                
                const sample = Math.sin(this.phases[v] * Math.PI * 2) * amp;
                
                // Stereo pan
                sumL += sample * (1 - pan) * 0.5;
                sumR += sample * (1 + pan) * 0.5;
            }
            
            left[i] = sumL;
            right[i] = sumR;
        }
        
        return true;
    }
}
```

### Strategy 3: GPU Buffer → AudioWorklet Data Flow

```javascript
class AudioBridge {
    constructor(device, simulation) {
        this.device = device;
        this.simulation = simulation;
        this.voiceBuffer = device.createBuffer({
            size: NUM_VOICES * 16, // 4 f32 per voice
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        this.readbackBuffer = device.createBuffer({
            size: NUM_VOICES * 16,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
    }
    
    async updateAudio() {
        // Run aggregation compute shader
        this.runAggregationPass();
        
        // Readback voice parameters (async)
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.voiceBuffer, 0,
            this.readbackBuffer, 0,
            NUM_VOICES * 16
        );
        this.device.queue.submit([commandEncoder.finish()]);
        
        await this.readbackBuffer.mapAsync(GPUMapMode.READ);
        const voices = new Float32Array(
            this.readbackBuffer.getMappedRange()
        );
        
        // Send to AudioWorklet
        this.workletNode.port.postMessage({ voices: voices.slice() });
        this.readbackBuffer.unmap();
    }
}
```

---

## User Interface Design

### Audio Modal Layout

Based on existing modal patterns (Settings, RuleEditor, InfluenceCurveEditor):

```
┌─────────────────────────────────────────────────┐
│ 🔊 Audio                                      ✕ │
├─────────────────────────────────────────────────┤
│ Master                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━ 75%  │
│ [🔇 Mute]                    [▶ Enable Audio]   │
│─────────────────────────────────────────────────│
│ Sonification Mode                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│ │Spat-│ │Gran-│ │Scan │ │Noise│ │Spec-│ │Voice││
│ │ial  │ │ular │ │     │ │     │ │tral │ │     ││
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│─────────────────────────────────────────────────│
│ Frequency Range                                 │
│ Low  ━━○━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 80 Hz │
│ High ━━━━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━━ 2000 Hz│
│─────────────────────────────────────────────────│
│ Scale                                           │
│ [Chromatic ▼]  Root: [C ▼]  Octaves: [3 ▼]     │
│─────────────────────────────────────────────────│
│ Timbre                                          │
│ Waveform: [○ Sine] [○ Tri] [● Saw] [○ Square]  │
│ Filter   ━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━ 4000Hz │
│ Resonance━━━○━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.2 │
│─────────────────────────────────────────────────│
│ Vitality Influence                              │
│ ┌──────────────────────────────────────────────┐│
│ │          ___/                                ││
│ │      ___/                                    ││
│ │  ___/           [Similar curve editor]       ││
│ │ /                                            ││
│ └──────────────────────────────────────────────┘│
│ Profile: [Linear ▼]  (maps vitality → volume)  │
│─────────────────────────────────────────────────│
│ Spatial Settings                                │
│ Voice Count: [32 ▼]  Pan Spread: ━━━━━━○━━ 0.8 │
│ Reverb     ━━━━━━○━━━━━━━━━━━━━━━━━━━━━━━ 0.3  │
│─────────────────────────────────────────────────│
│ Presets                                         │
│ ┌────────┐┌────────┐┌────────┐┌────────┐       │
│ │ Calm   ││ Bright ││Rhythmic││ Drone  │       │
│ │Ambient ││ Pulse  ││ Scan   ││ Evolve │       │
│ └────────┘└────────┘└────────┘└────────┘       │
└─────────────────────────────────────────────────┘
```

### Key UI Components

1. **Master Controls**
   - Volume slider
   - Mute toggle
   - Enable/Disable audio (important for performance)

2. **Sonification Mode Selector**
   - Visual buttons similar to spectrum mode selector
   - Preview of what each mode sounds like (icons)

3. **Frequency/Scale Settings**
   - Base frequency range
   - Musical scale selection (chromatic, major, pentatonic, etc.)
   - Root note selection

4. **Timbre Controls**
   - Waveform selection
   - Filter cutoff and resonance
   - Attack/decay for envelopes

5. **Vitality Influence Curve**
   - Reuse `InfluenceCurveEditor` component
   - Map vitality to amplitude or other parameters

6. **Spatial Settings**
   - Number of voices
   - Stereo spread
   - Reverb amount

7. **Presets**
   - Quick access to curated sound profiles

---

## Challenges & Solutions

### Challenge 1: Latency from GPU Readback

**Problem:** Reading data back from GPU introduces 10-50ms latency.

**Solutions:**
1. **Triple Buffering:** Always have 3 buffers in flight
   - Buffer A: Currently being rendered
   - Buffer B: Being copied from GPU
   - Buffer C: Being used by AudioWorklet

2. **Predictive Synthesis:** Extrapolate parameters forward
   - If frequency is increasing, continue that trend
   - Smoothing prevents audible jumps

3. **Reduced Update Rate:** Only update voice params every 2-4 frames
   - Audio continues smoothly between updates
   - Interpolate between parameter snapshots

### Challenge 2: Millions of Cells → Manageable Voices

**Problem:** Can't have an oscillator per cell.

**Solutions:**
1. **Spatial Aggregation:** Divide grid into N×M regions
   - Each region = one voice
   - Sum vitality within region

2. **Activity-Based Voice Allocation:**
   - Track most active regions
   - Allocate voices to active areas
   - Silent regions don't get voices

3. **Hierarchical Aggregation:**
   - Coarse grid (8×8) for most parameters
   - Fine grid (32×32) for high-frequency detail

### Challenge 3: Harsh/Unpleasant Sounds

**Problem:** Many oscillators can create noise/dissonance.

**Solutions:**
1. **Musical Scale Quantization:**
   ```javascript
   const scales = {
       pentatonic: [0, 2, 4, 7, 9],       // Pleasant, no dissonance
       major: [0, 2, 4, 5, 7, 9, 11],
       minor: [0, 2, 3, 5, 7, 8, 10],
       wholeTone: [0, 2, 4, 6, 8, 10],    // Dreamy
       chromatic: [0,1,2,3,4,5,6,7,8,9,10,11]
   };
   
   function quantizeToScale(freq, scale, rootFreq) {
       const semitones = 12 * Math.log2(freq / rootFreq);
       const octave = Math.floor(semitones / 12);
       const note = Math.round(semitones) % 12;
       const quantized = findNearest(scale, note);
       return rootFreq * Math.pow(2, octave + quantized/12);
   }
   ```

2. **Low-Pass Filtering:**
   - Global filter on output
   - User-controllable cutoff
   - Removes harsh high frequencies

3. **Amplitude Limiting/Compression:**
   - Prevent clipping
   - Soft knee compression for natural dynamics

4. **Attack/Decay Envelopes:**
   - Smooth transitions prevent clicks
   - Longer attack = softer sound

### Challenge 4: Audio/Visual Synchronization

**Problem:** Audio generation must stay in sync with visual simulation.

**Solutions:**
1. **Frame-Locked Updates:**
   - Update audio params in the same frame as visual render
   - Use requestAnimationFrame timing

2. **Timestamp-Based Sync:**
   - Include timestamp in voice parameter updates
   - AudioWorklet can interpolate based on time

3. **Separate but Coordinated:**
   - Audio runs at its own rate (typically 128 samples at a time)
   - Parameters updated from main thread at visual frame rate

---

## Proposed Architecture

### Phase 1: Basic Implementation

1. **Add Audio Aggregation Compute Shader**
   - Input: cell state buffer
   - Output: N voice parameters (frequency, amplitude, pan)
   - Simple row-based frequency mapping

2. **Create AudioWorklet Synthesizer**
   - Receives voice parameters via MessagePort
   - Simple sine oscillators with smoothing

3. **Build Audio Modal UI**
   - Enable/disable toggle
   - Volume control
   - Basic mode selection

### Phase 2: Enhanced Features

1. **Multiple Sonification Modes**
   - Spatial frequency mapping
   - Granular synthesis
   - Row scanning

2. **Vitality Influence Integration**
   - Reuse existing vitality curve infrastructure
   - Map to amplitude, filter, or pitch

3. **Musical Scale Quantization**
   - Scale selector in UI
   - GPU-side quantization for efficiency

### Phase 3: Polish

1. **Presets System**
   - Curated sound profiles
   - Save/load user presets

2. **Effects Chain**
   - Reverb (convolution or algorithmic)
   - Delay
   - Chorus/flanger

3. **Performance Optimization**
   - Adaptive voice count based on device
   - Quality settings

---

## Open Questions

1. **Voice Count Trade-off:**
   - More voices = richer sound but more CPU
   - What's the sweet spot? 32? 64? 128?

2. **Readback Frequency:**
   - Every frame? Every 2 frames? Adaptive?
   - Trade-off between responsiveness and efficiency

3. **Default Behavior:**
   - Should audio be off by default? (battery, surprise factor)
   - Should there be a "first time" experience?

4. **Mobile Support:**
   - WebGPU support on mobile is limited
   - Fallback to Web Audio API only?

5. **Accessibility:**
   - Sonification as accessibility feature?
   - Screen reader integration?

6. **Recording/Export:**
   - Allow users to record audio output?
   - Sync with video recording feature?

---

## Creative Brainstorming: Unique Sonification Ideas

### Idea 1: "Pattern Recognition" Events

Instead of continuous sonification, detect meaningful patterns and trigger musical phrases:

- **Glider detected** → ascending arpeggio in direction of travel
- **Oscillator (blinker)** → rhythmic pulse at oscillation frequency
- **Still life formed** → sustained pad chord
- **Explosion/chaos** → crescendo of noise
- **Population crash** → descending glissando

Could use ML or heuristics to detect patterns. Creates more "musical" output vs. pure data sonification.

### Idea 2: "Mood Ring" Mode

Analyze global automaton metrics and create an overall "mood":

```javascript
const metrics = {
    activity: birthRate + deathRate,
    stability: fractionOfStillLifes,
    chaos: entropyMeasure,
    growth: populationTrend
};

// Map to musical parameters
const mood = {
    tempo: 60 + activity * 60,           // 60-120 BPM
    key: stability > 0.5 ? 'major' : 'minor',
    density: chaos * voiceCount,
    brightness: growth > 0 ? 0.8 : 0.4   // filter cutoff
};
```

### Idea 3: "Living Spectrum" Visualization + Audio Sync

Create a spectrum analyzer that goes BOTH ways:
- Visual → Audio: Cell density creates audio spectrum
- Audio → Visual: Optional microphone input modulates cell birth probability

```
┌──────────────────────────────────────────┐
│    ▄▄ ██ ▄▄     ▄▄ ██ ▄▄                │  ← Frequency spectrum
│   ████████████ ████████████             │    from CA activity
│ ▄▄████████████████████████▄▄           │
│ ████████████████████████████           │
└──────────────────────────────────────────┘
        ↕ Bidirectional mapping
┌──────────────────────────────────────────┐
│ ░░░░████░░░░░░████░░░░░░████░░░░░░░     │
│ ░░████████░░████████░░████████░░░░░░    │  ← CA Grid
│ ██████████████████████████████████      │
└──────────────────────────────────────────┘
```

### Idea 4: "Musical DNA" from Rule String

Derive a base musical motif from the rule itself:

```javascript
function ruleToMotif(rule) {
    const birthNotes = rule.birth.map(n => SCALE[n % SCALE.length]);
    const surviveNotes = rule.survive.map(n => SCALE[n % SCALE.length]);
    
    return {
        birthChord: birthNotes,      // Play when cells born
        surviveChord: surviveNotes,  // Sustain while alive
        numStatesScale: numStatesToScale(rule.numStates)
    };
}
```

Different rules would have signature sounds! Conway's Life (B3/S23) would sound different from HighLife (B36/S23).

### Idea 5: "Spatial Audio Field" with Head Tracking

For users with headphones + device motion:

- Map grid to 360° sound field
- Use device orientation to "look around" the CA
- Cells "behind you" are quieter/filtered
- Creates truly immersive experience

```javascript
window.addEventListener('deviceorientation', (e) => {
    const lookAngle = e.alpha; // 0-360
    voices.forEach(voice => {
        const angleDiff = Math.abs(voice.angle - lookAngle);
        voice.spatialGain = 1 - (angleDiff / 180) * 0.8;
        voice.spatialFilter = 4000 - (angleDiff / 180) * 3000;
    });
});
```

### Idea 6: "Evolution History" as Music Timeline

Store recent history and create evolving composition:

```
t-10 ─────────────────┐
t-9  ────────────────┐│
t-8  ───────────────┐││  Each layer = harmony voice
t-7  ──────────────┐│││  Older states = lower pitch
t-6  ─────────────┐││││  Creates "temporal harmony"
t-5  ────────────┐│││││
t-4  ───────────┐││││││
t-3  ──────────┐│││││││
t-2  ─────────┐││││││││
t-1  ────────┐│││││││││
NOW  ───────→└┴┴┴┴┴┴┴┴┴→ Combined output
```

Creates rich harmonies that represent the automaton's recent history.

### Idea 7: "Generative MIDI" Output

Instead of (or in addition to) audio synthesis, output MIDI:

- Users can route to their favorite software synths
- Professional musicians can use CA as generative composition tool
- Could integrate with Web MIDI API

```javascript
// Pseudo-code for MIDI output
navigator.requestMIDIAccess().then(midi => {
    const output = midi.outputs.values().next().value;
    
    function sendNoteFromCell(cell) {
        if (cell.justBorn) {
            output.send([0x90, cellToNote(cell), cellToVelocity(cell)]);
        }
        if (cell.justDied) {
            output.send([0x80, cellToNote(cell), 0]);
        }
    }
});
```

### Idea 8: "Binaural Beats" Mode

For relaxation/meditation use:

- Generate pairs of slightly detuned frequencies
- Create 1-40 Hz "beat frequencies" matching brainwave states
- CA activity controls which frequency band

```javascript
const BRAINWAVE_BANDS = {
    delta: { range: [0.5, 4], state: 'deep sleep' },
    theta: { range: [4, 8], state: 'meditation' },
    alpha: { range: [8, 13], state: 'relaxed' },
    beta: { range: [13, 30], state: 'active' },
    gamma: { range: [30, 100], state: 'peak focus' }
};

// Map CA activity to brainwave band
const band = activityLevel < 0.2 ? 'delta' :
             activityLevel < 0.4 ? 'theta' :
             activityLevel < 0.6 ? 'alpha' :
             activityLevel < 0.8 ? 'beta' : 'gamma';
```

### Idea 9: "Neighborhood Harmony" System

Use the same neighbor influence concept from vitality, but for harmony:

- Each cell's pitch is influenced by its neighbors
- Creates emergent chord progressions
- Cells "negotiate" their pitch with neighbors

```javascript
function negotiatedPitch(cell, neighbors) {
    let basePitch = cellRowToPitch(cell.y);
    let neighborInfluence = 0;
    
    neighbors.forEach(n => {
        const interval = n.pitch - basePitch;
        // Favor consonant intervals
        if (isConsonant(interval)) {
            neighborInfluence += interval * 0.1;
        }
    });
    
    return quantizeToScale(basePitch + neighborInfluence);
}
```

### Idea 10: "Rule-Reactive" Synthesis

Use the current rule's birth/survive mask to generate the timbre:

```javascript
function ruleToWaveform(birthMask, surviveMask) {
    // Birth mask controls odd harmonics
    const oddHarmonics = [];
    for (let i = 0; i < 9; i++) {
        if (birthMask & (1 << i)) {
            oddHarmonics.push({ harmonic: 2*i + 1, amplitude: 1/(2*i+1) });
        }
    }
    
    // Survive mask controls even harmonics
    const evenHarmonics = [];
    for (let i = 0; i < 9; i++) {
        if (surviveMask & (1 << i)) {
            evenHarmonics.push({ harmonic: 2*i + 2, amplitude: 1/(2*i+2) });
        }
    }
    
    return synthesizeWaveform([...oddHarmonics, ...evenHarmonics]);
}
```

Each rule would have its own unique timbre!

---

## References

1. [WebGPU Audio (webgpuaudio.com)](https://www.webgpuaudio.com/docs/wgslEditor/WgslAudioEditorWithInputs) - Real-time WGSL audio synthesis examples
2. [Noise Square Installation](https://www.isea-symposium-archives.org/presentation/noise-square-physical-sonification-of-cellular-automata-through-mechatronic-sound-sculpture/) - Physical CA sonification
3. [Lenia](https://en.wikipedia.org/wiki/Lenia) - Continuous CA for smoother audio transitions
4. [Web Audio API Spec](https://webaudio.github.io/web-audio-api/) - AudioWorklet documentation

---

## Next Steps

### Immediate (Phase 0: Proof of Concept)

1. [ ] **Create minimal AudioWorklet synthesizer**
   - Start with 8 fixed oscillators
   - Test Web Audio API integration in browser
   - Verify low-latency playback works

2. [ ] **Add simple audio toggle to toolbar**
   - On/off button only
   - Hard-coded parameters initially

3. [ ] **Basic cell state → audio mapping**
   - Divide grid into 8 regions
   - Sum vitality per region → amplitude
   - Row position → frequency

### Short Term (Phase 1: Basic Implementation)

4. [ ] **Implement GPU aggregation compute shader**
   - Create `audio-aggregate.wgsl`
   - Bind to existing cell buffers
   - Output voice parameter buffer

5. [ ] **GPU→CPU data pipeline**
   - Readback buffer setup
   - Async mapping with triple buffering
   - MessagePort to AudioWorklet

6. [ ] **Audio Modal UI (minimal)**
   - Enable/disable
   - Master volume
   - 2-3 preset modes

### Medium Term (Phase 2: Enhanced Features)

7. [ ] **Multiple sonification modes**
   - Spatial frequency mapping
   - Granular synthesis
   - Noise filtering

8. [ ] **Musical scale quantization**
   - Pentatonic (default)
   - Major/minor options
   - Root note selection

9. [ ] **Vitality curve integration**
   - Reuse InfluenceCurveEditor
   - Map to amplitude curve

10. [ ] **Full Audio Modal UI**
    - All controls from UI design section
    - Presets system

### Long Term (Phase 3: Polish)

11. [ ] **Effects chain**
    - Reverb
    - Filter with cutoff control
    - Optional delay

12. [ ] **Performance optimization**
    - Adaptive voice count
    - Quality presets
    - Mobile fallbacks

13. [ ] **Audio recording/export**
    - Sync with video recording
    - MP3/WAV export

14. [ ] **User testing & presets**
    - Curate pleasant default sounds
    - Community preset sharing

---

## Appendix A: Musical Theory for Pleasant Sonification

### Scale Systems for Harmonic Output

To ensure pleasant audio output, frequencies should be quantized to musical scales. Here are the key scale systems ranked by "safety" (how hard it is to create dissonance):

#### 1. Pentatonic Major (Safest)
Notes: C, D, E, G, A (intervals: 0, 2, 4, 7, 9 semitones)
- No semitone intervals = no harsh dissonance
- Works in any combination
- Used across cultures for its inherent pleasantness

```javascript
const PENTATONIC_MAJOR = [0, 2, 4, 7, 9];
// Extended across octaves: 0, 2, 4, 7, 9, 12, 14, 16, 19, 21...
```

#### 2. Pentatonic Minor
Notes: C, Eb, F, G, Bb (intervals: 0, 3, 5, 7, 10)
- Darker mood, still very safe
- Great for atmospheric soundscapes

#### 3. Whole Tone Scale
Notes: C, D, E, F#, G#, A# (intervals: 0, 2, 4, 6, 8, 10)
- Dreamy, floating quality
- All intervals are 2 semitones = balanced
- Creates an "otherworldly" feel

#### 4. Major Scale
Notes: C, D, E, F, G, A, B (intervals: 0, 2, 4, 5, 7, 9, 11)
- Familiar, bright
- Some dissonance possible (B-C, E-F)
- Requires care with voice leading

#### 5. Chromatic (Most Expressive, Hardest)
All 12 notes
- Maximum flexibility
- Requires careful amplitude balancing
- Best with filtering to soften harsh intervals

### Frequency Ratios and Consonance

The most consonant intervals have simple frequency ratios:

| Interval     | Ratio | Consonance |
|-------------|-------|------------|
| Unison      | 1:1   | Perfect    |
| Octave      | 2:1   | Perfect    |
| Perfect 5th | 3:2   | Very High  |
| Perfect 4th | 4:3   | High       |
| Major 3rd   | 5:4   | Medium     |
| Minor 3rd   | 6:5   | Medium     |
| Major 2nd   | 9:8   | Low        |
| Minor 2nd   | 16:15 | Dissonant  |

**Implication:** When aggregating cells to voices, favor combinations that produce these ratios.

### Dynamic Voice Amplitude Strategy

To prevent harsh stacking, implement amplitude reduction based on voice density:

```javascript
// Amplitude per voice decreases as voice count increases
function getVoiceAmplitude(activeVoices, totalVoices) {
    const density = activeVoices / totalVoices;
    // Use square root for natural falloff
    const baseAmp = 0.5 / Math.sqrt(activeVoices);
    // Additional reduction for very high density
    const densityPenalty = 1 - (density * 0.3);
    return baseAmp * densityPenalty;
}
```

### Detuning for Richness

Slight detuning between voices creates "chorus" effect and reduces harsh phasing:

```javascript
function detuneFrequency(baseFreq, voiceIndex, totalVoices, detuneAmount = 0.02) {
    // Spread voices across +/- detuneAmount (e.g., 2%)
    const spread = (voiceIndex / totalVoices) * 2 - 1; // -1 to +1
    return baseFreq * (1 + spread * detuneAmount);
}
```

---

## Appendix B: Detailed Synthesis Algorithms

### Algorithm 1: Wavetable Synthesis from CA Rows

Convert CA row patterns directly into wavetable waveforms:

```javascript
// Each row becomes a single cycle waveform
function rowToWavetable(cellStates, rowIndex, gridWidth) {
    const wavetable = new Float32Array(gridWidth);
    const rowStart = rowIndex * gridWidth;
    
    for (let x = 0; x < gridWidth; x++) {
        const state = cellStates[rowStart + x];
        const vitality = stateToVitality(state);
        // Map vitality to waveform sample (-1 to +1)
        wavetable[x] = (vitality * 2) - 1;
    }
    
    // Apply smoothing to reduce harmonics
    return applyHannWindow(wavetable);
}

// Play all row-wavetables as oscillators
function synthesizeFromRows(cellStates, width, height, sampleRate, duration) {
    const samples = new Float32Array(sampleRate * duration);
    const baseFreq = 110; // A2
    
    for (let row = 0; row < height; row++) {
        const wavetable = rowToWavetable(cellStates, row, width);
        const freq = baseFreq * Math.pow(2, row / 12); // Chromatic
        const amplitude = 0.5 / Math.sqrt(height);
        
        // Render oscillator with this wavetable
        for (let i = 0; i < samples.length; i++) {
            const phase = (i * freq / sampleRate) % 1;
            const sampleIdx = Math.floor(phase * width);
            samples[i] += wavetable[sampleIdx] * amplitude;
        }
    }
    
    return samples;
}
```

### Algorithm 2: Karplus-Strong Physical Modeling

Use CA patterns to initialize "plucked string" synthesis:

```javascript
class KarplusStrongString {
    constructor(frequency, sampleRate, damping = 0.996) {
        this.bufferSize = Math.round(sampleRate / frequency);
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
        this.damping = damping;
    }
    
    // Initialize from CA cell row
    initFromCells(cellStates, startIdx, count) {
        for (let i = 0; i < this.bufferSize; i++) {
            const cellIdx = startIdx + (i % count);
            const vitality = stateToVitality(cellStates[cellIdx]);
            // Excitation: vitality maps to initial displacement
            this.buffer[i] = (vitality * 2 - 1) * (Math.random() * 0.2 + 0.8);
        }
    }
    
    nextSample() {
        const idx = this.writeIndex;
        const nextIdx = (idx + 1) % this.bufferSize;
        
        // Average adjacent samples with damping
        const output = this.buffer[idx];
        this.buffer[idx] = (this.buffer[idx] + this.buffer[nextIdx]) 
                          * 0.5 * this.damping;
        
        this.writeIndex = nextIdx;
        return output;
    }
}
```

### Algorithm 3: Frequency Modulation (FM) from Neighbors

Use neighbor count to modulate carrier frequency:

```javascript
function fmSynthesis(time, baseFreq, neighborCount, maxNeighbors) {
    const carrierFreq = baseFreq;
    // Modulation depth based on neighbor count
    const modDepth = (neighborCount / maxNeighbors) * 200; // 0-200 Hz modulation
    const modFreq = baseFreq * 2; // Modulator at 2x carrier
    
    // Classic FM: carrier + depth * sin(modulator)
    const modulator = Math.sin(2 * Math.PI * modFreq * time);
    const instantFreq = carrierFreq + modDepth * modulator;
    
    return Math.sin(2 * Math.PI * instantFreq * time);
}
```

### Algorithm 4: Convolution Reverb from CA Pattern

Use CA pattern as impulse response for natural reverb:

```javascript
function patternToImpulseResponse(cellStates, width, height, sampleRate) {
    // Create stereo impulse response
    const duration = 2.0; // 2 second reverb
    const length = sampleRate * duration;
    const irLeft = new Float32Array(length);
    const irRight = new Float32Array(length);
    
    const totalCells = width * height;
    
    for (let i = 0; i < totalCells; i++) {
        if (cellStates[i] === 0) continue; // Dead cells = no reflection
        
        const x = i % width;
        const y = Math.floor(i / width);
        const vitality = stateToVitality(cellStates[i]);
        
        // Time delay based on position (simulate room reflections)
        const delay = Math.sqrt(x * x + y * y) / Math.sqrt(width * width + height * height);
        const sampleIdx = Math.floor(delay * length);
        
        // Pan based on x position
        const pan = x / width;
        
        // Amplitude with exponential decay
        const amp = vitality * Math.exp(-delay * 3) * 0.1;
        
        if (sampleIdx < length) {
            irLeft[sampleIdx] += amp * (1 - pan);
            irRight[sampleIdx] += amp * pan;
        }
    }
    
    return { left: irLeft, right: irRight };
}
```

---

## Appendix C: WGSL Audio Compute Shader Examples

### Basic Audio Aggregation Shader

```wgsl
struct AudioParams {
    grid_width: u32,
    grid_height: u32,
    voice_grid_x: u32,
    voice_grid_y: u32,
    base_freq: f32,
    freq_range: f32,
    num_states: u32,
    sample_rate: f32,
}

struct Voice {
    frequency: f32,
    amplitude: f32,
    pan: f32,
    phase: f32,
}

@group(0) @binding(0) var<uniform> params: AudioParams;
@group(0) @binding(1) var<storage, read> cells: array<u32>;
@group(0) @binding(2) var<storage, read_write> voices: array<Voice>;

fn get_vitality(state: u32) -> f32 {
    if (state == 0u) { return 0.0; }
    if (state == 1u) { return 1.0; }
    return f32(params.num_states - state) / f32(params.num_states - 1u);
}

@compute @workgroup_size(8, 8)
fn aggregate_voices(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x >= params.voice_grid_x || id.y >= params.voice_grid_y) {
        return;
    }
    
    let voice_idx = id.x + id.y * params.voice_grid_x;
    
    // Calculate region bounds for this voice
    let cells_per_voice_x = params.grid_width / params.voice_grid_x;
    let cells_per_voice_y = params.grid_height / params.voice_grid_y;
    
    let start_x = id.x * cells_per_voice_x;
    let start_y = id.y * cells_per_voice_y;
    
    var total_vitality: f32 = 0.0;
    var weighted_x: f32 = 0.0;
    var weighted_y: f32 = 0.0;
    var cell_count: f32 = 0.0;
    
    // Sum vitality in region
    for (var dy: u32 = 0u; dy < cells_per_voice_y; dy++) {
        for (var dx: u32 = 0u; dx < cells_per_voice_x; dx++) {
            let x = start_x + dx;
            let y = start_y + dy;
            let cell_idx = x + y * params.grid_width;
            let v = get_vitality(cells[cell_idx]);
            
            if (v > 0.0) {
                total_vitality += v;
                weighted_x += f32(x) * v;
                weighted_y += f32(y) * v;
                cell_count += 1.0;
            }
        }
    }
    
    let max_cells = f32(cells_per_voice_x * cells_per_voice_y);
    let density = total_vitality / max_cells;
    
    // Calculate voice parameters
    let freq_t = f32(id.y) / f32(params.voice_grid_y);
    let frequency = params.base_freq * pow(2.0, freq_t * params.freq_range);
    
    let amplitude = density * 0.5 / sqrt(f32(params.voice_grid_x * params.voice_grid_y));
    
    let pan = (f32(id.x) / f32(params.voice_grid_x)) * 2.0 - 1.0;
    
    // Write voice
    voices[voice_idx] = Voice(
        frequency,
        amplitude,
        pan,
        voices[voice_idx].phase // Preserve phase for continuity
    );
}
```

### Audio Sample Generation Shader

```wgsl
struct SynthParams {
    num_voices: u32,
    sample_rate: f32,
    buffer_size: u32,
    time_offset: f32,
}

@group(0) @binding(0) var<uniform> params: SynthParams;
@group(0) @binding(1) var<storage, read> voices: array<Voice>;
@group(0) @binding(2) var<storage, read_write> audio_buffer: array<vec2<f32>>;

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

fn sine(phase: f32) -> f32 {
    return sin(phase * TWO_PI);
}

fn soft_clip(x: f32) -> f32 {
    return tanh(x);
}

@compute @workgroup_size(256)
fn synthesize(@builtin(global_invocation_id) id: vec3<u32>) {
    if (id.x >= params.buffer_size) {
        return;
    }
    
    let t = params.time_offset + f32(id.x) / params.sample_rate;
    var sum_left: f32 = 0.0;
    var sum_right: f32 = 0.0;
    
    for (var v: u32 = 0u; v < params.num_voices; v++) {
        let voice = voices[v];
        
        if (voice.amplitude < 0.001) {
            continue;
        }
        
        // Calculate phase for this sample
        let phase = fract(voice.phase + voice.frequency * t);
        let sample = sine(phase) * voice.amplitude;
        
        // Pan: -1 = full left, +1 = full right
        let left_amp = sqrt(0.5 * (1.0 - voice.pan));
        let right_amp = sqrt(0.5 * (1.0 + voice.pan));
        
        sum_left += sample * left_amp;
        sum_right += sample * right_amp;
    }
    
    // Soft clip to prevent distortion
    audio_buffer[id.x] = vec2<f32>(
        soft_clip(sum_left),
        soft_clip(sum_right)
    );
}
```

---

## Appendix D: Sonification Mode Profiles

### Mode 1: "Ambient Drone"
- **Voice count:** 16
- **Frequency range:** 80Hz - 400Hz
- **Scale:** Pentatonic minor
- **Waveform:** Sine + slight harmonics
- **Filter:** Low-pass at 800Hz
- **Reverb:** 60%
- **Best for:** Slow, meditative automata

### Mode 2: "Bright Pulse"
- **Voice count:** 64
- **Frequency range:** 200Hz - 2000Hz
- **Scale:** Major
- **Waveform:** Triangle
- **Filter:** Band-pass 500-4000Hz
- **Reverb:** 30%
- **Best for:** Active, chaotic patterns

### Mode 3: "Rhythmic Scanner"
- **Technique:** Row scanning
- **Scan rate:** 8 columns/second
- **Note duration:** 50-200ms based on vitality
- **Scale:** Pentatonic major
- **Attack:** Fast (5ms)
- **Decay:** Medium (100ms)
- **Best for:** Gliders, oscillators, spaceships

### Mode 4: "Textural Noise"
- **Technique:** Filtered noise
- **Noise type:** Pink noise base
- **Filter:** Multi-band (8 bands)
- **Band control:** Regional activity
- **Modulation:** Slow, smooth
- **Best for:** Large-scale pattern evolution

### Mode 5: "Granular Cloud"
- **Grain density:** 100-1000 grains/sec
- **Grain duration:** 10-50ms
- **Pitch:** Y-position mapped
- **Spray:** Random offset ±10%
- **Envelope:** Hann window
- **Best for:** Dense, static patterns

### Mode 6: "Physical Model"
- **Technique:** Karplus-Strong
- **Trigger:** Birth events
- **Pitch:** Row-based
- **Decay:** 1-3 seconds
- **Damping:** Based on neighbor count
- **Best for:** Sparse, event-driven patterns

---

## Appendix E: Performance Benchmarks (Estimated)

Based on WebGPU capabilities and AudioWorklet constraints:

| Voice Count | GPU Aggregation | AudioWorklet Synthesis | Total Latency | CPU Usage |
|-------------|-----------------|------------------------|---------------|-----------|
| 16          | <1ms            | ~3ms                   | ~20ms         | ~2%       |
| 32          | <1ms            | ~5ms                   | ~25ms         | ~5%       |
| 64          | ~1ms            | ~10ms                  | ~30ms         | ~10%      |
| 128         | ~2ms            | ~20ms                  | ~40ms         | ~20%      |
| 256         | ~3ms            | ~35ms                  | ~60ms         | ~35%      |

**Recommended default:** 32 voices (good balance)

**Buffer sizes:**
- 128 samples @ 44.1kHz = 2.9ms latency (tight)
- 256 samples @ 44.1kHz = 5.8ms latency (balanced)
- 512 samples @ 44.1kHz = 11.6ms latency (safe)

**Recommended default:** 256 samples

---

*Document created: December 2024*
*Last updated: December 2024*

