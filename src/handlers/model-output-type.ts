import assert from 'assert';
import JSON5 from 'json5';
import {
    ClassDeclarationStructure,
    CommentStatement,
    ExportSpecifierStructure,
    StatementStructures,
    StructureKind,
} from 'ts-morph';

import { getGraphqlImport } from '../helpers/get-graphql-import';
import { getGraphqlType } from '../helpers/get-graphql-type';
import { getPropertyType } from '../helpers/get-property-type';
import { ImportDeclarationMap } from '../helpers/import-declaration-map';
import { propertyStructure } from '../helpers/property-structure';
import { EventArguments, OutputType } from '../types';

export function modelOutputType(outputType: OutputType, args: EventArguments) {
    const { getSourceFile, models, config, modelFields, fieldSettings } = args;
    const model = models.get(outputType.name);
    assert(model, `Cannot find model by name ${outputType.name}`);
    const fileType = 'model';
    const sourceFile = getSourceFile({
        name: outputType.name,
        type: fileType,
    });

    const sourceFileStructure = sourceFile.getStructure();

    const importDeclarations = new ImportDeclarationMap();
    let classStructure = (sourceFileStructure.statements as StatementStructures[]).find(
        (s: StatementStructures) => s.kind === StructureKind.Class,
    ) as ClassDeclarationStructure | undefined;
    if (!classStructure) {
        classStructure = {
            kind: StructureKind.Class,
            isExported: true,
            name: outputType.name,
            decorators: [
                {
                    name: 'ObjectType',
                    arguments: [],
                },
            ],
            properties: [],
        };
        (sourceFileStructure.statements as StatementStructures[]).push(classStructure);
    }

    const decorator = classStructure.decorators?.find(d => d.name === 'ObjectType');
    assert(decorator, 'ObjectType decorator not found');
    decorator.arguments = model.documentation
        ? [JSON5.stringify({ description: model.documentation })]
        : [];

    importDeclarations.add('Field', '@nestjs/graphql');
    importDeclarations.add('ObjectType', '@nestjs/graphql');

    for (const field of outputType.fields) {
        // Do not generate already defined properties for model
        if (classStructure.properties?.some(p => p.name === field.name)) {
            continue;
        }

        const { location, isList, type } = field.outputType;
        const outputTypeName = String(type);
        const customType = config.types[outputTypeName];
        const modelField = modelFields.get(model.name)?.get(field.name);
        const settings = fieldSettings.get(model.name)?.get(field.name);

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

        const property = propertyStructure({
            name: field.name,
            isNullable: field.isNullable,
            propertyType,
            isList,
        });

        classStructure.properties?.push(property);

        if (graphqlImport.name !== outputType.name && graphqlImport.specifier) {
            importDeclarations.add(graphqlImport.name, graphqlImport.specifier);
        }

        // Create import for typescript field/property type
        if (customType && customType.fieldType && customType.fieldModule) {
            importDeclarations.add(customType.fieldType, customType.fieldModule);
        }

        if (settings?.hideOutput) {
            importDeclarations.add('HideField', '@nestjs/graphql');
            property.decorators?.push({ name: 'HideField', arguments: [] });
        } else {
            property.decorators?.push({
                name: 'Field',
                arguments: [
                    `() => ${isList ? `[${graphqlType}]` : graphqlType}`,
                    JSON5.stringify({
                        nullable: Boolean(field.isNullable),
                        defaultValue: ['number', 'string', 'boolean'].includes(
                            typeof modelField?.default,
                        )
                            ? modelField?.default
                            : undefined,
                        description: modelField?.documentation,
                    }),
                ],
            });
        }
    }

    const hasExportDeclaration = (sourceFileStructure.statements as StatementStructures[]).some(
        structure => {
            return (
                structure.kind === StructureKind.ExportDeclaration &&
                (structure.namedExports as ExportSpecifierStructure[]).some(
                    o => (o.alias || o.name) === model.name,
                )
            );
        },
    );

    // Check re-export, comment generated class if found
    if (hasExportDeclaration) {
        let commentStatement: CommentStatement | undefined;
        while (
            (commentStatement = sourceFile.getStatementByKind(
                2 /* SingleLineCommentTrivia */,
            ))
        ) {
            commentStatement.remove();
        }

        sourceFile.addStatements([classStructure]);
        const classDeclaration = sourceFile.getClassOrThrow(model.name);

        const commentedText = classDeclaration
            .getText()
            .split('\n')
            .map(x => `// ${x}`);
        classDeclaration.remove();
        sourceFile.addStatements(['\n', ...commentedText]);
    } else {
        (sourceFileStructure.statements as StatementStructures[]).unshift(
            ...importDeclarations.toStatements(),
        );
        sourceFile.set(sourceFileStructure);
    }
}
