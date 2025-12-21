const express = require('express');
const controller = require('../controllers/userController');
const { verifyToken, isTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', [verifyToken, isTeacherOrAdmin], controller.createUser);
router.get('/', [verifyToken, isTeacherOrAdmin], controller.getAllUsers);
router.post('/:userId/access', [verifyToken, isTeacherOrAdmin], controller.updateUserAccess);
router.get('/:id/access', [verifyToken, isTeacherOrAdmin], controller.getUserAccess);

module.exports = router;
