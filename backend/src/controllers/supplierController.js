/**
 * Supplier Controller
 * 
 * Handles supplier management operations.
 */

const Supplier = require('../models/Supplier');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @description Returns all suppliers, optionally filtered by active status.
 * @access      Authenticated.
 * @triggeredBy SuppliersPage list and PurchaseOrdersPage supplier dropdown.
 * @request     GET /api/suppliers
 * @params      Query: is_active ('true'/'false').
 * @dbOps       Supplier.findAll → SELECT suppliers.
 * @returns     { success, data: suppliers[] }.
 */
const getSuppliers = async (req, res, next) => {
    try {
        const { is_active } = req.query;

        const suppliers = await Supplier.findAll(is_active !== undefined ? is_active === 'true' : null);

        return successResponse(res, suppliers);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single supplier by ID.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today.
 * @request     GET /api/suppliers/:id
 * @params      Param: id.
 * @dbOps       Supplier.findById → SELECT suppliers.
 * @returns     { success, data: supplier }.
 */
const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const supplier = await Supplier.findById(id);

        if (!supplier) {
            throw new NotFoundError('Supplier not found');
        }

        return successResponse(res, supplier);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a supplier record.
 * @access      Manager/Admin.
 * @triggeredBy SuppliersPage "Add Supplier" → handleSubmit().
 * @request     POST /api/suppliers
 * @params      Body: name, contact_person?, phone?, email?, address?, city?, tax_id?, payment_terms?.
 * @dbOps       Supplier.create (INSERT suppliers); Supplier.findById (SELECT).
 * @returns     { success, data: supplier } (201).
 */
const createSupplier = async (req, res, next) => {
    try {
        const {
            name,
            contact_person,
            phone,
            email,
            address,
            city,
            tax_id,
            payment_terms
        } = req.body;

        // Create supplier
        const supplierId = await Supplier.create({
            name,
            contact_person,
            phone,
            email,
            address,
            city,
            tax_id,
            payment_terms
        });

        // Get created supplier
        const supplier = await Supplier.findById(supplierId);

        logger.info(`Supplier created: ${name} by ${req.user.username}`);

        return createdResponse(res, supplier, 'Supplier created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Updates an existing supplier's fields.
 * @access      Manager/Admin.
 * @triggeredBy SuppliersPage edit modal → handleSubmit().
 * @request     PUT /api/suppliers/:id
 * @params      Param: id; Body: any updatable supplier fields.
 * @dbOps       Supplier.findById (SELECT); Supplier.update (UPDATE suppliers).
 * @returns     { success, data: supplier }.
 */
const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if supplier exists
        const existingSupplier = await Supplier.findById(id);
        if (!existingSupplier) {
            throw new NotFoundError('Supplier not found');
        }

        // Update supplier
        await Supplier.update(id, updateData);

        // Get updated supplier
        const supplier = await Supplier.findById(id);

        logger.info(`Supplier updated: ${supplier.name} by ${req.user.username}`);

        return successResponse(res, supplier, 'Supplier updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Deletes a supplier, blocking deletion when linked purchase orders exist
 *              (deactivate instead in that case).
 * @access      Manager/Admin.
 * @triggeredBy SuppliersPage delete confirmation → handleDelete().
 * @request     DELETE /api/suppliers/:id
 * @params      Param: id.
 * @dbOps       Supplier.findById (SELECT); Supplier.hasPurchaseOrders (SELECT); Supplier.delete.
 * @returns     { success, message: 'Supplier deleted successfully' }.
 */
const deleteSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if supplier exists
        const supplier = await Supplier.findById(id);
        if (!supplier) {
            throw new NotFoundError('Supplier not found');
        }

        // Check if supplier has purchase orders
        const hasOrders = await Supplier.hasPurchaseOrders(id);
        if (hasOrders) {
            throw new ConflictError('Cannot delete supplier with purchase orders. Deactivate instead.');
        }

        // Delete supplier
        await Supplier.delete(id);

        logger.info(`Supplier deleted: ${supplier.name} by ${req.user.username}`);

        return successResponse(res, null, 'Supplier deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};
