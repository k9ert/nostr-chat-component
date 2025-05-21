import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  files: 'test/**/*.test.js',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  testFramework: {
    config: {
      timeout: '10000', // 10 Sekunden Timeout für Tests
    },
  },
  plugins: [
    esbuildPlugin({ ts: true, target: 'auto' }),
  ],
};
