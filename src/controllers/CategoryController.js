import db from '../database/index.js';

function parseBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

function parseFields(fields, extra = []) {
  if (!fields) return null;
  const list = fields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  const merged = ['id', ...list, ...extra];
  return [...new Set(merged)];
}

export async function searchCategories(req, res) {
  const limitParam = Number(req.query.limit ?? 12);
  const pageParam = Number(req.query.page ?? 1);

  if (Number.isNaN(limitParam) || Number.isNaN(pageParam) || pageParam < 1) {
    return res.status(400).json({ message: 'Invalid pagination parameters' });
  }

  const where = {};
  const useInMenu = parseBoolean(req.query.use_in_menu);
  if (useInMenu !== undefined) {
    where.use_in_menu = useInMenu;
  }

  const attributes = parseFields(req.query.fields, ['use_in_menu']);

  if (limitParam === -1) {
    const data = await db.Category.findAll({ where, attributes, order: [['id', 'ASC']] });
    return res.status(200).json({
      data,
      total: data.length,
      limit: -1,
      page: pageParam
    });
  }

  const limit = limitParam || 12;
  const offset = (pageParam - 1) * limit;

  const { rows, count } = await db.Category.findAndCountAll({
    where,
    attributes,
    limit,
    offset,
    order: [['id', 'ASC']]
  });

  return res.status(200).json({
    data: rows,
    total: count,
    limit,
    page: pageParam
  });
}

export async function getCategoryById(req, res) {
  const { id } = req.params;
  const category = await db.Category.findByPk(id, {
    attributes: ['id', 'name', 'slug', 'use_in_menu']
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.status(200).json(category);
}

export async function createCategory(req, res) {
  const { name, slug, use_in_menu } = req.body || {};

  if (!name || !slug) {
    return res.status(400).json({ message: 'name and slug are required' });
  }

  try {
    const created = await db.Category.create({ name, slug, use_in_menu });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ message: 'Unable to create category' });
  }
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, slug, use_in_menu } = req.body || {};

  if (!name || !slug) {
    return res.status(400).json({ message: 'name and slug are required' });
  }

  const category = await db.Category.findByPk(id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  await category.update({ name, slug, use_in_menu });
  return res.status(204).send();
}

export async function deleteCategory(req, res) {
  const { id } = req.params;
  const category = await db.Category.findByPk(id);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  await category.destroy();
  return res.status(204).send();
}