/**
 * WebGPU Context Initialization
 * Handles device setup and capability detection
 */

export interface WebGPUContext {
	device: GPUDevice;
	context: GPUCanvasContext;
	format: GPUTextureFormat;
	canvas: HTMLCanvasElement;
}

export interface WebGPUError {
	type: 'not-supported' | 'adapter-failed' | 'device-failed';
	message: string;
}

/**
 * Check if WebGPU is supported in the current browser
 */
export function isWebGPUSupported(): boolean {
	return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Request a WebGPU device once, so multiple canvases can share it.
 */
export async function requestWebGPUDevice(options?: {
	powerPreference?: GPUPowerPreference;
}): Promise<
	| { ok: true; value: { device: GPUDevice; format: GPUTextureFormat } }
	| { ok: false; error: WebGPUError }
> {
	if (!isWebGPUSupported()) {
		return {
			ok: false,
			error: {
				type: 'not-supported',
				message:
					'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, Safari 17+, or Firefox 121+.'
			}
		};
	}

	const adapter = await navigator.gpu.requestAdapter({
		powerPreference: options?.powerPreference ?? 'high-performance'
	});

	if (!adapter) {
		return {
			ok: false,
			error: {
				type: 'adapter-failed',
				message: 'Failed to get WebGPU adapter. Your GPU may not be supported.'
			}
		};
	}

	let device: GPUDevice;
	try {
		device = await adapter.requestDevice({
			requiredFeatures: [],
			requiredLimits: {
				maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
				maxBufferSize: adapter.limits.maxBufferSize
			}
		});
	} catch {
		return {
			ok: false,
			error: {
				type: 'device-failed',
				message: 'Failed to create WebGPU device.'
			}
		};
	}

	// Handle device loss
	device.lost.then((info) => {
		console.error('WebGPU device lost:', info.message);
		if (info.reason !== 'destroyed') {
			// Could implement auto-recovery here
			console.warn('Device lost unexpectedly, refresh the page to continue.');
		}
	});

	const format = navigator.gpu.getPreferredCanvasFormat();

	return { ok: true, value: { device, format } };
}

/**
 * Create a configured WebGPU canvas context using a (possibly shared) device.
 */
export function createWebGPUContext(
	canvas: HTMLCanvasElement,
	device: GPUDevice,
	format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat()
): { ok: true; value: WebGPUContext } | { ok: false; error: WebGPUError } {
	const context = canvas.getContext('webgpu');
	if (!context) {
		return {
			ok: false,
			error: {
				type: 'not-supported',
				message: 'Failed to get WebGPU canvas context.'
			}
		};
	}

	context.configure({
		device,
		format,
		alphaMode: 'premultiplied'
	});

	return {
		ok: true,
		value: { device, context, format, canvas }
	};
}

/**
 * Initialize WebGPU context for a single canvas element (device-per-canvas).
 * Prefer `requestWebGPUDevice` + `createWebGPUContext` for multi-canvas apps.
 */
export async function initWebGPU(
	canvas: HTMLCanvasElement
): Promise<{ ok: true; value: WebGPUContext } | { ok: false; error: WebGPUError }> {
	const dev = await requestWebGPUDevice();
	if (!dev.ok) return dev;
	return createWebGPUContext(canvas, dev.value.device, dev.value.format);
}

/**
 * Create a GPU buffer with initial data
 */
export function createBuffer(
	device: GPUDevice,
	data: ArrayBuffer | ArrayBufferView,
	usage: GPUBufferUsageFlags
): GPUBuffer {
	const buffer = device.createBuffer({
		size: data.byteLength,
		usage,
		mappedAtCreation: true
	});

	const dst = new Uint8Array(buffer.getMappedRange());
	dst.set(new Uint8Array('buffer' in data ? data.buffer : data));
	buffer.unmap();

	return buffer;
}

/**
 * Create an empty GPU buffer of specified size
 */
export function createEmptyBuffer(
	device: GPUDevice,
	size: number,
	usage: GPUBufferUsageFlags
): GPUBuffer {
	return device.createBuffer({ size, usage });
}


