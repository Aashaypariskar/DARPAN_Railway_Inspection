const { Reason } = require('../models');

/**
 * ReasonController - Admin CRUD for Failure Reasons
 */

// GET /api/reasons?question_id=X
exports.getReasonsByQuestion = async (req, res) => {
    try {
        const { question_id } = req.query;
        if (!question_id) {
            return res.status(400).json({ success: false, error: 'question_id is required' });
        }

        const reasons = await Reason.findAll({
            where: { question_id },
            order: [['id', 'ASC']]
        });

        if (reasons.length === 0) {
            console.warn(`[WARNING] No reasons found for question ID: ${question_id}`);
        }

        res.json({
            success: true,
            reasons: reasons
        });
    } catch (error) {
        console.error('Get Reasons Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reasons' });
    }
};

// POST /api/admin/reason
exports.createReason = async (req, res) => {
    try {
        console.log('[DEBUG] createReason Body:', req.body);
        const { question_id, text } = req.body;

        if (!question_id || !text) {
            return res.status(400).json({ error: 'question_id and text are required' });
        }

        const reason = await Reason.create({
            question_id,
            text: text.trim()
        });

        res.status(201).json(reason);
    } catch (error) {
        console.error('Create Reason Error:', error);
        res.status(500).json({ error: 'Failed to create reason' });
    }
};

// PUT /api/admin/reason/:id
exports.updateReason = async (req, res) => {
    try {
        console.log('[DEBUG] updateReason ID:', req.params.id, 'Body:', req.body);
        const { id } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const reason = await Reason.findByPk(id);
        if (!reason) {
            return res.status(404).json({ error: 'Reason not found' });
        }

        reason.text = text.trim();
        await reason.save();

        res.json(reason);
    } catch (error) {
        console.error('Update Reason Error:', error);
        res.status(500).json({ error: 'Failed to update reason' });
    }
};

// DELETE /api/admin/reason/:id
exports.deleteReason = async (req, res) => {
    try {
        console.log('[DEBUG] deleteReason ID:', req.params.id);
        const { id } = req.params;

        const reason = await Reason.findByPk(id);
        if (!reason) {
            return res.status(404).json({ error: 'Reason not found' });
        }

        await reason.destroy();
        res.json({ message: 'Reason deleted successfully' });
    } catch (error) {
        console.error('Delete Reason Error:', error);
        res.status(500).json({ error: 'Failed to delete reason' });
    }
};
