# S-notation playground

Open `index.html` through your existing HTTPS server. No build, packages, or backend are needed. The ScriptLog example button fetches only the JSON file in this directory. All assets use relative URLs.

Type or paste text, edit earlier passages, then select **Generate analysis** (Ctrl/Cmd+Enter). **Try the paper’s example** loads all seven revisions from pages 6–7 of `snota.pdf`. Copy or download the resulting notation. Reloading clears the session.

## Implementation

`snotation.js` implements the 2012 v1.0 rules in a DOM-independent token stream. Normal production includes insertion before trailing whitespace. Insertions nest; deleted characters remain in the stream with zero position count. Active counts are recomputed for enclosing insertions before applying deletion tag jumping. Revision breaks can pass only older breaks. Opening and closing insertion tags do not jump. Deletion closing tags pass anything while characters remain, then only the categories specified in §5.2; opening deletion tags are placed last.

`app.js` records browser edits and groups consecutive typing/deleting at adjacent positions. Caret navigation, focus changes, and generating output end a group. A replacement produces a deletion and an insertion, with normal-production rules applied to the latter. Undo/redo are new recorded operations, not removal of history. Final text cannot reconstruct earlier edits. Positions use UTF-16 offsets to match textarea selection APIs; output preserves Unicode text. Braces, brackets, pipes, and backslashes in literal input are backslash-escaped in plain-text exports (a demo convention, since the PDF does not define escaping).

Run `node snotation.test.cjs`, `node recording.test.cjs`, `node app.test.cjs`, and `node wordtiming.test.cjs` to verify the worked example, nesting, jumping, positions, and mixed edits.

## Revision ledger

Generate produces both the notation and a revision ledger. Load the supplied fixture using **Load ScriptLog example**, or import a local JSON file with **Import ScriptLog JSON**. **Download CSV** exports the generated ledger, preserving three decimal places and `-` for missing times. Imports are parsed locally.

`recording.js` captures timed edits, groups adjacent typing/deletions, filters caret updates caused by editing, and remembers the first observed navigation after the preceding writing edit. Live times use a monotonic clock relative to page load or Start over; imported times use ScriptLog's `relativeTime` without converting large nanosecond counters. Continuing an import offsets the live clock by the imported recording duration. The untimed PDF example displays dashes.

Ledger positions follow the supplied example: source is the final live-text offset of `|x`; target is the final live-text offset of the revision closing marker `}x` or `]x`. An insertion's target is therefore after its inserted text. Deleted text and markup contribute zero characters. Later edits move the points; they are not historical event offsets. UTF-16 character offsets are 0-based. Words are whitespace-separated runs in final live text, indexed from 1; a point at a word's end belongs to that word, a point at the next word's start belongs to the next word, whitespace uses the preceding word, and leading whitespace uses word 1. An empty text has no word indexes.

The five time columns are the preceding operation's last writing edit, first observed caret/selection navigation since then (or missing), last observed navigation movement, first edit in this revision, and last edit in this revision. A grouped backward deletion retains the earliest edit time even as its target moves left. Pauses and key releases are not writing edits; a same-location deletion-to-insertion switch has no navigation timestamp. Generating output ends the current group but does not invent an edit or navigation time.

## Browsing revisions

The ledger has short headers with detailed tooltips, plus Edit and Content columns. Content previews show at most 80 Unicode characters, with Show all / Show less for longer edits. Spaces, tabs, and line breaks are displayed as `·`, `⇥`, and `↵`; CSV exports always include the full original text, with standard CSV quoting.

Click a revision number to see its before state. Timestamp buttons open five historical views: Source edit shows the text after the preceding writing operation with the caret at its source; Nav start shows the same text at departure; Nav end shows the text with the last observed caret or selection at arrival; First edit shows the text immediately before the grouped revision, highlighting a deletion or marking an insertion point; Last edit shows the text after the whole grouped revision, highlighting inserted text or marking the deletion point. These before/after views are whole-revision boundaries, not individual keystroke replays. Missing timestamps stay as dashes; the revision number and Before/After controls still work.

Use Previous revision / Next revision to step while retaining Before/After. Historical offsets in the preview belong to that historical text, whereas the table continues to show final marker positions. Intervening normal production is included when visiting later revisions. The preview and CSV stay attached to the last generated ledger while you edit; Generate refreshes all three outputs. Browsing does not change the editor or its recording.

