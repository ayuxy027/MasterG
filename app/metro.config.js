// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .txt extension for bundled PDF.js files (renamed from .js to avoid code processing)
config.resolver.assetExts.push('txt');

module.exports = config;
