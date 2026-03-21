const { AmenityItem } = require('../models');

/**
 * CommonController - Shared Read-Only Logic
 * Strictly isolated from domain-specific controllers.
 */

exports.getSubcategoryMetadata = async (req, res) => {
    try {
        const { subcategory_id } = req.query;
        if (!subcategory_id) {
            return res.status(400).json({ error: 'subcategory_id is required' });
        }

        // Check if any AmenityItem under this subcategory has activity_type NOT NULL
        // This determines if the UI should show Major/Minor tabs
        const items = await AmenityItem.findAll({
            where: { subcategory_id }
        });

        const supportsActivityType = items.some(item => item.activity_type !== null);

        res.json({
            supportsActivityType
        });
    } catch (err) {
        console.error('Metadata Error:', err);
        res.status(500).json({ error: 'Failed to fetch subcategory metadata' });
    }
};
