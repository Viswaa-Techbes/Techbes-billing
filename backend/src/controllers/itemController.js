const Item = require('../models/Item');
const BusinessProfile = require('../models/BusinessProfile');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/items
 * Scoped to the logged-in user's business.
 * Supports query params: search, category, status, page, limit.
 */
const getItems = asyncHandler(async (req, res) => {
  const business = await BusinessProfile.findOne({ userId: req.user._id });
  if (!business) {
    return res.status(200).json({ success: true, data: { items: [], total: 0 } });
  }

  const { search, category, status = 'ACTIVE', page = 1, limit = 50 } = req.query;
  const filter = { businessId: business._id };

  if (status && status !== 'ALL') {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { itemName: searchRegex },
      { sku: searchRegex },
      { description: searchRegex }
    ];
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const total = await Item.countDocuments(filter);
  
  // Sort primarily by usageFrequency (most used first), then by creation date
  const items = await Item.find(filter)
    .sort({ usageFrequency: -1, createdAt: -1 })
    .skip(skipIndex)
    .limit(parseInt(limit))
    .lean();

  res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

/**
 * POST /api/items
 * Create a new item. Warns on duplicates unless ignoreDuplicateCheck is true.
 */
const createItem = asyncHandler(async (req, res) => {
  const business = await BusinessProfile.findOne({ userId: req.user._id });
  if (!business) {
    throw ApiError.badRequest('Please complete your Business Profile first.');
  }

  const { itemName, sku, ignoreDuplicateCheck = false } = req.body;

  if (!itemName || !itemName.trim()) {
    throw ApiError.badRequest('Item Name is required.');
  }

  // Duplicate check
  if (!ignoreDuplicateCheck) {
    const trimmedName = itemName.trim();
    const query = {
      businessId: business._id,
      itemName: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    };

    if (sku && sku.trim()) {
      query.sku = { $regex: new RegExp(`^${sku.trim()}$`, 'i') };
    }

    const existingItem = await Item.findOne(query);
    if (existingItem) {
      return res.status(200).json({
        success: false,
        duplicateWarning: true,
        message: `An item named "${itemName}"${sku ? ' with SKU ' + sku : ''} already exists. Do you want to save it anyway?`,
        data: existingItem
      });
    }
  }

  const item = await Item.create({
    ...req.body,
    businessId: business._id
  });

  res.status(201).json({
    success: true,
    message: 'Item created successfully.',
    data: item
  });
});

/**
 * PUT /api/items/:id
 * Edit an item.
 */
const updateItem = asyncHandler(async (req, res) => {
  const business = await BusinessProfile.findOne({ userId: req.user._id });
  if (!business) {
    throw ApiError.badRequest('Business profile not found.');
  }

  const { id } = req.params;
  const item = await Item.findOneAndUpdate(
    { _id: id, businessId: business._id },
    { ...req.body },
    { new: true, runValidators: true }
  );

  if (!item) {
    throw ApiError.notFound('Item not found or does not belong to this business.');
  }

  res.status(200).json({
    success: true,
    message: 'Item updated successfully.',
    data: item
  });
});

/**
 * DELETE /api/items/:id
 * Soft delete or deactivate item.
 */
const deleteItem = asyncHandler(async (req, res) => {
  const business = await BusinessProfile.findOne({ userId: req.user._id });
  if (!business) {
    throw ApiError.badRequest('Business profile not found.');
  }

  const { id } = req.params;
  const item = await Item.findOneAndUpdate(
    { _id: id, businessId: business._id },
    { status: 'INACTIVE' },
    { new: true }
  );

  if (!item) {
    throw ApiError.notFound('Item not found or does not belong to this business.');
  }

  res.status(200).json({
    success: true,
    message: 'Item deactivated successfully.',
    data: item
  });
});

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem
};
