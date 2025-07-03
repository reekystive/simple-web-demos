import fsSync from 'node:fs';
import ts from 'typescript';

export const createMockHost = (sourceFiles: URL[]) => {
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => sourceFiles.map((f) => f.pathname),
    getScriptSnapshot: (f) => ts.ScriptSnapshot.fromString(fsSync.readFileSync(f, 'utf8')),
    getScriptVersion: () => '1',
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => ({}),
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: (f) => fsSync.existsSync(f),
    readFile: (f) => fsSync.readFileSync(f, 'utf8'),
  };
  return host;
};
