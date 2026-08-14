/**
 * Held Bill Controller
 *
 * Handles HTTP requests for holding and resuming pending bills.
 */

const HeldBill = require('../models/HeldBill');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getHeldBills = async (request, response, next) => {
    try {
        const { page = 1, limit = 20, user_id } = request.query;

        const result = await HeldBill.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            user_id
        });

        return paginatedResponse(response, result.bills, result.pagination);
    } catch (error) {
        next(error);
    }
};

const getHeldBill = async (request, response, next) => {
    try {
        const { id } = request.params;
        const bill = await HeldBill.findById(id);

        if (!bill) {
            throw new NotFoundError('Held bill not found');
        }

        return successResponse(response, bill);
    } catch (error) {
        next(error);
    }
};

const createHeldBill = async (request, response, next) => {
    try {
        const { reference = null, customer_id = null, cart, notes = null } = request.body;

        if (!Array.isArray(cart) || cart.length === 0) {
            throw new ValidationError('A cart with at least one item is required');
        }

        const billId = await HeldBill.create({
            reference,
            user_id: request.user.id,
            customer_id,
            cart,
            notes
        });

        const bill = await HeldBill.findById(billId);
        logger.info(`Held bill #${billId} created by ${request.user.username}`);

        return createdResponse(response, bill, 'Bill held successfully');
    } catch (error) {
        next(error);
    }
};

const deleteHeldBill = async (request, response, next) => {
    try {
        const { id } = request.params;
        const bill = await HeldBill.findById(id);

        if (!bill) {
            throw new NotFoundError('Held bill not found');
        }

        await HeldBill.delete(id);
        return successResponse(response, null, 'Held bill deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getHeldBills,
    getHeldBill,
    createHeldBill,
    deleteHeldBill
};