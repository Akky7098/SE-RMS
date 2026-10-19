const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findRegisteredGoogleAccount } = require('./googleAccount');
const payload = { sub: 'google-subject', email_verified: true, email: 'Person@gmail.com' };
test('registered Gmail accounts are allowed with normalized exact email', async () => {
  const user = { status: 'ACTIVE' };
  assert.equal(await findRegisteredGoogleAccount(payload, { findOne: async query => {
    assert.deepEqual(query, { email: 'person@gmail.com' });
    return user;
  } }), user);
});
test('registered company and other domains follow the same account check', async () => {
  for (const email of ['worker@sandeepedgetech.com', 'worker@another-company.com']) {
    const user = { status: 'ACTIVE', googleId: payload.sub };
    assert.equal(await findRegisteredGoogleAccount({ ...payload, email }, { findOne: async () => user }), user);
  }
});
test('unknown Gmail cannot create or receive an ERP account', async () => {
  await assert.rejects(findRegisteredGoogleAccount(payload, { findOne: async () => null, create: () => assert.fail('Must never auto-provision') }), /not registered/);
});
test('unverified email is rejected before account lookup', async () => {
  await assert.rejects(findRegisteredGoogleAccount({ ...payload, email_verified: false }, { findOne: () => assert.fail('Not verified') }), /not verified/);
});
test('inactive users and mismatched Google subjects are rejected', async () => {
  await assert.rejects(findRegisteredGoogleAccount(payload, { findOne: async () => ({ status: 'INACTIVE' }) }), /not active/);
  await assert.rejects(findRegisteredGoogleAccount(payload, { findOne: async () => ({ status: 'ACTIVE', googleId: 'another-subject' }) }), /another Google account/);
});
test('missing Google identity and invalid email are rejected', async () => {
  await assert.rejects(findRegisteredGoogleAccount({ ...payload, sub: '' }, {}), /Invalid Google account/);
  await assert.rejects(findRegisteredGoogleAccount({ ...payload, email: 'invalid' }, {}), /valid email/);
});
