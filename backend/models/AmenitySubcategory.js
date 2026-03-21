const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('AmenitySubcategory', {
        name: { type: DataTypes.STRING, allowNull: false },
        category_id: { type: DataTypes.INTEGER, allowNull: false },
        requires_compartment: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, { tableName: 'amenity_subcategories', timestamps: false });
};
