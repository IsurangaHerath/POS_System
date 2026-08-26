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
const Customer = require('../models/Customer');
const CashRegister = require('../models/CashRegister');
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
 * @description Lists sales with pagination and filters (date range, status, payment method, user).
 * @access      Authenticated.
 * @triggeredBy SalesPage list/filter → fetchSales().
 * @request     GET /api/sales
 * @params      Query: page, limit, startDate, endDate, status, payment_method, user_id.
 *              NOTE: frontend currently sends start_date/end_date (snake_case) — mismatched with
 *              startDate/endDate here, so date filtering is not applied (see PROJECT_INTERACTION_MAPPING.md §14).
 * @dbOps       Sale.findAll → SELECT sales (+ item aggregation).
 * @returns     paginatedResponse { success, data: sales, pagination }.
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
 * @description Returns a single sale with all its line items.
 * @access      Authenticated.
 * @triggeredBy SalesPage row click → SaleDetailPage.
 * @request     GET /api/sales/:id
 * @params      Param: id.
 * @dbOps       Sale.findByIdWithItems → SELECT sales + sale_items.
 * @returns     { success, data: sale }.
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
 * @description Processes a POS checkout inside a single DB transaction: validates stock per item
 *              (row-locked), inserts the sale header + line items, computes tax/totals server-side,
 *              decrements stock, writes inventory logs, then commits (rollback on any failure).
 * @access      Authenticated (cashier+).
 * @triggeredBy POSPage checkout → handleCheckout() → POST /sales.
 * @request     POST /api/sales
 * @params      Body: items[{product_id, quantity, unit_price, discount}], payment_method,
 *              amount_paid, discount_amount, notes?.
 * @dbOps       TX: Product.findByIdForUpdate (SELECT ... FOR UPDATE), Sale.generateInvoiceNumber,
 *              Sale.create (INSERT sales), Sale.createItem (INSERT sale_items),
 *              Product.updateStock (UPDATE quantity_in_stock), Sale.logInventoryChange (INSERT inventory_logs, type='sale');
 *              database.commitTransaction / rollbackTransaction.
 * @returns     { success, data: sale } (201).
 */
