import assert from 'assert';

export function error(message: string, severity: 'WARNING' | 'ERROR', value?: unknown) {
    switch (severity) {
        case 'WARNING':
            console.log('prisma-nestjs-graphql:', message);
            break;
        case 'ERROR':
        default:
            throw new Error(message);
    }
}