The ledger scrolls vertically within a capped panel with sticky column headers. Opening a historical preview reduces the ledger height so both panels stay nearby. Previous/Next follows the active row inside the ledger, preserves horizontal scroll, and keeps the page stable; the text preview also scrolls internally to its highlight. The preview includes the current revision content and its index in the list.

Navigation end is the last actual caret/selection change before a revision begins, not the first editing time. Multiple arrow-key moves give distinct start/end times; a single click gives equal times. Unchanged selection notifications, pauses, key releases, and automatic caret updates following edits do not extend navigation. The Nav end preview includes movement duration (Nav end − Nav start) and the following pause (First edit − Nav end). Imported logs use actual caret-update timestamps; browser recording uses the key/click time associated with each observed movement, with the selection event time as a fallback. For selections and backward deletion, the arrival caret may differ from the deletion’s left edge; the preview preserves the observed selection. Without observed navigation both columns show a dash.

## Time per word: four durations

Generate produces final word occurrences and a separate tombstone list, with six columns: Word index, Word final text, **1: Initial production, keys only**, **4: Revision, keys + gap**, **2: Initial production, keys + gap**, **3: Revision, keys only**. All durations are seconds. CSV uses the same metric order with a final Status field to distinguish tombstones. Revision+ and replacement predecessor transfers are omitted.

1. Production keys only is first-to-last word-character edit within each uninterrupted production run, summed if a word's production resumes. Separators do not extend the word's span.
2. Production keys + gap adds the gap from the last preceding whitespace-boundary edit (space, newline, tab, etc.) to the first character of a newly produced word. Empty recordings use relative time 0 as the first word's boundary. A boundary and word inserted in one event have no measurable internal gap. Resuming an existing word does not re-add its original gap. This measure can include long pauses or other activity before a word.
3. Revision keys only sums the first-to-last-edit spans of the word's revisions. One-edit revisions contribute zero.
4. Revision keys + gap adds the target pause, starting each revision at Nav end. Without new navigation, continuing at the previous edit caret uses that preceding edit as arrival, counting an uninterrupted target interval once rather than reusing the same older navigation gap. Navigation travel and time between separate visits are excluded.

For example, word 6, “vi”, has **0.665 s** of production keys only and **53.441 s** with the gap since the last newline. Its following space does not extend either span. Word 2, “redigerar”, accumulates **3.264 s** of revision keys only and **3.751 s** with target gaps.

Production remains insertion at the current end or before trailing whitespace; other insertions and all deletions are revision. Individual timestamped edits are retained inside grouped operations. Time follows character identities through word versions; splits/merges apportion history by surviving characters. Multi-word revision intervals are shared by affected non-whitespace characters, and separator-only revisions use the preceding word when available. Fully erased words retain their own timings in tombstones, with their complete pre-deletion spelling. Missing timestamps produce a dash, while a timed single-key edit can have zero duration. Pauses inside a span have no idle cutoff. The untimed PDF demo does not acquire fabricated timings.

## Event audit

Generate and ScriptLog import also produce a heterogeneous, paginated Event audit table. Every replace/remove/insert anchors a text-edit row, showing the historical offset, deleted/inserted content, caret before/after, and the corresponding S-notation unit(s). Each original event keeps its 1-based source index, original fields (including `when`, `relativeTime`, and Java `eventID`), origin, and associated records. The CSV includes complete content and source records. Expand Associated events to inspect the raw JSON and short before/after contexts. Unit links open the existing revision preview or highlight normal production in the notation.

`R1`, `R2`, etc. are numbered revisions; `P1`, `P2`, etc. are audit identifiers for grouped normal production, which has no visible markup in S-notation. A native replacement can map to both a deletion unit and an insertion/production unit. Each text-changing event is mapped through its retained primitive-edit provenance rather than by matching timestamps.

Pressed keys still active at an edit or navigation are temporal associations, not assertions of causation. Releases are paired by key identity, so overlapping keys remain with their matching press. Raw records have one owning row; held keys can be referenced by source index from more than one observation. Keys with no defensible edit/navigation association remain standalone. Automatic caret feedback at the expected edit position is attached to the edit; pure cursor/selection changes are standalone navigation rows. Unchanged caret observations and unknown event types are retained. A navigation row's next-edit unit is a forward reference, not a claim that it produced markup.

