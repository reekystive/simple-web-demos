/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import packageJson from './package.json' with { type: 'json' };

const entries: Record<string, string> = {
  index: './src/index.ts',
};

const externalDeps = [...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.peerDependencies)];
export const regexOfExternalDeps = externalDeps.map((dep) => new RegExp(`^${dep}(?:$|/)`));

const dtsPlugin = dts({
  bundleTypes: true,
  outDirs: ['dist'],
  tsconfigPath: 'tsconfig.web.json',
});

// @ts-expect-error - adding custom identifier to the plugin to filter it out in storybook builds
dtsPlugin.identifier = 'unplugin-dts/vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
      cssFileName: 'styles',
    },
    rollupOptions: {
      output: {
        preserveModules: true,
      },
      external: regexOfExternalDeps,
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss(), tsconfigPaths(), dtsPlugin],
  test: {},
});
