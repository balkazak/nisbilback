const express = require('express');
const controller = require('../controllers/questionCategoryController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, controller.getAllCategories);
router.post('/', [verifyToken, isAdmin], controller.createCategory);
router.post('/:categoryId/subcategories', [verifyToken, isAdmin], controller.createSubcategory);
router.delete('/:id', [verifyToken, isAdmin], controller.deleteCategory);
router.delete('/subcategories/:id', [verifyToken, isAdmin], controller.deleteSubcategory);

module.exports = router;

