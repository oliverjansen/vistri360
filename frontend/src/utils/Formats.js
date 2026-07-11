import React from 'react'

export const storageFormat = (path) => {
  const storageBasePath = import.meta.env.VITE_STORAGE_PATH?.replace(/\/$/, '') ?? '';
  const normalizedPath = String(path).replace(/^\//, '');
  const storagePath = `${storageBasePath}/${normalizedPath}`;

  return storagePath;
}
