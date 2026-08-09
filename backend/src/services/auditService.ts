import { query } from '../db/pool';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: unknown;
  ip?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userId ?? null,
        entry.action,
        entry.entity,
        entry.entityId ?? null,
        entry.details !== undefined ? JSON.stringify(entry.details) : null,
        entry.ip ?? '',
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
