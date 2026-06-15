import db from './database.ts';

export function addInviteUser(fullName: string, email: string, inviteCode: string) {
  const insert = db.prepare('INSERT INTO invite_users (full_name, email, invite_code) VALUES (?, ?, ?)');
  return insert.run(fullName, email, inviteCode);
}

export function removeInviteUser(id: number) {
  const remove = db.prepare('DELETE FROM invite_users WHERE id = ?');
  return remove.run(id);
}

export function deactivateInviteUser(id: number) {
  const deactivate = db.prepare('UPDATE invite_users SET is_active = 0 WHERE id = ?');
  return deactivate.run(id);
}

export function listInviteUsers() {
  const list = db.prepare('SELECT * FROM invite_users');
  return list.all();
}

export function validateInvite(email: string, inviteCode: string) {
  const validate = db.prepare('SELECT * FROM invite_users WHERE email = ? AND invite_code = ? AND is_active = 1');
  return validate.get(email, inviteCode);
}
