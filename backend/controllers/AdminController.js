const { User, Role, CategoryMaster, UserCategory, AdminAuditLog, sequelize } = require('../models');

/**
 * 1. Create User API
 * POST /api/admin/create-user
 */
exports.createUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        let { name, email, password, role_id, category_ids, phone_number } = req.body;
        let generatedPassword = null;

        if (!name || !email || !role_id) {
            return res.status(400).json({ error: 'Missing required fields: name, email, role_id' });
        }

        if (!password) {
            generatedPassword = Math.random().toString(36).slice(-8);
            password = generatedPassword;
        }

        // 1. Role Hierarchy Check: Only Super Admins can create Admins
        const targetRole = await Role.findByPk(role_id);
        if (!targetRole) return res.status(400).json({ error: 'Invalid role' });

        const adminUser = await User.findByPk(req.user.id, { include: [Role] });
        if (targetRole.role_name === 'Admin' && adminUser.Role.role_name !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can create new Administrators.' });
        }
        if (targetRole.role_name === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Creation of additional Super Admin accounts is restricted at this level.' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ error: 'Email already in use' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone_number,
            role_id,
            status: 'Active'
        }, { transaction: t });

        // 2. Assign Categories with strict validation
        if (Array.isArray(category_ids) && category_ids.length > 0) {
            const validCategories = await CategoryMaster.findAll({ where: { id: category_ids } });
            if (validCategories.length !== category_ids.length) {
                await t.rollback();
                return res.status(400).json({ error: 'One or more category IDs are invalid.' });
            }
            const mappings = category_ids.map(catId => ({
                user_id: user.id,
                category_id: catId
            }));
            await UserCategory.bulkCreate(mappings, { transaction: t });
        }

        // 3. Audit Log (Snapshot Names)
        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: name,
            action_type: 'USER_CREATED',
            details: { email, role: targetRole.role_name, category_count: category_ids?.length || 0 }
        }, { transaction: t });

        await t.commit();

        // Fetch user with associations to return
        const createdUser = await User.findByPk(user.id, {
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: createdUser,
            generated_password: generatedPassword // Return this for the admin to copy
        });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

/**
 * 2. Get All Users (Excludes Deleted)
 * GET /api/admin/users
 */
exports.getUsers = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const users = await User.findAll({
            where: {
                status: { [Op.ne]: 'Deleted' }
            },
            attributes: ['id', 'name', 'email', 'phone_number', 'status', 'last_login', 'createdAt', 'role_id'],
            include: [
                { model: Role },
                { model: CategoryMaster, through: { attributes: [] } }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error('Get Users Error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * 2.1 Get Audit Logs (Paginated)
 * GET /api/admin/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await AdminAuditLog.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            total: count,
            pages: Math.ceil(count / limit),
            currentPage: page,
            logs: rows
        });
    } catch (err) {
        console.error('Audit Logs Error:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

/**
 * 3. Update User (Consolidated Atomic Update)
 * PUT /api/admin/user/:id
 */
exports.updateUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { name, email, role_id, category_ids, status, phone_number } = req.body;

        const user = await User.findByPk(id, { include: [Role] });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 1. Immutability Guard: Cannot modify DELETED users
        if (user.status === 'Deleted') {
            return res.status(400).json({ error: 'Cannot modify a deleted user record. Records are preserved for audit only.' });
        }

        const adminUser = await User.findByPk(req.user.id, { include: [Role] });
        const oldData = { name: user.name, role: user.Role?.role_name, status: user.status };

        // 2. Role Hierarchy Guard
        if (role_id && role_id != user.role_id) {
            const targetRole = await Role.findByPk(role_id);
            if (targetRole.role_name === 'Admin' && adminUser.Role.role_name !== 'SUPER_ADMIN') {
                await t.rollback();
                return res.status(403).json({ error: 'Only Super Admins can promote users to Administrator.' });
            }
            if (targetRole.role_name === 'SUPER_ADMIN') {
                await t.rollback();
                return res.status(403).json({ error: 'Role modification to Super Admin is restricted.' });
            }
            // Prevent demoting self from Admin
            if (req.user.id == id && user.Role.role_name === 'Admin') {
                await t.rollback();
                return res.status(403).json({ error: 'You cannot demote yourself from the Administrator role.' });
            }
            user.role_id = role_id;
        }

        // 3. Status Guard: Last Admin Protection
        if (status && status !== user.status) {
            if (req.user.id == id && (status === 'Inactive' || status === 'Deleted')) {
                await t.rollback();
                return res.status(400).json({ error: 'You cannot deactivate or delete your own account.' });
            }

            if (user.Role.role_name === 'Admin' || user.Role.role_name === 'SUPER_ADMIN') {
                const adminCount = await User.count({
                    where: { status: 'Active' },
                    include: [{ model: Role, where: { role_name: user.Role.role_name } }]
                });
                if (adminCount <= 1 && status !== 'Active') {
                    await t.rollback();
                    return res.status(400).json({ error: `Cannot deactivate the last active ${user.Role.role_name} account.` });
                }
            }
            user.status = status;
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone_number !== undefined) user.phone_number = phone_number;

        await user.save({ transaction: t });

        // 4. Category Syncing
        if (Array.isArray(category_ids)) {
            const validCategories = await CategoryMaster.findAll({ where: { id: category_ids } });
            if (validCategories.length !== category_ids.length) {
                await t.rollback();
                return res.status(400).json({ error: 'One or more category IDs are invalid.' });
            }
            await UserCategory.destroy({ where: { user_id: id }, transaction: t });
            if (category_ids.length > 0) {
                await UserCategory.bulkCreate(category_ids.map(cId => ({ user_id: id, category_id: cId })), { transaction: t });
            }
        }

        // 5. Audit Log
        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: user.name,
            action_type: 'USER_UPDATED',
            details: { before: oldData, after: { name: user.name, role_id, status: user.status, categories: category_ids } }
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Update User Error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

/**
 * 4. Deactivate User (Soft Delete to Inactive)
 * DELETE /api/admin/user/:id
 */
exports.deleteUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (req.user.id == id) {
            return res.status(400).json({ error: 'You cannot deactivate your own account.' });
        }

        const user = await User.findByPk(id, { include: [Role] });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.status === 'Deleted') return res.status(400).json({ error: 'User is already in a deleted state.' });

        // Last Admin Protection
        if (user.Role.role_name === 'Admin' || user.Role.role_name === 'SUPER_ADMIN') {
            const adminCount = await User.count({
                where: { status: 'Active' },
                include: [{ model: Role, where: { role_name: user.Role.role_name } }]
            });
            if (adminCount <= 1 && user.status === 'Active') {
                return res.status(400).json({ error: `Cannot deactivate the last active ${user.Role.role_name} account.` });
            }
        }

        const adminUser = await User.findByPk(req.user.id);
        user.status = 'Inactive';
        await user.save({ transaction: t });

        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: user.name,
            action_type: 'USER_DELETED', // Standardizing on status change
            details: { type: 'Deactivation', from: 'Active', to: 'Inactive' }
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'User deactivated successfully' });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Delete User Error:', err);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
};

