// v5.0 — FOUND-V5-04: nordic/require-change-log
// Fails lint when an exported async function whose name matches the mutating-
// verb regex in a v5 feature service file contains no recordChange( call and
// no @no-change-log escape-hatch comment with a reason.
//
// Scope is controlled entirely by the `files:` glob in eslint.config.mjs —
// new v5 feature dirs add themselves to that include list as they land.

'use strict';

const MUTATING_VERB_RE =
  /^(create|update|delete|edit|submit|approve|reject|commit|rollback|upsert|archive|withdraw|bulk[A-Z])/;

function isMutatingName(name) {
  return typeof name === 'string' && MUTATING_VERB_RE.test(name);
}

function getFnFromExport(node) {
  // ExportNamedDeclaration -> FunctionDeclaration
  if (node.declaration && node.declaration.type === 'FunctionDeclaration') {
    return { fn: node.declaration, name: node.declaration.id && node.declaration.id.name };
  }
  // ExportNamedDeclaration -> VariableDeclaration -> VariableDeclarator(Arrow/FunctionExpression)
  if (node.declaration && node.declaration.type === 'VariableDeclaration') {
    const decl = node.declaration.declarations && node.declaration.declarations[0];
    if (
      decl &&
      decl.init &&
      (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')
    ) {
      return { fn: decl.init, name: decl.id && decl.id.name };
    }
  }
  return null;
}

function bodyCallsRecordChange(fnNode) {
  let found = false;
  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (
      node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'recordChange'
    ) {
      found = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === 'object' && typeof val.type === 'string') walk(val);
    }
  }
  walk(fnNode.body);
  return found;
}

function findEscapeHatch(comments) {
  // Returns { present: boolean, hasReason: boolean }
  for (const c of comments) {
    const text = c.value || '';
    const idx = text.indexOf('@no-change-log');
    if (idx === -1) continue;
    const after = text.slice(idx + '@no-change-log'.length);
    // Consider a reason present if there is any non-whitespace, non-asterisk text after the tag.
    const reason = after.replace(/[\s*]+/g, '');
    return { present: true, hasReason: reason.length > 0 };
  }
  return { present: false, hasReason: false };
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforces that every exported async mutating function calls recordChange() (or uses the @no-change-log escape hatch with a reason).',
    },
    messages: {
      missingRecordChange:
        "Mutating export '{{name}}' must call recordChange() inside its body, or document an escape hatch via a leading /** @no-change-log <reason> */ block comment.",
      escapeHatchNeedsReason:
        "'@no-change-log' escape hatch on '{{name}}' must include an explanatory reason after the tag.",
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    return {
      ExportNamedDeclaration(node) {
        const info = getFnFromExport(node);
        if (!info || !info.fn || !info.name) return;
        if (!info.fn.async) return;
        if (!isMutatingName(info.name)) return;

        const comments = sourceCode.getCommentsBefore(node);
        const hatch = findEscapeHatch(comments);

        if (hatch.present) {
          if (!hatch.hasReason) {
            context.report({
              node: info.fn.id || node,
              messageId: 'escapeHatchNeedsReason',
              data: { name: info.name },
            });
          }
          return;
        }

        if (!bodyCallsRecordChange(info.fn)) {
          context.report({
            node: info.fn.id || node,
            messageId: 'missingRecordChange',
            data: { name: info.name },
          });
        }
      },
    };
  },
};
