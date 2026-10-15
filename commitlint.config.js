/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'data', 'docs', 'test', 'refactor', 'perf', 'build', 'ci', 'chore', 'revert'],
    ],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
