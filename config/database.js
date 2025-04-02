const mysql = require('mysql');

// Create connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin1',
  database: process.env.DB_NAME || 'file_manager'
});

// Connect
db.connect(err => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('MySQL Connected...');
});

module.exports = db;