// Jest setup for Web Crypto API
const { Crypto } = require('@peculiar/webcrypto');

// Polyfill Web Crypto API for Node.js tests
global.crypto = new Crypto();

// Mock TextEncoder/TextDecoder if needed
if (!global.TextEncoder) {
  global.TextEncoder = require('util').TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = require('util').TextDecoder;
}