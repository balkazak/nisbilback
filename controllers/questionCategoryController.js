const { QuestionCategory, QuestionSubcategory } = require('../models');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await QuestionCategory.findAll({
            include: [
                {
                    model: QuestionSubcategory,
                    as: 'subcategories'
                }
            ],
            order: [
                ['sort_order', 'ASC'],
                ['id', 'ASC'],
                [{ model: QuestionSubcategory, as: 'subcategories' }, 'sort_order', 'ASC'],
                [{ model: QuestionSubcategory, as: 'subcategories' }, 'id', 'ASC']
            ]
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching question categories:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name_kk, name_ru, sort_order } = req.body;
        if (!name_kk || !name_ru) {
            return res.status(400).json({ message: 'Необходимо указать названия на двух языках (name_kk и name_ru)' });
        }
        const category = await QuestionCategory.create({
            name_kk: name_kk.trim(),
            name_ru: name_ru.trim(),
            sort_order: sort_order || 0
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createSubcategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name_kk, name_ru, sort_order } = req.body;
        if (!name_kk || !name_ru) {
            return res.status(400).json({ message: 'Необходимо указать названия подкатегории на двух языках (name_kk и name_ru)' });
        }
        const category = await QuestionCategory.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Категория не найдена' });
        }
        const subcategory = await QuestionSubcategory.create({
            categoryId: category.id,
            name_kk: name_kk.trim(),
            name_ru: name_ru.trim(),
            sort_order: sort_order || 0
        });
        res.status(201).json(subcategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const deleted = await QuestionCategory.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'Категория не найдена' });
        res.status(200).json({ message: 'Категория удалена' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteSubcategory = async (req, res) => {
    try {
        const deleted = await QuestionSubcategory.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'Подкатегория не найдена' });
        res.status(200).json({ message: 'Подкатегория удалена' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

