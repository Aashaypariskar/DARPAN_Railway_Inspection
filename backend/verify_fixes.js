const { InspectionAnswer, User, Role, sequelize } = require('./models');
const ReportingProjectionService = require('./services/ReportingProjectionService');
const AdminController = require('./controllers/AdminController');

async function verify() {
    try {
        console.log('--- VERIFYING AMENITY REPORT FIX ---');
        // Find a session ID that has AMENITY module_type
        const sample = await InspectionAnswer.findOne({
            where: { module_type: 'AMENITY' },
            attributes: ['session_id'],
            raw: true
        });

        if (sample) {
            console.log(`Projecting sample Amenity session: ${sample.session_id}`);
            await ReportingProjectionService.projectSession(sample.session_id, 'AMENITY');
            
            // Check if reporting_answers was populated
            const [report] = await sequelize.query(
                'SELECT count(*) as count FROM reporting_answers ra JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id WHERE rs.source_session_id = :sid AND rs.module_type = "AMENITY"',
                { replacements: { sid: sample.session_id }, type: sequelize.QueryTypes.SELECT }
            );
            console.log(`Reporting answers count for session ${sample.session_id}:`, report.count);
        } else {
            console.log('No Amenity sessions found to test projection.');
        }

        console.log('\n--- VERIFYING USER FEATURES ---');
        // Mock request for createUser
        const req = {
            body: {
                name: 'Test Client',
                email: 'client@test.com',
                phone_number: '1234567890',
                role_id: 1 // Admin role
            },
            user: { id: 1 } // Mock admin user
        };
        const res = {
            status: function(s) { this.statusCode = s; return this; },
            json: function(data) { this.data = data; return this; }
        };

        // Note: AdminController needs a transaction or mock sequelize, but it imports it.
        // I'll just manually check the model creation to be safe and avoid side effects in a script that might fail.
        
        console.log('Testing create user logic handle phone and password generation...');
        // We can just call it if we mock the req.user correctly and have a Super Admin id.
        // Let's check the users first.
        const admin = await User.findOne({ include: [Role] });
        if (admin) {
            req.user.id = admin.id;
            await AdminController.createUser(req, res);
            console.log('Create User response:', JSON.stringify(res.data, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
