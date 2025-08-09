const express = require('express');
const router = express.Router();

// Middleware: ensure DB ready
router.use((req, res, next) => {
  const db = req.app.locals.db;
  if (!db) return res.status(503).json({ error: 'Database not ready' });
  next();
});

function mapPropertyRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cover: row.cover,
    location: row.location,
    price_per_night: row.price_per_night,
    rating_avg: row.rating_avg,
    ratings_count: row.ratings_count,
    host: row.host_id ? { id: row.host_id, name: row.host_name, picture: row.host_picture } : undefined,
  };
}

// GET /api/properties
router.get('/properties', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.allAsync(`
      SELECT p.*, u.name AS host_name, u.picture AS host_picture
      FROM properties p
      JOIN users u ON u.id = p.host_id
      ORDER BY p.title ASC
    `);
    res.json(rows.map(mapPropertyRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper to enrich a property with arrays
async function getPropertyDetails(db, id) {
  const row = await db.getAsync(`
    SELECT p.*, u.name AS host_name, u.picture AS host_picture
    FROM properties p
    JOIN users u ON u.id = p.host_id
    WHERE p.id = ?
  `, [id]);
  if (!row) return null;
  const base = mapPropertyRow(row);
  const pictures = await db.allAsync('SELECT url FROM property_pictures WHERE property_id = ?', [id]);
  const equipments = await db.allAsync('SELECT name FROM property_equipments WHERE property_id = ?', [id]);
  const tags = await db.allAsync('SELECT name FROM property_tags WHERE property_id = ?', [id]);
  return {
    ...base,
    pictures: pictures.map(r => r.url),
    equipments: equipments.map(r => r.name),
    tags: tags.map(r => r.name),
  };
}

// GET /api/properties/:id
router.get('/properties/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const prop = await getPropertyDetails(db, req.params.id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    res.json(prop);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function genId() {
  // 8 hex chars
  return Math.random().toString(16).slice(2, 10);
}

// POST /api/properties
router.post('/properties', async (req, res) => {
  const db = req.app.locals.db;
  const {
    id,
    title,
    description = null,
    cover = null,
    location = null,
    price_per_night,
    host_id,
    host,
    pictures = [],
    equipments = [],
    tags = [],
  } = req.body || {};

  if (!title) return res.status(400).json({ error: 'title is required' });
  let price = Number(price_per_night);
  if (!Number.isFinite(price) || price <= 0) price = 80; // default

  try {
    // ensure host
    let hostId = host_id;
    if (!hostId && host && host.name) {
      const hostName = String(host.name);
      const hostPic = host.picture || null;
      const found = await db.getAsync('SELECT id FROM users WHERE name = ? AND IFNULL(picture, "") = IFNULL(?, "")', [hostName, hostPic]);
      if (found) hostId = found.id;
      else {
        const ins = await db.runAsync('INSERT INTO users(name, picture, role) VALUES (?,?,?)', [hostName, hostPic, 'owner']);
        hostId = ins.lastID;
      }
    }
    if (!hostId) return res.status(400).json({ error: 'host_id or host{name,picture} is required' });

    const newId = id || genId();
    await db.runAsync(
      'INSERT INTO properties(id, title, description, cover, location, host_id, price_per_night) VALUES (?,?,?,?,?,?,?)',
      [newId, title, description, cover, location, hostId, price]
    );

    // Arrays
    if (Array.isArray(pictures)) {
      for (const url of pictures) {
        if (url) await db.runAsync('INSERT OR IGNORE INTO property_pictures(property_id, url) VALUES (?,?)', [newId, url]);
      }
    }
    if (Array.isArray(equipments)) {
      for (const name of equipments) {
        if (name) await db.runAsync('INSERT OR IGNORE INTO property_equipments(property_id, name) VALUES (?,?)', [newId, name]);
      }
    }
    if (Array.isArray(tags)) {
      for (const name of tags) {
        if (name) await db.runAsync('INSERT OR IGNORE INTO property_tags(property_id, name) VALUES (?,?)', [newId, name]);
      }
    }

    const prop = await getPropertyDetails(db, newId);
    res.status(201).json(prop);
  } catch (e) {
    if (/(UNIQUE|PRIMARY KEY)/i.test(e.message)) {
      return res.status(409).json({ error: 'Property with same id already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/properties/:id
router.patch('/properties/:id', async (req, res) => {
  const db = req.app.locals.db;
  const allowed = ['title', 'description', 'cover', 'location', 'host_id', 'price_per_night'];
  const fields = [];
  const params = [];
  for (const k of allowed) {
    if (k in req.body) {
      fields.push(`${k} = ?`);
      params.push(req.body[k]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  try {
    const r = await db.runAsync(`UPDATE properties SET ${fields.join(', ')} WHERE id = ?`, params);
    if (r.changes === 0) return res.status(404).json({ error: 'Property not found' });
    const prop = await getPropertyDetails(db, req.params.id);
    res.json(prop);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/properties/:id
router.delete('/properties/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const r = await db.runAsync('DELETE FROM properties WHERE id = ?', [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ error: 'Property not found' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// USERS
router.get('/users', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.allAsync('SELECT id, name, picture, role FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const row = await db.getAsync('SELECT id, name, picture, role FROM users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/users', async (req, res) => {
  const db = req.app.locals.db;
  const { name, picture = null, role = 'client' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!['owner', 'client', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
  try {
    const r = await db.runAsync('INSERT INTO users(name, picture, role) VALUES (?,?,?)', [name, picture, role]);
    const user = await db.getAsync('SELECT id, name, picture, role FROM users WHERE id = ?', [r.lastID]);
    res.status(201).json(user);
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) return res.status(409).json({ error: 'User already exists' });
    res.status(500).json({ error: e.message });
  }
});

// RATINGS
router.get('/properties/:id/ratings', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const prop = await db.getAsync('SELECT id FROM properties WHERE id = ?', [req.params.id]);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    const rows = await db.allAsync(`
      SELECT r.id, r.score, r.comment, r.created_at, u.id as user_id, u.name as user_name, u.picture as user_picture
      FROM ratings r JOIN users u ON u.id = r.user_id
      WHERE r.property_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json(rows.map(r => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      created_at: r.created_at,
      user: { id: r.user_id, name: r.user_name, picture: r.user_picture },
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/properties/:id/ratings', async (req, res) => {
  const db = req.app.locals.db;
  const { user_id, score, comment = null } = req.body || {};
  const s = Number(score);
  if (!Number.isInteger(s) || s < 1 || s > 5) return res.status(400).json({ error: 'score must be integer between 1 and 5' });
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const prop = await db.getAsync('SELECT id FROM properties WHERE id = ?', [req.params.id]);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    const user = await db.getAsync('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.runAsync('INSERT INTO ratings(property_id, user_id, score, comment) VALUES (?,?,?,?)', [req.params.id, user_id, s, comment]);

    // recompute average and count
    const stats = await db.getAsync('SELECT AVG(score) as avg, COUNT(*) as cnt FROM ratings WHERE property_id = ?', [req.params.id]);
    const avg = Math.round((stats.avg || 0) * 10) / 10;
    const cnt = stats.cnt || 0;
    await db.runAsync('UPDATE properties SET rating_avg = ?, ratings_count = ? WHERE id = ?', [avg, cnt, req.params.id]);

    const rows = await db.allAsync(`
      SELECT r.id, r.score, r.comment, r.created_at, u.id as user_id, u.name as user_name, u.picture as user_picture
      FROM ratings r JOIN users u ON u.id = r.user_id
      WHERE r.property_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.status(201).json({ rating_avg: avg, ratings_count: cnt, ratings: rows.map(r => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      created_at: r.created_at,
      user: { id: r.user_id, name: r.user_name, picture: r.user_picture },
    }))});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
