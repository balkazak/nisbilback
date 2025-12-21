const express = require('express');
const controller = require('../controllers/courseController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Public read (or protected for students?) - Let's verify token for all
router.get('/', verifyToken, controller.getAllCourses);
router.get('/:id', verifyToken, controller.getCourseById);

// Admin only write
router.post('/', [verifyToken, isAdmin], controller.createCourse);
router.delete('/:id', [verifyToken, isAdmin], controller.deleteCourse);

// Lessons
router.post('/:courseId/lessons', [verifyToken, isAdmin], controller.addLesson);
router.delete('/lessons/:id', [verifyToken, isAdmin], controller.deleteLesson);

module.exports = router;
