/**
 * Purchase Order Controller
 * 
 * Handles purchase order operations.
 */

const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * @description Lists purchase orders with pagination and optional status/supplier filters.
 * @access      Authenticated (manager+ for create/update).
 * @triggeredBy PurchaseOrdersPage list → fetchOrders().
 * @request     GET /api/purchase-orders
 * @params      Query: page, limit, status, supplier_id.
 * @dbOps       PurchaseOrder.findAll → SELECT purchase_orders (JOIN suppliers/users).
 * @returns     paginatedResponse { success, data: purchaseOrders, pagination }.
 */
const getPurchaseOrders = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            supplier_id
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            supplier_id
        };

        const { purchaseOrders, pagination } = await PurchaseOrder.findAll(options);

        return paginatedResponse(res, purchaseOrders, pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns a single purchase order with all its line items.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today (no PO detail view).
 * @request     GET /api/purchase-orders/:id
 * @params      Param: id.
 * @dbOps       PurchaseOrder.findByIdWithItems → SELECT purchase_orders + purchase_order_items.
 * @returns     { success, data: purchaseOrder }.
 */
const getPurchaseOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const purchaseOrder = await PurchaseOrder.findByIdWithItems(id);

        if (!purchaseOrder) {
            throw new NotFoundError('Purchase order not found');
        }

        return successResponse(res, purchaseOrder);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a purchase order: validates line items against existing products,
 *              generates a unique PO number, inserts header + items.
 * @access      Manager/Admin.
 * @triggeredBy PurchaseOrdersPage "Create Order" → handleCreateOrder().
 * @request     POST /api/purchase-orders
 * @params      Body: supplier_id, items[{product_id, quantity, unit_cost}], expected_date?, notes?.
 * @dbOps       Product.findById (SELECT per item); PurchaseOrder.generatePONumber;
 *              PurchaseOrder.create (INSERT purchase_orders); PurchaseOrder.createItem (INSERT items).
 * @returns     { success, data: purchaseOrder } (201).
 */
const createPurchaseOrder = async (req, res, next) => {
    try {
        const { supplier_id, items, expected_date, notes } = req.body;
        const userId = req.user.id;

        // Validate items
        if (!items || items.length === 0) {
            throw new ValidationError('At least one item is required');
        }

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product_id);

            if (!product) {
                throw new NotFoundError(`Product with ID ${item.product_id} not found`);
            }

            const itemSubtotal = item.unit_cost * item.quantity;
            subtotal += itemSubtotal;

            orderItems.push({
                product_id: product.id,
                unit_cost: item.unit_cost,
                quantity_ordered: item.quantity,
                quantity_received: 0,
                subtotal: itemSubtotal
            });
        }

        // Generate PO number
        const poNumber = await PurchaseOrder.generatePONumber();

        // Create purchase order
        const poId = await PurchaseOrder.create({
            po_number: poNumber,
            supplier_id,
            user_id: userId,
            subtotal,
            total_amount: subtotal, // Add tax if needed
            expected_date,
            notes
        });

        // Create PO items
        for (const orderItem of orderItems) {
            await PurchaseOrder.createItem(poId, orderItem);
        }

        // Get created PO
        const purchaseOrder = await PurchaseOrder.findByIdWithItems(poId);

        logger.info(`Purchase order created: ${poNumber} by ${req.user.username}`);

        return createdResponse(res, purchaseOrder, 'Purchase order created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Marks a purchase order as received/partially received inside a transaction:
 *              restocks product quantities for the received delta, logs inventory changes,
 *              and updates the PO status to 'received' (all items) or 'approved' (partial).
 * @access      Manager/Admin.
 * @triggeredBy No frontend caller today — the UI sends PUT /purchase-orders/:id/status
 *              instead, which has no backend route (see PROJECT_INTERACTION_MAPPING.md §14 #2).
 * @request     PUT /api/purchase-orders/:id/receive
 * @params      Param: id; Body: items[{product_id, quantity_received}], notes?.
 * @dbOps       TX: PurchaseOrder.findById (SELECT), PurchaseOrder.findItem (SELECT), Product.updateStock (UPDATE),
 *              PurchaseOrder.logInventoryChange (INSERT inventory_logs), PurchaseOrder.updateItemReceived (UPDATE),
 *              PurchaseOrder.getItems (SELECT), PurchaseOrder.updateStatus (UPDATE); commit/rollback.
 * @returns     { success, data: purchaseOrder }.
 */
const receivePurchaseOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { items, notes } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(items) || items.length === 0) {
            throw new ValidationError('At least one received item is required');
        }

        // Check if PO exists
        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            throw new NotFoundError('Purchase order not found');
        }

        if (purchaseOrder.status === 'cancelled') {
            throw new ValidationError('Cannot receive cancelled purchase order');
        }

        if (purchaseOrder.status === 'received') {
            throw new ValidationError('Purchase order is already fully received');
        }

        // Start transaction
        const connection = await db.beginTransaction();

        try {
            // Process received items
            for (const item of items) {
                const poItem = await PurchaseOrder.findItem(id, item.product_id, connection);

                if (!poItem) {
                    throw new NotFoundError(`Item not found in purchase order for product ${item.product_id}`);
                }

                const qtyReceived = Number(item.quantity_received) || 0;
                if (qtyReceived < 0) {
                    throw new ValidationError('Received quantity cannot be negative');
                }
                if (qtyReceived > poItem.quantity_ordered) {
                    throw new ValidationError(
                        `Cannot receive more than ordered for ${poItem.product_id} (ordered: ${poItem.quantity_ordered})`
                    );
                }
                if (qtyReceived < poItem.quantity_received) {
                    throw new ValidationError(
                        `Received quantity cannot decrease below already-received amount`
                    );
                }

                const qtyDiff = qtyReceived - poItem.quantity_received;

                if (qtyDiff > 0) {
                    // Update product stock
                    await Product.updateStock(item.product_id, qtyDiff, connection);

                    // Log inventory change
                    await PurchaseOrder.logInventoryChange(
                        item.product_id,
                        qtyDiff,
                        id,
                        userId,
                        connection
                    );
                }

                // Update PO item
                await PurchaseOrder.updateItemReceived(id, item.product_id, qtyReceived, connection);
            }

            // Check if all items received
            const allItems = await PurchaseOrder.getItems(id, connection);
            const allReceived = allItems.every(
                item => item.quantity_received >= item.quantity_ordered
            );

            // Update PO status
            const newStatus = allReceived ? 'received' : 'approved';
            await PurchaseOrder.updateStatus(id, newStatus, allReceived ? new Date() : null, connection);

            await db.commitTransaction(connection);

            // Get updated PO
            const updatedPO = await PurchaseOrder.findByIdWithItems(id);

            logger.info(`Purchase order received: ${purchaseOrder.po_number} by ${req.user.username}`);

            return successResponse(res, updatedPO, 'Purchase order received successfully');
        } catch (error) {
            await db.rollbackTransaction(connection);
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

/**
 * @description Cancels a pending purchase order; received POs cannot be cancelled.
 * @access      Manager/Admin.
 * @triggeredBy No frontend caller today — the UI sends PUT /purchase-orders/:id/status
 *              instead, which has no backend route (see PROJECT_INTERACTION_MAPPING.md §14 #2).
 * @request     PUT /api/purchase-orders/:id/cancel
 * @params      Param: id; Body: reason?.
 * @dbOps       PurchaseOrder.findById (SELECT); PurchaseOrder.updateStatus('cancelled') → UPDATE.
 * @returns     { success, data: { id, status: 'cancelled' } }.
 */
const cancelPurchaseOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Check if PO exists
        const purchaseOrder = await PurchaseOrder.findById(id);
        if (!purchaseOrder) {
            throw new NotFoundError('Purchase order not found');
        }

        if (purchaseOrder.status === 'received') {
            throw new ValidationError('Cannot cancel received purchase order');
        }

        // Cancel PO
        await PurchaseOrder.updateStatus(id, 'cancelled');

        logger.info(`Purchase order cancelled: ${purchaseOrder.po_number} by ${req.user.username}. Reason: ${reason}`);

        return successResponse(res, { id, status: 'cancelled' }, 'Purchase order cancelled successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder
};
