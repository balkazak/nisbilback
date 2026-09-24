const express = require('express');
const controller = require('../controllers/resultController');
const { verifyToken, isTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/trial', controller.submitTrialResult);
router.post('/', verifyToken, controller.submitResult);
router.get('/me', verifyToken, controller.getMyResults);
router.get('/:id/review', verifyToken, controller.getResultReview);
router.get('/', [verifyToken, isTeacherOrAdmin], controller.getAllResults);

module.exports = router;
