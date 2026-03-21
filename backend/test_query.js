const sequelize = require('./config/db');
const ReportQueryService = require('./services/ReportQueryService');

async function test() {
    try {
        console.log('Testing getRecentSessions...');
        const filters = {
            fromDate: '2020-01-01',
            toDate: '2030-01-01',
            page: 1,
            limit: 50
        };
        const results = await ReportQueryService.getRecentSessions(filters);
        console.log('Results (History):', results.data?.length || 0);
        if (results.data && results.data.length > 0) {
            console.log('First Record Sample:', results.data[0]);
        }

        console.log('\nTesting getSummaryReport...');
        const summary = await ReportQueryService.getSummaryReport(filters);
        console.log('Summary:', summary);

        console.log('\nTesting getAgingReport...');
        const aging = await ReportQueryService.getAgingReport(filters);
        console.log('Aging:', aging.data?.length || 0);

        console.log('\nTesting getRepeatedReport...');
        const repeated = await ReportQueryService.getRepeatedReport(filters);
        console.log('Repeated:', repeated.data?.length || 0);

        console.log('\nTesting getInspectorReport...');
        const inspectors = await ReportQueryService.getInspectorReport(filters);
        console.log('Inspectors:', inspectors.data?.length || 0);

    } catch (err) {
        console.error('QUERY FAILED:', err);
    } finally {
        await sequelize.close();
    }
}

test();
