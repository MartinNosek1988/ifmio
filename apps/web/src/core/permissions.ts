export type PermLevel = 'none' | 'read' | 'write' | 'admin';

export interface Permissions {
  properties: PermLevel;
  finance: PermLevel;
  workorders: PermLevel;
  helpdesk: PermLevel;
  assets: PermLevel;
  documents: PermLevel;
  team: PermLevel;
  settings: PermLevel;
}

const DEFAULT_PERMISSIONS: Permissions = {
  properties: 'write',
  finance: 'write',
  workorders: 'write',
  helpdesk: 'write',
  assets: 'write',
  documents: 'write',
  team: 'read',
  settings: 'read',
};

export function getPermissions(role: string): Permissions {
  if (role === 'admin') {
    return Object.fromEntries(
      Object.keys(DEFAULT_PERMISSIONS).map((k) => [k, 'admin'])
    ) as unknown as Permissions;
  }
  if (role === 'viewer') {
    return Object.fromEntries(
      Object.keys(DEFAULT_PERMISSIONS).map((k) => [k, 'read'])
    ) as unknown as Permissions;
  }
  return DEFAULT_PERMISSIONS;
}

export function canRead(level: PermLevel): boolean {
  return level !== 'none';
}

export function canWrite(level: PermLevel): boolean {
  return level === 'write' || level === 'admin';
}
