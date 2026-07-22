const express = require('express');
const { getDelayStats, getTopDelayed } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/delays', getDelayStats);
router.get('/top-delayed', getTopDelayed);

module.exports = router;
