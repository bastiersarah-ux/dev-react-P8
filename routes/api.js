const express = require('express');
const router = express.Router();

const dbReady = require('../middlewares/dbReady');
const properties = require('../controllers/propertiesController');
const users = require('../controllers/usersController');
const ratings = require('../controllers/ratingsController');

// Ensure DB is ready for all API routes
router.use(dbReady);

// Properties
router.get('/properties', properties.list);
router.get('/properties/:id', properties.getById);
router.post('/properties', properties.create);
router.patch('/properties/:id', properties.update);
router.delete('/properties/:id', properties.remove);

// Users
router.get('/users', users.list);
router.get('/users/:id', users.getById);
router.post('/users', users.create);

// Ratings for properties
router.get('/properties/:id/ratings', ratings.listForProperty);
router.post('/properties/:id/ratings', ratings.add);

module.exports = router;
