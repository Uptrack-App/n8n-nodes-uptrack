import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks the `X-Uptrack-Signature` header of an Uptrack webhook.
 *
 * Header format: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the signing secret>`.
 * Requests older (or newer) than `toleranceSec` are refused, which stops replays.
 * Spec: https://uptrack.app/guides/webhook-payloads
 */
export function verifyUptrackSignature(
	rawBody: Buffer | string,
	header: string | undefined,
	secret: string,
	nowMs: number = Date.now(),
	toleranceSec = 300,
): boolean {
	if (!header || !secret) return false;

	let timestamp = '';
	let signature = '';
	for (const part of header.split(',')) {
		const index = part.indexOf('=');
		if (index === -1) continue;
		const key = part.slice(0, index).trim();
		const value = part.slice(index + 1).trim();
		if (key === 't') timestamp = value;
		if (key === 'v1') signature = value;
	}

	const seconds = Number(timestamp);
	if (!timestamp || !Number.isFinite(seconds) || !signature) return false;
	if (Math.abs(nowMs / 1000 - seconds) > toleranceSec) return false;

	const expected = createHmac('sha256', secret)
		.update(`${timestamp}.`)
		.update(rawBody)
		.digest('hex');

	const expectedBuffer = Buffer.from(expected, 'utf8');
	const givenBuffer = Buffer.from(signature, 'utf8');
	if (expectedBuffer.length !== givenBuffer.length) return false;
	return timingSafeEqual(expectedBuffer, givenBuffer);
}
