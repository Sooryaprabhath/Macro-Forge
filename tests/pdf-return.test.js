import test from 'node:test';
import assert from 'node:assert/strict';
import { setupPdfDownloads } from '../src/pdf-downloads.js';

for (const confirmed of [false, true]) {
  test(`return popup ${confirmed ? 'shows success after verification' : 'does not trust a return URL as payment'}`, async (context) => {
    const elements = new Map();
    const element = id => {
      if (!elements.has(id)) elements.set(id, {
        hidden: false, textContent: '', disabled: false, open: false,
        addEventListener() {}, showModal() { this.open = true; },
      });
      return elements.get(id);
    };
    const originals = new Map();
    const replace = (name, value) => {
      originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, { configurable: true, value });
    };
    context.after(() => {
      for (const [name, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    });
    replace('document', { getElementById: element });
    replace('window', { location: { search: '?pdf_payment=return', pathname: '/', hash: '' } });
    replace('history', { replaceState() {} });
    replace('navigator', { userAgent: 'test', platform: 'test', maxTouchPoints: 0 });
    replace('localStorage', { getItem: () => JSON.stringify({
      raw: JSON.stringify({ result: { input: {}, calories: 2100 }, day: [] }), expires: Date.now() + 60000,
    }) });
    let requests = 0;
    replace('fetch', async (url) => {
      assert.equal(url, '/api/payment/status');
      requests++;
      return Response.json({ paid: confirmed, status: confirmed ? 'paid' : 'created' });
    });
    setupPdfDownloads(() => null);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests, 1);
    assert.equal(element('pdfPaymentDialog').open, true);
    assert.equal(element('downloadPaidPdf').hidden, !confirmed);
    if (confirmed) {
      assert.equal(element('pdfPaymentTitle').textContent, 'Payment successful');
      assert.match(element('pdfPaymentStatus').textContent, /₹9 payment is confirmed/);
    } else {
      assert.notEqual(element('pdfPaymentTitle').textContent, 'Payment successful');
      assert.match(element('pdfPaymentStatus').textContent, /Waiting for payment/);
    }
  });
}
