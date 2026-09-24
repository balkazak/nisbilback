/**
 * Migration: Add NIS category to Tests and question_type to Questions
 * 
 * Run this once to add the new ENUM value and column:
 *   node scripts/migrate_nis_category.js
 */
const { sequelize } = require('../models');

async function migrate() {
    const dialect = sequelize.getDialect();
    console.log('Running NIS category migration on dialect:', dialect);

    try {
        if (dialect === 'postgres') {
            // 1. Add 'nis' to the Tests category ENUM
            console.log('Adding NIS to category ENUM...');
            try {
                await sequelize.query(`ALTER TYPE "enum_Tests_category" ADD VALUE IF NOT EXISTS 'nis';`);
                console.log('✅ Added nis to enum_Tests_category');
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('nis value already exists in enum, skipping...');
                } else {
                    console.error('Warning adding ENUM value:', err.message);
                }
            }

            // 2. Create the question_type ENUM type
            console.log('Creating question_type ENUM...');
            try {
                await sequelize.query(`CREATE TYPE "enum_Questions_question_type" AS ENUM ('standard', 'sandyk_sippattama');`);
                console.log('✅ Created enum_Questions_question_type');
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('enum_Questions_question_type already exists, skipping...');
                } else {
                    console.error('Warning creating ENUM type:', err.message);
                }
            }

            // 3. Add question_type column to Questions table
            console.log('Adding question_type column to Questions...');
            try {
                await sequelize.query(`ALTER TABLE "Questions" ADD COLUMN "question_type" "enum_Questions_question_type" DEFAULT 'standard';`);
                console.log('✅ Added question_type column');
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('question_type column already exists, skipping...');
                } else {
                    console.error('Warning adding column:', err.message);
                }
            }
        } else if (dialect === 'sqlite') {
            // SQLite doesn't support ENUMs natively, Sequelize handles it as TEXT
            console.log('SQLite detected — adding question_type column...');
            try {
                await sequelize.query('ALTER TABLE Questions ADD COLUMN question_type VARCHAR(50) DEFAULT "standard";');
                console.log('✅ Added question_type column to Questions (SQLite)');
            } catch (err) {
                if (err.message.includes('duplicate column')) {
                    console.log('question_type column already exists, skipping...');
                } else {
                    console.error('Warning:', err.message);
                }
            }
        }

        console.log('\n🎉 Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sequelize.close();
    }
}

migrate();
