import { Op } from 'sequelize';
import db from '../database/index.js';
import { saveBase64Image, toPublicUrl } from '../services/imageService.js';

function parseNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeOptionValues(option) {
  const raw = option?.values ?? option?.value;
  if (Array.isArray(raw)) return raw.map((item) => String(item));
  if (typeof raw === 'string') return raw.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeRadius(radius) {
  if (radius === undefined || radius === null) return undefined;
  if (typeof radius === 'number') return radius;
  const parsed = parseInt(String(radius).replace('px', ''), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function serializeProduct(product, fields = null) {
  const plain = product.get({ plain: true });
  const categoryIds = plain.Categories?.map((category) => category.id) ?? [];
  const images = (plain.images || []).map((img) => ({
    id: img.id,
    content: toPublicUrl(img.path)
  }));
  const options = (plain.options || []).map((opt) => ({
    id: opt.id,
    title: opt.title,
    shape: opt.shape,
    radius: opt.radius,
    type: opt.type,
    values: opt.values ? opt.values.split(',').map((v) => v.trim()).filter(Boolean) : []
  }));

  const base = {
    id: plain.id,
    enabled: plain.enabled,
    name: plain.name,
    slug: plain.slug,
    stock: plain.stock,
    description: plain.description,
    price: plain.price,
    price_with_discount: plain.price_with_discount,
    category_ids: categoryIds,
    images,
    options
  };

  if (!fields) return base;

  const requested = fields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  const response = { id: base.id };
  for (const key of requested) {
    if (key in base) {
      response[key] = base[key];
    }
  }

  return response;
}

function getOptionFilters(query) {
  const filters = [];
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^option\[(\d+)\]$/);
    if (!match) continue;
    const optionId = Number(match[1]);
    const values = parseArray(value);
    if (optionId && values.length) {
      filters.push({ optionId, values });
    }
  }
  return filters;
}

async function applyOptionFilters(products, filters) {
  if (!filters.length) return products;

  return products.filter((product) => {
    const options = product.options || [];
    return filters.every((filter) => {
      const option = options.find((opt) => opt.id === filter.optionId);
      if (!option) return false;
      const values = option.values ? option.values.split(',').map((v) => v.trim()) : [];
      return filter.values.some((v) => values.includes(v));
    });
  });
}

export async function searchProducts(req, res) {
  const limitParam = parseNumber(req.query.limit ?? 12, 12);
  const pageParam = parseNumber(req.query.page ?? 1, 1);
  if (Number.isNaN(limitParam) || Number.isNaN(pageParam) || pageParam < 1) {
    return res.status(400).json({ message: 'Invalid pagination parameters' });
  }

  const where = {};
  const match = req.query.match;
  if (match) {
    where[Op.or] = [
      { name: { [Op.like]: `%${match}%` } },
      { description: { [Op.like]: `%${match}%` } }
    ];
  }

  const priceRange = req.query['price-range'];
  if (priceRange) {
    const [min, max] = priceRange.split('-').map((value) => parseNumber(value));
    if (min !== null && max !== null) {
      where.price = { [Op.between]: [min, max] };
    }
  }

  const categoryIds = parseArray(req.query.category_ids).map((id) => Number(id)).filter(Boolean);
  const optionFilters = getOptionFilters(req.query);

  const include = [
    { model: db.ProductImage, as: 'images' },
    { model: db.ProductOption, as: 'options' },
    { model: db.Category, through: { attributes: [] } }
  ];

  if (categoryIds.length) {
    include[2].where = { id: categoryIds };
    include[2].required = true;
  }

  const queryOptions = {
    where,
    include,
    order: [['id', 'ASC']]
  };

  let products = await db.Product.findAll(queryOptions);

  if (optionFilters.length) {
    products = await applyOptionFilters(products, optionFilters);
  }

  const total = products.length;
  let paged = products;

  if (limitParam !== -1) {
    const limit = limitParam || 12;
    const offset = (pageParam - 1) * limit;
    paged = products.slice(offset, offset + limit);

    return res.status(200).json({
      data: paged.map((product) => serializeProduct(product, req.query.fields)),
      total,
      limit,
      page: pageParam
    });
  }

  return res.status(200).json({
    data: paged.map((product) => serializeProduct(product, req.query.fields)),
    total,
    limit: -1,
    page: pageParam
  });
}

export async function getProductById(req, res) {
  const { id } = req.params;

  const product = await db.Product.findByPk(id, {
    include: [
      { model: db.ProductImage, as: 'images' },
      { model: db.ProductOption, as: 'options' },
      { model: db.Category, through: { attributes: [] } }
    ]
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.status(200).json(serializeProduct(product));
}

export async function createProduct(req, res) {
  const {
    enabled,
    name,
    slug,
    stock,
    description,
    price,
    price_with_discount,
    category_ids,
    images,
    options
  } = req.body || {};

  if (!name || !slug || price === undefined || price_with_discount === undefined) {
    return res.status(400).json({ message: 'name, slug, price and price_with_discount are required' });
  }

  const transaction = await db.sequelize.transaction();
  try {
    const product = await db.Product.create(
      {
        enabled: enabled ?? false,
        name,
        slug,
        stock: stock ?? 0,
        description: description ?? null,
        price,
        price_with_discount,
        use_in_menu: req.body?.use_in_menu ?? false
      },
      { transaction }
    );

    if (Array.isArray(category_ids) && category_ids.length) {
      await product.setCategories(category_ids, { transaction });
    }

    if (Array.isArray(images) && images.length) {
      for (const image of images) {
        if (!image?.content) continue;
        const path = await saveBase64Image({
          content: image.content,
          type: image.type,
          productId: product.id
        });
        if (path) {
          await db.ProductImage.create(
            { product_id: product.id, enabled: image.enabled ?? false, path },
            { transaction }
          );
        }
      }
    }

    if (Array.isArray(options) && options.length) {
      for (const option of options) {
        if (!option?.title) continue;
        const values = normalizeOptionValues(option);
        await db.ProductOption.create(
          {
            product_id: product.id,
            title: option.title,
            shape: option.shape ?? 'square',
            radius: normalizeRadius(option.radius) ?? 0,
            type: option.type ?? 'text',
            values: values.join(',')
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const created = await db.Product.findByPk(product.id, {
      include: [
        { model: db.ProductImage, as: 'images' },
        { model: db.ProductOption, as: 'options' },
        { model: db.Category, through: { attributes: [] } }
      ]
    });

    return res.status(201).json(serializeProduct(created));
  } catch (err) {
    await transaction.rollback();
    return res.status(400).json({ message: 'Unable to create product' });
  }
}

export async function updateProduct(req, res) {
  const { id } = req.params;

  const product = await db.Product.findByPk(id, {
    include: [
      { model: db.ProductImage, as: 'images' },
      { model: db.ProductOption, as: 'options' }
    ]
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const transaction = await db.sequelize.transaction();
  try {
    const updates = {};
    const fields = ['enabled', 'name', 'slug', 'stock', 'description', 'price', 'price_with_discount', 'use_in_menu'];
    for (const field of fields) {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length) {
      await product.update(updates, { transaction });
    }

    if (Array.isArray(req.body?.category_ids)) {
      await product.setCategories(req.body.category_ids, { transaction });
    }

    if (Array.isArray(req.body?.images)) {
      for (const image of req.body.images) {
        if (image?.deleted && image?.id) {
          await db.ProductImage.destroy({ where: { id: image.id, product_id: product.id }, transaction });
          continue;
        }

        if (image?.id) {
          if (image.content && !String(image.content).startsWith('http')) {
            const path = await saveBase64Image({
              content: image.content,
              type: image.type,
              productId: product.id
            });
            if (path) {
              await db.ProductImage.update(
                { path },
                { where: { id: image.id, product_id: product.id }, transaction }
              );
            }
          }
          continue;
        }

        if (image?.content) {
          const path = await saveBase64Image({
            content: image.content,
            type: image.type,
            productId: product.id
          });
          if (path) {
            await db.ProductImage.create(
              { product_id: product.id, enabled: image.enabled ?? false, path },
              { transaction }
            );
          }
        }
      }
    }

    if (Array.isArray(req.body?.options)) {
      for (const option of req.body.options) {
        if (option?.deleted && option?.id) {
          await db.ProductOption.destroy({ where: { id: option.id, product_id: product.id }, transaction });
          continue;
        }

        const values = normalizeOptionValues(option);
        if (option?.id) {
          await db.ProductOption.update(
            {
              title: option.title,
              shape: option.shape,
              radius: normalizeRadius(option.radius),
              type: option.type,
              values: values.length ? values.join(',') : undefined
            },
            {
              where: { id: option.id, product_id: product.id },
              transaction
            }
          );
          continue;
        }

        if (option?.title) {
          await db.ProductOption.create(
            {
              product_id: product.id,
              title: option.title,
              shape: option.shape ?? 'square',
              radius: normalizeRadius(option.radius) ?? 0,
              type: option.type ?? 'text',
              values: values.join(',')
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();
    return res.status(204).send();
  } catch (err) {
    await transaction.rollback();
    return res.status(400).json({ message: 'Unable to update product' });
  }
}

export async function deleteProduct(req, res) {
  const { id } = req.params;
  const product = await db.Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await product.destroy();
  return res.status(204).send();
}