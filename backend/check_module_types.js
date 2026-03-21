const { InspectionAnswer } = require('./models');
const { Op } = require('sequelize');

async function check() {
    const counts = await InspectionAnswer.findAll({
        attributes: ['module_type', [require('sequelize').fn('COUNT', 'id'), 'count']],
        group: ['module_type'],
        raw: true
    });
    console.log('InspectionAnswer module_type counts:', counts);
    
    const sample = await InspectionAnswer.findOne({
        where: { subcategory_name: { [Op.like]: '%Amenity%' } },
        raw: true
    });
    console.log('Sample Amenity record:', sample);
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
