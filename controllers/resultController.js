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
        const isNis = test.category === 'nis';

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
            } else if (isNis) {
                const qType = q.question_type || 'standard';
                const pointsForCorrect = qType === 'sandyk_sippattama' ? 5 : 10;
                max_score += pointsForCorrect;
                if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
                    if (parseInt(userAnswer) === q.correct_option_index) {
                        score += pointsForCorrect;
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

        // Check if user has already passed this test BEFORE creating the new result
        const existingResult = await Result.findOne({
            where: { UserId: req.user.id, TestId: testId }
        });

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
        
        // Only award coins if this is the FIRST time taking the test or no previous result existed
        if (!test.is_standalone && !test.is_trial && !existingResult) {
            const user = await User.findByPk(req.user.id);
            if (user) {
                // Determine max reward (10 coins)
                const MAX_REWARD = 10;
                // Calculate percentage (0 to 1)
                const percentage = max_score > 0 ? (score / max_score) : 0;
                
                // Calculate earned coins: ensure at least 0, round to nearest integer
                earnedCoins = Math.max(0, Math.round(percentage * MAX_REWARD));
                
                user.coins += earnedCoins;
                await user.save();
                totalCoins = user.coins;
            }
        } else if (test.is_standalone) {
            const user = await User.findByPk(req.user.id);
            totalCoins = user ? user.coins : 0;
        } else {
            const user = await User.findByPk(req.user.id);
            totalCoins = user ? user.coins : 0;
        }

        // Construct detailed question review for student
        const questionsReview = (test.Questions || []).map((q, idx) => {
            const rawAns = details ? details[q.id] : undefined;
            const userAnswer = (rawAns !== undefined && rawAns !== null && rawAns !== '') ? parseInt(rawAns) : null;
            const isCorrect = userAnswer !== null && userAnswer === q.correct_option_index;

            let max_points = q.score_value || 1;
            let points_awarded = 0;

            if (isBil) {
                max_points = 4;
                if (userAnswer !== null) {
                    points_awarded = isCorrect ? 4 : -1;
                }
            } else if (isNis) {
                const qType = q.question_type || 'standard';
                max_points = qType === 'sandyk_sippattama' ? 5 : 10;
                if (userAnswer !== null && isCorrect) {
                    points_awarded = max_points;
                }
            } else {
                if (isCorrect) {
                    points_awarded = max_points;
                }
            }

            return {
                id: q.id,
                order: idx + 1,
                text: q.text,
                image_url: q.image_url,
                options: q.options,
                userAnswer: userAnswer,
                correct_option_index: q.correct_option_index,
                isCorrect: isCorrect,
                max_points,
                points_awarded,
                score_value: q.score_value,
                question_type: q.question_type || 'standard'
            };
        });

        res.status(201).json({
            ...result.toJSON(),
            category: test.category,
            earnedCoins,
            totalCoins,
            questionsReview
        });
    } catch (error) {
        console.error('Error submitting result:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.submitTrialResult = async (req, res) => {
    try {
        const { details } = req.body; // details: { questionId: optionIndex }
        const test = await Test.findOne({
            where: { is_trial: true },
            include: [Question]
        });
        if (!test) return res.status(404).json({ message: 'Пробный тест не найден' });

        let score = 0;
        let max_score = 0;
        const isBil = test.category === 'bil';
        const isNis = test.category === 'nis';

        const questionsReview = (test.Questions || []).map((q, idx) => {
            const rawAns = details ? details[q.id] : undefined;
            const userAnswer = (rawAns !== undefined && rawAns !== null && rawAns !== '') ? parseInt(rawAns) : null;
            const isCorrect = userAnswer !== null && userAnswer === q.correct_option_index;

            let max_points = q.score_value || 1;
            let points_awarded = 0;

            if (isBil) {
                max_score += 4;
                max_points = 4;
                if (userAnswer !== null) {
                    if (isCorrect) {
                        score += 4;
                        points_awarded = 4;
                    } else {
                        score -= 1;
                        points_awarded = -1;
                    }
                }
            } else if (isNis) {
                const qType = q.question_type || 'standard';
                const pts = qType === 'sandyk_sippattama' ? 5 : 10;
                max_score += pts;
                max_points = pts;
                if (userAnswer !== null && isCorrect) {
                    score += pts;
                    points_awarded = pts;
                }
            } else {
                max_score += q.score_value;
                max_points = q.score_value;
                if (isCorrect) {
                    score += q.score_value;
                    points_awarded = q.score_value;
                }
            }

            return {
                id: q.id,
                order: idx + 1,
                text: q.text,
                image_url: q.image_url,
                options: q.options,
                userAnswer: userAnswer,
                correct_option_index: q.correct_option_index,
                isCorrect: isCorrect,
                max_points,
                points_awarded,
                score_value: q.score_value,
                question_type: q.question_type || 'standard'
            };
        });

        res.status(200).json({
            score,
            max_score,
            category: test.category,
            questionsReview
        });
    } catch (error) {
        console.error('Error in trial result evaluation:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getResultReview = async (req, res) => {
    try {
        const staffRoles = ['admin', 'curator', 'teacher', 'operator'];
        const isStaff = staffRoles.includes(req.user.role);

        const queryWhere = { id: req.params.id };
        if (!isStaff) {
            queryWhere.UserId = req.user.id;
        }

        const result = await Result.findOne({
            where: queryWhere,
            include: [
                {
                    model: Test,
                    include: [Question]
                },
                {
                    model: User,
                    attributes: ['id', 'username', 'role', 'phone', 'coins']
                }
            ]
        });
        if (!result) return res.status(404).json({ message: 'Результат не найден' });

        const test = result.Test;
        const isBil = test ? test.category === 'bil' : false;
        const isNis = test ? test.category === 'nis' : false;
        const details = result.details || {};
        const questionsReview = (test && test.Questions ? test.Questions : []).map((q, idx) => {
            const rawAns = details[q.id];
            const userAnswer = (rawAns !== undefined && rawAns !== null && rawAns !== '') ? parseInt(rawAns) : null;
            const isCorrect = userAnswer !== null && userAnswer === q.correct_option_index;

            let max_points = q.score_value || 1;
            let points_awarded = 0;

            if (isBil) {
                max_points = 4;
                if (userAnswer !== null) {
                    points_awarded = isCorrect ? 4 : -1;
                }
            } else if (isNis) {
                const qType = q.question_type || 'standard';
                max_points = qType === 'sandyk_sippattama' ? 5 : 10;
                if (userAnswer !== null && isCorrect) {
                    points_awarded = max_points;
                }
            } else {
                if (isCorrect) {
                    points_awarded = max_points;
                }
            }

            return {
                id: q.id,
                order: idx + 1,
                text: q.text,
                image_url: q.image_url,
                options: q.options,
                userAnswer: userAnswer,
                correct_option_index: q.correct_option_index,
                isCorrect: isCorrect,
                max_points,
                points_awarded,
                score_value: q.score_value,
                question_type: q.question_type || 'standard'
            };
        });

        res.status(200).json({
            ...result.toJSON(),
            category: test ? test.category : 'standard',
            questionsReview
        });
    } catch (error) {
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

exports.getUserResults = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUser = await User.findByPk(userId, {
            attributes: ['id', 'username', 'role', 'phone', 'coins', 'groupId']
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const results = await Result.findAll({
            where: { UserId: userId },
            include: [{ model: Test, attributes: ['id', 'title', 'category'] }],
            order: [['completed_at', 'DESC']]
        });

        // Compute summary metrics (total tests, correct answers, total questions, points, etc.)
        const summary = {
            totalTests: results.length,
            totalScore: 0,
            totalMaxScore: 0,
            averagePercentage: 0
        };

        const enrichedResults = results.map(r => {
            const json = r.toJSON();
            summary.totalScore += r.score || 0;
            summary.totalMaxScore += r.max_score || 0;

            let correctCount = 0;
            let answeredCount = 0;
            let totalQuestions = 0;

            const details = r.details || {};
            const qIds = Object.keys(details);
            answeredCount = qIds.length;

            return {
                ...json,
                percentage: r.max_score > 0 ? Math.round((Math.max(0, r.score) / r.max_score) * 100) : 0,
                answeredCount
            };
        });

        if (summary.totalMaxScore > 0) {
            summary.averagePercentage = Math.round((Math.max(0, summary.totalScore) / summary.totalMaxScore) * 100);
        }

        res.status(200).json({
            user: targetUser,
            summary,
            results: enrichedResults
        });
    } catch (error) {
        console.error('Error fetching user results:', error);
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

