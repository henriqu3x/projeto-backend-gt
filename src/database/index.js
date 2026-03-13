import { Sequelize, DataTypes } from 'sequelize';
import env from '../config/env.js';
import UserModel from '../models/User.js';
import CategoryModel from '../models/Category.js';
import ProductModel from '../models/Product.js';
import ProductImageModel from '../models/ProductImage.js';
import ProductOptionModel from '../models/ProductOption.js';
import ProductCategoryModel from '../models/ProductCategory.js';

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false
});

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = UserModel(sequelize, DataTypes);
db.Category = CategoryModel(sequelize, DataTypes);
db.Product = ProductModel(sequelize, DataTypes);
db.ProductImage = ProductImageModel(sequelize, DataTypes);
db.ProductOption = ProductOptionModel(sequelize, DataTypes);
db.ProductCategory = ProductCategoryModel(sequelize, DataTypes);

// Associations

db.Product.hasMany(db.ProductImage, { foreignKey: 'product_id', as: 'images' });
db.ProductImage.belongsTo(db.Product, { foreignKey: 'product_id' });

db.Product.hasMany(db.ProductOption, { foreignKey: 'product_id', as: 'options' });
db.ProductOption.belongsTo(db.Product, { foreignKey: 'product_id' });

db.Product.belongsToMany(db.Category, {
  through: db.ProductCategory,
  foreignKey: 'product_id',
  otherKey: 'category_id'
});

db.Category.belongsToMany(db.Product, {
  through: db.ProductCategory,
  foreignKey: 'category_id',
  otherKey: 'product_id'
});

export default db;