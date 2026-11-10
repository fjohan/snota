# S-notation playground

Open `index.html` through your existing HTTPS server. No build, packages, network requests, or backend are needed. All assets use relative URLs.

Type or paste text, edit earlier passages, then select **Generate S-notation** (Ctrl/Cmd+Enter). **Try the paper’s example** loads all seven revisions from pages 6–7 of `snota.pdf`. Copy or download the resulting notation. Reloading clears the session.

## Implementation

`snotation.js` implements the 2012 v1.0 rules in a DOM-independent token stream. Normal production includes insertion before trailing whitespace. Insertions nest; deleted characters remain in the stream with zero position count. Active counts are recomputed for enclosing insertions before applying deletion tag jumping. Revision breaks can pass only older breaks. Opening and closing insertion tags do not jump. Deletion closing tags pass anything while characters remain, then only the categories specified in §5.2; opening deletion tags are placed last.

`app.js` records browser edits and groups consecutive typing/deleting at adjacent positions. Caret navigation, focus changes, and generating output end a group. A replacement produces a deletion and an insertion, with normal-production rules applied to the latter. Undo/redo are new recorded operations, not removal of history. Final text cannot reconstruct earlier edits. Positions use UTF-16 offsets to match textarea selection APIs; output preserves Unicode text. Braces, brackets, pipes, and backslashes in literal input are backslash-escaped in plain-text exports (a demo convention, since the PDF does not define escaping).

Run `node snotation.test.cjs` to verify the worked example, nesting, jumping, positions, and mixed edits.
