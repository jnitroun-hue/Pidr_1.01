export const APP_BUILD_STORAGE_KEY = 'pidr_app_build_id';
export const APP_UPDATE_RELOAD_KEY = 'pidr_app_update_reloading';
export const APP_VERSION_CHECK_INTERVAL_MS = 3 * 60 * 1000;

/** Встроенный id сборки (NEXT_PUBLIC_APP_BUILD_ID на этапе build) */
export function getEmbeddedBuildId(): string {
  return process.env.NEXT_PUBLIC_APP_BUILD_ID || 'local-dev';
}
