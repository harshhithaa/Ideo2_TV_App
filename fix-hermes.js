#!/usr/bin/env node

/**
 * Fix for React Native 0.76.5 Hermes library issue
 * 
 * RN 0.76.5 has a bug where it tries to load libhermes_executor.so
 * but that library was merged into libhermes.so. This script creates
 * a symlink/copy so the app can run on emulators.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Hermes executor library for RN 0.76.5...');

const architectures = ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'];
const variants = ['debug', 'release'];

let fixed = 0;

variants.forEach(variant => {
  const basePath = path.join(__dirname, 'android', 'app', 'build', 'intermediates', 'merged_native_libs', variant, `merge${variant.charAt(0).toUpperCase() + variant.slice(1)}NativeLibs`, 'out', 'lib');
  
  if (!fs.existsSync(basePath)) {
    return;
  }

  architectures.forEach(abi => {
    const abiDir = path.join(basePath, abi);
    if (!fs.existsSync(abiDir)) {
      return;
    }

    const hermesLib = path.join(abiDir, 'libhermes.so');
    const hermesExecutorLib = path.join(abiDir, 'libhermes_executor.so');

    if (fs.existsSync(hermesLib) && !fs.existsSync(hermesExecutorLib)) {
      try {
        fs.copyFileSync(hermesLib, hermesExecutorLib);
        console.log(`✅ Created libhermes_executor.so for ${variant}/${abi}`);
        fixed++;
      } catch (err) {
        console.error(`❌ Failed to copy for ${variant}/${abi}:`, err.message);
      }
    }
  });
});

if (fixed === 0) {
  console.log('ℹ️  No libraries needed fixing (build first with `cd android && ./gradlew assembleDebug`)');
} else {
  console.log(`\n✨ Fixed ${fixed} architecture(s)`);
}
