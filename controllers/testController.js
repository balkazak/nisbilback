const { Test, Question, QuestionCategory, QuestionSubcategory, Lesson, User, Course } = require('../models');

const questionWithCategoryInclude = {
    model: Question,
    include: [
        {
            model: QuestionSubcategory,
            as: 'subcategory',
            include: [{ model: QuestionCategory, as: 'category' }]
        }
    ]
};

const validateStandaloneQuestionCategories = (is_standalone, lessonId, questions) => {
    if (!is_standalone || lessonId) return null;
    if (!Array.isArray(questions) || questions.length === 0) return null;
    for (let i = 0; i < questions.length; i++) {
        const subId = questions[i].subcategoryId;
        if (!subId || Number.isNaN(parseInt(subId, 10))) {
            return `Для вопроса №${i + 1} необходимо выбрать категорию и подкатегорию`;
        }
    }
    return null;
};

exports.createTest = async (req, res) => {
    try {
        // lessonId is optional. If present, attaches to lesson. If null, standalone.
        const { title, description, time_limit, is_standalone, lessonId, questions, category, is_trial, coin_price } = req.body;

        const validationError = validateStandaloneQuestionCategories(is_standalone, lessonId, questions);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        if (is_trial) {
            await Test.update({ is_trial: false }, { where: { is_trial: true } });
        }

        const test = await Test.create({
            title,
            description,
            time_limit,
            is_standalone,
            lessonId, // Can be null
            category,
            is_trial: !!is_trial,
            coin_price: coin_price || 0
        });

        if (questions && questions.length > 0) {
            const questionData = questions.map(q => ({
                ...q,
                subcategoryId: (is_standalone && !lessonId && q.subcategoryId) ? parseInt(q.subcategoryId, 10) : null,
                TestId: test.id
            }));
            await Question.bulkCreate(questionData);
        }

        res.status(201).json(test);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTestById = async (req, res) => {
    try {
        const test = await Test.findByPk(req.params.id, {
            include: [questionWithCategoryInclude],
            order: [[Question, 'id', 'ASC']]
        });
        if (!test) return res.status(404).json({ message: 'Тест не найден' });

        // Hide correct answers and question categories from students while taking the test
        if (req.user.role === 'student' && !req.query.showAnswers) {
            const plainTest = test.toJSON();
            plainTest.Questions.forEach(q => {
                delete q.correct_option_index;
                delete q.subcategoryId;
                delete q.subcategory;
            });
            return res.status(200).json(plainTest);
        }

        res.status(200).json(test);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllTests = async (req, res) => {
    try {
        const { is_standalone } = req.query;
        const whereClause = {};
        if (is_standalone !== undefined) {
            whereClause.is_standalone = is_standalone === 'true';
        }

        const tests = await Test.findAll({
            where: whereClause,
            include: [
                { model: Lesson } // Always include lesson info
            ]
        });

        // Filter for students: Only return tests they have access to
        if (req.user.role === 'student') {
            const user = await User.findByPk(req.user.id, { include: [Test, Course] });
            if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

            const assignedTestIds = user.Tests.map(t => t.id);
            const assignedCourseIds = user.Courses.map(c => c.id);

            const accessibleTests = tests.filter(test => {
                if (test.is_standalone) {
                    test.setDataValue('isOwned', assignedTestIds.includes(test.id));
                    // Return all standalone tests so student can see what to buy
                    return true;
                } else if (test.Lesson && test.Lesson.CourseId) {
                    return assignedCourseIds.includes(test.Lesson.CourseId);
                }
                return false;
            });

            return res.status(200).json(accessibleTests);
        }

        res.status(200).json(tests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteTest = async (req, res) => {
    try {
        const deleted = await Test.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'Тест не найден' });
        res.status(200).json({ message: 'Тест удален' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateTest = async (req, res) => {
    try {
        const { title, description, time_limit, is_standalone, lessonId, questions, category, is_trial, coin_price } = req.body;

        const test = await Test.findByPk(req.params.id);
        if (!test) return res.status(404).json({ message: 'Тест не найден' });

        const effectiveStandalone = is_standalone !== undefined ? is_standalone : test.is_standalone;
        const effectiveLessonId = lessonId !== undefined ? lessonId : test.lessonId;

        const validationError = validateStandaloneQuestionCategories(effectiveStandalone, effectiveLessonId, questions);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        if (is_trial) {
            await Test.update({ is_trial: false }, { where: { is_trial: true } });
        }

        // Update test metadata
        await test.update({
            title,
            description,
            time_limit,
            is_standalone,
            lessonId,
            category,
            is_trial: is_trial !== undefined ? !!is_trial : test.is_trial,
            coin_price: coin_price !== undefined ? coin_price : test.coin_price
        });

        // Update questions: delete old ones and create new ones
        if (questions && questions.length > 0) {
            await Question.destroy({ where: { TestId: test.id } });
            const questionData = questions.map(q => ({
                ...q,
                subcategoryId: (effectiveStandalone && !effectiveLessonId && q.subcategoryId) ? parseInt(q.subcategoryId, 10) : null,
                TestId: test.id
            }));
            await Question.bulkCreate(questionData);
        }

        const updatedTest = await Test.findByPk(test.id, {
            include: [questionWithCategoryInclude],
            order: [[Question, 'id', 'ASC']]
        });
        res.status(200).json(updatedTest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTrialTest = async (req, res) => {
    try {
        const test = await Test.findOne({
            where: { is_trial: true },
            include: [Question],
            order: [[Question, 'id', 'ASC']]
        });
        if (!test) return res.status(404).json({ message: 'Тест не найден' });

        // Sanitize for guest/student: remove correct_option_index and categories
        const plainTest = test.toJSON();
        if (plainTest.Questions) {
            plainTest.Questions.forEach(q => {
                delete q.correct_option_index;
                delete q.subcategoryId;
                delete q.subcategory;
            });
        }

        res.status(200).json(plainTest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.buyTest = async (req, res) => {
    try {
        const { testId } = req.body;
        const userId = req.user.id;

        const test = await Test.findByPk(testId);
        if (!test) return res.status(404).json({ message: 'Тест не найден' });
        if (!test.is_standalone) return res.status(400).json({ message: 'Только отдельные тесты можно приобрести' });

        const user = await User.findByPk(userId, { include: [Test] });
        if (user.Tests.find(t => t.id === parseInt(testId))) {
            return res.status(400).json({ message: 'Тест уже приобретен' });
        }

        if (user.coins < test.coin_price) {
            return res.status(400).json({ message: 'Недостаточно монет' });
        }

        // Deduct coins and add access
        user.coins -= test.coin_price;
        await user.save();
        await user.addTest(test);

        res.status(200).json({ message: 'Тест успешно приобретен', coins: user.coins });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
