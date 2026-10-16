import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePayment, digest } from '../src/server/payments.js';
import { createBasicPdf } from '../src/basic-pdf.js';
import { createPlanPdf } from '../src/pdf.js';
import { calculate } from '../src/calc.js';
import { buildSampleDay } from '../src/foods.js';

const env = { RAZORPAY_KEY_ID: 'test-id', RAZORPAY_KEY_SECRET: 'test-only-secret' };
const origin = 'https://macroforge.example';
const raw = JSON.stringify({ result: { input: {}, calories: 2100 }, day: [] });
function request(path, body = '{}', cookie = '', from = origin) {
  return new Request(`${origin}${path}`, { method: 'POST', headers: { Origin: from, Cookie: cookie, 'Content-Type': 'application/json' }, body });
}
async function fixture() {
  const hash = await digest(raw);
  const link = { id: 'plink_Test123', short_url: 'https://rzp.io/rzp/example', amount: 900, amount_paid: 0, currency: 'INR', status: 'created', expire_by: Math.floor(Date.now() / 1000) + 3600, notes: { plan_digest: hash } };
  const calls = [];
  let renders = 0;
  const dependencies = {
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return Response.json(link);
    },
    render: async () => { renders++; return { output: () => new TextEncoder().encode('%PDF-test').buffer }; },
  };
  const start = await handlePayment(request('/api/payment/start', JSON.stringify({ digest: hash })), env, dependencies);
  assert.equal(start.status, 200);
  const cookie = start.headers.get('set-cookie').split(';')[0];
  return { link, calls, dependencies, cookie, renders: () => renders };
}

test('checkout charges exactly INR 9 without sending plan data to Razorpay', async () => {
  const { calls, cookie } = await fixture();
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.amount, 900);
  assert.equal(payload.currency, 'INR');
  assert.equal(payload.accept_partial, false);
  assert.equal(payload.customer, undefined);
  assert.equal(payload.result, undefined);
  assert.equal(Object.keys(payload.notes).join(), 'plan_digest');
  assert.match(cookie, /^macroforge_pdf=/);
});

test('missing configuration and cross-origin requests cannot start payments', async () => {
  const dependencies = { fetcher: () => assert.fail('must not call Razorpay') };
  assert.equal((await handlePayment(request('/api/payment/start'), {}, dependencies)).status, 503);
  assert.equal((await handlePayment(request('/api/payment/start', '{}', '', 'https://evil.example'), env, dependencies)).status, 403);
});

test('unpaid, partial, cancelled, expired, wrong currency, amount or plan stay locked', async () => {
  for (const change of [
    { status: 'created' }, { status: 'partially_paid', amount_paid: 100 },
    { status: 'cancelled' }, { status: 'expired' }, { currency: 'USD' },
    { amount: 100 }, { amount_paid: 100 }, { notes: { plan_digest: 'wrong' } }, { id: 'plink_Other' },
  ]) {
    const f = await fixture();
    Object.assign(f.link, { status: 'paid', amount_paid: 900 }, change);
    const response = await handlePayment(request('/api/pdf', raw, f.cookie), env, f.dependencies);
    assert.equal(response.status, 402, JSON.stringify(change));
    assert.equal(f.renders(), 0);
  }
});

test('paid plan downloads and can be retried without creating another payment', async () => {
  const f = await fixture();
  Object.assign(f.link, { status: 'paid', amount_paid: 900 });
  for (let retry = 0; retry < 2; retry++) {
    const response = await handlePayment(request('/api/pdf', raw, f.cookie), env, f.dependencies);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), '%PDF-test');
  }
  assert.equal(f.calls.filter((call) => call.options.method === 'POST').length, 1);
});

test('forged receipts and changed snapshots never invoke the PDF renderer', async () => {
  const f = await fixture();
  Object.assign(f.link, { status: 'paid', amount_paid: 900 });
  assert.equal((await handlePayment(request('/api/pdf', raw), env, f.dependencies)).status, 401);
  assert.equal((await handlePayment(request('/api/pdf', raw, f.cookie + 'a'), env, f.dependencies)).status, 401);
  assert.equal((await handlePayment(request('/api/pdf', raw.replace('2100', '2500'), f.cookie), env, f.dependencies)).status, 409);
  assert.equal(f.renders(), 0);
});

test('reopening checkout reuses an existing pending or paid link', async () => {
  const f = await fixture();
  const hash = await digest(raw);
  const start = () => handlePayment(request('/api/payment/start', JSON.stringify({ digest: hash }), f.cookie), env, f.dependencies);
  assert.equal((await (await start()).json()).url, f.link.short_url);
  Object.assign(f.link, { status: 'paid', amount_paid: 900 });
  assert.equal((await (await start()).json()).paid, true);
  assert.equal(f.calls.filter((call) => call.options.method === 'POST').length, 1);
});

test('basic PDF contains calories and excludes full plan content', () => {
  const pdf = createBasicPdf({ calories: 2100, protein: 123, carbs: 222, fat: 55 });
  const content = pdf.internal.pages.flat().join('\n');
  assert.equal(pdf.getNumberOfPages(), 1);
  assert.match(content, /2,100/);
  assert.doesNotMatch(content, /Protein|Shopping|Training|123 g|222 g|55 g/i);
});

test('verified request renders the complete report as PDF bytes', async () => {
  const f = await fixture();
  const result = calculate({ sex: 'male', age: 25, weight: 75, height: 175, bodyFat: NaN, activity: 1.55, days: 4, style: 'strength', goal: 'maintain', pace: 'moderate', target: NaN, diet: 'omnivore', meals: 4, carbStyle: 'balanced', region: 'global' });
  const snapshot = JSON.stringify({ result, day: buildSampleDay(result, 1) });
  const hash = await digest(snapshot);
  // Start a fresh signed receipt for the real generated snapshot.
  f.link.status = 'created';
  f.link.notes.plan_digest = hash;
  const start = await handlePayment(request('/api/payment/start', JSON.stringify({ digest: hash })), env, f.dependencies);
  const cookie = start.headers.get('set-cookie').split(';')[0];
  Object.assign(f.link, { status: 'paid', amount_paid: 900 });
  const response = await handlePayment(request('/api/pdf', snapshot, cookie), env, { ...f.dependencies, render: createPlanPdf });
  assert.equal(response.status, 200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.ok(bytes.length > 10_000);
});
