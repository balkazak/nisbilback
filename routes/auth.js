const express = require('express');
const controller = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

console.log('Auth Routes Loaded');

router.post('/login', (req, res, next) => {
    console.log('Route /login matched');
    next();
}, controller.login);

router.post('/login', controller.login);
router.get('/me', verifyToken, controller.getMe);

module.exports = router;
