module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        node: true, // Agregar soporte para Node.js
    },
    parserOptions: {
        ecmaVersion: 'latest',
    },
    plugins: ['bot-whatsapp'],
    extends: ['plugin:bot-whatsapp/recommended'],
};
