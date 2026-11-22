import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';
import { databaseHealth } from '../src/db.js';

test('health reports a successful database probe without authentication', async (t) => {
  const probe = t.mock.method(databaseHealth, 'check', async () => {});
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(probe.mock.callCount(), 1);
  assert.deepEqual(response.body, { ok: true, status: 'ok', api: 'running', live: true, database: 'connected' });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.ok(response.headers['x-request-id']);
});

test('liveness stays up when database readiness fails', async (t) => {
  t.mock.method(databaseHealth, 'check', async () => { throw Object.assign(new Error('offline'), { code: 'P1001' }); });
  const health = await request(app).get('/health');
  assert.equal(health.status, 503);
  assert.deepEqual(health.body, { ok: false, status: 'degraded', api: 'running', live: true, database: 'disconnected' });
  const live = await request(app).get('/live');
  assert.equal(live.status, 200);
  assert.deepEqual(live.body, { ok: true, status: 'ok', api: 'running', live: true });
});

test('store API requires authentication', async () => {
  const response = await request(app).get('/stores');
  assert.equal(response.status, 401);
});
