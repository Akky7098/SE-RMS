const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan } = require('./employeeUserPlan');
const employee = { _id: 'e1', employeeCode: 'SE1', biometricCode: '123', fullName: 'Example', status: 'ACTIVE', personalEmail: 'worker@gmail.com' };
const user = { _id: 'u1', email: 'worker@gmail.com', status: 'ACTIVE', role: 'ADMIN', systemRole: 'STANDARD_USER' };
const row = (employees = [employee], users = [], accesses = []) => buildPlan(employees, users, accesses).rows[0];
test('uses actual personal email and preserves biometric code', () => {
  assert.equal(row().action, 'CREATE');
  assert.equal(row().email, 'worker@gmail.com');
  assert.equal(row().biometricCode, '123');
});
test('existing linked administrator is preserved without role/password changes', () => {
  const linked = { ...employee, user: 'u1' };
  assert.equal(row([linked], [{ ...user, employee: 'e1' }]).action, 'PRESERVE');
  assert.equal(user.role, 'ADMIN');
});
test('an existing exact-email user can receive missing reciprocal links', () => {
  assert.equal(row([employee], [user]).action, 'LINK');
});
test('missing email, missing biometric and exited employees are skipped', () => {
  assert.equal(row([{ ...employee, personalEmail: null }]).reason, 'MISSING_EMAIL');
  assert.equal(row([{ ...employee, biometricCode: null }]).reason, 'MISSING_BIOMETRIC_CODE');
  assert.equal(row([{ ...employee, status: 'EXITED' }]).reason, 'EMPLOYEE_NOT_ACTIVE');
});
test('shared email and biometric collisions never provision', () => {
  assert.equal(row([employee, { ...employee, _id: 'e2', biometricCode: '999' }]).reason, 'EMAIL_SHARED_BY_EMPLOYEES');
  assert.equal(row([employee, { ...employee, _id: 'e2', personalEmail: 'other@gmail.com' }]).reason, 'DUPLICATE_BIOMETRIC_CODE');
});
test('dangling or conflicting links are not overwritten', () => {
  assert.equal(row([{ ...employee, user: 'missing' }]).reason, 'DANGLING_EMPLOYEE_USER');
  assert.equal(row([employee], [{ ...user, employee: 'e2' }]).reason, 'USER_LINKED_TO_ANOTHER_EMPLOYEE');
});
test('disabled users/access and multiple account matches are blocked', () => {
  assert.equal(row([employee], [{ ...user, status: 'SUSPENDED' }]).reason, 'EXISTING_USER_NOT_ACTIVE');
  assert.equal(row([employee], [], [{ employee: 'e1', status: 'DISABLED' }]).reason, 'ACCESS_DISABLED');
  assert.equal(row([employee], [user, { ...user, _id: 'u2' }]).reason, 'MULTIPLE_USER_MATCHES');
});
