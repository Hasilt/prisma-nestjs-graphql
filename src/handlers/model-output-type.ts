import assert from 'assert';
import {
    ClassDeclarationStructure,
    CommentStatement,
    ImportDeclarationStructure,
    OptionalKind,
} from 'ts-morph';

import { generateClass } from '../helpers/generate-class';
import { generateDecorator } from '../helpers/generate-decorator';
import { generateImport } from '../helpers/generate-import';
import { generateProperty } from '../helpers/generate-property';
import { getGraphqlImport } from '../helpers/get-graphql-import';
import { getGraphqlType } from '../helpers/get-graphql-type';
import { getPropertyType } from '../helpers/get-property-type';
import { EventArguments, OutputType } from '../types';

export function modelOutputType(outputType: OutputType, args: EventArguments) {
    const { getSourceFile, models, config, modelFields } = args;

    const model = models.get(outputType.name);
    assert(model);
    const fileType = 'model';
    const sourceFile = getSourceFile({
        name: outputType.name,
        type: fileType,
    });

    const importDeclarations = new Map<
        string,
        OptionalKind<ImportDeclarationStructure>
    >();

    const classDeclaration = generateClass({
        decorator: {
            name: 'ObjectType',
            properties: [
                {
                    name: 'description',
                    value: model.documentation,
                },
            ],
        },
        sourceFile,
        name: outputType.name,
    });

    importDeclarations.set('Field', {
        namedImports: [{ name: 'Field' }],
        moduleSpecifier: '@nestjs/graphql',
    });

    for (const field of outputType.fields) {
        // Do not generate already defined properties for model
        if (classDeclaration.getProperty(field.name)) {
            continue;
        }

        const { location, isList, type } = field.outputType;
        const outputTypeName = String(type);
        const modelField = modelFields.get(model.name)?.get(field.name);
        const fieldMeta = modelField?.meta;
        const customType = config.types[outputTypeName];

        // console.log({
        //     'field.outputType': field.outputType,
        //     'outputType.name': outputType.name,
        //     'model?.name': model?.name,
        //     outputTypeName,
        //     'field.name': field.name,
        //     fieldMeta,
        // });

        const propertyType = customType?.fieldType
            ? [customType.fieldType]
            : getPropertyType({
                  location,
                  type: outputTypeName,
              });

        const propertyDeclaration = generateProperty({
            classDeclaration,
            name: field.name,
            isNullable: field.isNullable,
            propertyType,
            isList,
        });

        if (fieldMeta?.hideOutput) {
            generateImport({
                sourceFile,
                name: 'HideField',
                moduleSpecifier: '@nestjs/graphql',
            });
            propertyDeclaration.addDecorator({ name: 'HideField()' });
            continue;
        }

        const graphqlType =
            customType?.graphqlType ??
            getGraphqlType({
                location,
                type: outputTypeName,
                isId: modelField?.isId,
            });

        const graphqlImport = getGraphqlImport({
            sourceFile,
            fileType,
            location,
            isId: modelField?.isId,
            name: graphqlType,
            customType,
            getSourceFile,
        });

        if (graphqlImport.name !== outputType.name && graphqlImport.specifier) {
            generateImport({
                sourceFile,
                name: graphqlImport.name,
                moduleSpecifier: graphqlImport.specifier,
            });
        }

        // Create import for typescript field/property type
        if (customType && customType.fieldModule && customType.fieldType) {
            generateImport({
                sourceFile,
                name: customType.fieldType,
                moduleSpecifier: customType.fieldModule,
            });
        }

        generateDecorator({
            propertyDeclaration,
            graphqlType,
            isList,
            isNullable: field.isNullable,
            defaultValue: modelField?.default,
            description: modelField?.documentation,
        });

        for (const decorator of fieldMeta?.decorators ?? []) {
            if (!importDeclarations.has(decorator.namespace)) {
                importDeclarations.set(decorator.namespace, {
                    namespaceImport: decorator.namespace,
                    moduleSpecifier: decorator.from,
                });
            }
            propertyDeclaration.insertDecorator(0, {
                name: decorator.name,
                arguments: decorator.arguments,
            });
        }
    }

    sourceFile.addImportDeclarations([...importDeclarations.values()]);

    // Check re-export, comment generated class if found
    const exportDeclaration = sourceFile.getExportDeclaration(d => {
        return d.getNamedExports().some(x => x.getNameNode().getText() === model.name);
    });
    if (exportDeclaration) {
        let commentStatement: CommentStatement | undefined;
        while (
            (commentStatement = sourceFile.getStatementByKind(
                2 /* SingleLineCommentTrivia */,
            ))
        ) {
            commentStatement.remove();
        }
        const commentedText = classDeclaration
            .getText()
            .split('\n')
            .map(x => `// ${x}`);
        classDeclaration.remove();
        sourceFile.addStatements(['\n', ...commentedText]);
    }

    // const diagnostics = sourceFile.getPreEmitDiagnostics().map(d => ({
    //     start: d.getStart(),
    //     length: d.getLength(),
    //     getSource: d.getSource(),
    //     getMessageText: d.getMessageText(),
    //     getLineNumber: d.getLineNumber(),
    //     getCategory: d.getCategory(),
    //     x: sourceFile.getText().substr(d.getStart(), d.getLength()),
    //     related: d.compilerObject.relatedInformation?.map(i => i.messageText),
    // }));
    // console.dir(diagnostics, { depth: 4 });
}