/**
 * 4.1 Permanent Delete (Transition to 'Deleted' Status)
 * DELETE /api/admin/user/:id/permanent
 */
exports.permanentDeleteUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (req.user.id == id) return res.status(400).json({ error: 'You cannot delete your own account.' });

        const user = await User.findByPk(id, { include: [Role] });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Only Inactive users can be moved to Deleted
        if (user.status !== 'Inactive') {
            return res.status(400).json({ error: 'Only inactivated users can be moved to the Deleted state.' });
        }

        const adminUser = await User.findByPk(req.user.id);
        user.status = 'Deleted';
        await user.save({ transaction: t });

        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: user.name,
            action_type: 'USER_DELETED',
            details: { type: 'Permanent Deletion', from: 'Inactive', to: 'Deleted' }
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'User record moved to Deleted status successfully.' });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Permanent Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete user record' });
    }
};

/**
 * 5.1 Update User Categories (Specific Endpoint)
 * PUT /api/admin/user-categories/:id
 */
exports.updateUserCategories = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { category_ids } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.status === 'Deleted') {
            return res.status(400).json({ error: 'Cannot modify a deleted user record.' });
        }

        if (!Array.isArray(category_ids)) {
            return res.status(400).json({ error: 'category_ids must be an array.' });
        }

        const adminUser = await User.findByPk(req.user.id);

        // Category Syncing
        const validCategories = await CategoryMaster.findAll({ where: { id: category_ids } });
        if (validCategories.length !== category_ids.length) {
            await t.rollback();
            return res.status(400).json({ error: 'One or more category IDs are invalid.' });
        }

        await UserCategory.destroy({ where: { user_id: id }, transaction: t });
        if (category_ids.length > 0) {
            await UserCategory.bulkCreate(category_ids.map(cId => ({ user_id: id, category_id: cId })), { transaction: t });
        }

        // Audit Log
        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: user.name,
            action_type: 'CATEGORY_UPDATED',
            details: { category_ids }
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'User categories updated successfully' });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Update User Categories Error:', err);
        res.status(500).json({ error: 'Failed to update user categories' });
    }
};

/**
 * 5. Reset User Password
 * PUT /api/admin/user/:id/reset-password
 */
exports.resetUserPassword = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.status === 'Deleted') return res.status(400).json({ error: 'Cannot reset password for a deleted user.' });

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save({ transaction: t });

        const adminUser = await User.findByPk(req.user.id);
        await AdminAuditLog.create({
            admin_id: req.user.id,
            admin_name_snapshot: adminUser.name,
            target_user_id: user.id,
            target_user_name_snapshot: user.name,
            action_type: 'PASSWORD_RESET',
            details: {}
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, message: 'User password reset successfully' });
    } catch (err) {
        if (!t.finished) await t.rollback();
        console.error('Password Reset Error:', err);
        res.status(500).json({ error: 'Failed to reset user password' });
    }
};

/**
 * Helper to fetch Roles and Categories for the form
 * EXCLUDES 'SUPER_ADMIN' role
 */
exports.getFormMetadata = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const roles = await Role.findAll({
            where: {
                role_name: { [Op.ne]: 'SUPER_ADMIN' }
            }
        });
        const categories = await CategoryMaster.findAll();
        res.json({ roles, categories });
    } catch (err) {
        console.error('Metadata Error:', err);
        res.status(500).json({ error: 'Failed to fetch form metadata' });
    }
};
