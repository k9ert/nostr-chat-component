import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/components/nostr-chat.js',
  output: [
    {
      file: 'dist/nostr-chat.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/nostr-chat.min.js',
      format: 'es',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [nodeResolve()]
};
