import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src', '<rootDir>/shared'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'server/src/**/*.ts',
    'shared/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
};

export default config;
