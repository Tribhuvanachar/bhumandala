// payment-providers.js -- pluggable payment gateways, mirroring the same
// shape lib/providers.js already uses for OTP delivery: donation-core.js,
// payment-state.js and index.js's orchestration do not know or care which
// gateway is behind a donation. Adding a real one (Cashfree, Razorpay,
// Stripe, ...) later means adding one entry here against ITS current,
// verified API -- never touching the validation, state machine, receipt
// or Firestore code, all of which are already built and tested against
// the `mock` gateway below.
//
// IMPORTANT: no real gateway is wired in yet -- that decision (which
// gateway, sandbox vs. production credentials, the exact webhook
// signature scheme) is the project lead's to make, and any integration
// must be built against that gateway's OWN current documentation at the
// time, not from a half-remembered API shape. See ../../../PAYMENTS_SETUP.md.
//
// `mock` exists purely so the rest of the pipeline (createDonation ->
// webhook -> state machine -> receipt -> public_supporters) can be built
// and tested for real right now, the same way providers.js's `console`
// OTP channel exists to test sign-in without a real WhatsApp/SMS
// account. It is refused outside an emulator for the identical reason:
// a dev convenience that could reach production would mean donations
// silently succeeding without a rupee ever moving.
'use strict';

const crypto = require('crypto');

/**
 * Each gateway exposes:
 *   createOrder({ donationReference, amountMinor, currency, customer,
 *                 returnUrl, config }) -> Promise<{ok, gatewayOrderId,
 *                 checkout, message?}>
 *     `checkout` is whatever minimal, non-secret payload the BROWSER
 *     needs to continue (a session id, a redirect URL, ...) -- never the
 *     gateway's own API credentials.
 *   verifyWebhookSignature(rawBody, headers, secret) -> boolean
 *   parseWebhookEvent(rawBody, headers) -> {
 *     eventId, eventType, gatewayOrderId, gatewayPaymentId,
 *     status,           // one of payment-state.js's ALL_STATUSES, already normalized
 *     amountMinor, currency, paymentMethod
 *   } | null
 */
const gateways = {
  /**
   * Dev/test-only gateway. `createOrder` never calls out to anything --
   * it deterministically fabricates a gateway order id from the
   * donation reference, so a test can predict it. The webhook shape
   * below is OUR OWN fixture format, not any real gateway's; it exists
   * only to exercise index.js's webhook handler and the state machine
   * end to end.
   */
  mock: {
    id: 'mock',
    async createOrder({ donationReference, amountMinor, currency }) {
      const gatewayOrderId = `mock_order_${donationReference}`;
      return {
        ok: true,
        gatewayOrderId,
        checkout: {
          gateway: 'mock',
          // A real gateway hands the browser a session id / redirect URL
          // here; the mock hands back enough for a test harness to
          // simulate the browser side without a real checkout page.
          sessionId: `mock_session_${donationReference}`,
          amountMinor,
          currency
        }
      };
    },

    /**
     * HMAC-SHA256 over the raw body, same construction as the WhatsApp
     * webhook (lib/whatsapp.js) -- a real gateway's own scheme must be
     * implemented against ITS current documentation when chosen; do not
     * assume this shape carries over.
     */
    verifyWebhookSignature(rawBody, headers, secret) {
      if (!rawBody || !secret) return false;
      const header = headers && (headers['x-mock-signature'] || headers['X-Mock-Signature']);
      if (typeof header !== 'string' || !header) return false;
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(header, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    },

    parseWebhookEvent(rawBody) {
      let body;
      try { body = JSON.parse(rawBody.toString('utf8')); } catch (e) { return null; }
      if (!body || typeof body !== 'object') return null;
      const statusMap = {
        SUCCESS: 'SUCCESS',
        FAILED: 'FAILED',
        CANCELLED: 'CANCELLED',
        REFUNDED: 'REFUNDED',
        PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
        PENDING: 'PENDING'
      };
      const status = statusMap[body.status];
      if (!body.eventId || !status) return null;
      return {
        eventId: String(body.eventId),
        eventType: String(body.eventType || `payment.${status.toLowerCase()}`),
        gatewayOrderId: body.orderId ? String(body.orderId) : null,
        gatewayPaymentId: body.paymentId ? String(body.paymentId) : null,
        status,
        amountMinor: Number.isInteger(body.amountMinor) ? body.amountMinor : null,
        currency: typeof body.currency === 'string' ? body.currency : null,
        paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null
      };
    }
  }

  // 'cashfree', 'razorpay', etc. go here once a gateway is chosen --
  // each is a self-contained entry with the same four members as
  // `mock` above, built against that gateway's current API docs.
};

function getGateway(id) {
  const g = gateways[id];
  if (!g) {
    throw new Error(`Unknown payment gateway "${id}". Known gateways: ${Object.keys(gateways).join(', ')}`);
  }
  return g;
}

/**
 * Refuses the `mock` gateway outside an emulator -- called on every
 * order creation and every webhook, not just at startup, so a config
 * change at runtime cannot quietly make it the production gateway.
 * Mirrors providers.js's assertProviderAllowed exactly.
 */
function assertGatewayAllowed(id, env = process.env) {
  if (id !== 'mock') return;
  const inEmulator = !!(env.FUNCTIONS_EMULATOR === 'true' || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST);
  if (!inEmulator) {
    throw new Error('The "mock" payment gateway is emulator-only and must never be used in a deployed environment.');
  }
}

module.exports = { gateways, getGateway, assertGatewayAllowed };
