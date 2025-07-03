import ts from 'typescript';

export interface IdentifierPosition {
  start: number;
  end: number;
  line: number;
  character: number;
}

export function* findIdentifierPositions(
  sf: ts.SourceFile,
  ident: string
): Iterable<IdentifierPosition, void, unknown> {
  function* visit(node: ts.Node): Generator<IdentifierPosition, void, unknown> {
    if (ts.isIdentifier(node) && node.text === ident) {
      const start = node.getStart(sf, /* skipTrivia */ true);
      const end = node.getEnd();
      const { line, character } = sf.getLineAndCharacterOfPosition(start);
      yield { start, end, line, character };
    }
    for (const child of node.getChildren()) {
      yield* visit(child);
    }
  }
  yield* visit(sf);
}
