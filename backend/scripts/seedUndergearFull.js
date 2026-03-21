const { sequelize, Question } = require('../models');
const { DataTypes } = require('sequelize');

// Temporary model for deficiency_reasons since it doesn't have an explicit exported model in index.js
const DeficiencyReason = sequelize.define('DeficiencyReason', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING(255), allowNull: true },
    reason_text: { type: DataTypes.STRING(255), allowNull: false }
}, {
    tableName: 'deficiency_reasons',
    timestamps: false
});

async function seed() {
    const transaction = await sequelize.transaction();
    try {
        console.log('--- STARTING UNDERGEAR FULL DB INTEGRATION SEEDING ---');

        const qTexts = [
            '1. Visual check longitudinal beams, cross beams & bolster for cracks, damages and corrosion.',
            '2. Visual check brake supports, damper supports, traction centre supports and anti-roll bar supports for cracks, damages and corrosion.',
            '3. Check bogie bolster sub-assembly and brackets for cracks, damages and corrosion.',
            '4. Wash bogie frame thoroughly with water jet ensuring water is not directed towards pneumatic/electrical connections and axle bearings.',
            '5. Examine bogie frame for corrosion/damage at critical locations like lower web and yaw damper bracket.',
            '6. Lubricate brake levers, fixings and all moving parts.',
            '7. Check air pipes and connections for tightness manually by listening for escaping air (hissing sound).',
            '8. Check brake pad wear. New pad width 35mm, minimum allowable depth 7mm. Replace if required.',
            '9. Check brake pads for damage and presence of foreign objects.',
            '10. Check operation of passenger emergency valve.',
            '11. Visual check brake cylinders and brake levers for damage, cracks and corrosion.',
            '12. Check functionality of self-adjusting mechanism using appropriate spanner.',
            '13. Check play of brake pads in holders and monitor wear. Replace in full set formation if worn out.',
            '14. Check all fixing parts of air brake in bogies and underframe are properly secured.',
            '15. Thoroughly check all air pipes and connections are properly fixed with underframe.',
            '16. Remove dust and greasy material from brake calipers and actuators.',
            '17. Lubricate brake levers, pins and bushes ensuring no lubricant drops on brake disc.',
            '18. Visual check dampers for damage, cracks and oil leaks.',
            '19. Visual check damper fixings for loosening or missing components.',
            '20. Visual check rubber elements for cracks and ageing.',
            '21. Carry out bearing feeling for detection of hot bearing during rolling-in examination.',
            '22. Check axle box for grease leakage through weeping hole of control arm.',
            '23. Visual check wheels for cracks.',
            '24. Drain 60 & 150 L air reservoirs of air spring and check isolating and drain cock positions.',
            '25. Clean leveling valve filter as per OEM instructions.',
            '26. Check installation lever with inflated air spring for normal function and tighten all related nuts and brackets.',
            '27. Check and adjust air spring installation height (289mm to 294mm).',
            '28. Thoroughly check air spring bulging and leakage.',
            '29. Check air suspension pipes for leakage using soap water particularly at joints including ferrule joints.',
            '30. Remove external dust, mud and oil deposits from air spring FIBA and control equipment.',
            '31. Check square platform frame of bogie for cracks and deformation.',
            '32. Tighten air spring bottom plate bolts and nuts.',
            '33. Measure bogie clearances related to air spring.',
            '34. Visual examination of air spring for external damages.',
            '35. Check isolating cocks and drain cocks for proper positions.',
            '36. Inspect levelling valve, installation lever, duplex check valve and FIBA devices for leakage, damage or loosening.',
            '37. Clean dirt collector filter and bottom exhaust air filter with kerosene and refit.',
            '38. Ensure FIBA device, ASCE and air springs are not in isolated condition and functioning correctly.'
        ];

        let displayOrder = 1;
        for (const text of qTexts) {
            await Question.findOrCreate({
                where: {
                    text: text,
                    category: 'Undergear'
                },
                defaults: {
                    answer_type: 'BOOLEAN',
                    category: 'Undergear',
                    is_active: 1,
                    display_order: displayOrder
                },
                transaction
            });
            displayOrder++;
        }

        const reasons = [
            'Crack observed',
            'Corrosion observed',
            'Leakage detected',
            'Loose component',
            'Wear beyond limit',
            'Improper installation'
        ];

        for (const rText of reasons) {
            await DeficiencyReason.findOrCreate({
                where: {
                    category: 'Undergear',
                    reason_text: rText
                },
                defaults: {
                    category: 'Undergear',
                    reason_text: rText
                },
                transaction
            });
        }

        await transaction.commit();
        console.log('--- UNDERGEAR SEEDING COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('SEED ERROR:', err);
        if (transaction) await transaction.rollback();
        process.exit(1);
    }
}

seed();
