/**
 * Axios React Native Compatibility Shim
 * This file ensures axios uses the browser-compatible version in React Native
 */

const fs = require('fs');
const path = require('path');

const axiosPackageJsonPath = path.join(__dirname, 'node_modules', 'axios', 'package.json');
const axiosPackageJson = JSON.parse(fs.readFileSync(axiosPackageJsonPath, 'utf8'));

// Force React Native to use browser version
axiosPackageJson['react-native'] = './dist/browser/axios.cjs';

fs.writeFileSync(axiosPackageJsonPath, JSON.stringify(axiosPackageJson, null, 2));

console.log('✅ Axios configured for React Native');
