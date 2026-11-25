/**
 * Safe Migration:
 * 1. Creates QuestionCategories and QuestionSubcategories tables (if not exist)
 * 2. Adds nullable subcategoryId column to Questions table (if not exist)
 * 3. Seeds all 7 bilingual categories and their subcategories (idempotent)
 * 4. Deletes ONLY the 3 old standalone tests ('1 - ТЕСТ (математика)', '2 - ТЕСТ (математика)', '3 - ТЕСТ (математика)')
 *    without touching any courses, lessons, lesson tests, users, groups, or other data.
 *
 * Usage:
 *   node scripts/migrate_question_categories.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    sequelize,
    QuestionCategory,
    QuestionSubcategory,
    Test,
    Question,
    Result,
    UserTests,
    Course,
    Lesson,
    User
} = require('../models');
const seedData = require('../data/questionCategoriesSeed');

async function migrate() {
    const dialect = sequelize.getDialect();
    console.log('Running Question Categories migration on dialect:', dialect);

    try {
        // Snapshot counts BEFORE
        const beforeCounts = {
            users: await User.count(),
            courses: await Course.count(),
            lessons: await Lesson.count(),
            lessonTests: await Test.count({ where: { is_standalone: false } }),
            standaloneTests: await Test.count({ where: { is_standalone: true } })
        };
        console.log('Counts BEFORE migration:', beforeCounts);

        // 1. Sync new tables safely (does NOT alter/drop existing tables)
        await QuestionCategory.sync();
        await QuestionSubcategory.sync();
        console.log('✅ QuestionCategories and QuestionSubcategories tables ready');

        // 2. Add nullable subcategoryId column to Questions table if missing
        if (dialect === 'postgres') {
            await sequelize.query(`
                ALTER TABLE "Questions"
                ADD COLUMN IF NOT EXISTS "subcategoryId" INTEGER
                REFERENCES "QuestionSubcategories"("id") ON DELETE SET NULL;
            `);
            console.log('✅ Ensured subcategoryId column on Questions (PostgreSQL)');
        } else if (dialect === 'sqlite') {
            const cols = await sequelize.query('PRAGMA table_info(Questions);', { type: sequelize.QueryTypes.SELECT });
            if (!cols.some(c => c.name === 'subcategoryId')) {
                await sequelize.query('ALTER TABLE Questions ADD COLUMN subcategoryId INTEGER REFERENCES QuestionSubcategories(id) ON DELETE SET NULL;');
                console.log('✅ Added subcategoryId column to Questions (SQLite)');
            } else {
                console.log('✅ subcategoryId column already exists on Questions (SQLite)');
            }
        }

        // 3. Seed categories and subcategories idempotently
        let totalSubcategories = 0;
        for (const catItem of seedData) {
            let [category] = await QuestionCategory.findOrCreate({
                where: { name_kk: catItem.name_kk },
                defaults: {
                    name_kk: catItem.name_kk,
                    name_ru: catItem.name_ru,
                    sort_order: catItem.sort_order
                }
            });

            if (category.name_ru !== catItem.name_ru || category.sort_order !== catItem.sort_order) {
                await category.update({ name_ru: catItem.name_ru, sort_order: catItem.sort_order });
            }

            for (let i = 0; i < catItem.subcategories.length; i++) {
                const subItem = catItem.subcategories[i];
                const sortOrder = i + 1;
                const [sub] = await QuestionSubcategory.findOrCreate({
                    where: {
                        categoryId: category.id,
                        name_kk: subItem.name_kk
                    },
                    defaults: {
                        categoryId: category.id,
                        name_kk: subItem.name_kk,
                        name_ru: subItem.name_ru,
                        sort_order: sortOrder
                    }
                });
                if (sub.name_ru !== subItem.name_ru || sub.sort_order !== sortOrder) {
                    await sub.update({ name_ru: subItem.name_ru, sort_order: sortOrder });
                }
                totalSubcategories++;
            }
        }
        console.log(`✅ Seeded ${seedData.length} categories and ${totalSubcategories} subcategories`);

        // 4. Clean up ONLY the 3 old standalone tests requested by the user
        const targetTitles = [
            '1 - ТЕСТ (математика)',
            '2 - ТЕСТ (математика)',
            '3 - ТЕСТ (математика)'
        ];
        const testsToDelete = await Test.findAll({
            where: {
                is_standalone: true,
                lessonId: null,
                title: targetTitles
            }
        });

        if (testsToDelete.length > 0) {
            const idsToDelete = testsToDelete.map(t => t.id);
            console.log('Deleting 3 old standalone tests:', testsToDelete.map(t => ({ id: t.id, title: t.title })));

            await UserTests.destroy({ where: { TestId: idsToDelete } });
            await Result.destroy({ where: { TestId: idsToDelete } });
            await Question.destroy({ where: { TestId: idsToDelete } });
            await Test.destroy({ where: { id: idsToDelete } });

            console.log(`✅ Deleted ${idsToDelete.length} old standalone tests and their linked records`);
        } else {
            console.log('ℹ️ Old 3 standalone tests already cleaned up (0 found)');
        }

        // Snapshot counts AFTER
        const afterCounts = {
            users: await User.count(),
            courses: await Course.count(),
            lessons: await Lesson.count(),
            lessonTests: await Test.count({ where: { is_standalone: false } }),
            standaloneTests: await Test.count({ where: { is_standalone: true } }),
            questionCategories: await QuestionCategory.count(),
            questionSubcategories: await QuestionSubcategory.count()
        };
        console.log('Counts AFTER migration:', afterCounts);
        console.log('🎉 Migration completed safely!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

migrate();

