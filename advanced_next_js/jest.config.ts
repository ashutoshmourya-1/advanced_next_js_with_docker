import type {Config} from 'jest';
import nextJest from 'next/jest.js'
 
const create_jest_config = nextJest({
  dir: './',
})

const config: Config = {
  clearMocks: true,

  collectCoverage: true,

  coverageDirectory: "coverage",

  coverageProvider: "v8",

  moduleNameMapper: {
    "^@repositories/(.*)$": "<rootDir>/src/repositories/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@actions/(.*)$": "<rootDir>/src/actions/$1",
    "^@type/(.*)$": "<rootDir>/src/type/$1",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
  },

  modulePathIgnorePatterns: ["<rootDir>/.next/"],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testEnvironment: "jsdom",
};

const jest_config_fn = create_jest_config(config);
 
export default async (): Promise<Config> => {
  const resolved_config = await jest_config_fn();
  return {
    ...resolved_config,
    transformIgnorePatterns: ["/node_modules/(?!.*@tanstack)"],
  };
};