The audit independently replays the source edit fields as plain-text splices, compares the result to the notation engine's final text, checks mappings/classification, and verifies that every source record is accounted for exactly once. This is an additional consistency check using the same source log, not an independent recording or an inference of writer intent. Initial metadata text is a separate baseline. Untimed PDF operations without original events are explicitly labelled derived; no key/caret records are invented. Live input captures browser key and selection observations and labels after-input selection snapshots as snapshots. Generation freezes both event provenance and grouped edit details; later typing does not alter the generated audit until Generate is clicked again.

Run `node eventaudit.test.cjs` for raw replay, exact event coverage, key overlap, unit mapping, replacement, navigation and tampering checks.

## Asset updates and browser regression

All script and stylesheet URLs share a content fingerprint, preventing a cached old app/recorder from being mixed with a newer page. After modifying JS or CSS, run `python3 refresh-assets.py` to update the URLs in `index.html`. Serving remains buildless. A generated audit resets its type filter to All records; if audit generation fails, the panel shows the error and the notation still renders.

`python3 browser.test.py` runs actual Chromium checks for the built-in ScriptLog, native typing/replacements, the paper example, import, filters, raw details, and visible errors. It requires Playwright and its Chromium headless shell. The test also simulates an older cached app with an empty audit, then checks that an ordinary reload picks up the versioned assets and renders all 74 ScriptLog audit rows. Set `SNOTA_TEST_URL` to additionally exercise an existing HTTP(S) server.

The revision ledger’s **Edge** column, immediately before Source ch., classifies each revision at its first edit against the then-current live text. **Leading** means the first deleted range reaches the current end, allowing trailing spaces, hard returns, tabs, and other whitespace; **Away** means non-whitespace text still follows. For a grouped deletion that starts away and later reaches the end, the label stays Away. Labels remain historical as later edits move markers. Insertions at the leading edge continue to be ordinary, unnumbered production under the existing notation rule. This column is descriptive only; it does not change notation, revision grouping, or word timings. The CSV includes it in the same position.

## Writing phases

Generate and log loading now also produce Writing phases and `writing-phases.csv`. `node phases.test.cjs` checks the classifier. Each phase is a maximal consecutive sequence of effective actions of one type: **0 Normal production** changes text at the current leading edge (including trailing whitespace); **1 Navigation** changes the caret or selection in either direction; **2 Revision** changes text away from the leading edge. Phase 0 includes leading-edge deletions, paste and undo/redo. A deletion/replacement uses the right edge of the removed range; classification is per action and can change within a grouped S-notation revision. Existing notation, ledger and word timings retain their own definitions.

Selection creation, extension, collapse, reversal and Select All are navigation even when the active endpoint remains at the end. End returning from earlier text is navigation too. No-op keys/clicks and pure viewport scrolling create no effective phase action. Keys/releases remain in the event audit; automatic caret feedback and explicitly labelled after-input snapshots stay with their text edit. Undo/redo cursor restoration described by a snapshot does not invent navigation. Live browser selections preserve the active endpoint (`dot`) and anchor (`mark`) using `selectionDirection`; imported endpoints are used as supplied.

Start/end character and word positions refer to the historical document before the first and after the last effective action. Characters are UTF-16 offsets from 0; words are whitespace-separated runs from 1, using the preceding word in whitespace, with a dash for empty text. Selection ranges expose navigation where the active caret returns to the same point or stays at the end. Undo/autocorrect can edit a different position from the starting caret; actual edit offsets are available under Actions / sources.

Start/end times are the first and last effective edit/caret observations, not key release times. Durations include pauses within a phase, have no idle threshold, and do not absorb gaps between different phases. Target pauses can therefore appear as between-phase gaps; the existing word timing with gap is a separate measure. The sample yields 15 phases from 74 effective actions: 3 production, 7 navigation, 5 revision. Derived untimed demonstrations do not fabricate missing navigation or timestamps. Expand a phase to inspect the contributing source events and S-notation units.

The Writing phases table and CSV include **Target word** immediately after End word: the actual historical text of the word at the ending caret. It follows the same word-index rule (preceding word in whitespace, first word before the first word), and is absent for an empty document. Later corrections do not replace the historical spelling. Long target words use the standard expandable preview; exports retain the full word.

## Offline synthetic writer

Run with Node, without npm packages or a browser:

