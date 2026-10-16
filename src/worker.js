import { handlePayment } from './server/payments.js';

export default {
  async fetch(request, env) {
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
