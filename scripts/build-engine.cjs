#!/usr/bin/env node
/** Rebuild the shipped runtime without downloading or installing dependencies. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const engine = path.join(root, 'engine');
const args = process.argv.slice(2);
let compilerPath;
let check = false;
let typecheck = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--typescript' && args[i + 1] && !args[i + 1].startsWith('--')) {
    compilerPath = path.resolve(args[++i]);
  } else if (args[i] === '--check') {
    check = true;
  } else if (args[i] === '--typecheck') {
    typecheck = true;
  } else if (args[i] === '--help') {
    console.log('Usage: node scripts/build-engine.cjs [--typescript /path/to/typescript] [--check | --typecheck]');
    console.log('Normal users do not need TypeScript: engine/runtime already contains the executable files.');
    process.exit(0);
  } else {
    console.error(`Unknown or incomplete argument: ${args[i]}`);
    process.exit(1);
  }
}
if (check && typecheck) {
  console.error('Choose either --check (reproducibility) or --typecheck (types only).');
  process.exit(1);
}

let ts;
try {
  ts = require(compilerPath || 'typescript');
} catch {
  console.error('TypeScript was not found. Pass an existing compiler package directory with --typescript /path/to/typescript.');
  console.error('No compiler is needed to run the shipped calculators or upstream tests.');
  process.exit(1);
}
if (typeof ts.createProgram !== 'function' || typeof ts.version !== 'string') {
  console.error('The supplied module is not the TypeScript compiler API.');
  process.exit(1);
}

const diagnosticsHost = {
  getCanonicalFileName: value => value,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
};
const configFile = path.join(engine, 'tsconfig.json');
const config = ts.readConfigFile(configFile, ts.sys.readFile);
if (config.error) {
  console.error(ts.formatDiagnosticsWithColorAndContext([config.error], diagnosticsHost));
  process.exit(1);
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, engine, undefined, configFile);
const program = ts.createProgram(parsed.fileNames.sort(), parsed.options);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, diagnosticsHost));
  process.exit(1);
}
if (typecheck) {
  console.log(`Strict typecheck passed: ${parsed.fileNames.length} modules (TypeScript ${ts.version}).`);
  process.exit(0);
}

const generated = new Map();
const emit = program.emit(undefined, (filename, data) => {
  generated.set(path.resolve(filename), data);
});
if (emit.emitSkipped || emit.diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(emit.diagnostics, diagnosticsHost));
  process.exit(1);
}
generated.set(path.join(engine, 'runtime', 'package.json'), '{\n  "type": "commonjs",\n  "private": true\n}\n');

const checker = program.getTypeChecker();
const typeFlags = ts.TypeFormatFlags.NoTruncation;
const exportModules = parsed.fileNames.map(filename => {
  const source = program.getSourceFile(filename);
  const symbol = checker.getSymbolAtLocation(source);
  const exported = checker.getExportsOfModule(symbol).map(item => {
    const declaration = item.valueDeclaration || item.declarations?.[0];
    const valueType = item.flags & ts.SymbolFlags.TypeAlias || item.flags & ts.SymbolFlags.Interface
      ? checker.getDeclaredTypeOfSymbol(item)
      : checker.getTypeOfSymbolAtLocation(item, declaration);
    const entry = { name: item.name, type: checker.typeToString(valueType, declaration, typeFlags) };
    const signatures = valueType.getCallSignatures();
    if (signatures.length) {
      entry.signatures = signatures.map(signature => checker.signatureToString(signature, declaration, typeFlags));
    }
    if (item.name.startsWith('EMPTY_') && declaration?.initializer) {
      entry.exampleExpression = declaration.initializer.getText(source);
    }
    if (ts.isInterfaceDeclaration(declaration)) {
      entry.fields = checker.getPropertiesOfType(valueType).map(field => {
        const fieldNode = field.valueDeclaration || field.declarations?.[0];
        return {
          name: field.name,
          type: checker.typeToString(checker.getTypeOfSymbolAtLocation(field, fieldNode), fieldNode, typeFlags),
          optional: Boolean(field.flags & ts.SymbolFlags.Optional),
          description: ts.displayPartsToString(field.getDocumentationComment(checker)),
        };
      });
    }
    return entry;
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { module: path.basename(filename, '.ts'), exports: exported };
});
generated.set(path.join(engine, 'exports.json'), JSON.stringify({
  schemaVersion: 1,
  description: 'Exported source types and original example defaults. Example defaults are not user answers or conversation policy.',
  modules: exportModules,
}, null, 2) + '\n');

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const manifest = {
  schemaVersion: 1,
  compiler: { name: 'typescript', version: ts.version },
  config: 'engine/tsconfig.json',
  sourceSha256: Object.fromEntries(parsed.fileNames.map(filename => [path.relative(root, filename), digest(fs.readFileSync(filename))])),
  artifactSha256: Object.fromEntries([...generated].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([filename, data]) => [path.relative(root, filename), digest(data)])),
};
generated.set(path.join(engine, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

if (check) {
  const mismatches = [...generated].filter(([filename, data]) => !fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== data).map(([filename]) => path.relative(root, filename));
  const expectedRuntime = new Set([...generated.keys()].filter(filename => path.dirname(filename) === path.join(engine, 'runtime')).map(filename => path.basename(filename)));
  if (fs.existsSync(path.join(engine, 'runtime'))) {
    for (const name of fs.readdirSync(path.join(engine, 'runtime'))) {
      if (!expectedRuntime.has(name)) mismatches.push(`engine/runtime/${name} (unexpected file)`);
    }
  }
  if (mismatches.length) {
    console.error(`Runtime differs from a clean build:\n${mismatches.join('\n')}`);
    process.exit(1);
  }
  console.log(`Reproducible build verified: ${generated.size} artifacts, TypeScript ${ts.version}.`);
} else {
  for (const [filename, data] of generated) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, data);
  }
  console.log(`Built ${parsed.fileNames.length} modules into engine/runtime with strict TypeScript ${ts.version}.`);
}
