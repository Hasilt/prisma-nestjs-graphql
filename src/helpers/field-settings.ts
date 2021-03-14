import { chunk, fromPairs, trim } from 'lodash';
import { Project } from 'ts-morph';

export type FieldSettings = {
    hideOutput: boolean;
    decorators: {
        name: string;
        arguments?: string[];
    }[];
};

const project = new Project({
    useInMemoryFileSystem: true,
});

export function parseFieldSettings(
    text: string,
): FieldSettings & { documentation: string | undefined } {
    let hideOutput = false;
    const decorators: FieldSettings['decorators'] = [];
    const sourceFile = project.createSourceFile('x.ts', `class X { ${text} x }`, {
        overwrite: true,
    });
    const testDecorators = sourceFile
        .getClass(() => true)
        ?.getProperty('x')
        ?.getDecorators();

    // sourceFile.getText();
    // console.log(
    //     'sourceFile.getText()',
    //     sourceFile.getText(),
    //     sourceFile.getStructure(),
    // );

    for (const testDecorator of testDecorators || []) {
        const name = testDecorator.getFullName();
        const arguments_ = testDecorator.getArguments().map(x => x.getText());
        if (name === 'TypeGraphQL.omit') {
            const omit = fromPairs(chunk(arguments_, 2));
            if (omit.output === 'true') {
                hideOutput = true;
                continue;
            }
        } else if (name === 'HideField') {
            hideOutput = true;
            continue;
        }
        decorators.push({
            name,
            arguments: arguments_,
        });
    }
    if (testDecorators) {
        // eslint-disable-next-line unicorn/no-array-for-each
        testDecorators.forEach(d => d.remove());
    }

    const documentation =
        trim(sourceFile.getText().slice('class X {'.length, -'x }'.length)) ||
        undefined;

    return {
        documentation,
        hideOutput,
        decorators,
    };
}
