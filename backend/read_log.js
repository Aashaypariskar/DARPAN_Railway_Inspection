const fs = require('fs');
const content = fs.readFileSync('debug_mysql_output.txt', 'utf8');
console.log(content);
