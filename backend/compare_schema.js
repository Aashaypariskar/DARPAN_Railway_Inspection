const fs = require('fs');
const path = require('path');

// Mock Sequelize DataTypes for evaluation
const DataTypes = {
    STRING: 'STRING',
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    DATE: 'DATE',
    DATEONLY: 'DATEONLY',
    BOOLEAN: 'BOOLEAN',
    JSON: 'JSON',
    ENUM: (...args) => `ENUM(${args.join(',')})`,
    FLOAT: 'FLOAT',
    DECIMAL: 'DECIMAL'
};

const extractedSchema = JSON.parse(fs.readFileSync('db_schema.json', 'utf8'));
const modelsDir = path.join(__dirname, 'models');
const results = { mismatches: [], missingInDB: [], missingInModel: [] };

function mapType(mysqlType) {
    mysqlType = mysqlType.toLowerCase();
    if (mysqlType.includes('int')) return 'INTEGER';
    if (mysqlType.includes('varchar')) return 'STRING';
    if (mysqlType.includes('text')) return 'TEXT';
    if (mysqlType.includes('datetime')) return 'DATE';
    if (mysqlType.includes('date')) return 'DATEONLY';
    if (mysqlType.includes('tinyint(1)')) return 'BOOLEAN';
    if (mysqlType.includes('json')) return 'JSON';
    if (mysqlType.includes('enum')) return 'ENUM';
    return mysqlType.toUpperCase();
}

// Focus on core models defined in index.js for now or individual files
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

// Add index.js as it contains many core models
const indexContent = fs.readFileSync(path.join(modelsDir, 'index.js'), 'utf8');

function processModel(tableName, schema) {
    const dbTable = extractedSchema[tableName];
    if (!dbTable) {
        results.missingInDB.push(tableName);
        return;
    }

    const dbColumns = dbTable.columns.reduce((acc, col) => {
        acc[col.Field] = col;
        return acc;
    }, {});

    Object.keys(schema).forEach(field => {
        const modelCol = schema[field];
        const dbCol = dbColumns[field];

        if (!dbCol) {
            results.missingInModel.push({ table: tableName, column: field, reason: 'Missing in DB' });
            return;
        }

        const expectedType = mapType(dbCol.Type);
        const actualType = modelCol.type || modelCol;
        
        const actualTypeStr = typeof actualType === 'string' ? actualType : (actualType.key || (actualType.toString && actualType.toString()) || 'UNKNOWN');

        if (!actualTypeStr.includes(expectedType) && !(expectedType === 'BOOLEAN' && actualTypeStr.includes('INTEGER'))) {
             results.mismatches.push({
                table: tableName,
                column: field,
                expected: expectedType,
                actual: actualTypeStr
            });
        }
    });
}

// Very basic extraction for index.js direct defines
const defineRegex = /const (\w+) = sequelize\.define\('(\w+)', (\{[\s\S]+?\}), (\{[\s\S]+?tableName: '(\w+)'[\s\S]+?\})\);/g;
let match;
while ((match = defineRegex.exec(indexContent)) !== null) {
    try {
        const tableName = match[5];
        // We'd need a real JS parser to safely eval the schema object, 
        // but let's try a simpler approach if possible.
        // For now, we'll stick to the individual files more reliably.
    } catch (e) {}
}


modelFiles.forEach(file => {

    } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
    }
});

fs.writeFileSync('drift_audit.json', JSON.stringify(results, null, 2));
console.log('Drift audit complete. Results in drift_audit.json');
