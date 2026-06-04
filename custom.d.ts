// Module declarations to allow importing CSS and the new react-dom client entry in TS
declare module 'react-dom/client' {
  import * as React from 'react';
  export function createRoot(container: Element | DocumentFragment): {
    render(element: React.ReactNode): void;
  };
}

declare module '*.css';

interface ImportMetaEnv {
  readonly DEV?: boolean;
  readonly MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
