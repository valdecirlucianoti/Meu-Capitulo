const pool = require('./config/database');

const query = (text, params = []) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query
};