'use strict';

const { add } = require('./source.cjs');

function helper() {
  return add(1, 2);
}

module.exports = { helper };
