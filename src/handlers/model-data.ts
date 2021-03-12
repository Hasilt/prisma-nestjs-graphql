import { isEmpty, map, mapKeys, trim } from 'lodash';
import { Node, SourceFile } from 'ts-morph';

import { DMMF, EventArguments, Field, FieldMeta } from '../types';

export function modelData(model: DMMF.Model, args: EventArguments) {
    const { modelNames, models, modelFields, config } = args;
    modelNames.push(model.name);
    models.set(model.name, model);

    const modelFieldsValue = new Map<string, Field>();
    modelFields.set(model.name, modelFieldsValue);
    for (const field of model.fields) {
        modelFieldsValue.set(field.name, {
            ...field,
            ...getFieldMeta(field.documentation, config.decorators),
        });
    }
}

function getFieldMeta(
    documentation: string | undefined,
    decorators: Record<string, any>,
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
        const match = /^@((\w+)\.\w+)\((.*)\)/.exec(line);
        const decorator = match && decorators[match?.[2]];
        if (decorator && match) {
            lines.splice(index, 1);
            // console.log('match', match);
            // const expression = match.input!.slice(match[1].length + 1);
            // console.log('expression', expression);
            // playground.insertText(0, expression);
            // const statement = playground.getStatement(statement =>
            //     Node.isExpressionStatement(statement),
            // );
            // const callExpression = statement?.compilerNode.expression;
            // const args = callExpression.arguments.map(a => a.getText());
            meta.decorators.push({
                name: match[1],
                namespace: match[2],
                from: decorator.from,
                arguments: String(match[3])
                    .split(',')
                    .map(s => trim(s))
                    .filter(Boolean),
            });
        }
    }

    return {
        documentation: isEmpty(lines) ? undefined : lines.join('\\n'),
        meta,
    };
}
