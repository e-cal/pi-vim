import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMultiLineEditor,
  sendKeys,
  setInternalCursor,
} from "./harness.js";

// Intentional Vim divergence: normal j/k are mapped to gj/gk. Visual j/k
// and operator j/k retain logical-line semantics; Pi owns wrapping geometry.
describe("wrapped-line navigation", () => {
  const text = "abcdefghijklmnopqrstuvwxyz\nXYZ";

  it("moves within a wrapped logical line and preserves the buffer", () => {
    const { editor, clipboardWrites } = createMultiLineEditor(text);
    editor.render(12); // Eleven content columns with the default padding.
    editor.handleInput("j");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
    editor.handleInput("j");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 22 });
    editor.handleInput("k");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
    assert.equal(editor.getText(), text);
    assert.equal(editor.getMode(), "normal");
    assert.deepEqual(clipboardWrites, []);
  });

  it("supports counted j/k and gj/gk and consumes the count", () => {
    const { editor } = createMultiLineEditor(text);
    editor.render(12);
    sendKeys(editor, ["2", "j"]);
    assert.deepEqual(editor.getCursor(), { line: 0, col: 22 });
    sendKeys(editor, ["2", "g", "k"]);
    assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
    sendKeys(editor, ["g", "j", "l"]);
    assert.deepEqual(editor.getCursor(), { line: 0, col: 12 });
  });

  it("clamps large counts at buffer boundaries without leaking counts", () => {
    const { editor } = createMultiLineEditor(text);
    editor.render(12);
    sendKeys(editor, ["9", "9", "9", "9", "9", "j"]);
    assert.equal(editor.getCursor().line, 1);
    sendKeys(editor, ["9", "9", "9", "9", "9", "k"]);
    assert.equal(editor.getCursor().line, 0);
    editor.handleInput("0");
    editor.handleInput("k");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
    editor.handleInput("l");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 1 });
  });

  it("uses the latest render width after resize", () => {
    const { editor } = createMultiLineEditor(text);
    editor.render(12);
    editor.handleInput("j");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 11 });
    setInternalCursor(editor, 0);
    editor.render(16);
    editor.handleInput("j");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 15 });
  });

  it("keeps operator motions and visual j/k logical-line based", () => {
    const { editor, clipboardWrites } = createMultiLineEditor(`${text}\nlast`);
    editor.render(12);
    sendKeys(editor, ["y", "j"]);
    assert.deepEqual(clipboardWrites, [`${text}\n`]);
    assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
    sendKeys(editor, ["v", "j"]);
    assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
  });

  it("handles empty lines and leaves insert typing unchanged", () => {
    const { editor } = createMultiLineEditor("abc\n\ndef");
    editor.render(12);
    editor.handleInput("j");
    assert.deepEqual(editor.getCursor(), { line: 1, col: 0 });
    sendKeys(editor, ["i", "j", "k"]);
    assert.equal(editor.getText(), "abc\njk\ndef");
    assert.equal(editor.getMode(), "insert");
  });

  it("keeps wrapped Unicode movement on grapheme boundaries", () => {
    const { editor } = createMultiLineEditor("😀😀😀😀😀😀😀😀😀😀😀😀");
    editor.render(12);
    editor.handleInput("j");
    const col = editor.getCursor().col;
    assert.ok(col > 0);
    assert.equal(col % 2, 0);
    editor.handleInput("k");
    assert.deepEqual(editor.getCursor(), { line: 0, col: 0 });
  });
});
