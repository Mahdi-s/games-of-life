import { json, error, type RequestHandler } from '@sveltejs/kit';

type CreditsResponse = {
	data: {
		total_credits: number;
		total_usage: number;
	};
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	let apiKey = '';
	try {
		const body = (await request.json()) as { apiKey?: unknown };
		apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
	} catch {
		// ignore
	}

	if (!apiKey) {
		throw error(400, 'Missing apiKey');
	}

	const res = await fetch('https://openrouter.ai/api/v1/credits', {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'HTTP-Referer': 'http://localhost',
			'X-Title': 'games-of-life-nlca'
		}
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw error(res.status, text || `OpenRouter credits failed (${res.status})`);
	}

	const data = (await res.json()) as CreditsResponse;
	const total_credits = Number(data?.data?.total_credits ?? NaN);
	const total_usage = Number(data?.data?.total_usage ?? NaN);
	if (!Number.isFinite(total_credits) || !Number.isFinite(total_usage)) {
		throw error(502, 'OpenRouter credits returned unexpected shape');
	}

	return json({
		total_credits,
		total_usage
	});
};

