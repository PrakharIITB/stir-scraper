const knex = require('knex');
require('dotenv').config();

const knexConfig = {
    client: 'pg',
    connection: {
      host: process.env.PG_HOST,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      port: process.env.PG_PORT,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,               // Minimum number of connections in the pool
      max: 10,              // Maximum number of connections in the pool
      idleTimeoutMillis: 30000 // 30 seconds idle timeout for connections
    },
  };

const db = knex(knexConfig);

module.exports = db;
