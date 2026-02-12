module.exports = {
  root: true,
  extends: '@react-native',

  // Parser options cho ES6+ và JSX
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  // Environment settings
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },

  // Cài đặt React
  settings: {
    react: {
      version: 'detect', // Auto-detect phiên bản React
    },
  },

  // Custom rules override
  rules: {
    // ========================================
    // General JavaScript/TypeScript Rules
    // ========================================

    // Cho phép console.log/error (hữu ích cho debug)
    'no-console': 'off',

    // Tắt formatting rules (Prettier xử lý)
    semi: 'off',
    quotes: 'off',
    'comma-dangle': 'off',

    // ========================================
    // React & React Native Rules
    // ========================================

    // Cho phép JSX trong .tsx và .jsx
    'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],

    // Không bắt buộc import React (React 17+)
    'react/react-in-jsx-scope': 'off',

    // Cảnh báo khi define component trong render
    'react/no-unstable-nested-components': [
      'warn',
      { allowAsProps: true }, // Cho phép nếu pass qua props
    ],

    // Cho phép inline styles (RN thường dùng)
    'react-native/no-inline-styles': 'off',

    // Sort imports (không bắt buộc nhưng đẹp hơn)
    'react-native/sort-styles': 'off',

    // ========================================
    // React Hooks Rules
    // ========================================

    // Bắt buộc tuân theo rules of hooks
    'react-hooks/rules-of-hooks': 'error',

    // Cảnh báo dependencies thiếu
    'react-hooks/exhaustive-deps': 'warn',

    // ========================================
    // Import/Export Rules
    // ========================================

    // Cho phép default export
    'import/prefer-default-export': 'off',

    // Không bắt buộc extension cho imports
    'import/extensions': 'off',
  },

  // Override cho từng loại file cụ thể
  overrides: [
    // ========================================
    // TypeScript Files (.ts, .tsx)
    // ========================================
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        // Cho phép biến/param không dùng nếu bắt đầu bằng _
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
          },
        ],

        // Tắt no-unused-vars của ESLint gốc (dùng TS version)
        'no-unused-vars': 'off',

        // Cho phép any type (warning thôi)
        '@typescript-eslint/no-explicit-any': 'warn',

        // Cho phép empty function
        '@typescript-eslint/no-empty-function': 'warn',

        // Không bắt buộc explicit return type
        '@typescript-eslint/explicit-module-boundary-types': 'off',

        // Cảnh báo khi shadow variable
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'warn',

        // Cho phép require() (React Native hay dùng cho assets)
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',

        // Cho phép namespace (dùng trong type declarations)
        '@typescript-eslint/no-namespace': 'off',

        // Cho phép empty interface (extends từ interface khác)
        '@typescript-eslint/no-empty-object-type': 'off',
      },
    },

    // ========================================
    // Test Files
    // ========================================
    {
      files: [
        '*.test.ts',
        '*.test.tsx',
        '*.spec.ts',
        '*.spec.tsx',
        '**/__tests__/**/*',
        '**/__mocks__/**/*',
      ],
      env: {
        jest: true,
        'jest/globals': true,
      },
      rules: {
        // Cho phép inline styles trong test
        'react-native/no-inline-styles': 'off',

        // Cho phép any trong test
        '@typescript-eslint/no-explicit-any': 'off',

        // Cho phép empty function trong mock
        '@typescript-eslint/no-empty-function': 'off',
      },
    },

    // ========================================
    // Config Files
    // ========================================
    {
      files: [
        '*.config.js',
        '*.config.ts',
        'babel.config.js',
        'metro.config.js',
      ],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // ========================================
    // Supabase Edge Functions (Deno)
    // ========================================
    {
      files: ['supabase/functions/**/*.ts'],
      env: {
        browser: false,
        node: false,
      },
      globals: {
        Deno: 'readonly',
      },
      rules: {
        // Deno sử dụng import maps, không cần extension
        'import/extensions': 'off',

        // Cho phép top-level await
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
