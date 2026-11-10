const assert=require('node:assert/strict');
const {RevisionRecording,ledgerCSV,ledgerValue}=require('./recording.js');
const data=require('./scriptlog-data.json');
const rec=RevisionRecording.fromScriptLog(data);
const {model,rows}=rec.build();
const expected=[
 [1,25,7,5,2,15.887,17.597,18.846,22.110],
 [2,7,8,2,2,22.110,null,22.166,22.166],
 [3,8,16,2,3,22.166,25.197,28.447,28.447],
 [4,57,31,11,7,99.718,101.757,102.966,102.966],
 [5,31,43,7,9,102.966,104.517,105.750,105.750],
 [6,43,52,9,11,105.750,107.821,109.382,109.382]
];
assert.deepEqual(rows.map(r=>Object.values(r)),expected,'Every cell matches the supplied revision ledger');
assert.equal(model.toPlain(),'vi redi[sh]₁|₂{g}₂|₃erar in{n}₃e i orden|₁\n\nvi {r}₄|₅edigerar i {b}₅|₆örjan av [b]₆orden|₄\n\n');
assert.equal(ledgerValue('lastEdit',22.110),'22.110');assert.equal(ledgerValue('navigationStart',null),'-');
const csv=ledgerCSV(rows);assert.equal(csv.split('\r\n').length,7);assert.ok(csv.includes('"2","7","8","2","2","22.110","-","22.166","22.166"'));
const live=new RevisionRecording();live.edit(0,0,'abcd',1);live.navigate(4,4,1.001);live.navigate(2,2,2);live.edit(1,1,'',3);live.navigate(1,1,3.001);live.edit(0,1,'',4);live.edit(0,0,'Z',5);
const lr=live.build().rows;assert.equal(lr.length,2);assert.equal(lr[0].firstEdit,3);assert.equal(lr[0].lastEdit,4);assert.equal(lr[0].navigationStart,2);assert.equal(lr[1].sourceLast,4);assert.equal(lr[1].navigationStart,null);
// Later edits move the ledger points with the notation markers.
const anchor=new RevisionRecording();anchor.edit(0,0,'hello world',1);anchor.navigate(6,6,2);anchor.edit(6,0,'big ',3);let point=anchor.build().rows[0].targetChars;anchor.navigate(0,0,4);anchor.edit(0,0,'X',5);assert.equal(anchor.build().rows[0].targetChars,point+1);
const missing=new RevisionRecording('abcd');missing.edit(1,0,'X',null);assert.equal(missing.build().rows[0].firstEdit,null);
const empty=new RevisionRecording();empty.edit(0,0,'a',1);empty.edit(0,1,'',2);assert.equal(empty.build().rows[0].sourceWord,null);
assert.throws(()=>RevisionRecording.fromScriptLog({}));
assert.throws(()=>RevisionRecording.fromScriptLog([[{initialText:''}],[{event:'<remove>',relativeTime:'1',offset:0,length:1}]]));
assert.throws(()=>RevisionRecording.fromScriptLog([[{}],[{event:'<caretUpdate>',relativeTime:'1',dot:1,mark:1}]]));
assert.throws(()=>RevisionRecording.fromScriptLog([[{}],[{event:'<keyPressed>',relativeTime:'2'},{event:'<keyPressed>',relativeTime:'1'}]]));
// Continue an imported recording without changing historic timings.
rec.endGroup();rec.edit(model.text.length,0,'continued',rec.duration+1);assert.deepEqual(rec.build().rows,rows);
console.log('Passed: exact ScriptLog notation and all 54 ledger cells, CSV precision, live grouping/navigation, moving markers, absent times, validation, and continuation.');
