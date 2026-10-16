const encoder = new TextEncoder();
const COOKIE = 'macroforge_pdf';
const PRICE = 900; // INR paise, fixed server-side.
const MAX_BODY = 150_000;
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const fail = (message, status) => { throw Object.assign(new Error(message), { status }); };

export async function digest(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(value, secret) {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value)));
}
async function readSession(request, secret) {
  try {
    const token = request.headers.get('Cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!/^[a-f0-9]{64}$/.test(signature)) return null;
    const bytes = Uint8Array.from(signature.match(/../g), (b) => parseInt(b, 16));
    if (!await crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(payload))) return null;
    const session = JSON.parse(atob(payload));
    return session.expires > Date.now() && /^plink_[a-zA-Z0-9]+$/.test(session.id) && /^[a-f0-9]{64}$/.test(session.digest) ? session : null;
  } catch { return null; }
}
async function cookie(session, secret, request) {
  const payload = btoa(JSON.stringify(session));
  return `${COOKIE}=${payload}.${await sign(payload, secret)}; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=86400${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function bodyText(request) {
  const reader = request.body?.getReader();
  if (!reader) fail('Missing request data.', 400);
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); fail('Plan is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
function parse(text) {
  try { return JSON.parse(text); } catch { fail('Invalid request data.', 400); }
}
export function isPaid(link, session) {
  return link.id === session.id && link.status === 'paid' && link.amount === PRICE
    && link.amount_paid === PRICE && link.currency === 'INR'
    && link.notes?.plan_digest === session.digest;
}

export async function handlePayment(request, env, { fetcher = fetch, render } = {}) {
  try {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
    if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: 'Full PDF checkout is not available yet. Please use the free basic PDF for now.' }, 503);
    const path = new URL(request.url).pathname;
    if (!['/api/payment/start', '/api/payment/status', '/api/pdf'].includes(path)) return json({ error: 'Not found.' }, 404);
    const api = async (path, options = {}) => {
      const response = await fetcher(`https://api.razorpay.com/v1/payment_links${path}`, {
        ...options,
        headers: { Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) fail('Payment service is unavailable. Please try again; do not pay twice.', 502);
      return response.json();
    };
    const session = await readSession(request, env.RAZORPAY_KEY_SECRET);
    if (path === '/api/payment/start') {
      const data = parse(await bodyText(request));
      if (!/^[a-f0-9]{64}$/.test(data?.digest)) fail('Invalid plan reference.', 400);
      if (session) {
        const existing = await api(`/${session.id}`);
        // Preserve an unpaid checkout even if the user changed their plan. This
        // avoids orphaning a pending payment or accidentally asking them to pay twice.
        if (existing.status === 'created' && existing.expire_by * 1000 > Date.now()) {
          if (session.digest !== data.digest) fail('A checkout is pending for your previous plan. Return to that plan or finish/cancel that checkout before starting another.', 409);
          return json({ url: existing.short_url, paid: false });
        }
        if (session.digest === data.digest && isPaid(existing, session)) return json({ paid: true });
      }
      const link = await api('', { method: 'POST', body: JSON.stringify({
        amount: PRICE, currency: 'INR', accept_partial: false,
        description: 'MacroForge full plan PDF',
        reference_id: crypto.randomUUID(), expire_by: Math.floor(Date.now() / 1000) + 3600,
        notify: { sms: false, email: false }, reminder_enable: false,
        notes: { plan_digest: data.digest },
      }) });
      if (!/^plink_[a-zA-Z0-9]+$/.test(link.id) || !/^https:\/\/rzp\.io\//.test(link.short_url)) fail('Could not create checkout. Please try again.', 502);
      const receipt = { id: link.id, digest: data.digest, expires: Date.now() + 86400_000 };
      return json({ url: link.short_url, paid: false }, 200, { 'Set-Cookie': await cookie(receipt, env.RAZORPAY_KEY_SECRET, request) });
    }
    if (!session) fail('No checkout found in this browser. Start checkout before downloading.', 401);
    const link = await api(`/${session.id}`);
    const paid = isPaid(link, session);
    if (path === '/api/payment/status') return json({ paid, status: link.status });
    if (!paid) fail('Payment has not been confirmed. The full PDF stays locked until payment succeeds.', 402);
    const raw = await bodyText(request);
    if (await digest(raw) !== session.digest) fail('Your plan changed after checkout. Restore the paid plan to download it.', 409);
    const snapshot = parse(raw);
    if (!snapshot?.result?.input || !Number.isFinite(snapshot.result.calories) || !Array.isArray(snapshot.day) || snapshot.day.length > 10) fail('Invalid plan data.', 400);
    const doc = await render(snapshot.result, snapshot.day);
    return new Response(doc.output('arraybuffer'), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="MacroForge-full-plan.pdf"',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    // Never log the request body: it contains personal plan data.
    return json({ error: error.status ? error.message : 'Could not complete the request. Please retry without paying again.' }, error.status || 500);
  }
}
