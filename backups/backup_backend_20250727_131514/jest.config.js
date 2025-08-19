export default {
  // Configuration for ES modules
  transform: {},
  transformIgnorePatterns: [],
  
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'auth/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    '!node_modules/**',
    '!tests/**',
    '!coverage/**',
    '!jest.config.js',
    '!server.js',
    '!index.js',
    '!migrations/**',
    '!seeders/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};