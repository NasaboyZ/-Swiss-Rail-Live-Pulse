const express = require('express');
const { findConnections } = require('../controllers/connectionController');

const router = express.Router();

router.get('/', findConnections);

module.exports = router;
