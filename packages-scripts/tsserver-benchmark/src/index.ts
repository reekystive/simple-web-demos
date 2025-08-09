import { workspaceRootPath } from '@monorepo/workspace-package-graph';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { findIdentifierPositions, IdentifierPosition } from './utils/identifier-position.js';
import { createMockHost } from './utils/mock-host.js';

const testSources = [
  { file: new URL('apps/app-storybook/.storybook/preview.ts', workspaceRootPath), identifier: 'preview' },
  { file: new URL('apps/app-template/src/main.tsx', workspaceRootPath), identifier: 'getElementById' },
];

type TestSourceWithPositions = (typeof testSources)[number] & {
  tsSourceFile: ts.SourceFile;
  position: IdentifierPosition;
};

const getTestSourceWithPositions = async (sources: typeof testSources): Promise<TestSourceWithPositions[]> => {
  const testSourceWithPositions = await Promise.all(
    sources.map(async (s) => {
      const sourceFile = ts.createSourceFile(
        fileURLToPath(s.file),
        await fs.readFile(s.file, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      const positions = findIdentifierPositions(sourceFile, s.identifier);
      const firstPosition = positions[Symbol.iterator]().next().value;
      if (!firstPosition) {
        throw new Error(`No position found for ${s.identifier} in ${fileURLToPath(s.file)}`);
      }
      return { ...s, tsSourceFile: sourceFile, position: firstPosition };
    })
  );
  return testSourceWithPositions;
};

const host = createMockHost(testSources.map((s) => s.file));
const testSourceWithPositions = await getTestSourceWithPositions(testSources);
const languageService = ts.createLanguageService(host);

const benchmarkFindReferences = (test: TestSourceWithPositions) => {
  const t0 = performance.now();
  const references = languageService.findReferences(fileURLToPath(test.file), test.position.start);
  const t1 = performance.now();
  return { references, time: t1 - t0 };
};

const benchmarkGetQuickInfoAtPosition = (test: TestSourceWithPositions) => {
  const t0 = performance.now();
  const quickInfo = languageService.getQuickInfoAtPosition(fileURLToPath(test.file), test.position.start);
  const t1 = performance.now();
  return { quickInfo, time: t1 - t0 };
};

for (const s of testSourceWithPositions) {
  const references = benchmarkFindReferences(s);
  console.log(`findReference for %o in\n%o\ntook %oms\n`, s.identifier, s.file.href, references.time);
  const quickInfo = benchmarkGetQuickInfoAtPosition(s);
  console.log(`getQuickInfoAtPosition for %o in\n%o\ntook %oms\n`, s.identifier, s.file.href, quickInfo.time);
}
