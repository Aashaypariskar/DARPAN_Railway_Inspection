const { Question, Reason } = require('./models');

async function seed() {
    try {
        console.log('--- CLEANING SICK LINE QUESTIONS ---');
        await Question.destroy({
            where: { section_code: 'SS1-C' }
        });

        const questions = [
            // VESTIBULE DOORS
            { text: 'Check condition of vestibule door for hinges, spigot and hinges', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', display_order: 1 },
            { text: 'Attention to the vestibule door if found loose hinges/spigot', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', display_order: 2 },
            { text: 'Replacement of Defective/broken hinges/spigot of vestibule door', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', display_order: 3 },
            { text: 'Check condition of vestibule door glass and rubber profile', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', display_order: 4 },
            { text: 'Vestibule door rubber profile found torn to be replaced', item_name: 'VESTIBULE DOORS', section_code: 'SS1-C', display_order: 5 },

            // SLIDING DOORS
            { text: 'Check availability /working of sliding door latches & stoppers', item_name: 'SLIDING DOORS', section_code: 'SS1-C', display_order: 10 },
            { text: 'Attention to the loose sliding door latches and stoppers', item_name: 'SLIDING DOORS', section_code: 'SS1-C', display_order: 11 },
            { text: 'Fitment of new sliding door latches and stoppers', item_name: 'SLIDING DOORS', section_code: 'SS1-C', display_order: 12 },
            { text: 'Check function and condition of sliding door spigot', item_name: 'SLIDING DOORS', section_code: 'SS1-C', display_order: 13 },

            // WASH BASIN
            { text: 'Check for leakage in wash basin plumbing', item_name: 'WASH BASIN', section_code: 'SS1-C', display_order: 20 },
            { text: 'Check condition of wash basin and mirror', item_name: 'WASH BASIN', section_code: 'SS1-C', display_order: 21 },
            { text: 'Attention to loose wash basin fittings', item_name: 'WASH BASIN', section_code: 'SS1-C', display_order: 22 },

            // WINDOWS
            { text: 'Check condition of window glass and shutters', item_name: 'WINDOWS', section_code: 'SS1-C', display_order: 30 },
            { text: 'Check for proper sealing of windows', item_name: 'WINDOWS', section_code: 'SS1-C', display_order: 31 },

            // SEATS & BERTHS
            { text: 'Check condition of seats and berths for any damage', item_name: 'SEATS & BERTHS', section_code: 'SS1-C', display_order: 40 },
            { text: 'Check for availability of snack trays and bottle holders', item_name: 'SEATS & BERTHS', section_code: 'SS1-C', display_order: 41 },
            { text: 'Attention to loose berth fittings', item_name: 'SEATS & BERTHS', section_code: 'SS1-C', display_order: 42 }
        ];

        console.log(`Seeding ${questions.length} questions...`);
        const createdQs = await Question.bulkCreate(questions);

        // Add default reasons for all boolean questions
        for (const q of createdQs) {
            const reasons = ['Broken', 'Missing', 'Loose', 'Damaged', 'Not Working', 'Leakage'];
            await Reason.bulkCreate(reasons.map(r => ({ question_id: q.id, text: r })));
        }

        console.log('--- SEEDING COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
