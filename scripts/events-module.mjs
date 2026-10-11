import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Load the same TypeScript adapter used by the app without starting a server.
const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')}`;
const events = compile(await readFile(new URL('../lib/events.ts', import.meta.url), 'utf8'));
const adapter = await readFile(new URL('../lib/mcp.ts', import.meta.url), 'utf8');
export const mcp = await import(compile(adapter.replace("'./events'", JSON.stringify(events))));
