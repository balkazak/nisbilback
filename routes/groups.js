const express = require('express');
const controller = require('../controllers/groupController');
const { verifyToken, isStaff, isOperatorOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', [verifyToken, isStaff], controller.getAllGroups);
router.get('/:id', [verifyToken, isStaff], controller.getGroupById);

// Creation, update, delete only for Operator and Admin
router.post('/', [verifyToken, isOperatorOrAdmin], controller.createGroup);
router.put('/:id', [verifyToken, isOperatorOrAdmin], controller.updateGroup);
router.delete('/:id', [verifyToken, isOperatorOrAdmin], controller.deleteGroup);

// Assign students to group
router.post('/:id/students', [verifyToken, isOperatorOrAdmin], controller.assignStudents);
router.delete('/:id/students/:studentId', [verifyToken, isOperatorOrAdmin], controller.removeStudent);

module.exports = router;
