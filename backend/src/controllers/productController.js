/**
 * Product Controller
 * 
 * Handles HTTP requests for product operations including:
 * - Listing products with filtering and pagination
 * - Retrieving individual products
 * - Creating, updating, and deleting products
 * - Low stock product queries
 */

// Model and utility imports
const Product = require('../models/Product');
const { 
    successResponse, 
    createdResponse, 
    paginatedResponse, 
    notFoundResponse 
} = require('../utils/response');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @description Lists products with pagination, keyword search, and category/active/low-stock
 *              filters; joins category names for display.
 * @access      Authenticated.
 * @triggeredBy ProductsPage (list/search/filter) and POSPage / PurchaseOrdersPage product pickers.
 * @request     GET /api/products
 * @params      Query: page, limit, category_id, is_active, low_stock, search, sortBy, sortOrder.
 * @dbOps       Product.findAll → SELECT products (optional JOIN categories, WHERE/Having).
 * @returns     paginatedResponse { success, data: products, pagination }.
 */
const getProducts = async (request, response, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            category_id,
            is_active,
            low_stock,
            search,
            sortBy,
            sortOrder
        } = request.query;

        // Build query options
        const queryOptions = {
            page: parseInt(page),
            limit: parseInt(limit),
            category_id,
            is_active: is_active !== undefined ? is_active === 'true' : null,
            low_stock: low_stock === 'true',
            search,
            sortBy,
            sortOrder
        };

        const { products, pagination } = await Product.findAll(queryOptions);

        return paginatedResponse(response, products, pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single product by its primary key ID.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today (detail views render from list data).
 * @request     GET /api/products/:id
 * @params      Param: id.
 * @dbOps       Product.findById → SELECT products.
 * @returns     { success, data: product }.
 */
const getProductById = async (request, response, next) => {
    try {
        const { id } = request.params;

        const product = await Product.findById(id);

        if (!product) {
            throw new NotFoundError('Product not found');
        }

        return successResponse(response, product);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single product by its barcode (for scanner-based lookup).
 * @access      Authenticated.
 * @triggeredBy No frontend caller today (POSPage loads the full catalog instead of barcode lookups).
 * @request     GET /api/products/barcode/:barcode
 * @params      Param: barcode.
 * @dbOps       Product.findByBarcode → SELECT products WHERE barcode.
 * @returns     { success, data: product }.
 */
const getProductByBarcode = async (request, response, next) => {
    try {
        const { barcode } = request.params;

        const product = await Product.findByBarcode(barcode);

        if (!product) {
            throw new NotFoundError('Product not found');
        }

        return successResponse(response, product);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Returns every product whose stock is at/below its reorder level.
 * @access      Authenticated.
 * @triggeredBy No direct frontend caller today (Dashboard uses /api/dashboard/low-stock instead).
 * @request     GET /api/products/low-stock
 * @params      none.
 * @dbOps       Product.getLowStock → SELECT products WHERE quantity_in_stock <= reorder_level.
 * @returns     { success, data: products[] }.
 */
const getLowStockProducts = async (request, response, next) => {
    try {
        const products = await Product.getLowStock();

        return successResponse(response, products);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a product, enforcing unique sku/barcode, and returns the created record.
 * @access      Manager/Admin.
 * @triggeredBy ProductsPage → ProductForm "Save" → handleSubmit().
 * @request     POST /api/products
 * @params      Body: name, sku, barcode?, category_id?, cost_price (default 0), selling_price,
 *              quantity_in_stock (default 0), reorder_level (default 10), unit (default 'piece'),
 *              description?, tax_rate (default 0).
 * @dbOps       Product.skuExists / Product.barcodeExists (SELECT); Product.create (INSERT products); Product.findById (SELECT).
 * @returns     { success, data: product } (201).
 */
const createProduct = async (request, response, next) => {
    try {
        const {
            name,
            barcode,
            sku,
            category_id,
            brand_id = null,
            unit_id = null,
            cost_price = 0,
            selling_price,
            wholesale_price = 0,
            quantity_in_stock = 0,
            reorder_level = 10,
            min_stock = 0,
            unit = 'piece',
            description,
            tax_rate = 0
        } = request.body;

        // Auto-generate unique SKU if the provided one already exists
        let finalSku = sku;
        if (await Product.skuExists(finalSku)) {
            const prefix = sku.substring(0, 8);
            let counter = 1;
            finalSku = `${prefix}-${String(counter).padStart(3, '0')}`;
            while (await Product.skuExists(finalSku)) {
                counter++;
                finalSku = `${prefix}-${String(counter).padStart(3, '0')}`;
            }
        }

        // Check for duplicate barcode if provided
        if (barcode) {
            const barcodeExists = await Product.barcodeExists(barcode);
            if (barcodeExists) {
                throw new ConflictError('Barcode already exists');
            }
        }

        // Create the product
        const productId = await Product.create({
            name,
            barcode,
            sku: finalSku,
            category_id,
            brand_id,
            unit_id,
            cost_price,
            selling_price,
            wholesale_price,
            quantity_in_stock,
            reorder_level,
            min_stock,
            unit,
            description,
            tax_rate
        });

        const product = await Product.findById(productId);

        logger.info(`Product created: ${finalSku} by ${request.user.username}`);

        return createdResponse(response, product, 'Product created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Updates an existing product with sku/barcode uniqueness checks against other products.
 * @access      Manager/Admin.
 * @triggeredBy ProductsPage edit modal → handleSubmit().
 * @request     PUT /api/products/:id
 * @params      Param: id; Body: any updatable product fields.
 * @dbOps       Product.findById (SELECT); Product.skuExists / Product.barcodeExists (SELECT); Product.update (UPDATE products).
 * @returns     { success, data: product }.
 */
const updateProduct = async (request, response, next) => {
    try {
        const { id } = request.params;
        const updateData = request.body;

        // Verify product exists
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            throw new NotFoundError('Product not found');
        }

        // Check for duplicate SKU if being updated
        if (updateData.sku && updateData.sku !== existingProduct.sku) {
            const skuExists = await Product.skuExists(updateData.sku, parseInt(id));
            if (skuExists) {
                throw new ConflictError('SKU already exists');
            }
        }

        // Check for duplicate barcode if being updated
        if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
            const barcodeExists = await Product.barcodeExists(updateData.barcode, parseInt(id));
            if (barcodeExists) {
                throw new ConflictError('Barcode already exists');
            }
        }

        // Update the product
        await Product.update(id, updateData);

        const product = await Product.findById(id);

        logger.info(`Product updated: ${product.sku} by ${request.user.username}`);

        return successResponse(response, product, 'Product updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Deactivates a product so it no longer appears in active listings/sales.
 * @access      Manager/Admin.
 * @triggeredBy ProductsPage delete confirmation → handleDelete().
 * @request     DELETE /api/products/:id
 * @params      Param: id.
 * @dbOps       Product.findById (SELECT); Product.delete → deactivate/soft DELETE products.
 * @returns     { success, message: 'Product deactivated successfully' }.
 */
const deleteProduct = async (request, response, next) => {
    try {
        const { id } = request.params;

        const product = await Product.findById(id);
        if (!product) {
            throw new NotFoundError('Product not found');
        }

        await Product.delete(id);

        logger.info(`Product deleted: ${product.sku} by ${request.user.username}`);

        return successResponse(response, null, 'Product deactivated successfully');
    } catch (error) {
        next(error);
    }
};

// Export controller functions
module.exports = {
    getProducts,
    getProductById,
    getProductByBarcode,
    getLowStockProducts,
    createProduct,
    updateProduct,
    deleteProduct
};
