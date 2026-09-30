import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/python/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
globalThis.MonacoEnvironment={getWorker:()=>new EditorWorker()};
loader.config({monaco});
export default function CodeEditor({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}) {
 return <Editor height="100%" language="python" theme="vs-dark" value={value} onChange={v=>onChange(v??'')} loading={<div className="editor-loading">Loading Python editor…</div>} beforeMount={m=>m.editor.defineTheme('arena',{base:'vs-dark',inherit:true,rules:[{token:'comment',foreground:'747e78'},{token:'keyword',foreground:'D3F56A'},{token:'string',foreground:'d9b788'}],colors:{'editor.background':'#151819','editorLineNumber.foreground':'#525a55','editor.lineHighlightBackground':'#1b2020','editorCursor.foreground':'#d3f56a'}})} onMount={editor=>{monaco.editor.setTheme('arena');editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,()=>{});}} options={{readOnly:disabled,minimap:{enabled:false},fontSize:14,fontFamily:'Consolas, "Liberation Mono", monospace',padding:{top:22},scrollBeyondLastLine:false,automaticLayout:true,tabSize:4,wordWrap:'on',ariaLabel:'Python solution editor',accessibilitySupport:'on',renderLineHighlight:'line',overviewRulerLanes:0,lineNumbersMinChars:3}}/>;
}
