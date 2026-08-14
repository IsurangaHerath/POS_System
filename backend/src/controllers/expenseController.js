/**
 * Expense Controller
 *
 * Handles HTTP requests for expense management.
 */

const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @description Lists expenses with pagination and date/category filters.
 * @request     GET /api/expenses
 */
const getExpenses = async (request, response, next) => {
    try {
        const { page = 1, limit = 20, startDate, endDate, category_id } = request.query;

        const result = await Expense.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            category_id
        });

        return paginatedResponse(response, result.expenses, result.pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a new expense; also records a cash-register entry if a
 *              cash register is currently open for the user.
 * @request     POST /api/expenses
 */
const createExpense = async (request, response, next) => {
    try {
        const data = { ...request.body, user_id: request.user.id };

        if (!data.amount || Number(data.amount) <= 0) {
            throw new ValidationError('A valid expense amount is required');
        }

        const expenseId = await Expense.create(data);

        // Record cash movement if a cash register is open.
        const openRegister = await CashRegister.findOpenByUser(request.user.id);
        if (openRegister && (data.payment_method || 'cash') === 'cash') {
            await CashRegister.addEntry(
                openRegister.id,
                'expense',
                Number(data.amount),
                expenseId,
                data.description || 'Expense',
                null
            );
        }

        const expense = await Expense.findById(expenseId);
        logger.info(`Expense #${expenseId} created by ${request.user.username}`);

        return createdResponse(response, expense, 'Expense created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Updates an existing expense.
 * @request     PUT /api/expenses/:id
 */
const updateExpense = async (request, response, next) => {
    try {
        const { id } = request.params;
        const expense = await Expense.findById(id);

        if (!expense) {
            throw new NotFoundError('Expense not found');
        }

        await Expense.update(id, request.body);
        const updated = await Expense.findById(id);

        return successResponse(response, updated, 'Expense updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Deletes an expense.
 * @request     DELETE /api/expenses/:id
 */
const deleteExpense = async (request, response, next) => {
    try {
        const { id } = request.params;
        const expense = await Expense.findById(id);

        if (!expense) {
            throw new NotFoundError('Expense not found');
        }

        await Expense.delete(id);
        return successResponse(response, null, 'Expense deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns expense categories.
 * @request     GET /api/expenses/categories
 */
const getCategories = async (request, response, next) => {
    try {
        const categories = await Expense.getCategories();
        return successResponse(response, categories);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates an expense category.
 * @request     POST /api/expenses/categories
 */
const createCategory = async (request, response, next) => {
    try {
        const { name, description = null } = request.body;
        if (!name) {
            throw new ValidationError('Category name is required');
        }
        const id = await Expense.createCategory(name, description);
        return createdResponse(response, { id, name, description }, 'Category created successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getCategories,
    createCategory
};