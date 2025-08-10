const express = require('express');
const router = express.Router();

const dbReady = require('../middlewares/dbReady');
const { requireRole, requireAdmin, requireSelfOrAdmin } = require('../middlewares/auth');
const properties = require('../controllers/propertiesController');
const users = require('../controllers/usersController');
const ratings = require('../controllers/ratingsController');

// Ensure DB is ready for all API routes
router.use(dbReady);

// Properties
router.get('/properties', properties.list);
router.get('/properties/:id', properties.getById);
router.post('/properties', requireRole(['owner','admin']), properties.create);
router.patch('/properties/:id', requireRole(['owner','admin']), properties.update);
router.delete('/properties/:id', requireRole(['owner','admin']), properties.remove);

// Users
router.get('/users', requireAdmin, users.list);
router.get('/users/:id', requireSelfOrAdmin('id'), users.getById);
router.post('/users', requireAdmin, users.create);
router.patch('/users/:id', requireSelfOrAdmin('id'), users.update);

// Ratings for properties
router.get('/properties/:id/ratings', ratings.listForProperty);
router.post('/properties/:id/ratings', ratings.add);

module.exports = router;
