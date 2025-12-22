const { sequelize } = require('../models');

async function clearDatabase() {
    try {
        console.log('Disabling foreign key checks...');
        await sequelize.query('PRAGMA foreign_keys = OFF;');

        console.log('Clearing all tables...');
        const models = Object.values(sequelize.models);

        for (const model of models) {
            console.log(`Clearing table: ${model.tableName}`);
            await model.destroy({ truncate: true, cascade: true });
        }

        console.log('Enabling foreign key checks...');
        await sequelize.query('PRAGMA foreign_keys = ON;');

        console.log('Database cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
