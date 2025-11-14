/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY: string
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.wasm?arraybuffer' {
  const src: ArrayBuffer;
  export default src;
}
