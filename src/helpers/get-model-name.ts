import { memoize } from 'lodash';

export function createGetModelName(modelNames: string[]) {
    return memoize(tryGetName);

    function tryGetName(name: string): string | undefined {
        return getModelName({ modelNames, name });
    }
}

export function getModelName(args: { name: string; modelNames: string[] }) {
    const { name, modelNames } = args;
    for (const keyword of splitKeywords) {
        const [test] = name.split(keyword, 1);
        if (modelNames.includes(test)) {
            return test;
        }
    }
    for (const keyword of endsWithKeywords) {
        const [test] = name.split(keyword).slice(-1);
        if (modelNames.includes(test)) {
            return test;
        }
    }
    for (const [start, end] of middleKeywords) {
        const test = name.slice(start.length).slice(0, -end.length);
        if (modelNames.includes(test)) {
            return test;
        }
    }
    return;
}

const splitKeywords = [
    'CreateInput',
    'CreateMany',
    'CreateNested',
    'CreateOneWithout',
    'CreateOrConnect',
    'CreateWithout',
    'DistinctField',
    'Filter',
    'ManyWithout',
    'OrderByInput',
    'RelationFilter',
    'ListRelationFilter',
    'ScalarWhereInput',
    'UpdateInput',
    'UpdateMany',
    'UpdateOneRequiredWithout',
    'UpdateOneWithout',
    'UpdateWith',
    'UpsertWith',
    'UpsertWithout',
    'WhereInput',
    'WhereUniqueInput',
    'AvgAggregate',
    'SumAggregate',
    'MinAggregate',
    'MaxAggregate',
    'CountAggregate',
    'ScalarField',
    'GroupBy',
    'OrderBy',
    'UncheckedUpdate',
    'UncheckedCreate',
    'ScalarWhere',
].sort((a, b) => b.length - a.length);

const endsWithKeywords = [
    'Aggregate',
    'GroupBy',
    'CreateOne',
    'DeleteMany',
    'DeleteOne',
    'FindMany',
    'FindOne',
    'FindUnique',
    'UpdateMany',
    'UpdateOne',
    'UpsertOne',
];

const middleKeywords = [
    ['Aggregate', 'Args'],
    ['CreateOne', 'Args'],
    ['DeleteMany', 'Args'],
    ['DeleteOne', 'Args'],
    ['FindMany', 'Args'],
    ['FindFirst', 'Args'],
    ['FindOne', 'Args'],
    ['FindUnique', 'Args'],
    ['UpdateMany', 'Args'],
    ['UpdateOne', 'Args'],
    ['UpsertOne', 'Args'],
    ['GroupBy', 'Args'],
    ['OrderBy', 'Args'],
];
