// All authenticated and public services use the same production API origin.
export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  'https://api.nuvanata.io/api/v1'
).trim().replace(/\/+$/, '');

const publicBase = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
export const APP_BASENAME = publicBase
  ? new URL(publicBase, window.location.origin).pathname.replace(/\/+$/, '')
  : '';
export const appUrl = path => `${APP_BASENAME}/${String(path).replace(/^\/+/, '')}`;
export const publicAsset = path => `${publicBase}/${String(path).replace(/^\/+/, '')}`;
