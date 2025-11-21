module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'ci']],
        'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
        'subject-empty': [2, 'never'],
        'subject-period': [2, 'never', '.'],
    },
};
