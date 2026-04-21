/**
 * Sale Controller
 * 
 * Handles HTTP requests for sales operations including:
 * - Listing sales with filtering and pagination
 * - Retrieving individual sales
 * - Creating new sales (POS transactions)
 * - Voiding sales
 * - Generating invoices and receipts
 */

// Model and utility imports
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { 
    successResponse, 
    createdResponse, 
    paginatedResponse 
} = require('../utils/response');
const { 
    NotFoundError, 
    ValidationError, 
    ConflictError 
} = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const database = require('../config/database');

/**
 * Retrieves a paginated list of sales with optional filtering
 * Query params: page, limit, startDate, endDate, status, payment_method, user_id
 */
const getSales = async (request, response, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            status,
            payment_method,
            user_id
        } = request.query;

        // Build query options
        const queryOptions = {
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            status,
            payment_method,
            user_id
        };

        const { sales, pagination } = await Sale.findAll(queryOptions);

        return paginatedResponse(response, sales, pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves a single sale by ID with all items
 * Params: id
 */
const getSaleById = async (request, response, next) => {
    try {
        const { id } = request.params;

        const sale = await Sale.findByIdWithItems(id);

        if (!sale) {
            throw new NotFoundError('Sale not found');
        }

        return successResponse(response, sale);
    } catch (error) {
        next(error);
    }
};

/**
 * Creates a new sale (POS transaction)
 * Includes inventory management and transaction support
 * Body: items, payment_method, amount_paid, discount_amount, notes
 */
const createSale = async (request, response, next) => {
    // Begin database transaction
    const tx = await database.beginTransaction();
    
    try {
        const { 
            items, 
            payment_method, 
            amount_paid, 
            discount_amount = 0, 
            notes 
        } = request.body;
        
        const userId = request.user.id;

        // Validate items
        if (!items || items.length === 0) {
            throw new ValidationError('At least one item is required');
        }

        let subtotal = 0;
        let totalTax = 0;
        const saleItemList = [];

        // Process each item in the sale
        for (const item of items) {
            // Lock product row to prevent race conditions during stock check/update
            const product = await Product.findByIdForUpdate(item.product_id, tx);

            // Validate product exists
            if (!product) {
                throw new NotFoundError(`Product with ID ${item.product_id} not found`);
            }

            // Validate sufficient stock
            if (product.quantity_in_stock < item.quantity) {
                throw new ValidationError(
                    `Insufficient stock for ${product.name}. Available: ${product.quantity_in_stock}`
                );
            }

            // Calculate item amounts
            const itemSubtotal = product.selling_price * item.quantity;
            const itemTax = (itemSubtotal * (product.tax_rate || 0)) / 100;
            const itemDiscount = item.discount || 0;

            // Accumulate totals
            subtotal += itemSubtotal;
            totalTax += itemTax;

            // Build sale item record
            saleItemList.push({
                product_id: product.id,
                product_name: product.name,
                product_barcode: product.barcode,
                unit_price: product.selling_price,
                quantity: item.quantity,
                subtotal: itemSubtotal,
                discount: itemDiscount,
                tax_amount: itemTax
            });
        }

        // Calculate final amounts
        const totalAmount = subtotal + totalTax - discount_amount;
        const changeAmount = amount_paid - totalAmount;

        // Generate unique invoice number
        const invoiceNumber = await Sale.generateInvoiceNumber(tx);

        // Create the sale record
        const saleId = await Sale.create({
            invoice_number: invoiceNumber,
            user_id: userId,
            subtotal,
            tax_amount: totalTax,
            discount_amount,
            total_amount: totalAmount,
            payment_method,
            amount_paid,
            change_amount: changeAmount > 0 ? changeAmount : 0,
            notes
        }, tx);

        // Create sale items and update inventory
        for (const saleItem of saleItemList) {
            await Sale.createItem(saleId, saleItem, tx);
            
            // Handle stock update in application logic for better control
            // NOTE: Ensure after_sale_item_insert trigger is removed from DB to avoid double decrement
            await Product.updateStock(saleItem.product_id, -saleItem.quantity, tx);

            // Log inventory change
            await Sale.logInventoryChange(
                saleItem.product_id,
                -saleItem.quantity,
                saleId,
                'sale',
                userId,
                null,
                tx
            );
        }

        // Commit the transaction
        await database.commitTransaction(tx);

        const completedSale = await Sale.findByIdWithItems(saleId);

        logger.info(`Sale created: ${invoiceNumber} by ${request.user.username}`);

        return createdResponse(response, completedSale, 'Sale completed successfully');
    } catch (error) {
        // Rollback on any error
        await database.rollbackTransaction(tx);
        next(error);
    }
};

/**
 * Voids (cancels) an existing sale
 * Restores inventory and logs the void reason
 * Params: id
 * Body: reason
 */
const voidSale = async (request, response, next) => {
    // Begin database transaction
    const tx = await database.beginTransaction();
    
    try {
        const { id } = request.params;
        const { reason } = request.body;

        const existingSale = await Sale.findById(id, tx);
        
        if (!existingSale) {
            throw new NotFoundError('Sale not found');
        }

        if (existingSale.status === 'voided') {
            throw new ConflictError('Sale is already voided');
        }

        // Mark sale as voided
        await Sale.voidSale(id, tx);

        // Restore inventory for each item
        const saleItems = await Sale.getSaleItems(id, tx);
        for (const item of saleItems) {
            await Product.updateStock(item.product_id, item.quantity, tx);

            // Log inventory restoration
            await Sale.logInventoryChange(
                item.product_id,
                item.quantity,
                id,
                'return',
                request.user.id,
                `Voided sale: ${reason}`,
                tx
            );
        }

        // Commit the transaction
        await database.commitTransaction(tx);

        logger.info(
            `Sale voided: ${existingSale.invoice_number} by ${request.user.username}. Reason: ${reason}`
        );

        return successResponse(
            response, 
            { id, status: 'voided' }, 
            'Sale voided successfully'
        );
    } catch (error) {
        await database.rollbackTransaction(tx);
        next(error);
    }
};

/**
 * Generates invoice data for a sale
 * Params: id
 */
const generateInvoice = async (request, response, next) => {
    try {
        const { id } = request.params;

        const sale = await Sale.findByIdWithItems(id);

        if (!sale) {
            throw new NotFoundError('Sale not found');
        }

        response.setHeader('Content-Type', 'application/json');
        return response.json({
            success: true,
            message: 'Invoice data',
            data: sale
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generates HTML receipt for a sale
 * Params: id
 */
const generateReceipt = async (request, response, next) => {
    try {
        const { id } = request.params;

        const sale = await Sale.findByIdWithItems(id);

        if (!sale) {
            throw new NotFoundError('Sale not found');
        }

        // Generate HTML receipt
        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.invoice_number}</title>
                <style>
                    body { 
                        font-family: monospace; 
                        max-width: 300px; 
                        margin: 0 auto; 
                        padding: 10px; 
                    }
                    .header { text-align: center; margin-bottom: 10px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .item { display: flex; justify-content: space-between; }
                    .total { font-weight: bold; }
                    .footer { text-align: center; margin-top: 10px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>POS System Store</h2>
                    <p>123 Main Street, City</p>
                </div>
                <div class="divider"></div>
                <p>Invoice: ${sale.invoice_number}</p>
                <p>Date: ${new Date(sale.sale_date).toLocaleString()}</p>
                <p>Cashier: ${sale.cashier_name}</p>
                <div class="divider"></div>
                ${sale.items.map(item => `
                    <div class="item">
                        <span>${item.product_name} x${item.quantity}</span>
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="divider"></div>
                <div class="item">
                    <span>Subtotal:</span>
                    <span>$${sale.subtotal.toFixed(2)}</span>
                </div>
                <div class="item">
                    <span>Tax:</span>
                    <span>$${sale.tax_amount.toFixed(2)}</span>
                </div>
                ${sale.discount_amount > 0 ? `
                    <div class="item">
                        <span>Discount:</span>
                        <span>-$${sale.discount_amount.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="item total">
                    <span>Total:</span>
                    <span>$${sale.total_amount.toFixed(2)}</span>
                </div>
                <div class="divider"></div>
                <div class="item">
                    <span>Paid (${sale.payment_method}):</span>
                    <span>$${sale.amount_paid.toFixed(2)}</span>
                </div>
                ${sale.change_amount > 0 ? `
                    <div class="item">
                        <span>Change:</span>
                        <span>$${sale.change_amount.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="divider"></div>
                <div class="footer">
                    <p>Thank you for your purchase!</p>
                </div>
            </body>
            </html>
        `;

        response.setHeader('Content-Type', 'text/html');
        return response.send(receiptHtml);
    } catch (error) {
        next(error);
    }
};

// Export controller functions
module.exports = {
    getSales,
    getSaleById,
    createSale,
    voidSale,
    generateInvoice,
    generateReceipt
};
