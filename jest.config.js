export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/index.ts',
    '!server/vite.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};