const createSale = async (request, response, next) => {
    let tx = null;
    
    try {
        // Begin database transaction inside try so failures are caught
        tx = await database.beginTransaction();
        const {
            items,
            payment_method,
            amount_paid,
            discount_amount = 0,
            discount_type = 'fixed',
            payments = [],
            customer_id = null,
            notes
        } = request.body;
        
        const userId = request.user.id;

        // Validate items
        if (!items || items.length === 0) {
            throw new ValidationError('At least one item is required');
        }

        let subtotal = 0;
        let totalTax = 0;
        let itemDiscountTotal = 0;
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

            // Calculate item amounts (allow client-provided price override for discounts)
            const itemPrice = Number(item.unit_price) || Number(product.selling_price);
            const itemSubtotal = itemPrice * item.quantity;
            const itemDiscount = Math.max(0, Number(item.discount) || 0);
            if (itemDiscount > itemSubtotal) {
                throw new ValidationError(`Discount for ${product.name} cannot exceed item subtotal`);
            }
            const itemNet = itemSubtotal - itemDiscount;
            const itemTax = (itemNet * (product.tax_rate || 0)) / 100;

            // Accumulate totals
            subtotal += itemSubtotal;
            totalTax += itemTax;
            itemDiscountTotal += itemDiscount;

            // Build sale item record
            saleItemList.push({
                product_id: product.id,
                product_name: product.name,
                product_barcode: product.barcode,
                unit_price: itemPrice,
                quantity: item.quantity,
                subtotal: itemNet,
                discount: itemDiscount,
                tax_amount: itemTax
            });
        }

        // Invoice-level discount (fixed amount or percentage of net-of-item-discount subtotal)
        const netSubtotal = subtotal - itemDiscountTotal;
        let invoiceDiscount = Math.max(0, Number(discount_amount) || 0);
        if (discount_type === 'percent') {
            invoiceDiscount = (netSubtotal * (Number(discount_amount) || 0)) / 100;
        }
        if (invoiceDiscount > netSubtotal) {
            throw new ValidationError('Invoice discount cannot exceed subtotal');
        }

        // Final sale total
        const totalAmount = netSubtotal + totalTax - invoiceDiscount;
        const roundedTotal = Math.round(totalAmount * 100) / 100;

        // ---- Payment reconciliation (cash / card / bank / QR / credit / mixed) ----
        let totalPaid = 0;
        let creditAmount = 0;
        let cashPaid = 0;
        let effectiveMethod = payment_method;

        if (payments && payments.length > 0) {
            for (const p of payments) {
                const amt = Math.max(0, Number(p.amount) || 0);
                totalPaid += amt;
                if (p.method === 'cash') cashPaid += amt;
                if (p.method === 'credit') creditAmount += amt;
            }
            const nonCreditMethods = payments.filter((p) => p.method !== 'credit');
            effectiveMethod = nonCreditMethods.length > 1
                ? 'mixed'
                : (nonCreditMethods.length === 1 ? nonCreditMethods[0].method : 'credit');
        } else if (payment_method === 'credit') {
            totalPaid = 0;
        } else {
            totalPaid = Number(amount_paid) || roundedTotal;
            if (payment_method === 'cash') cashPaid = totalPaid;
        }

        const amountDue = Math.max(0, roundedTotal - totalPaid);
        const changeAmount = totalPaid > roundedTotal ? totalPaid - roundedTotal : 0;

        // ---- Credit / udharata handling ----
        // The credit portion of a mixed payment is also added to the customer balance,
        // so a customer cannot bypass credit tracking by splitting payment methods.
        const creditCharged = amountDue + creditAmount;
        if (customer_id && creditCharged > 0) {
            const customer = await Customer.findById(customer_id, tx);
            if (!customer) {
                throw new NotFoundError('Customer not found');
            }
            // Atomic check-and-update: chargeCredit only succeeds when the new
            // balance stays within the limit, preventing concurrent sales from
            // pushing the customer over it.
            const charged = await Customer.chargeCredit(customer_id, creditCharged, tx);
            if (!charged) {
                throw new ValidationError('Credit sale would exceed customer credit limit');
            }
        }

        // Generate unique invoice number
        const invoiceNumber = await Sale.generateInvoiceNumber(tx);

        // Create the sale record
        const saleId = await Sale.create({
            invoice_number: invoiceNumber,
            user_id: userId,
            subtotal: netSubtotal,
            tax_amount: totalTax,
            discount_amount: invoiceDiscount,
            invoice_discount_amount: invoiceDiscount,
            discount_type,
            rounded_total: roundedTotal,
            amount_due: amountDue,
            total_amount: totalAmount,
            payment_method: effectiveMethod,
            amount_paid: totalPaid,
            change_amount: changeAmount,
            customer_id,
            notes
        }, tx);

        // Persist individual payment records
        if (payments && payments.length > 0) {
            for (const p of payments) {
                await database.query(
                    `INSERT INTO payments (payment_type, sale_id, amount, method, user_id)
                     VALUES ('sale', ?, ?, ?, ?)`,
                    [saleId, Number(p.amount) || 0, p.method, userId],
                    tx
                );
            }
        } else {
            const paymentAmount = payment_method === 'credit' ? roundedTotal : totalPaid;
            await database.query(
                `INSERT INTO payments (payment_type, sale_id, amount, method, user_id)
                 VALUES ('sale', ?, ?, ?, ?)`,
                [saleId, paymentAmount, effectiveMethod, userId],
                tx
            );
        }

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

        // Record cash movement if a cash register is open for this cashier
        if (cashPaid > 0) {
            const openRegister = await CashRegister.findOpenByUser(userId);
            if (openRegister) {
                await CashRegister.addEntry(openRegister.id, 'sale', cashPaid, saleId, null, tx);
            }
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
 * @description Voids a completed sale, restoring each item's stock and logging a 'return'
 *              inventory change with the provided reason, all inside a transaction.
 * @access      Authenticated (manager+ expected).
 * @triggeredBy No frontend caller today (SalesPage has no void/refund action).
 * @request     PUT /api/sales/:id/void
 * @params      Param: id; Body: reason.
 * @dbOps       TX: Sale.findById (SELECT), Sale.voidSale (UPDATE status='voided'),
 *              Sale.getSaleItems (SELECT sale_items), Product.updateStock (UPDATE),
 *              Sale.logInventoryChange (INSERT inventory_logs, type='return'); commit/rollback.
 * @returns     { success, data: { id, status: 'voided' } }.
 */
const voidSale = async (request, response, next) => {
    let tx = null;
    
    try {
        // Begin database transaction inside try so failures are caught
        tx = await database.beginTransaction();
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

        // Reverse customer credit / udharata balance for credit sales.
        // Pure-credit sales (payment_method='credit' with nothing paid) record the
        // full amount as a credit payment; amount_due already equals the charge, so
        // adding getCreditPaidAmount would double-count. Mixed/array credit sales
        // record amount_paid > 0, so there the credit payments are added on top.
        const isPureCredit = existingSale.payment_method === 'credit'
            && Number(existingSale.amount_paid) === 0;
        const creditCharged = isPureCredit
            ? (Number(existingSale.amount_due) || 0)
            : (Number(existingSale.amount_due) || 0) + (await Sale.getCreditPaidAmount(id, tx));
        if (existingSale.customer_id && creditCharged > 0) {
            await Customer.adjustBalance(existingSale.customer_id, -creditCharged, tx);
        }

        // Record a refund entry in the open cash register if the sale was paid in cash
        if (Number(existingSale.amount_paid) > 0) {
            const openRegister = await CashRegister.findOpenByUser(request.user.id);
            if (openRegister) {
                await CashRegister.addEntry(openRegister.id, 'refund', existingSale.amount_paid, id, `Voided sale: ${reason}`, tx);
            }
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
 * @description Returns a sale's data in JSON form for invoice rendering.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today (frontend prints invoices client-side).
 * @request     GET /api/sales/:id/invoice
 * @params      Param: id.
 * @dbOps       Sale.findByIdWithItems → SELECT sales + sale_items.
 * @returns     { success, message: 'Invoice data', data: sale }.
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
 * @description Returns a printable HTML receipt for a sale.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today (POSPage renders its own receipt and uses window.print()).
 * @request     GET /api/sales/:id/receipt
 * @params      Param: id.
 * @dbOps       Sale.findByIdWithItems → SELECT sales + sale_items.
 * @returns     text/html receipt document.
 */
const generateReceipt = async (request, response, next) => {
    try {
        const { id } = request.params;

        const sale = await Sale.findByIdWithItems(id);

        if (!sale) {
            throw new NotFoundError('Sale not found');
        }

        // Load store settings for the receipt header/footer
        const [settingsRows] = await database.query(
            `SELECT setting_key, setting_value FROM settings
             WHERE setting_key IN ('store_name','store_address','store_phone','receipt_footer')`
        );
        const settingsMap = {};
        for (const row of settingsRows) {
            settingsMap[row.setting_key] = row.setting_value;
        }
        sale.business_name = settingsMap.store_name || 'POS System Store';
        sale.business_address = settingsMap.store_address || '';
        sale.business_phone = settingsMap.store_phone || '';
        sale.receipt_footer = settingsMap.receipt_footer || 'Thank you for your purchase!';

        // Escape user-controlled values to prevent stored XSS
        const esc = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Generate HTML receipt
        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${esc(sale.invoice_number)}</title>
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
                    <h2>${esc(sale.business_name || 'POS System Store')}</h2>
                    <p>${esc(sale.business_address || '')}</p>
                    <p>${esc(sale.business_phone || '')}</p>
                </div>
                <div class="divider"></div>
                <p>Invoice: ${esc(sale.invoice_number)}</p>
                <p>Date: ${new Date(sale.sale_date).toLocaleString()}</p>
                <p>Cashier: ${esc(sale.cashier_name)}</p>
                ${sale.customer_name ? `<p>Customer: ${esc(sale.customer_name)}</p>` : ''}
                <div class="divider"></div>
                ${sale.items.map(item => `
                    <div class="item">
                        <span>${esc(item.product_name)} x${item.quantity}</span>
                        <span>${money(item.subtotal)}</span>
                    </div>
                `).join('')}
                <div class="divider"></div>
                <div class="item">
                    <span>Subtotal:</span>
                    <span>${money(sale.subtotal)}</span>
                </div>
                <div class="item">
                    <span>Tax:</span>
                    <span>${money(sale.tax_amount)}</span>
                </div>
                ${sale.discount_amount > 0 ? `
                    <div class="item">
                        <span>Discount:</span>
                        <span>-${money(sale.discount_amount)}</span>
                    </div>
                ` : ''}
                <div class="item total">
                    <span>Total:</span>
                    <span>${money(sale.total_amount)}</span>
                </div>
                <div class="divider"></div>
                <div class="item">
                    <span>Paid (${esc(sale.payment_method)}):</span>
                    <span>${money(sale.amount_paid)}</span>
                </div>
                ${sale.change_amount > 0 ? `
                    <div class="item">
                        <span>Change:</span>
                        <span>${money(sale.change_amount)}</span>
                    </div>
                ` : ''}
                ${sale.amount_due > 0 ? `
                    <div class="item">
                        <span>Balance Due:</span>
                        <span>${money(sale.amount_due)}</span>
                    </div>
                ` : ''}
                <div class="divider"></div>
                <div class="footer">
                    <p>${esc(sale.receipt_footer || 'Thank you for your purchase!')}</p>
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
