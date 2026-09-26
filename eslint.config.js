let customConfig = [];
let hasIgnoresFile = false;
try {
  require.resolve('./eslint.ignores.js');
  hasIgnoresFile = true;
} catch {
  // eslint.ignores.js doesn't exist
}

if (hasIgnoresFile) {
  const ignores = require('./eslint.ignores.js');
  customConfig = [{ignores}];
}

module.exports = [
  ...customConfig,
  ...require('gts'),
  {
    files: ['src/notification-sound-core.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['tools/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
