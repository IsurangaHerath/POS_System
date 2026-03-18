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
 * Retrieves a paginated list of products with optional filtering
 * Query params: page, limit, category_id, is_active, low_stock, search, sortBy, sortOrder
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
 * Retrieves a single product by its ID
 * Params: id
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
 * Retrieves a single product by its barcode
 * Params: barcode
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
 * Retrieves all products with low stock levels
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
 * Creates a new product
 * Body: name, barcode, sku, category_id, cost_price, selling_price, 
 *       quantity_in_stock, reorder_level, unit, description, tax_rate
 */
const createProduct = async (request, response, next) => {
    try {
        const {
            name,
            barcode,
            sku,
            category_id,
            cost_price = 0,
            selling_price,
            quantity_in_stock = 0,
            reorder_level = 10,
            unit = 'piece',
            description,
            tax_rate = 0
        } = request.body;

        // Check for duplicate SKU
        const skuExists = await Product.skuExists(sku);
        if (skuExists) {
            throw new ConflictError('SKU already exists');
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
            sku,
            category_id,
            cost_price,
            selling_price,
            quantity_in_stock,
            reorder_level,
            unit,
            description,
            tax_rate
        });

        const product = await Product.findById(productId);

        logger.info(`Product created: ${sku} by ${request.user.username}`);

        return createdResponse(response, product, 'Product created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Updates an existing product
 * Params: id
 * Body: product fields to update
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
 * Deletes (deactivates) a product
 * Params: id
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
