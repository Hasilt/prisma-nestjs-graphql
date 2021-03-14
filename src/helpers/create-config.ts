import filenamify from 'filenamify';
import { unflatten } from 'flat';
import { mapKeys, merge, trim } from 'lodash';
import { Nullable } from 'simplytyped';

import { TypeRecord } from '../types';

export function createConfig(data: Record<string, string | undefined>) {
    const config = merge({}, unflatten(data, { delimiter: '_' })) as Record<
        string,
        unknown
    >;
    const $warnings: string[] = [];

    const configOutputFilePattern = String(
        config.outputFilePattern || `{model}/{name}.{type}.ts`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    let outputFilePattern = filenamify(configOutputFilePattern, {
        replacement: '/',
    })
        .replace(/\.\./g, '/')
        .replace(/\/+/g, '/');
    outputFilePattern = trim(outputFilePattern, '/');

    if (outputFilePattern !== configOutputFilePattern) {
        $warnings.push(
            `Due to invalid filepath 'outputFilePattern' changed to '${outputFilePattern}'`,
        );
    }

    return {
        outputFilePattern,
        tsConfigFilePath: 'tsconfig.json' as string,
        combineScalarFilters: toBoolean(config.combineScalarFilters),
        noAtomicOperations: toBoolean(config.noAtomicOperations),
        reExportAll: toBoolean(config.reExportAll),
        decorators: mapKeys(config.decorators as Record<string, any>, 'name'),
        $warnings,
        types: merge(
            {},
            {
                Json: {
                    fieldType: 'any',
                    graphqlType: 'GraphQLJSON',
                    graphqlModule: 'graphql-type-json',
                },
            },
            config.types,
        ) as Record<string, Nullable<TypeRecord>>,
    };
}

function toBoolean(value: unknown) {
    return ['true', '1', 'on'].includes(String(value));
}
