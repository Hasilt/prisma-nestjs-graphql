import expect from 'expect';

import { parseFieldMeta } from './parse-field-meta';

describe('parseFieldMeta', () => {
    it('simple maxlength', () => {
        const result = parseFieldMeta('@Validator.MaxLength(30)');
        expect(result.decorators[0].name).toEqual('Validator.MaxLength');
        expect(result.decorators[0].arguments).toEqual(['30']);
    });

    it('invalid validator minlength', () => {
        const result = parseFieldMeta('@Validator.MinLength()');
        expect(result.decorators[0].name).toEqual('Validator.MinLength');
        expect(result.decorators[0].arguments).toEqual([]);
    });

    it('multiple lines', () => {
        const result = parseFieldMeta(
            `@Validator.MaxLength(50, {\nmessage: 'Job title is too long'\n})`,
        );
        expect(result.decorators[0].name).toEqual('Validator.MaxLength');
        expect(result.decorators[0].arguments).toEqual([
            '50',
            `{\nmessage: 'Job title is too long'\n}`,
        ]);
    });

    it('hidefield decorator as meta', () => {
        const result = parseFieldMeta(`@HideField()`);
        expect(result.hideOutput).toEqual(true);
        expect(result.decorators).toEqual([]);
    });

    it('typegraphql output', () => {
        const result = parseFieldMeta(`@TypeGraphQL.omit(output: true)`);
        expect(result.hideOutput).toEqual(true);
        expect(result.decorators).toEqual([]);
    });

    it('empty string', () => {
        const result = parseFieldMeta(``);
        expect(result.hideOutput).toEqual(false);
        expect(result.decorators).toEqual([]);
    });

    it('several decorators', () => {
        const result = parseFieldMeta(`@Max(50) @Min(0)`);
        expect(result.hideOutput).toEqual(false);
        expect(result.decorators).toEqual([
            {
                name: 'Max',
                arguments: ['50'],
            },
            {
                name: 'Min',
                arguments: ['0'],
            },
        ]);
    });

    it('mixed documentation and decorator', () => {
        const result = parseFieldMeta(`User really\n@Max(50)`);
        expect(result.hideOutput).toEqual(false);
        expect(result.documentation).toEqual('User really');
        expect(result.decorators).toEqual([
            {
                name: 'Max',
                arguments: ['50'],
            },
        ]);
    });
});
