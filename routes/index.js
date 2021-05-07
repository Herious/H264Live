var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET home page. */
router.get('/live', function(req, res, next) {
  res.render('live', { title: 'Express' });
});


router.get('/screens', function(req, res, next) {
  res.render('screens', { title: 'Express' });
});

router.get('/screensjsmpeg', function(req, res, next) {
  res.render('screensjsmpeg', { title: 'Express' });
});

router.get('/test', function(req, res, next) {
  res.send({'data': "test"});
});


module.exports = router;
