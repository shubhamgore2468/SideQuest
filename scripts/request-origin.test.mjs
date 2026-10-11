import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../lib/request-origin.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {allowedRequestOrigin}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const request=headers=>new Request('http://localhost:8080/api/profile',{method:'POST',headers});
test('accepts public HTTPS host behind Railway proxy',()=>{
 assert.equal(allowedRequestOrigin(request({origin:'https://sidequest.up.railway.app',host:'sidequest.up.railway.app','x-forwarded-proto':'https','sec-fetch-site':'same-origin'})),true);
});
test('rejects cross-site and foreign origins even with forwarded headers',()=>{
 assert.equal(allowedRequestOrigin(request({origin:'https://evil.example',host:'sidequest.up.railway.app','x-forwarded-host':'evil.example','x-forwarded-proto':'https'})),false);
 assert.equal(allowedRequestOrigin(request({origin:'http://localhost:8080','sec-fetch-site':'cross-site'})),false);
 assert.equal(allowedRequestOrigin(request({origin:'null',host:'sidequest.up.railway.app'})),false);
});
test('accepts localhost same origin but rejects another port or malformed origin',()=>{
 assert.equal(allowedRequestOrigin(request({origin:'http://localhost:8080'})),true);
 assert.equal(allowedRequestOrigin(request({origin:'http://localhost:3000'})),false);
 assert.equal(allowedRequestOrigin(request({origin:'http://localhost:8080/path'})),false);
});
