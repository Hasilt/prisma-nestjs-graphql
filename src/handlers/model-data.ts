import { isEmpty, map, mapKeys } from 'lodash';
import { Node, SourceFile } from 'ts-morph';

import { DMMF, EventArguments, Field, FieldMeta } from '../types';

export function modelData(model: DMMF.Model, args: EventArguments) {
    const { modelNames, models, modelFields, config, playground } = args;
    modelNames.push(model.name);
    models.set(model.name, model);

    const modelFieldsValue = new Map<string, Field>();
    modelFields.set(model.name, modelFieldsValue);
    for (const field of model.fields) {
        modelFieldsValue.set(field.name, {
            ...field,
            ...getFieldMeta(field.documentation, config.decorators, playground),
        });
    }
}

function getFieldMeta(
    documentation: string | undefined,
    decorators: Record<string, any>,
    playground: SourceFile,
) {
    const meta: FieldMeta = {
        hideOutput: false,
        decorators: [],
    };

    if (!documentation) {
        return {
            documentation,
            meta,
        };
    }

    const lines = documentation.split('\\n');
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (
            /@TypeGraphQL\.omit\(output:\s*true\)/.test(line) ||
            /@HideField\(\)/.test(line)
        ) {
            meta.hideOutput = true;
            lines.splice(index, 1);
        }
        const match = /^@((\w+)\.)(\w+).*/.exec(line);
        const decorator = match && decorators[match?.[2]];
        if (decorator) {
            lines.splice(index, 1);
            playground
                .getProject()
                .createSourceFile(playground.getFilePath(), '', { overwrite: true });
            const expression = match.input!.slice(match[1].length + 1);
            playground.insertText(0, expression);
            const statement = playground.getStatement(statement =>
                Node.isExpressionStatement(statement),
            );
            const callExpression = statement?.compilerNode.expression;
            const args = callExpression.arguments.map(a => a.getText());
            meta.decorators.push({
                from: decorator.from,
                name: callExpression.expression.escapedText,
                arguments: args,
            });
        }
    }

    return {
        documentation: isEmpty(lines) ? undefined : lines.join('\\n'),
        meta,
    };
}
