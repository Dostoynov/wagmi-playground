/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GREETER_ADDRESS: string;
  readonly VITE_SF_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


