import { generateClass } from '../helpers/generate-class';
import { generateDecorator } from '../helpers/generate-decorator';
import { generateImport } from '../helpers/generate-import';
import { generateProperty } from '../helpers/generate-property';
import { getGraphqlImport } from '../helpers/get-graphql-import';
import { getGraphqlType } from '../helpers/get-graphql-type';
import { getModelName } from '../helpers/get-model-name';
import { getOutputTypeName } from '../helpers/get-output-type-name';
import { getPropertyType } from '../helpers/get-property-type';
import { EventArguments, OutputType } from '../types';

export function outputType(outputType: OutputType, args: EventArguments) {
    const {
        getSourceFile,
        models,
        config,
        eventEmitter,
        modelFields,
        modelNames,
    } = args;

    const fileType = 'output';
    const modelName = getModelName({
        name: outputType.name,
        modelNames,
        fallback: '',
    });
    const model = models.get(modelName);
    const shouldEmitAggregateOutput =
        model &&
        /(Count|Avg|Sum|Min|Max)AggregateOutputType$/.test(outputType.name) &&
        String(outputType.name).startsWith(model.name);
    // Get rid of bogus suffixes
    outputType.name = getOutputTypeName(outputType.name);

    if (shouldEmitAggregateOutput) {
        eventEmitter.emitSync('AggregateOutput', { ...args, outputType });
    }

    const sourceFile = getSourceFile({
        name: outputType.name,
        type: fileType,
    });

    const classDeclaration = generateClass({
        decorator: {
            name: 'ObjectType',
        },
        sourceFile,
        name: outputType.name,
    });

    generateImport({
        sourceFile,
        name: 'Field',
        moduleSpecifier: '@nestjs/graphql',
    });

    for (const field of outputType.fields) {
        const { location, isList, type } = field.outputType;
        const outputTypeName = getOutputTypeName(String(type));
        const modelField = model && modelFields.get(model.name)?.get(field.name);
        const fieldMeta = modelField?.meta;
        const customType = config.types[outputTypeName];

        // console.log({
        //     'field.outputType': field.outputType,
        //     'outputType.name': outputType.name,
        //     connectedModelName,
        //     outputTypeName,
        //     'field.name': field.name,
        //     fieldMeta,
        // });

        field.outputType.type = outputTypeName;

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
                isId: false,
            });

        const graphqlImport = getGraphqlImport({
            sourceFile,
            fileType,
            location,
            isId: false,
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
        });
    }
}