```sh
node scripts/generate-logs.cjs
node scripts/generate-logs.cjs --language sv --count 20 --seed 7
node scripts/generate-logs.cjs --all --check-only
node scripts/generate-logs.cjs --all
node scripts/validate-synthetic.cjs synthetic/samples/<sample-id>
node synthetic.test.cjs
```

The default creates three English and three Swedish sessions from `aka-en` / `aka-sv` (500 texts each) under `synthetic/`. `--count` is per language; `--language both|en|sv` selects collections. `--all` generates every selected source. `--check-only` runs generation/validation without writing logs. `--source <file>` targets one UTF-8 file. `--out <directory>` changes the destination. `--mistake-rate 0..0.25` controls per-letter typo probability. Same source and master seed derive the same per-file seed, events, virtual times, text and ground truth regardless of processing order. Existing sample IDs are protected; use `--force` to regenerate them. A large full set can occupy substantial disk space; use check-only when you only need validation.

Each sample contains:

- `log.json`: ScriptLog-compatible metadata/events, with explicit synthetic provenance, text edits, key presses/releases, caret changes, mouse observations, pauses and input types.
- `truth.json`: simulator-owned final text, hashes, scenario schedule, effective actions, operation/revision runs and their source/navigation/edit timestamps, plus expected phases.
- `validation.json`: expected-versus-actual revision timing checks and validation result.
- `analysis.json`: the current module’s ledger, word timings and phases.
- `base.txt`, `draft.txt`, `final.txt`: original corpus text, completed first draft, and revised final text. The final text may intentionally differ from the base; words are borrowed from the source rather than generating new prose.
- `notation.txt`, `ledger.csv`, `phases.csv`, `words.csv`. Add `--audit-csv` for the larger raw event-audit CSV.

`synthetic/catalog.json` is the browser manifest and `summary.json` reports the most recent generation. Failed analyses are saved and flagged FAIL for inspection; generation errors appear in the summary. The process exits nonzero for any failure.

In the page, open **Synthetic writer samples** above the ledger and click **Load / refresh samples**. Choose a sample or use Previous/Next; one session is loaded at a time. Base/draft/final text, ground truth and validation links are supplied. The browser recomputes revision times, raw-audit checks and phases against the loaded ground truth, so the saved offline PASS is not the sole verification. Manual edits invalidate that comparison. Logs can also be imported directly using Import ScriptLog JSON; reading a local file alone cannot automatically read its ground-truth sidecar. Custom output directories can be inspected via file import or served as `synthetic/`.

### Writer behavior and limits

Forward typing includes seeded wrong keys, duplicate letters and transpositions with immediate backspace/retype, short fast bursts, planning pauses and an earlier whole-word change. A deliberately invisible trailing space is left behind the cursor while subsequent typing continues, then removed. After drafting, the writer reads through, revises whole words and initial/medial/final word parts, splits a word, merges adjacent words, replaces a selection by paste, relocates a whole sentence by cut/paste, makes and corrects a review typo, and uses undo/redo sparingly. A source with no suitable complete sentence records a skipped scenario instead of inventing a sentence.

Mouse clicks, fine arrow movements, Shift-arrow selections, Home/End and PageUp/PageDown are mixed. Long positioning may use a mouse followed by precise arrows. The virtual page has 80 UTF-16 columns and eight rows; Home/End follow newline-delimited lines. This is a reproducible event model, not an emulator of a particular font/OS layout. Virtual times use seeded typing/navigation/target-pause distributions; overlapping releases are queued. These are scenario-coverage fixtures, not a calibrated behavioral model or a claim that the revised prose is linguistically improved.

The simulator records its expected operation timing and phase actions as it executes; it does not call the analysis modules to produce those expectations. Validation imports the emitted log, checks final text/hash, all revision source/nav/first/last timestamps, content and edge classification, phase membership/positions/times, and raw audit coverage/replay. Tampered logs or oracle timestamps are tested to fail. Per-word validation currently checks ordered final word occurrences, finite/nonnegative durations, and keys+gap ≥ keys-only; it is **not an independent per-word timing oracle**. Replacement character lineage is still the analysis module’s responsibility. Automatic selection restoration following undo/redo resynchronizes the importer without becoming navigation.

A full master-seed-42 check passed all 1,000 supplied texts: 4,229,923 events, 37,135 revisions and 34,000 phases. `synthetic/corpus-validation.json` records that check. Six browser samples are materialized by default; `--all` writes the complete set when desired.
