import { z } from 'zod';

// Files we stored ourselves look like /uploads/<uuid>.<ext>.
const UPLOADED_IMAGE = /^\/uploads\/[A-Za-z0-9_-]+\.(jpg|png|gif|webp)$/;
const UPLOADED_MEDIA = /^\/uploads\/[A-Za-z0-9_-]+\.(jpg|png|gif|webp|mp4|webm|mov)$/;

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const urlOr = (uploaded, message) =>
  z.string().max(2048).refine((value) => uploaded.test(value) || isHttpUrl(value), message);

// Post attachments: photos or videos.
export const mediaUrlSchema = urlOr(UPLOADED_MEDIA, 'Must be an uploaded file or an http(s) link');
// Avatars, community icons and banners must be pictures.
export const imageUrlSchema = urlOr(UPLOADED_IMAGE, 'Must be an uploaded image or an http(s) link');