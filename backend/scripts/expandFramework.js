const { sequelize, CategoryMaster, Category, LtrSchedule, AmenitySubcategory, Activity, Question, User, UserCategory } = require('../models');

async function expand() {
    try {
        console.log('--- STARTING FRAMEWORK EXPANSION ---');

        // 1. Schema Updates (Using raw queries for speed and safety)
        const queryInterface = sequelize.getQueryInterface();

        // Add columns to questions
        console.log('Updating questions table...');
        const qTable = await queryInterface.describeTable('questions');
        if (!qTable.schedule_id) await queryInterface.addColumn('questions', 'schedule_id', { type: require('sequelize').DataTypes.INTEGER, allowNull: true });
        if (!qTable.subcategory_id) await queryInterface.addColumn('questions', 'subcategory_id', { type: require('sequelize').DataTypes.INTEGER, allowNull: true });
        if (!qTable.specified_value) await queryInterface.addColumn('questions', 'specified_value', { type: require('sequelize').DataTypes.STRING, allowNull: true });

        // Add columns to activities
        console.log('Updating activities table...');
        const aTable = await queryInterface.describeTable('activities');
        if (!aTable.subcategory_id) await queryInterface.addColumn('activities', 'subcategory_id', { type: require('sequelize').DataTypes.INTEGER, allowNull: true });

        // Add columns to inspection_answers snapshots
        console.log('Updating inspection_answers table...');
        const ansTable = await queryInterface.describeTable('inspection_answers');
        if (!ansTable.subcategory_name) await queryInterface.addColumn('inspection_answers', 'subcategory_name', { type: require('sequelize').DataTypes.STRING(100), allowNull: true });
        if (!ansTable.schedule_name) await queryInterface.addColumn('inspection_answers', 'schedule_name', { type: require('sequelize').DataTypes.STRING(100), allowNull: true });

        // 2. Create Indexes
        console.log('Creating indexes...');
        // Note: Simple try-catch for index creation in case they exist
        try { await sequelize.query('CREATE INDEX idx_questions_schedule_id ON questions(schedule_id)'); } catch (e) { }
        try { await sequelize.query('CREATE INDEX idx_questions_activity_id ON questions(activity_id)'); } catch (e) { }
        try { await sequelize.query('CREATE INDEX idx_questions_subcategory_id ON questions(subcategory_id)'); } catch (e) { }

        // 3. Sync Tables (Ensures ltr_schedules and amenity_subcategories exist)
        await sequelize.sync();

        // 4. Seed Categories
        console.log('Seeding Master Categories...');
        const [ltrCatMaster] = await CategoryMaster.findOrCreate({ where: { name: 'Ltr to Railways' } });
        const [amenityCatMaster] = await CategoryMaster.findOrCreate({ where: { name: 'Amenity' } });

        // 5. Seed Ltr Schedules
        console.log('Seeding Ltr Schedules...');
        const schedules = ['D1 Schedule', 'D2 Schedule', 'D3 Schedule', 'Shop Schedule', 'Failure Investigation'];
        for (const sName of schedules) {
            await LtrSchedule.findOrCreate({ where: { name: sName, category_id: ltrCatMaster.id } });
        }

        // 6. Seed Amenity Subcategories
        console.log('Seeding Amenity Subcategories...');
        const subs = [
            'Exterior', 'Interior Passenger Area', 'Toilets',
            'Doors & Windows', 'Electrical Fittings', 'Berths & Seats',
            'Flooring', 'Pantry Area', 'Luggage Racks'
        ];
        for (const subName of subs) {
            await AmenitySubcategory.findOrCreate({ where: { name: subName, category_id: amenityCatMaster.id } });
        }

        // 7. Insert Ltr Questions (Sample for D1 Schedule)
        const d1 = await LtrSchedule.findOne({ where: { name: 'D1 Schedule' } });
        if (d1) {
            const ltrQs = [
                { text: 'Apply brake and measure brake cylinder pressure', spec: '3.0 ± 0.1 kg/cm²' },
                { text: 'Ensure free movement of brake calipers', spec: 'Movement should be free' },
                { text: 'Check brake pad wear thickness', spec: 'Pad thickness ≥ 10mm' },
                { text: 'Inspect brake hoses for leakage', spec: 'No leakage allowed' },
                { text: 'Test WSP self-diagnostics', spec: 'Error code 99 (OK)' },
                { text: 'Inspect WSP connectors for water ingress', spec: 'Dry and clean' },
                { text: 'Verify dump valve functionality', spec: 'Correct venting' },
                { text: 'Check pressure switch calibration', spec: 'Correct Trip point' },
                { text: 'Inspect speed sensors', spec: 'Physical integrity' },
                { text: 'Measure sensor-to-wheel gap', spec: '0.9mm to 1.1mm' },
                { text: 'Download WSP failure logs', spec: 'Logs retrieved' }
            ];

            for (const qData of ltrQs) {
                await Question.findOrCreate({
                    where: { text: qData.text, schedule_id: d1.id },
                    defaults: { specified_value: qData.spec }
                });
            }
        }

        // 8. Assign new categories to Admin (Safety for testing)
        console.log('Assigning categories to Admin...');
        const admin = await User.findOne({ where: { email: 'admin@inspection.com' } });
        if (admin) {
            const { UserCategory } = require('../models');
            await UserCategory.findOrCreate({ where: { user_id: admin.id, category_id: ltrCatMaster.id } });
            await UserCategory.findOrCreate({ where: { user_id: admin.id, category_id: amenityCatMaster.id } });
        }

        console.log('--- FRAMEWORK EXPANSION COMPLETE ---');
        process.exit(0);

    } catch (err) {
        console.error('EXPANSION ERROR:', err);
        process.exit(1);
    }
}

expand();
