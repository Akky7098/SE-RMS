/* Default is read-only. Apply requires an unchanged reviewed plan and a password
 * supplied through the environment (never a command argument or report field). */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { User } = require('../user/user.model');
const { Employee } = require('../employee/employee.model');
const { buildPlan, id } = require('./employeeUserPlan');

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const reportPath = option('--report');
if (!args.includes('--report') || !reportPath) throw Error('--report is required');
const writeReport = value => fs.writeFileSync(reportPath, JSON.stringify(value, null, 2), { mode: 0o600 });
async function snapshot(session) {
  const opts = session ? { session } : {};
  const employees = await Employee.collection.find({}, { ...opts, projection: { _id: 1, employeeCode: 1, biometricCode: 1, officialEmail: 1, personalEmail: 1, user: 1, status: 1, fullName: 1 } }).sort({ _id: 1 }).toArray();
  const users = await User.collection.find({}, { ...opts, projection: { _id: 1, email: 1, employee: 1, role: 1, systemRole: 1, status: 1 } }).sort({ _id: 1 }).toArray();
  const accesses = await mongoose.connection.collection('employeeaccesses').find({}, { ...opts, projection: { _id: 1, employee: 1, user: 1, status: 1 } }).sort({ _id: 1 }).toArray();
  return { employees, users, accesses };
}
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const before = await snapshot();
  const plan = buildPlan(before.employees, before.users, before.accesses);
  if (!args.includes('--apply')) {
    writeReport({ mode: 'DRY_RUN', createdAt: new Date().toISOString(), ...plan });
    console.log(JSON.stringify(plan.summary));
    return;
  }
  if (!args.includes('--expected-plan')) throw Error('--expected-plan is required');
  const reviewed = JSON.parse(fs.readFileSync(option('--expected-plan'), 'utf8'));
  if (reviewed.fingerprint !== plan.fingerprint) throw Error('Database changed since dry run. Create and review a fresh plan.');
  const initialPassword = process.env.EMPLOYEE_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.length < 8) throw Error('EMPLOYEE_INITIAL_PASSWORD must contain at least 8 characters');
  const creating = plan.rows.filter(row => row.action === 'CREATE');
  // This explicitly requested initial password is an exception only for this
  // migration. Normal password creation/change rules are not weakened.
  const hashes = new Map();
  for (const row of creating) hashes.set(row.employeeId, await bcrypt.hash(initialPassword, 12));
  const result = { mode: 'APPLY', startedAt: new Date().toISOString(), summary: plan.summary, before, changes: [] };
  writeReport(result);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await snapshot(session);
      if (buildPlan(current.employees, current.users, current.accesses).fingerprint !== plan.fingerprint) throw Error('Database changed while preparing passwords. No changes applied.');
      result.changes = [];
      for (const row of plan.rows.filter(item => ['CREATE', 'LINK'].includes(item.action))) {
        const employee = before.employees.find(item => id(item) === row.employeeId);
        let userId = row.userId;
        if (row.action === 'CREATE') {
          const users = await User.create([{
            displayName: employee.fullName.slice(0, 100), email: row.email,
            role: 'EMPLOYEE', systemRole: 'STANDARD_USER', status: 'ACTIVE',
            authProviders: ['local', 'google'], emailVerified: false,
            employee: employee._id, passwordHash: hashes.get(row.employeeId)
          }], { session });
          userId = id(users[0]);
        } else {
          const user = before.users.find(item => id(item) === userId);
          if (!user.employee) {
            const update = await User.updateOne({ _id: user._id, employee: null }, { $set: { employee: employee._id } }, { session, runValidators: true });
            if (update.modifiedCount !== 1) throw Error('User link changed concurrently');
          }
        }
        if (id(employee.user) !== userId) {
          const update = await Employee.updateOne({ _id: employee._id, user: employee.user || null }, { $set: { user: new mongoose.Types.ObjectId(userId) } }, { session, runValidators: true });
          if (update.modifiedCount !== 1) throw Error('Employee link changed concurrently');
        }
        result.changes.push({ employeeId: row.employeeId, employeeCode: row.employeeCode, biometricCode: row.biometricCode, email: row.email, userId, action: row.action });
      }
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    result.status = 'COMMITTED';
    result.finishedAt = new Date().toISOString();
    writeReport(result);
    const after = await snapshot();
    const integrity = result.changes.every(change => {
      const employee = after.employees.find(item => id(item) === change.employeeId);
      const user = after.users.find(item => id(item) === change.userId);
      return employee && user && id(employee.user) === change.userId && id(user.employee) === change.employeeId && employee.biometricCode === change.biometricCode;
    });
    if (!integrity) throw Error('Post-write verification failed. Inspect report immediately.');
    console.log(JSON.stringify({ status: result.status, changed: result.changes.length, created: result.changes.filter(row => row.action === 'CREATE').length, linked: result.changes.filter(row => row.action === 'LINK').length, integrityVerified: integrity, totalUsers: after.users.length }));
  } finally { await session.endSession(); }
}
main().catch(error => { console.error(error.name + ': ' + error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
