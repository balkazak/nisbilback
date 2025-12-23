const express = require('express');
const controller = require('../controllers/testController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, controller.getAllTests);
router.get('/:id', verifyToken, controller.getTestById);

router.post('/', [verifyToken, isAdmin], controller.createTest);
router.put('/:id', [verifyToken, isAdmin], controller.updateTest);
router.delete('/:id', [verifyToken, isAdmin], controller.deleteTest);

module.exports = router;
