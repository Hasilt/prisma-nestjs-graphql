import { ImportDeclarationStructure, OptionalKind, StructureKind } from 'ts-morph';

export class ImportDeclarationMap extends Map<
    string,
    OptionalKind<ImportDeclarationStructure>
> {
    add(name: string, moduleSpecifier: string);
    add(name: string, value: OptionalKind<ImportDeclarationStructure>);

    add(name: string, value: OptionalKind<ImportDeclarationStructure> | string) {
        if (!this.has(name)) {
            const structure: OptionalKind<ImportDeclarationStructure> =
                typeof value === 'string'
                    ? { moduleSpecifier: value, namedImports: [{ name }] }
                    : value;
            this.set(name, structure);
        }
    }

    *toStatements(): Iterable<ImportDeclarationStructure> {
        const iterator = this.values();
        let result = iterator.next();
        while (result.value) {
            yield {
                ...result.value,
                kind: StructureKind.ImportDeclaration,
            };
            result = iterator.next();
        }
    }
}
