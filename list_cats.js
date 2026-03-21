const { CategoryMaster } = require('./backend/models');
async function list() {
    const cats = await CategoryMaster.findAll();
    console.log(cats.map(c => c.name));
    process.exit(0);
}
list();
