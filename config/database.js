const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Required for Railway/Render
            }
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DATABASE_PATH || path.join(__dirname, '..', 'uploads', 'database.sqlite'),
        logging: false
    });

module.exports = sequelize;
