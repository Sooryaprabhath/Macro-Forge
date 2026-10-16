export function setupPdfDownloads(getSnapshot) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('pdfPaymentDialog');
  const status = $('pdfPaymentStatus');
  let snapshot = null, raw = '', checkoutUrl = '', poll = null, checking = false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const api = async (path, body) => {
    const response = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: body || '{}', signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Could not connect. Please retry without paying again.');
    }
    return response;
  };
  const saveBlob = (blob, name, pdfWindow) => {
    const url = URL.createObjectURL(blob);
    if (isIOS) {
      if (pdfWindow) pdfWindow.location.href = url;
      else window.location.assign(url);
      $('exportStatus').textContent = 'Your PDF is opening. Use Share → Save to Files to keep a copy.';
    } else {
      const link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.append(link); link.click(); link.remove();
      $('exportStatus').textContent = 'Your PDF download has started.';
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const basic = async (event) => {
    const current = getSnapshot();
    if (!current) return;
    const button = event.currentTarget;
    const pdfWindow = isIOS ? window.open('about:blank', '_blank') : null;
    button.disabled = true;
    try {
      const { createBasicPdf } = await import('./basic-pdf.js');
      saveBlob(createBasicPdf(current.result).output('blob'), 'MacroForge-daily-calories.pdf', pdfWindow);
      if (dialog.open) dialog.close();
    } catch {
      pdfWindow?.close();
      $('exportStatus').textContent = 'Could not create your basic PDF. Please try again.';
    } finally { button.disabled = false; }
  };
  $('basicPrintBtn').addEventListener('click', basic);
  $('dialogBasicPdf').addEventListener('click', basic);

  const stopPolling = () => { clearTimeout(poll); poll = null; };
  dialog.addEventListener('close', stopPolling);
  $('closePdfPayment').addEventListener('click', () => dialog.close());
  const paid = () => {
    stopPolling();
    $('payPdfBtn').hidden = true;
    $('pdfCheckoutLink').hidden = true;
    $('verifyPdfPayment').hidden = true;
    $('downloadPaidPdf').hidden = false;
    status.textContent = 'Payment confirmed. Your full PDF is ready to download.';
  };
  const check = async () => {
    if (checking || !dialog.open) return;
    checking = true;
    $('verifyPdfPayment').disabled = true;
    try {
      const data = await (await api('/api/payment/status')).json();
      if (data.paid) { paid(); return true; }
      status.textContent = ['expired', 'cancelled'].includes(data.status)
        ? 'This checkout has expired or been cancelled. Start a new checkout to continue.'
        : 'Waiting for payment confirmation. Complete payment in Razorpay, then check again.';
      if (['expired', 'cancelled'].includes(data.status)) stopPolling();
    } catch (error) { status.textContent = error.message; }
    finally { checking = false; $('verifyPdfPayment').disabled = false; }
    return false;
  };
  $('verifyPdfPayment').addEventListener('click', check);
  $('printBtn').addEventListener('click', () => {
    const current = getSnapshot();
    if (!current) return;
    // Freeze exactly the plan being purchased, even if UI state later changes.
    raw = JSON.stringify(current);
    snapshot = JSON.parse(raw);
    checkoutUrl = '';
    stopPolling();
    $('payPdfBtn').hidden = false;
    $('payPdfBtn').disabled = false;
    $('pdfCheckoutLink').hidden = true;
    $('verifyPdfPayment').hidden = true;
    $('downloadPaidPdf').hidden = true;
    status.textContent = '';
    dialog.showModal();
  });
  $('payPdfBtn').addEventListener('click', async () => {
    if (!snapshot) return;
    const button = $('payPdfBtn');
    // Reserve the window during the tap so mobile browsers allow it.
    const checkout = window.open('about:blank', '_blank');
    if (checkout) checkout.opener = null;
    button.disabled = true;
    status.textContent = 'Preparing secure ₹9 checkout…';
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const digest = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const data = await (await api('/api/payment/start', JSON.stringify({ digest }))).json();
      if (data.paid) { checkout?.close(); paid(); return; }
      checkoutUrl = data.url;
      if (!/^https:\/\/rzp\.io\//.test(checkoutUrl)) throw new Error('Invalid checkout address. Please try again.');
      $('pdfCheckoutLink').href = checkoutUrl;
      $('pdfCheckoutLink').hidden = false;
      $('verifyPdfPayment').hidden = false;
      if (checkout) checkout.location.href = checkoutUrl;
      status.textContent = checkout
        ? 'Complete payment in the Razorpay window, then return here. We’ll check for confirmation.'
        : 'Use “Open payment window” to pay, then return here and check payment.';
      stopPolling();
      const deadline = Date.now() + 5 * 60_000;
      const tick = async () => {
        if (!dialog.open || Date.now() > deadline) return;
        if (await check()) return;
        if (dialog.open && !$('downloadPaidPdf').hidden) return;
        if (dialog.open) poll = setTimeout(tick, 10_000);
      };
      if (dialog.open) poll = setTimeout(tick, 10_000);
    } catch (error) {
      checkout?.close(); status.textContent = error.message;
    } finally { button.disabled = false; }
  });
  $('downloadPaidPdf').addEventListener('click', async () => {
    const button = $('downloadPaidPdf');
    const pdfWindow = isIOS ? window.open('about:blank', '_blank') : null;
    button.disabled = true;
    status.textContent = 'Verifying payment and preparing your complete PDF…';
    try {
      const response = await api('/api/pdf', raw);
      saveBlob(await response.blob(), 'MacroForge-full-plan.pdf', pdfWindow);
      status.textContent = 'Your full PDF download has started. Keep it somewhere safe.';
    } catch (error) {
      pdfWindow?.close(); status.textContent = error.message;
    } finally { button.disabled = false; }
  });
}
