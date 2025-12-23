const { Test, Question, Lesson, User, Course } = require('../models');

exports.createTest = async (req, res) => {
    try {
        // lessonId is optional. If present, attaches to lesson. If null, standalone.
        const { title, description, time_limit, is_standalone, lessonId, questions } = req.body;

        const test = await Test.create({
            title,
            description,
            time_limit,
            is_standalone,
            lessonId // Can be null
        });

        if (questions && questions.length > 0) {
            const questionData = questions.map(q => ({ ...q, TestId: test.id }));
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
            include: [Question]
        });
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // If student, maybe hide correct answers? 
        // For simplicity, we send them now but frontend should handle logic or we sanitize here.
        // Let's keep it simple: Controller sends data, trusting client for now unless we need strict security.
        // Ideally, we shouldn't send 'correct_option_index' to students before submission.

        if (req.user.role === 'student' && !req.query.showAnswers) {
            const plainTest = test.toJSON();
            plainTest.Questions.forEach(q => delete q.correct_option_index);
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
            if (!user) return res.status(404).json({ message: 'User not found' });

            const assignedTestIds = user.Tests.map(t => t.id);
            const assignedCourseIds = user.Courses.map(c => c.id);

            const accessibleTests = tests.filter(test => {
                if (test.is_standalone) {
                    return assignedTestIds.includes(test.id);
                } else if (test.Lesson && test.Lesson.CourseId) {
                    return assignedCourseIds.includes(test.Lesson.CourseId);
                }
                // If test is not standalone and has no lesson (orphan), default hiding or admin only. 
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
        if (!deleted) return res.status(404).json({ message: 'Test not found' });
        res.status(200).json({ message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateTest = async (req, res) => {
    try {
        const { title, description, time_limit, is_standalone, lessonId, questions } = req.body;

        const test = await Test.findByPk(req.params.id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Update test metadata
        await test.update({
            title,
            description,
            time_limit,
            is_standalone,
            lessonId
        });

        // Update questions: delete old ones and create new ones
        if (questions && questions.length > 0) {
            await Question.destroy({ where: { TestId: test.id } });
            const questionData = questions.map(q => ({ ...q, TestId: test.id }));
            await Question.bulkCreate(questionData);
        }

        const updatedTest = await Test.findByPk(test.id, { include: [Question] });
        res.status(200).json(updatedTest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
