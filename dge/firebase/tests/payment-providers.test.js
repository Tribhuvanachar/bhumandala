// Tests for payment-providers.js — the `mock` gateway adapter (the only
// one that exists until a real gateway is chosen; see PAYMENTS_SETUP.md).
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const pp = require('../functions/lib/payment-providers');

describe('assertGatewayAllowed', () => {
  test('refuses "mock" outside an emulator', () => {
    assert.throws(() => pp.assertGatewayAllowed('mock', {}), /emulator-only/);
  });
  test('allows "mock" when an emulator env var is set', () => {
    assert.doesNotThrow(() => pp.assertGatewayAllowed('mock', { FUNCTIONS_EMULATOR: 'true' }));
    assert.doesNotThrow(() => pp.assertGatewayAllowed('mock', { FIRESTORE_EMULATOR_HOST: 'localhost:8080' }));
  });
  test('any other gateway id is a no-op regardless of environment', () => {
    assert.doesNotThrow(() => pp.assertGatewayAllowed('cashfree', {}));
  });
});

describe('getGateway', () => {
  test('returns the mock gateway', () => {
    assert.equal(pp.getGateway('mock').id, 'mock');
  });
  test('throws on an unknown gateway id', () => {
    assert.throws(() => pp.getGateway('nope'), /Unknown payment gateway/);
  });
});

describe('mock gateway: createOrder', () => {
  test('returns a deterministic order id from the donation reference', async () => {
    const g = pp.getGateway('mock');
    const r = await g.createOrder({ donationReference: 'DGE-20260908-ABCDEF', amountMinor: 100100, currency: 'INR' });
    assert.equal(r.ok, true);
    assert.equal(r.gatewayOrderId, 'mock_order_DGE-20260908-ABCDEF');
    assert.equal(r.checkout.amountMinor, 100100);
    // The checkout payload handed to the browser must never carry a secret.
    assert.ok(!('secret' in r.checkout));
    assert.ok(!JSON.stringify(r.checkout).toLowerCase().includes('secret'));
  });
});

describe('mock gateway: webhook signature + parsing', () => {
  const SECRET = 'test-webhook-secret';
  function sign(rawBody) {
    return crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  }

  test('verifies a correctly signed body', () => {
    const g = pp.getGateway('mock');
    const body = Buffer.from(JSON.stringify({ eventId: 'evt_1', status: 'SUCCESS' }));
    const ok = g.verifyWebhookSignature(body, { 'x-mock-signature': sign(body) }, SECRET);
    assert.equal(ok, true);
  });

  test('rejects a tampered body against an untouched signature', () => {
    const g = pp.getGateway('mock');
    const original = Buffer.from(JSON.stringify({ eventId: 'evt_1', status: 'SUCCESS', amountMinor: 100 }));
    const signature = sign(original);
    const tampered = Buffer.from(JSON.stringify({ eventId: 'evt_1', status: 'SUCCESS', amountMinor: 999999 }));
    assert.equal(g.verifyWebhookSignature(tampered, { 'x-mock-signature': signature }, SECRET), false);
  });

  test('rejects a missing or malformed signature header', () => {
    const g = pp.getGateway('mock');
    const body = Buffer.from(JSON.stringify({ eventId: 'evt_1', status: 'SUCCESS' }));
    assert.equal(g.verifyWebhookSignature(body, {}, SECRET), false);
    assert.equal(g.verifyWebhookSignature(body, { 'x-mock-signature': 'not-hex-of-the-right-length' }, SECRET), false);
  });

  test('rejects the correct signature computed with the WRONG secret', () => {
    const g = pp.getGateway('mock');
    const body = Buffer.from(JSON.stringify({ eventId: 'evt_1', status: 'SUCCESS' }));
    const wrongSig = crypto.createHmac('sha256', 'a-different-secret').update(body).digest('hex');
    assert.equal(g.verifyWebhookSignature(body, { 'x-mock-signature': wrongSig }, SECRET), false);
  });

  test('parses a well-formed event and normalizes its status', () => {
    const g = pp.getGateway('mock');
    const body = Buffer.from(JSON.stringify({
      eventId: 'evt_42', eventType: 'payment.success', orderId: 'mock_order_X', paymentId: 'pay_1',
      status: 'SUCCESS', amountMinor: 100100, currency: 'INR', paymentMethod: 'upi'
    }));
    const evt = g.parseWebhookEvent(body);
    assert.equal(evt.eventId, 'evt_42');
    assert.equal(evt.status, 'SUCCESS');
    assert.equal(evt.gatewayOrderId, 'mock_order_X');
    assert.equal(evt.amountMinor, 100100);
  });

  test('returns null for unparseable JSON', () => {
    const g = pp.getGateway('mock');
    assert.equal(g.parseWebhookEvent(Buffer.from('not json')), null);
  });

  test('returns null when eventId or status is missing/unrecognized', () => {
    const g = pp.getGateway('mock');
    assert.equal(g.parseWebhookEvent(Buffer.from(JSON.stringify({ status: 'SUCCESS' }))), null); // no eventId
    assert.equal(g.parseWebhookEvent(Buffer.from(JSON.stringify({ eventId: 'e1', status: 'MADE_UP' }))), null);
  });
});
