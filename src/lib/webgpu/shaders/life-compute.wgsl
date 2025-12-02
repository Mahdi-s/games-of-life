// Cellular Automaton Compute Shader
// Supports Life-like (B/S) and Generations rules
// Supports multiple neighborhood types

struct Params {
    width: u32,
    height: u32,
    birth_mask: u32,      // Bit i = 1 means birth with i neighbors
    survive_mask: u32,    // Bit i = 1 means survive with i neighbors
    num_states: u32,      // 2 for Life-like, 3+ for Generations
    boundary_mode: u32,   // 0=plane, 1=cylinderX, 2=cylinderY, 3=torus, 4=mobiusX, 5=mobiusY, 6=kleinX, 7=kleinY, 8=projectivePlane
    neighborhood: u32,    // 0 = Moore (8), 1 = Von Neumann (4), 2 = Extended Moore (24), 3 = Hexagonal (6), 4 = Extended Hexagonal (18)
    _padding: u32,        // Padding for 16-byte alignment
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> cell_state_in: array<u32>;
@group(0) @binding(2) var<storage, read_write> cell_state_out: array<u32>;

// Boundary modes:
// 0 = plane (no wrap)
// 1 = cylinderX (horizontal wrap only)
// 2 = cylinderY (vertical wrap only)
// 3 = torus (both wrap, same orientation)
// 4 = mobiusX (horizontal wrap with vertical flip)
// 5 = mobiusY (vertical wrap with horizontal flip)
// 6 = kleinX (horizontal möbius + vertical cylinder)
// 7 = kleinY (vertical möbius + horizontal cylinder)
// 8 = projectivePlane (both edges flip)

// Get cell state at position with boundary handling
fn get_cell(x: i32, y: i32) -> u32 {
    let w = i32(params.width);
    let h = i32(params.height);
    
    var fx = x;
    var fy = y;
    
    // Determine wrapping behavior based on boundary mode
    let mode = params.boundary_mode;
    
    // Check if we're out of bounds
    let out_left = x < 0;
    let out_right = x >= w;
    let out_top = y < 0;
    let out_bottom = y >= h;
    let out_x = out_left || out_right;
    let out_y = out_top || out_bottom;
    
    // Handle horizontal boundary
    if (out_x) {
        // Modes that wrap horizontally: 1 (cylinderX), 3 (torus), 4 (mobiusX), 6 (kleinX), 7 (kleinY), 8 (projective)
        let wraps_x = mode == 1u || mode == 3u || mode == 4u || mode == 6u || mode == 7u || mode == 8u;
        
        if (!wraps_x) {
            // No horizontal wrap - cell is dead
            return 0u;
        }
        
        // Wrap x coordinate
        fx = ((x % w) + w) % w;
        
        // Check if this is a flipping wrap (möbius-like in X direction)
        // Modes with X-flip: 4 (mobiusX), 6 (kleinX), 8 (projective)
        let flips_x = mode == 4u || mode == 6u || mode == 8u;
        
        if (flips_x) {
            // Flip y when wrapping across x boundary
            fy = h - 1 - y;
        }
    }
    
    // Handle vertical boundary
    if (out_y) {
        // Modes that wrap vertically: 2 (cylinderY), 3 (torus), 5 (mobiusY), 6 (kleinX), 7 (kleinY), 8 (projective)
        let wraps_y = mode == 2u || mode == 3u || mode == 5u || mode == 6u || mode == 7u || mode == 8u;
        
        if (!wraps_y) {
            // No vertical wrap - cell is dead
            return 0u;
        }
        
        // Wrap y coordinate
        fy = ((fy % h) + h) % h;
        
        // Check if this is a flipping wrap (möbius-like in Y direction)
        // Modes with Y-flip: 5 (mobiusY), 7 (kleinY), 8 (projective)
        let flips_y = mode == 5u || mode == 7u || mode == 8u;
        
        if (flips_y) {
            // Flip x when wrapping across y boundary
            fx = w - 1 - fx;
        }
    }
    
    // Final bounds check after all transformations
    if (fx < 0 || fx >= w || fy < 0 || fy >= h) {
        return 0u;
    }
    
    let idx = u32(fx) + u32(fy) * params.width;
    return cell_state_in[idx];
}

// Check if a cell is "alive" (state == 1 for Generations rules)
fn is_alive(state: u32) -> bool {
    return state == 1u;
}

// Count living neighbors - Moore neighborhood (8 cells)
fn count_neighbors_moore(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) {
                continue;
            }
            if (is_alive(get_cell(x + dx, y + dy))) {
                count++;
            }
        }
    }
    
    return count;
}

