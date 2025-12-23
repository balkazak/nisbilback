const express = require('express');
const controller = require('../controllers/courseController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();
console.log('Lesson routes loading...');

// PUT and DELETE should be available at /api/lessons/:id
router.put('/:id', [verifyToken, isAdmin], (req, res, next) => { console.log('PUT /api/lessons hit'); next(); }, controller.updateLesson);
router.delete('/:id', [verifyToken, isAdmin], (req, res, next) => { console.log('DELETE /api/lessons hit'); next(); }, controller.deleteLesson);

module.exports = router;
