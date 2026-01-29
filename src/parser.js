import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

/**
 * Extract all import/require specifiers from source code
 * Handles ESM (import/export) and CJS (require) patterns
 * @param {string} source - The source code
 * @returns {string[]} Array of import specifiers
 */
export function parseImports(source) {
  const imports = [];

  let ast;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowHashBang: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
  } catch {
    // If module mode fails, try script mode for pure CJS files
    try {
      ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowHashBang: true,
        allowReturnOutsideFunction: true,
      });
    } catch {
      return [];
    }
  }

  walk.simple(ast, {
    // require('specifier')
    CallExpression(node) {
      if (
        node.callee.name === 'require' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
      ) {
        imports.push(node.arguments[0].value);
      }
    },
    // import('specifier') - dynamic import
    ImportExpression(node) {
      if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
        imports.push(node.source.value);
      }
    },
    // import x from 'specifier'
    ImportDeclaration(node) {
      if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
        imports.push(node.source.value);
      }
    },
    // export * from 'specifier'
    ExportAllDeclaration(node) {
      if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
        imports.push(node.source.value);
      }
    },
    // export { x } from 'specifier'
    ExportNamedDeclaration(node) {
      if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
        imports.push(node.source.value);
      }
    },
  });

  return imports;
}
