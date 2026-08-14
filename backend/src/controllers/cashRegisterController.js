/**
 * Cash Register Controller
 *
 * Handles HTTP requests for cashier shift open/close and reconciliation.
 */

const CashRegister = require('../models/CashRegister');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @description Opens a cash register for the current user (or specified cashier).
 * @request     POST /api/cash-registers/open
 * @body        { opening_cash, notes? }
 */
const openRegister = async (request, response, next) => {
    try {
        const { opening_cash = 0, notes = null } = request.body;
        // Always open the register for the authenticated user; never allow
        // impersonating another cashier via the request body.
        const cashierId = request.user.id;

        const existing = await CashRegister.findOpenByUser(cashierId);
        if (existing) {
            throw new ConflictError('A cash register is already open for this cashier');
        }

        const registerId = await CashRegister.open({
            cashier_id: cashierId,
            opening_cash: Number(opening_cash),
            notes
        });

        const register = await CashRegister.findById(registerId);
        logger.info(`Cash register #${registerId} opened by ${request.user.username}`);

        return createdResponse(response, register, 'Cash register opened successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns the current open register for a cashier (or null).
 * @request     GET /api/cash-registers/current
 */
const getCurrent = async (request, response, next) => {
    try {
        const cashierId = request.query.cashier_id || request.user.id;
        const register = await CashRegister.findOpenByUser(cashierId);

        if (register) {
            register.expected_cash = await CashRegister.computeExpected(register.id);
            register.entries = await CashRegister.getEntries(register.id);
        }

        return successResponse(response, register);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns a specific register with its entries.
 * @request     GET /api/cash-registers/:id
 */
const getRegister = async (request, response, next) => {
    try {
        const { id } = request.params;
        const register = await CashRegister.findById(id);

        if (!register) {
            throw new NotFoundError('Cash register not found');
        }

        register.entries = await CashRegister.getEntries(id);
        return successResponse(response, register);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Closes a register, computing expected vs actual cash and variance.
 * @request     POST /api/cash-registers/:id/close
 * @body        { actual_cash, notes? }
 */
const closeRegister = async (request, response, next) => {
    try {
        const { id } = request.params;
        const { actual_cash, notes = null } = request.body;

        if (actual_cash === undefined || actual_cash === null) {
            throw new ValidationError('Actual cash amount is required');
        }

        const closed = await CashRegister.close(id, Number(actual_cash), notes);
        logger.info(
            `Cash register #${id} closed. Variance: ${closed.variance}. By ${request.user.username}`
        );

        return successResponse(response, closed, 'Cash register closed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Lists cash register shift history.
 * @request     GET /api/cash-registers
 */
const listRegisters = async (request, response, next) => {
    try {
        const { page = 1, limit = 20, cashier_id, status } = request.query;

        const result = await CashRegister.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            cashier_id,
            status
        });

        return paginatedResponse(response, result.registers, result.pagination);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    openRegister,
    getCurrent,
    getRegister,
    closeRegister,
    listRegisters
};