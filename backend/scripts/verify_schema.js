const sequelize = require('../config/db');
const Models = require('../models');

async function verifySchema() {
    // Part 1: Sequelize Models
    const modelsToVerify = [
        { name: 'InspectionAnswer', model: Models.InspectionAnswer },
        { name: 'CaiAnswer', model: Models.CaiAnswer },
        { name: 'CommissionaryAnswer', model: Models.CommissionaryAnswer },
        { name: 'SickLineAnswer', model: Models.SickLineAnswer },
        { name: 'PitLineSession', model: Models.PitLineSession },
        { name: 'WspSession', model: Models.WspSession }
    ];

    let failures = [];

    for (const item of modelsToVerify) {
        try {
            if (!item.model) {
                failures.push(`MODEL NOT FOUND: ${item.name}`);
                continue;
            }
            const table = await sequelize.getQueryInterface().describeTable(item.model.tableName);
            const modelAttributes = item.model.rawAttributes;

            const missingInDb = Object.keys(modelAttributes).filter(attr => {
                const fieldName = modelAttributes[attr].field || attr;
                return !table[fieldName];
            });
            
            if (missingInDb.length > 0) {
                failures.push(`${item.name} (${item.model.tableName}) missing columns: ${missingInDb.join(', ')}`);
            }
        } catch (err) {
            failures.push(`FAILED TO VERIFY ${item.name}: ${err.message}`);
        }
    }

    const rawTables = ['reporting_sessions', 'reporting_answers'];
    for (const tableName of rawTables) {
        try {
            await sequelize.getQueryInterface().describeTable(tableName);
        } catch (err) {
            failures.push(`TABLE NOT FOUND: ${tableName}`);
        }
    }

    if (failures.length === 0) {
        console.log('✅ SCHEMA CONSISTENCY VERIFIED');
        process.exit(0);
    } else {
        console.error('❌ SCHEMA FAILURES:\n' + failures.join('\n'));
        process.exit(1);
    }
}

verifySchema();
