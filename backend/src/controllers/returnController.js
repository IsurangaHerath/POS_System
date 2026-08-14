/**
 * Return Controller
 *
 * Handles HTTP requests for sales returns (full / partial) and refunds.
 * Returns never delete the original sale; they maintain a full audit trail,
 * restore stock, and (optionally) adjust the customer's credit balance.
 */

const ReturnModel = require('../models/Return');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * @description Lists returns with pagination and date/sale filters.
 * @request     GET /api/returns
 */
const getReturns = async (request, response, next) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, sale_id } = request.query;

        const result = await ReturnModel.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            sale_id
        });

        return paginatedResponse(response, result.returns, result.pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single return with its items.
 * @request     GET /api/returns/:id
 */
const getReturnById = async (request, response, next) => {
    try {
        const { id } = request.params;
        const returnData = await ReturnModel.findByIdWithItems(id);

        if (!returnData) {
            throw new NotFoundError('Return not found');
        }

        return successResponse(response, returnData);
    } catch (error) {
        next(error);
    }
};
/**
 * @description Records a return against a completed sale inside a transaction:
 *              validates the sale + quantities, restores stock, logs inventory,
 *              writes the return and items, and adjusts customer credit if needed.
 * @request     POST /api/returns
 * @body        { sale_id, return_type, refund_method, items: [{product_id,
 *              quantity, unit_price}], notes? }
 */
const createReturn = async (request, response, next) => {
    try {
        const {
            sale_id,
            return_type = 'partial',
            refund_method = 'cash',
            items,
            notes = null
        } = request.body;

        if (!sale_id || !Array.isArray(items) || items.length === 0) {
            throw new ValidationError('A sale and at least one returned item are required');
        }

        const returnResult = await database.transaction(async (tx) => {
            const sale = await Sale.findById(sale_id, tx);
            if (!sale) {
                throw new NotFoundError('Sale not found');
            }
            if (sale.status !== 'completed') {
                throw new ConflictError('Only completed sales can be returned');
            }

            const saleItems = await database.getMany(
                'SELECT * FROM sale_items WHERE sale_id = ?',
                [sale_id],
                tx
            );

            let subtotal = 0;
            let taxAmount = 0;

            for (const item of items) {
                const original = saleItems.find((si) => si.product_id === item.product_id);
                if (!original) {
                    throw new ValidationError(`Product #${item.product_id} is not part of this sale`);
                }
                if (item.quantity > original.quantity) {
                    throw new ValidationError(
                        `Cannot return more than ${original.quantity} of ${original.product_name}`
                    );
                }

                const lineSubtotal = (Number(item.unit_price) || Number(original.unit_price)) * Number(item.quantity);
                subtotal += lineSubtotal;

                // Restore stock and log the inventory movement.
                if (item.product_id) {
                    await database.query(
                        'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
                        [Number(item.quantity), item.product_id],
                        tx
                    );
                    await Sale.logInventoryChange(
                        item.product_id,
                        Number(item.quantity),
                        sale_id,
                        'return',
                        request.user.id,
                        `Return from ${sale.invoice_number}`,
                        tx
                    );
                }
            }

            const returnNumber = await ReturnModel.generateNumber();
            const returnId = await ReturnModel.create({
                return_number: returnNumber,
                sale_id,
                user_id: request.user.id,
                return_type,
                subtotal,
                tax_amount: taxAmount,
                refund_amount: subtotal,
                refund_method,
                customer_id: sale.customer_id || null,
                notes
            }, tx);

            for (const item of items) {
                const original = saleItems.find((si) => si.product_id === item.product_id);
                await ReturnModel.createItem(returnId, {
                    product_id: item.product_id,
                    product_name: original.product_name,
                    product_barcode: original.product_barcode,
                    unit_price: Number(item.unit_price) || Number(original.unit_price),
                    quantity: Number(item.quantity),
                    subtotal: (Number(item.unit_price) || Number(original.unit_price)) * Number(item.quantity)
                }, tx);
            }

            // If customer credit was involved, reduce their outstanding balance.
            if (sale.customer_id && Number(sale.amount_due) > 0) {
                await Customer.adjustBalance(sale.customer_id, -subtotal, tx);
            }

            return { returnId, sale };
        });

        const returnData = await ReturnModel.findByIdWithItems(returnResult.returnId);
        logger.info(`Return ${returnData.return_number} created by ${request.user.username}`);

        return createdResponse(response, returnData, 'Return processed successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getReturns,
    getReturnById,
    createReturn
};