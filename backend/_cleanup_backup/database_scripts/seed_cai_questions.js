const { CaiQuestion } = require('./models');
const sequelize = require('./config/db');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('--- Connected to Database ---');

        // Step 1: Clear existing questions
        await CaiQuestion.destroy({ where: {}, truncate: false });
        console.log('--- Existing CAI questions cleared ---');

        // Step 2: Insert 33 exact questions
        const questions = [
            { cai_code: 'CAI-001', question_text: 'Check the automatic mechanism of door for smooth functioning.' },
            { cai_code: 'CAI-002', question_text: 'Check all the elements of door mechanism for good condition and working like Shaft, pneumatic cylinder, LM bearings, elastic rope toothed belt, mountings and brackets' },
            { cai_code: 'CAI-003', question_text: 'Dismantle the mechanism if not working smoothly and replace or repair the defective element.' },
            { cai_code: 'CAI-004', question_text: 'Reassemble the mechanism and check for proper working.' },
            { cai_code: 'CAI-005', question_text: 'Check the door flaps for bent, broken or externally damage and repair or replace the defective door flap.' },
            { cai_code: 'CAI-006', question_text: 'Check the door flap element like inner & outer locking handle, locking pin, glass and glass frame, male & female hand safe gasket, moldings, mountings, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door flap.' },
            { cai_code: 'CAI-007', question_text: 'Check the guide rail for bent, corroded & damage. Repair or replace if required.' },
            { cai_code: 'CAI-008', question_text: 'Check the Key locking arrangement for good condition and working.' },
            { cai_code: 'CAI-009', question_text: 'Provide suitable lubricate on guide shaft for smooth working.' },

            { cai_code: 'CAI-010', question_text: 'Check the automatic mechanism of door for smooth functioning.' },
            { cai_code: 'CAI-011', question_text: 'Check all the elements of door mechanism for good condition and working like Shaft, pneumatic cylinder, LM bearings, elastic rope, mountings and brackets' },
            { cai_code: 'CAI-012', question_text: 'Dismantle the mechanism if not working smoothly and replace or repair the defective element.' },
            { cai_code: 'CAI-013', question_text: 'Reassemble the mechanism and check for proper working.' },
            { cai_code: 'CAI-014', question_text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.' },
            { cai_code: 'CAI-015', question_text: 'Check the door element like inner & outer handle, glass and glass rubber profile, hand safe gasket, moldings, mountings ,rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.' },
            { cai_code: 'CAI-016', question_text: 'Check the ventilation grill for intact and good condition.' },
            { cai_code: 'CAI-017', question_text: 'Check the Key locking arrangement and barrel bolt for good condition and working.' },
            { cai_code: 'CAI-018', question_text: 'Provide suitable lubricate on guide shaft for smooth working.' },

            { cai_code: 'CAI-019', question_text: 'Check the door for bent, broken or externally damage and repair or replace the defective door.' },
            { cai_code: 'CAI-020', question_text: 'Check the door element like inner & outer handle, hand safe gasket, middle hinge gasket, door frame moldings, upper & lower pivot, roller assembly, rivets etc. for bent, broken or externally damage and repair or replace the defective element of door.' },
            { cai_code: 'CAI-021', question_text: 'Check the roller guide for bent, corroded, damage or loose fitted. Repair or replace if found defective and ensure for correct fitting and secured firmly.' },
            { cai_code: 'CAI-022', question_text: 'Check carefully the door locking arrangement for smooth working and ensure upper connecting rod is working properly. If found defective disassemble the door , take out the lock assembly and repair or replace the defective element/ lock assembly.' },
            { cai_code: 'CAI-023', question_text: 'Check the housing (FRP panel) of upper pivot for damage, broken or loose fitted. If found repair with good ideas and tighten the screws of upper pivot plate.' },
            { cai_code: 'CAI-024', question_text: 'Check the all other fittings like Inside extra handle, coat hook and barrel bolt are in good condition and secured properly.' },
            { cai_code: 'CAI-025', question_text: 'If the doors are provided with slide lock and turn over latch , check the condition of sliding rod for bent or damage and turn over latch for bent, broken or damage and replace the defective parts.' },
            { cai_code: 'CAI-026', question_text: 'Provide suitable lubricate on roller guide for smooth working.' },

            { cai_code: 'CAI-027', question_text: 'Check the door for bent, broken, shifting of outer sheet or externally damage. If found repair or replace the defective door.' },
            { cai_code: 'CAI-028', question_text: 'Check the door element like inner & outer handle, hand safe gasket, facing brick gasket, outer gasket, door frame moldings, upper & lower pivot, rivets etc. for bent, broken or externally damage, repair or replace the defective element of door.' },
            { cai_code: 'CAI-029', question_text: 'Check carefully the door locking arrangement for smooth working and ensure upper & lower connecting rod is working properly. If found defective, disassemble the inner handle & cover of locking assembly and repair or replace the defective element/ lock assembly.' },
            { cai_code: 'CAI-030', question_text: 'Check the all other fittings like lower lock mounting, upper lock stopper, Nylon door stopper and barrel bolt are in good condition and secured properly.' },
            { cai_code: 'CAI-031', question_text: 'If the doors are provided with flap, check the condition of arm cylinder, stopper, flap and door panel for bent, damage or broken, repair or replace the defective parts.' },
            { cai_code: 'CAI-032', question_text: 'If the window glass of door is found broken or cracked , change the glass as per procedure.' },
            { cai_code: 'CAI-033', question_text: 'Repaint the doors from inside and out side.' }
        ];

        await CaiQuestion.bulkCreate(questions);
        console.log('--- 33 questions seeded successfully ---');

        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
}

seed();
