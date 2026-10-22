import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichTextHtml } from '../../src/utils/richText.ts';

test('preserves supported formatting and safe links', () => {
  assert.equal(
    sanitizeRichTextHtml('<h2 onclick="alert(1)">Title</h2><p><strong>Bold</strong> <a href="https://example.com" target="_blank">link</a></p>'),
    '<h2>Title</h2><p><strong>Bold</strong> <a href="https://example.com">link</a></p>',
  );
});

test('removes scripts, unsafe links, event handlers, and unsupported tags', () => {
  assert.equal(
    sanitizeRichTextHtml('<script>alert(1)</script><p onmouseover="bad()">Hello <a href="javascript:alert(1)">click</a><img src=x></p>'),
    '<p>Hello <a>click</a></p>',
  );
});

test('supports legacy plain text without injecting markup', () => {
  assert.equal(sanitizeRichTextHtml('Plain policy text'), 'Plain policy text');
});
