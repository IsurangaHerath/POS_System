/**
 * Customer Controller
 *
 * Handles HTTP requests for customer management and credit (udharata) payments.
 */

const Customer = require('../models/Customer');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * @description Lists customers with search, active and has-balance filters.
 * @request     GET /api/customers
 */
const getCustomers = async (request, response, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            is_active,
            has_balance
        } = request.query;

        const result = await Customer.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            is_active: is_active !== undefined ? is_active === 'true' : null,
            has_balance: has_balance === 'true'
        });

        return paginatedResponse(response, result.customers, result.pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single customer.
 * @request     GET /api/customers/:id
 */
const getCustomerById = async (request, response, next) => {
    try {
        const { id } = request.params;
        const customer = await Customer.findById(id);

        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        return successResponse(response, customer);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a new customer; auto-generates a customer code if not provided.
 * @request     POST /api/customers
 */
const createCustomer = async (request, response, next) => {
    try {
        const data = { ...request.body };
        if (!data.code) {
            data.code = await Customer.generateCode();
        }
        if (await Customer.codeExists(data.code)) {
            throw new ConflictError('Customer code already exists');
        }

        const customerId = await Customer.create(data);
        const customer = await Customer.findById(customerId);

        logger.info(`Customer created: ${customer.name} by ${request.user.username}`);

        return createdResponse(response, customer, 'Customer created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Updates an existing customer.
 * @request     PUT /api/customers/:id
 */
const updateCustomer = async (request, response, next) => {
    try {
        const { id } = request.params;
        const customer = await Customer.findById(id);

        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        const updateData = request.body;
        if (updateData.code && updateData.code !== customer.code) {
            if (await Customer.codeExists(updateData.code, id)) {
                throw new ConflictError('Customer code already exists');
            }
        }

        await Customer.update(id, updateData);
        const updated = await Customer.findById(id);

        return successResponse(response, updated, 'Customer updated successfully');
    } catch (error) {
        next(error);
    }
};
/**
 * @description Deactivates a customer.
 * @request     DELETE /api/customers/:id
 */
const deleteCustomer = async (request, response, next) => {
    try {
        const { id } = request.params;
        const customer = await Customer.findById(id);

        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        await Customer.delete(id);
        return successResponse(response, null, 'Customer deactivated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Records a payment against a customer's outstanding credit balance.
 *              Updates customer balance and writes a payment record in a transaction.
 * @request     POST /api/customers/:id/payments
 * @body        { amount, method, reference?, notes? }
 */
const recordPayment = async (request, response, next) => {
    try {
        const { id } = request.params;
        const { amount, method = 'cash', reference = null, notes = null } = request.body;

        if (!amount || Number(amount) <= 0) {
            throw new ValidationError('A valid payment amount is required');
        }

        const paymentAmount = Number(amount);

        await database.transaction(async (tx) => {
            const customer = await Customer.findById(id);
            if (!customer) {
                throw new NotFoundError('Customer not found');
            }

            // Reduce outstanding balance.
            await Customer.adjustBalance(id, -paymentAmount, tx);

            await database.query(
                `INSERT INTO payments
                 (payment_type, customer_id, amount, method, reference, user_id, notes)
                 VALUES ('credit', ?, ?, ?, ?, ?, ?)`,
                [id, paymentAmount, method, reference, request.user.id, notes],
                tx
            );
        });

        const updated = await Customer.findById(id);
        logger.info(`Credit payment of ${paymentAmount} recorded for customer #${id} by ${request.user.username}`);

        return successResponse(response, updated, 'Payment recorded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns the customer's credit statement (running balance log).
 * @request     GET /api/customers/:id/statement
 */
const getStatement = async (request, response, next) => {
    try {
        const { id } = request.params;
        const customer = await Customer.findById(id);

        if (!customer) {
            throw new NotFoundError('Customer not found');
        }

        const statement = await Customer.getStatement(id);

        return successResponse(response, {
            customer,
            current_balance: customer.balance,
            credit_limit: customer.credit_limit,
            entries: statement
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    getStatement
};