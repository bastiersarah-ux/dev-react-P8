async function listUsers(db) {
  return await db.allAsync('SELECT id, name, picture, role FROM users ORDER BY id DESC');
}

async function getUser(db, id) {
  return await db.getAsync('SELECT id, name, picture, role FROM users WHERE id = ?', [id]);
}

async function createUser(db, { name, picture = null, role = 'client' }) {
  if (!name) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }
  if (!['owner', 'client', 'admin'].includes(role)) {
    const err = new Error('invalid role');
    err.status = 400;
    throw err;
  }
  try {
    const r = await db.runAsync('INSERT INTO users(name, picture, role) VALUES (?,?,?)', [name, picture, role]);
    return await getUser(db, r.lastID);
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) {
      const err = new Error('User already exists');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
};
