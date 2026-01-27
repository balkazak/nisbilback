const express = require('express');
const controller = require('../controllers/userController');
const { verifyToken, isTeacherOrAdmin, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', [verifyToken, isTeacherOrAdmin], controller.createUser);
router.get('/', [verifyToken, isTeacherOrAdmin], controller.getAllUsers);
router.post('/:userId/access', [verifyToken, isAdmin], controller.updateUserAccess);
router.get('/:id/access', [verifyToken, isAdmin], controller.getUserAccess);
router.delete('/:id', [verifyToken, isAdmin], controller.deleteUser);

module.exports = router;
