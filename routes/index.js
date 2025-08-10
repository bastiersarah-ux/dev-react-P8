var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send({ name: 'Kasa Backend API', version: 'v1', docs: '/docs.html', openapi: '/openapi.json' });
});

// Redirect /docs to Swagger UI page
router.get('/docs', function(req, res) {
  res.redirect('/docs.html');
});

module.exports = router;
