const { CaiSession, Coach } = require('./models');

async function debug() {
    try {
        const session = await CaiSession.findByPk(5, {
            include: [{ model: Coach }]
        });
        if (!session) {
            console.log("Session SES-5 not found");
        } else {
            console.log("SES-5 Details:", JSON.stringify(session, null, 2));
        }

        const coaches = await Coach.findAll({ where: { coach_number: '12321-A1' } });
        console.log("Coaches found for 12321-A1:", JSON.stringify(coaches, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

debug();
