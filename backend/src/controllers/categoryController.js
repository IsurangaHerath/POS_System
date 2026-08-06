/**
 * Category Controller
 * 
 * Handles category management operations.
 */

const Category = require('../models/Category');
const { successResponse, createdResponse, notFoundResponse } = require('../utils/response');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @description Returns all categories built as a parent/child tree for hierarchical UI.
 * @access      Authenticated.
 * @triggeredBy CategoriesPage, ProductsPage filter, POSPage catalog, PurchaseOrdersPage item picker.
 * @request     GET /api/categories
 * @params      none.
 * @dbOps       Category.findAllTree → SELECT categories + child assembly.
 * @returns     { success, data: categories[] }.
 */
const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.findAllTree();

        return successResponse(res, categories);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Retrieves a single category by ID.
 * @access      Authenticated.
 * @triggeredBy No frontend caller today.
 * @request     GET /api/categories/:id
 * @params      Param: id.
 * @dbOps       Category.findById → SELECT categories.
 * @returns     { success, data: category }.
 */
const getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);

        if (!category) {
            throw new NotFoundError('Category not found');
        }

        return successResponse(res, category);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Creates a category with an optional parent for hierarchy support.
 * @access      Manager/Admin.
 * @triggeredBy CategoriesPage "Add Category" → handleSubmit().
 * @request     POST /api/categories
 * @params      Body: name, description?, parent_id?.
 * @dbOps       Category.nameExists (SELECT); Category.create (INSERT categories); Category.findById (SELECT).
 * @returns     { success, data: category } (201).
 */
const createCategory = async (req, res, next) => {
    try {
        const { name, description, parent_id } = req.body;

        // Check if category name already exists
        const nameExists = await Category.nameExists(name);
        if (nameExists) {
            throw new ConflictError('Category name already exists');
        }

        // Create category
        const categoryId = await Category.create({
            name,
            description,
            parent_id
        });

        // Get created category
        const category = await Category.findById(categoryId);

        logger.info(`Category created: ${name} by ${req.user.username}`);

        return createdResponse(res, category, 'Category created successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Updates a category (rename/re-parent/activate); prevents a category from
 *              being set as its own parent and enforces unique names.
 * @access      Manager/Admin.
 * @triggeredBy CategoriesPage edit modal → handleSubmit().
 * @request     PUT /api/categories/:id
 * @params      Param: id; Body: name?, description?, parent_id?, is_active?.
 * @dbOps       Category.findById (SELECT); Category.nameExists (SELECT); Category.update (UPDATE categories).
 * @returns     { success, data: category }.
 */
const updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, parent_id, is_active } = req.body;

        // Check if category exists
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            throw new NotFoundError('Category not found');
        }

        // Check if name is being changed and if it already exists
        if (name && name !== existingCategory.name) {
            const nameExists = await Category.nameExists(name, parseInt(id));
            if (nameExists) {
                throw new ConflictError('Category name already exists');
            }
        }

        // Prevent setting parent to self
        if (parent_id && parseInt(parent_id) === parseInt(id)) {
            throw new ConflictError('Category cannot be its own parent');
        }

        // Update category
        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (parent_id !== undefined) updateData.parent_id = parent_id;
        if (is_active !== undefined) updateData.is_active = is_active;

        await Category.update(id, updateData);

        // Get updated category
        const category = await Category.findById(id);

        logger.info(`Category updated: ${category.name} by ${req.user.username}`);

        return successResponse(res, category, 'Category updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @description Deletes a category only when it has no products and no child categories.
 * @access      Manager/Admin.
 * @triggeredBy CategoriesPage delete confirmation → handleDelete().
 * @request     DELETE /api/categories/:id
 * @params      Param: id.
 * @dbOps       Category.findById (SELECT); Category.hasProducts / Category.hasChildren (SELECT); Category.delete.
 * @returns     { success, message: 'Category deleted successfully' }.
 */
const deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if category exists
        const category = await Category.findById(id);
        if (!category) {
            throw new NotFoundError('Category not found');
        }

        // Check if category has products
        const hasProducts = await Category.hasProducts(id);
        if (hasProducts) {
            throw new ConflictError('Cannot delete category with products. Remove products first or reassign them.');
        }

        // Check if category has children
        const hasChildren = await Category.hasChildren(id);
        if (hasChildren) {
            throw new ConflictError('Cannot delete category with subcategories. Delete subcategories first.');
        }

        // Delete category
        await Category.delete(id);

        logger.info(`Category deleted: ${category.name} by ${req.user.username}`);

        return successResponse(res, null, 'Category deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
