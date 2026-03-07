const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is healthy' });
});

module.exports = router;
