const { Result, Test, User, Question } = require('../models');

exports.submitResult = async (req, res) => {
    try {
        console.log('Submitting result:', req.body);
        const { testId, details } = req.body; // details: { questionId: optionIndex }

        console.log('User ID:', req.user.id);

        const test = await Test.findByPk(testId, {
            include: [Question]
        });

        if (!test) {
            console.log('Test not found for ID:', testId);
            return res.status(404).json({ message: 'Test not found' });
        }

        // Calculate score
        let score = 0;
        let max_score = 0;

        const isBil = test.category === 'bil';

        test.Questions.forEach(q => {
            const userAnswer = details[q.id];
            
            if (isBil) {
                max_score += 4;
                if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
                    if (parseInt(userAnswer) === q.correct_option_index) {
                        score += 4;
                    } else {
                        score -= 1;
                    }
                }
            } else {
                max_score += q.score_value;
                if (userAnswer !== undefined && parseInt(userAnswer) === q.correct_option_index) {
                    score += q.score_value;
                }
            }
        });

        console.log(`Calculated score: ${score}/${max_score}`);

        const result = await Result.create({
            score,
            max_score,
            details,
            TestId: testId,
            UserId: req.user.id
        });

        console.log('Result created:', result.id);

        let earnedCoins = 0;
        let totalCoins = 0;
        if (!test.is_standalone && !test.is_trial) {
            const user = await User.findByPk(req.user.id);
            if (user) {
                earnedCoins = 10;
                user.coins += earnedCoins;
                await user.save();
                totalCoins = user.coins;
            }
        } else if (test.is_standalone) {
             const user = await User.findByPk(req.user.id);
             totalCoins = user ? user.coins : 0;
        }

        res.status(201).json({
            ...result.toJSON(),
            earnedCoins,
            totalCoins
        });
    } catch (error) {
        console.error('Error submitting result:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getMyResults = async (req, res) => {
    try {
        console.log('Fetching results for user:', req.user.id);
        const results = await Result.findAll({
            where: { UserId: req.user.id },
            include: [{ model: Test, attributes: ['title', 'category'] }]
        });
        console.log(`Found ${results.length} results`);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching my results:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getAllResults = async (req, res) => {
    try {
        console.log('Fetching all results');
        const results = await Result.findAll({
            include: [
                { model: Test, attributes: ['title', 'category'] },
                { model: User, attributes: ['username', 'id'] }
            ]
        });
        console.log(`Found ${results.length} results total`);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching all results:', error);
        res.status(500).json({ message: error.message });
    }
};
