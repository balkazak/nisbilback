const express = require('express');
const controller = require('../controllers/userController');
const { verifyToken, isStaff, isOperatorOrAdmin, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', [verifyToken, isStaff], controller.createUser);
router.get('/', [verifyToken, isStaff], controller.getAllUsers);
router.put('/:id', [verifyToken, isStaff], controller.updateUser);
router.delete('/:id', [verifyToken, isOperatorOrAdmin], controller.deleteUser);

// Access to courses and tests
router.post('/:userId/access', [verifyToken, isAdmin], controller.updateUserAccess);
router.get('/:id/access', [verifyToken, isAdmin], controller.getUserAccess);

module.exports = router;
