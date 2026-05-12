'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_ID_CARD_SETTINGS,
  ID_CARD_SETTINGS_KEY,
  normalizeAllProfiles,
} from '@/lib/idCardTemplateSettings';

export const IDCARD_SETTINGS_STORAGE_EVENT = 'idcard-settings-storage';

function subscribe(onStoreChange) {
  const win = typeof window !== 'undefined' ? window : undefined;
  if (!win) return () => {};
  win.addEventListener('storage', onStoreChange);
  win.addEventListener(IDCARD_SETTINGS_STORAGE_EVENT, onStoreChange);
  return () => {
    win.removeEventListener('storage', onStoreChange);
    win.removeEventListener(IDCARD_SETTINGS_STORAGE_EVENT, onStoreChange);
  };
}

/**
 * useSyncExternalStore compares snapshots with Object.is. normalizeAllProfiles() always
 * returns new object references, so we must return the same reference when localStorage
 * raw string is unchanged — otherwise React hits "Maximum update depth exceeded" (error #185).
 */
let memoRaw = '__init__';
let memoSnapshot = DEFAULT_ID_CARD_SETTINGS;

function getSnapshot() {
  try {
    const raw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY) ?? '';
    if (raw === memoRaw) {
      return memoSnapshot;
    }
    memoRaw = raw;
    if (!raw) {
      memoSnapshot = DEFAULT_ID_CARD_SETTINGS;
      return memoSnapshot;
    }
    const profiles = normalizeAllProfiles(JSON.parse(raw));
    memoSnapshot = profiles.default;
    return memoSnapshot;
  } catch {
    memoRaw = '';
    memoSnapshot = DEFAULT_ID_CARD_SETTINGS;
    return memoSnapshot;
  }
}

function getServerSnapshot() {
  return DEFAULT_ID_CARD_SETTINGS;
}

/** SSR-safe: server + first paint match defaults; after hydration reads localStorage. */
export function useIdCardSettingsFromStorage() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
