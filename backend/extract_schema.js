const mysql = require('mysql2/promise');
const fs = require('fs');

async function extractSchema() {
  const connection = await mysql.createConnection({
    host: '3.110.16.111',
    port: 3307,
    user: 'railway_user',
    password: 'Railway@123',
    database: 'inspection_db'
  });

  const [tables] = await connection.query('SHOW TABLES');
  const schema = {};

  for (const tableObj of tables) {
    const tableName = Object.values(tableObj)[0];
    const [columns] = await connection.query(`DESCRIBE ${tableName}`);
    const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
    schema[tableName] = { columns, indexes };
  }

  fs.writeFileSync('db_schema.json', JSON.stringify(schema, null, 2));
  await connection.end();
  console.log('Schema extracted to db_schema.json');
}

extractSchema().catch(console.error);