// Count living neighbors - Von Neumann neighborhood (4 cells)
fn count_neighbors_von_neumann(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    // Only orthogonal neighbors (N, S, E, W)
    if (is_alive(get_cell(x, y - 1))) { count++; } // North
    if (is_alive(get_cell(x, y + 1))) { count++; } // South
    if (is_alive(get_cell(x - 1, y))) { count++; } // West
    if (is_alive(get_cell(x + 1, y))) { count++; } // East
    
    return count;
}

// Count living neighbors - Extended Moore neighborhood (24 cells, radius 2)
fn count_neighbors_extended(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    for (var dy: i32 = -2; dy <= 2; dy++) {
        for (var dx: i32 = -2; dx <= 2; dx++) {
            if (dx == 0 && dy == 0) {
                continue;
            }
            if (is_alive(get_cell(x + dx, y + dy))) {
                count++;
            }
        }
    }
    
    return count;
}

// Count living neighbors - Hexagonal neighborhood (6 cells)
// Uses "offset coordinates" (odd-r) where odd rows are shifted right
// Each cell has 6 neighbors arranged in a honeycomb pattern
fn count_neighbors_hexagonal(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    // Determine if this row is odd or even
    let is_odd_row = (y & 1) == 1;
    
    // Top-left and top-right neighbors
    if (is_odd_row) {
        // Odd row: top neighbors at (x, y-1) and (x+1, y-1)
        if (is_alive(get_cell(x, y - 1))) { count++; }
        if (is_alive(get_cell(x + 1, y - 1))) { count++; }
    } else {
        // Even row: top neighbors at (x-1, y-1) and (x, y-1)
        if (is_alive(get_cell(x - 1, y - 1))) { count++; }
        if (is_alive(get_cell(x, y - 1))) { count++; }
    }
    
    // Left and right neighbors (same for both odd and even rows)
    if (is_alive(get_cell(x - 1, y))) { count++; }
    if (is_alive(get_cell(x + 1, y))) { count++; }
    
    // Bottom-left and bottom-right neighbors
    if (is_odd_row) {
        // Odd row: bottom neighbors at (x, y+1) and (x+1, y+1)
        if (is_alive(get_cell(x, y + 1))) { count++; }
        if (is_alive(get_cell(x + 1, y + 1))) { count++; }
    } else {
        // Even row: bottom neighbors at (x-1, y+1) and (x, y+1)
        if (is_alive(get_cell(x - 1, y + 1))) { count++; }
        if (is_alive(get_cell(x, y + 1))) { count++; }
    }
    
    return count;
}

