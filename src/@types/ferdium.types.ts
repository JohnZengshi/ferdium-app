declare global {
  interface Window {
    ferdium: any;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_AUTH_TOKEN: string;
      NODE_ENV: 'development' | 'production';
      FERDIUM_APPDATA_DIR?: string;
      PORTABLE_EXECUTABLE_FILE?: string;
      PORTABLE_EXECUTABLE_DIR?: string;
      ELECTRON_IS_DEV?: string;
      APPDATA?: string;
      FERDIUM_SERVER?: string;
      WA_AKG_BASE?: string;
      API_KEY_KEY?: string;
      API_KEY_STORAGE_KEY?: string;
      USE_LOCAL_API?: string;
      USE_LIVE_API?: string;
      DEBUG?: string;
      XDG_SESSION_TYPE?: string;
      SNAP?: string;
      ENV_PATH: string;
      DB_PATH: string;
      USER_PATH: string;
      HOST: string;
      PORT: string;
      FERDIUM_LOCAL_TOKEN: string;
    }
  }
}

/**
 * Workaround to make TS recognize this file as a module.
 * https://fettblog.eu/typescript-augmenting-global-lib-dom/
 */
export type {};
