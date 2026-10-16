import { handlePayment } from './server/payments.js';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/payment/return') {
      // Strip Razorpay's query parameters. The browser must fetch the actual
      // payment status with its signed checkout cookie before showing success.
      return new Response(null, { status: 303, headers: {
        Location: '/?pdf_payment=return', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      } });
    }
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return handlePayment(request, env, {
        render: async (result, day) => {
          const { createPlanPdf } = await import('./pdf.js');
          return createPlanPdf(result, day);
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