// Count living neighbors - Extended Hexagonal neighborhood (18 cells)
// Two rings of neighbors around the center cell in a hexagonal grid
// Ring 1: 6 immediate neighbors (same as regular hexagonal)
// Ring 2: 12 neighbors at distance 2
fn count_neighbors_extended_hexagonal(x: i32, y: i32) -> u32 {
    var count: u32 = 0u;
    
    // Determine if this row is odd or even
    let is_odd_row = (y & 1) == 1;
    
    // === RING 1: 6 immediate neighbors (same as regular hexagonal) ===
    
    // Top neighbors (y-1)
    if (is_odd_row) {
        if (is_alive(get_cell(x, y - 1))) { count++; }
        if (is_alive(get_cell(x + 1, y - 1))) { count++; }
    } else {
        if (is_alive(get_cell(x - 1, y - 1))) { count++; }
        if (is_alive(get_cell(x, y - 1))) { count++; }
    }
    
    // Left and right neighbors (y)
    if (is_alive(get_cell(x - 1, y))) { count++; }
    if (is_alive(get_cell(x + 1, y))) { count++; }
    
    // Bottom neighbors (y+1)
    if (is_odd_row) {
        if (is_alive(get_cell(x, y + 1))) { count++; }
        if (is_alive(get_cell(x + 1, y + 1))) { count++; }
    } else {
        if (is_alive(get_cell(x - 1, y + 1))) { count++; }
        if (is_alive(get_cell(x, y + 1))) { count++; }
    }
    
    // === RING 2: 12 outer neighbors ===
    
    // Row y-2 (2 cells directly above)
    let is_odd_row_m1 = ((y - 1) & 1) == 1;
    if (is_odd_row_m1) {
        // Row y-1 is odd, so y-2 is even
        if (is_alive(get_cell(x, y - 2))) { count++; }      // directly above
        if (is_alive(get_cell(x + 1, y - 2))) { count++; }  // above-right
    } else {
        // Row y-1 is even, so y-2 is odd
        if (is_alive(get_cell(x - 1, y - 2))) { count++; }  // above-left
        if (is_alive(get_cell(x, y - 2))) { count++; }      // directly above
    }
    
    // Row y-1 outer cells (2 cells at far corners of top row)
    if (is_odd_row) {
        // Current row is odd
        if (is_alive(get_cell(x - 1, y - 1))) { count++; }  // far top-left
        if (is_alive(get_cell(x + 2, y - 1))) { count++; }  // far top-right
    } else {
        // Current row is even
        if (is_alive(get_cell(x - 2, y - 1))) { count++; }  // far top-left
        if (is_alive(get_cell(x + 1, y - 1))) { count++; }  // far top-right
    }
    
    // Row y outer cells (2 cells at distance 2 horizontally)
    if (is_alive(get_cell(x - 2, y))) { count++; }  // far left
    if (is_alive(get_cell(x + 2, y))) { count++; }  // far right
    
    // Row y+1 outer cells (2 cells at far corners of bottom row)
    if (is_odd_row) {
        // Current row is odd
        if (is_alive(get_cell(x - 1, y + 1))) { count++; }  // far bottom-left
        if (is_alive(get_cell(x + 2, y + 1))) { count++; }  // far bottom-right
    } else {
        // Current row is even
        if (is_alive(get_cell(x - 2, y + 1))) { count++; }  // far bottom-left
        if (is_alive(get_cell(x + 1, y + 1))) { count++; }  // far bottom-right
    }
    
    // Row y+2 (2 cells directly below)
    let is_odd_row_p1 = ((y + 1) & 1) == 1;
    if (is_odd_row_p1) {
        // Row y+1 is odd, so y+2 is even
        if (is_alive(get_cell(x, y + 2))) { count++; }      // directly below
        if (is_alive(get_cell(x + 1, y + 2))) { count++; }  // below-right
    } else {
        // Row y+1 is even, so y+2 is odd
        if (is_alive(get_cell(x - 1, y + 2))) { count++; }  // below-left
        if (is_alive(get_cell(x, y + 2))) { count++; }      // directly below
    }
    
    return count;
}

// Count neighbors based on neighborhood type
fn count_neighbors(x: i32, y: i32) -> u32 {
    switch (params.neighborhood) {
        case 1u: { return count_neighbors_von_neumann(x, y); }
        case 2u: { return count_neighbors_extended(x, y); }
        case 3u: { return count_neighbors_hexagonal(x, y); }
        case 4u: { return count_neighbors_extended_hexagonal(x, y); }
        default: { return count_neighbors_moore(x, y); }
    }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = i32(global_id.x);
    let y = i32(global_id.y);
    
    // Bounds check
    if (global_id.x >= params.width || global_id.y >= params.height) {
        return;
    }
    
    let idx = global_id.x + global_id.y * params.width;
    let current_state = cell_state_in[idx];
    let neighbors = count_neighbors(x, y);
    
    var new_state: u32 = 0u;
    
    if (params.num_states == 2u) {
        // Standard Life-like rules (2-state)
        if (current_state == 0u) {
            // Dead cell - check birth condition
            if ((params.birth_mask & (1u << neighbors)) != 0u) {
                new_state = 1u;
            }
        } else {
            // Alive cell - check survival condition
            if ((params.survive_mask & (1u << neighbors)) != 0u) {
                new_state = 1u;
            }
        }
    } else {
        // Generations rules (multi-state)
        if (current_state == 0u) {
            // Dead cell - check birth condition
            if ((params.birth_mask & (1u << neighbors)) != 0u) {
                new_state = 1u; // Born
            }
        } else if (current_state == 1u) {
            // Alive cell - check survival condition
            if ((params.survive_mask & (1u << neighbors)) != 0u) {
                new_state = 1u; // Survive
            } else {
                new_state = 2u; // Start dying
            }
        } else {
            // Dying cell - increment towards death
            new_state = current_state + 1u;
            if (new_state >= params.num_states) {
                new_state = 0u; // Dead
            }
        }
    }
    
    cell_state_out[idx] = new_state;
}

