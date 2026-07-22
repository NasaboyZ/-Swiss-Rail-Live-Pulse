const express = require('express');
const { getDepartures, searchStations } = require('../controllers/trainController');

const router = express.Router();

router.get('/departures', getDepartures);
router.get('/search', searchStations);

module.exports = router;
