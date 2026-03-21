/**
 * migrate_coach_numbers.js
 *
 * One-time script: assigns a unique 6-digit coach number to every pitline coach
 * whose current coach_number does NOT already match ^[0-9]{6}$.
 *
 * Run once:
 *   node migrate_coach_numbers.js
 *
 * Safe to re-run — coaches already on 6-digit numbers are skipped.
 */

const { PitLineCoach } = require('./models');

const SIX_DIGIT_RE = /^[0-9]{6}$/;

async function migrate() {
    console.log('=== Coach Number Migration ===\n');

    // Load every pitline coach
    const all = await PitLineCoach.findAll({ order: [['id', 'ASC']] });

    const toUpdate = all.filter(c => !SIX_DIGIT_RE.test(c.coach_number));

    if (toUpdate.length === 0) {
        console.log('✅ All coaches already have valid 6-digit numbers. Nothing to do.');
        process.exit(0);
    }

    console.log(`Found ${toUpdate.length} coach(es) to migrate:\n`);

    // Build a set of already-used 6-digit numbers to avoid duplicates
    const usedNumbers = new Set(
        all
            .filter(c => SIX_DIGIT_RE.test(c.coach_number))
            .map(c => c.coach_number)
    );

    // Deterministic mapping from old name to 6-digit number
    // Uses a predictable base (100001) incremented per coach
    let counter = 100001;

    const getNext = () => {
        while (usedNumbers.has(String(counter))) {
            counter++;
        }
        const num = String(counter);
        usedNumbers.add(num);
        counter++;
        return num;
    };

    for (const coach of toUpdate) {
        const oldNumber = coach.coach_number;
        const newNumber = getNext();

        await coach.update({ coach_number: newNumber });
        console.log(`  Coach ID ${coach.id} (train ${coach.train_id}): "${oldNumber}" → ${newNumber}`);
    }

    console.log(`\n✅ Migration complete. ${toUpdate.length} coach(es) updated.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
