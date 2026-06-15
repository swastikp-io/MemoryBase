export default [
  {
    extends: 'vite.config.ts',
    test: {
      name: 'client',
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  },
  {
    test: {
      name: 'server',
      include: ['server/**/*.test.ts'],
      environment: 'node',
    },
  },
];
