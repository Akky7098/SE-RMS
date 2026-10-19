const crypto = require('crypto');
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const id = value => value == null ? '' : String(value._id || value);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const emailsOf = employee => [...new Set([employee.officialEmail, employee.personalEmail].map(normalizeEmail).filter(Boolean))];

function buildPlan(employees, users, accesses = []) {
  const byUserId = new Map(users.map(user => [id(user), user]));
  const rows = employees.map(employee => {
    const result = {
      employeeId: id(employee), employeeCode: employee.employeeCode,
      biometricCode: employee.biometricCode || null,
      email: normalizeEmail(employee.officialEmail || employee.personalEmail),
      action: 'SKIP', reason: ''
    };
    const skip = reason => ({ ...result, reason });
    if (employee.status !== 'ACTIVE') return skip('EMPLOYEE_NOT_ACTIVE');
    const knownEmails = emailsOf(employee);
    if (!knownEmails.length) return skip('MISSING_EMAIL');
    if (!knownEmails.every(validEmail)) return skip('INVALID_EMAIL');
    if (employees.some(other => id(other) !== id(employee) && emailsOf(other).some(email => knownEmails.includes(email)))) return skip('EMAIL_SHARED_BY_EMPLOYEES');
    if (!employee.biometricCode) return skip('MISSING_BIOMETRIC_CODE');
    if (employees.some(other => id(other) !== id(employee) && String(other.biometricCode || '').trim() === String(employee.biometricCode).trim())) return skip('DUPLICATE_BIOMETRIC_CODE');
    if (employee.user && !byUserId.has(id(employee.user))) return skip('DANGLING_EMPLOYEE_USER');
    const matching = users.filter(user => id(user) === id(employee.user) || id(user.employee) === id(employee) || knownEmails.includes(normalizeEmail(user.email)));
    if (matching.length > 1) return skip('MULTIPLE_USER_MATCHES');
    const user = matching[0];
    if (user) {
      result.userId = id(user);
      result.email = user.email;
      if (!knownEmails.includes(normalizeEmail(user.email))) return skip('EXISTING_USER_EMAIL_MISMATCH');
      if (id(user.employee) && id(user.employee) !== id(employee)) return skip('USER_LINKED_TO_ANOTHER_EMPLOYEE');
      if (employees.some(other => id(other) !== id(employee) && id(other.user) === id(user))) return skip('USER_SHARED_BY_EMPLOYEES');
      if (user.status !== 'ACTIVE') return skip('EXISTING_USER_NOT_ACTIVE');
    }
    const access = accesses.find(item => id(item.employee) === id(employee));
    if (access?.status === 'DISABLED') return skip('ACCESS_DISABLED');
    if (access?.user && id(access.user) !== id(user)) return skip('ACCESS_USER_CONFLICT');
    if (user && accesses.some(item => id(item.employee) !== id(employee) && id(item.user) === id(user))) return skip('ACCESS_SHARED_USER');
    result.action = user ? id(employee.user) === id(user) && id(user.employee) === id(employee) ? 'PRESERVE' : 'LINK' : 'CREATE';
    return result;
  });
  rows.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ employees, users, accesses })).digest('hex');
  const summary = { employees: employees.length, users: users.length, actions: {}, skipped: {} };
  for (const row of rows) {
    summary.actions[row.action] = (summary.actions[row.action] || 0) + 1;
    if (row.reason) summary.skipped[row.reason] = (summary.skipped[row.reason] || 0) + 1;
  }
  return { fingerprint, summary, rows };
}
module.exports = { buildPlan, normalizeEmail, id };
