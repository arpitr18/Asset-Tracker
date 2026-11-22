import jwt from 'jsonwebtoken';
import { db } from './db.js';

export function issueToken(employee) {
  return jwt.sign({ sub: employee.id, role: employee.role, version:employee.sessionVersion??0 }, process.env.JWT_SECRET, { expiresIn: '8h', issuer: 'cadbury-tracker-demo' });
}
export async function authenticate(req, res, next) {
  try {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'cadbury-tracker-demo' });
    const [employee] = await db.$queryRaw`SELECT id,name,email,"jobTitle",role,"territoryId" FROM "Employee"
      WHERE id=${payload.sub}::uuid AND enabled AND "sessionVersion"=${payload.version??0}`;
    if (!employee) return res.status(401).json({ error: 'Account unavailable' });
    req.employee = employee;
    next();
  } catch { res.status(401).json({ error: 'Invalid session' }); }
}
export const requireRole = (...roles) => (req, res, next) => roles.includes(req.employee.role) ? next() : res.status(403).json({ error: 'Forbidden' });
export function territoryWhere(employee) {
  if (employee.role === 'ADMIN' || employee.role === 'MANAGER') return {};
  return { territoryId: employee.territoryId || '00000000-0000-0000-0000-000000000000' };
}
