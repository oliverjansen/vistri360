import React from 'react'

export const storageFormat = (path) => {
  const storagePath = import.meta.env.VITE_STORAGE_PATH + '/' + path;

  return storagePath;
}