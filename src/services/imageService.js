import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';

const mediaRoot = path.resolve(process.cwd(), 'media');

function normalizeBase64(content) {
  if (!content) return null;
  const match = content.match(/^data:(.+);base64,(.*)$/);
  if (match) {
    return { mime: match[1], data: match[2] };
  }
  return { mime: null, data: content };
}

function extensionFromMime(mime) {
  if (!mime) return 'png';
  const map = {
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  return map[mime] || 'png';
}

export async function saveBase64Image({ content, type, productId }) {
  const normalized = normalizeBase64(content);
  if (!normalized) return null;

  const ext = extensionFromMime(type || normalized.mime);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const productDir = path.join(mediaRoot, `product-${productId}`);
  const filepath = path.join(productDir, filename);

  await fs.mkdir(productDir, { recursive: true });
  const buffer = Buffer.from(normalized.data, 'base64');
  await fs.writeFile(filepath, buffer);

  const relativePath = path.join('media', `product-${productId}`, filename).replace(/\\/g, '/');
  return relativePath;
}

export function toPublicUrl(relativePath) {
  if (!relativePath) return null;
  const base = env.APP_URL.replace(/\/$/, '');
  const clean = relativePath.replace(/^\//, '');
  return `${base}/${clean}`;
}