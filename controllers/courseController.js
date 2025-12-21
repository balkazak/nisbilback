const { Course, Lesson, Test, User } = require('../models');

// --- Courses ---

exports.createCourse = async (req, res) => {
    try {
        const { title, description, thumbnail_url } = req.body;
        const course = await Course.create({ title, description, thumbnail_url });
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [{ model: Lesson }]
        });

        if (req.user.role === 'student') {
            const user = await User.findByPk(req.user.id, { include: [Course] });
            if (!user) return res.status(404).json({ message: 'User not found' });

            const assignedCourseIds = user.Courses.map(c => c.id);
            const accessibleCourses = courses.filter(c => assignedCourseIds.includes(c.id));
            return res.status(200).json(accessibleCourses);
        }

        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCourseById = async (req, res) => {
    try {
        const { Result } = require('../models'); // lazy load to avoid circular dep issues if any

        const course = await Course.findByPk(req.params.id, {
            include: [{
                model: Lesson,
                include: [{ model: Test }] // Include tests attached to lessons
            }],
            order: [[Lesson, 'order', 'ASC']]
        });
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // If student, check for test completion to unlock solutions
        if (req.user.role === 'student') {
            const courseJSON = course.toJSON();

            // We need to fetch user's results to know what they passed
            const userResults = await Result.findAll({ where: { UserId: req.user.id } });
            // Set of TestIds that user completed
            const completedTestIds = new Set(userResults.map(r => r.TestId));

            courseJSON.Lessons = courseJSON.Lessons.map(lesson => {
                // If lesson has a test, check if it's completed
                const hasTest = lesson.Test && lesson.Test.id;
                const isTestCompleted = hasTest ? completedTestIds.has(lesson.Test.id) : true;
                // If no test, maybe solution is free? Or always hidden? 
                // Let's assume if no test, solution is visible (or maybe there is no solution).
                // But request says "show solution after he passes the test".
                // So if there IS a test, we require passing.

                if (hasTest && !isTestCompleted) {
                    lesson.solution_video_urls = []; // Hide solution
                }
                return lesson;
            });

            return res.status(200).json(courseJSON);
        }

        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const deleted = await Course.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'Course not found' });
        res.status(200).json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Lessons ---

// --- Lessons ---

exports.addLesson = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, video_urls, solution_video_urls, order } = req.body;

        const lesson = await Lesson.create({
            title,
            video_urls: video_urls || [],
            solution_video_urls: solution_video_urls || [],
            order,
            CourseId: courseId
        });
        res.status(201).json(lesson);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteLesson = async (req, res) => {
    try {
        const deleted = await Lesson.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ message: 'Lesson not found' });
        res.status(200).json({ message: 'Lesson deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
