# S-notation playground

Open `index.html` through your existing HTTPS server. No build, packages, or backend are needed. The ScriptLog example button fetches only the JSON file in this directory. All assets use relative URLs.

Type or paste text, edit earlier passages, then select **Generate S-notation** (Ctrl/Cmd+Enter). **Try the paper’s example** loads all seven revisions from pages 6–7 of `snota.pdf`. Copy or download the resulting notation. Reloading clears the session.

## Implementation

`snotation.js` implements the 2012 v1.0 rules in a DOM-independent token stream. Normal production includes insertion before trailing whitespace. Insertions nest; deleted characters remain in the stream with zero position count. Active counts are recomputed for enclosing insertions before applying deletion tag jumping. Revision breaks can pass only older breaks. Opening and closing insertion tags do not jump. Deletion closing tags pass anything while characters remain, then only the categories specified in §5.2; opening deletion tags are placed last.

`app.js` records browser edits and groups consecutive typing/deleting at adjacent positions. Caret navigation, focus changes, and generating output end a group. A replacement produces a deletion and an insertion, with normal-production rules applied to the latter. Undo/redo are new recorded operations, not removal of history. Final text cannot reconstruct earlier edits. Positions use UTF-16 offsets to match textarea selection APIs; output preserves Unicode text. Braces, brackets, pipes, and backslashes in literal input are backslash-escaped in plain-text exports (a demo convention, since the PDF does not define escaping).

Run `node snotation.test.cjs`, `node recording.test.cjs`, and `node app.test.cjs` to verify the worked example, nesting, jumping, positions, and mixed edits.

## Revision ledger

Generate produces both the notation and a nine-column ledger. Load the supplied fixture using **Load ScriptLog example**, or import a local JSON file with **Import ScriptLog JSON**. **Download CSV** exports the generated ledger, preserving three decimal places and `-` for missing times. Imports are parsed locally.

`recording.js` captures timed edits, groups adjacent typing/deletions, filters caret updates caused by editing, and remembers the first observed navigation after the preceding writing edit. Live times use a monotonic clock relative to page load or Start over; imported times use ScriptLog's `relativeTime` without converting large nanosecond counters. Continuing an import offsets the live clock by the imported recording duration. The untimed PDF example displays dashes.

Ledger positions follow the supplied example: source is the final live-text offset of `|x`; target is the final live-text offset of the revision closing marker `}x` or `]x`. An insertion's target is therefore after its inserted text. Deleted text and markup contribute zero characters. Later edits move the points; they are not historical event offsets. UTF-16 character offsets are 0-based. Words are whitespace-separated runs in final live text, indexed from 1; a point at a word's end belongs to that word, a point at the next word's start belongs to the next word, whitespace uses the preceding word, and leading whitespace uses word 1. An empty text has no word indexes.

The four time columns are the preceding operation's last writing edit, first observed caret/selection navigation since then (or missing), first edit in this revision, and last edit in this revision. A grouped backward deletion retains the earliest edit time even as its target moves left. Pauses and key releases are not writing edits; a same-location deletion-to-insertion switch has no navigation timestamp. Generating output ends the current group but does not invent an edit or navigation time.
