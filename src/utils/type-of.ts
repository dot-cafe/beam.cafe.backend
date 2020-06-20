type ValueType =
    'undefined' |
    'null' |
    'object' |
    'array' |
    'boolean' |
    'number' |
    'string' |
    'function' |
    'symbol' |
    'bigint';

export const typeOf = (val: unknown): ValueType => {
    switch (typeof val) {
        case 'undefined':
            return 'undefined';
        case 'object':
            return val === null ? 'null' :
                Array.isArray(val) ? 'array' : 'object';
        case 'boolean':
            return 'boolean';
        case 'number':
            return 'number';
        case 'string':
            return 'string';
        case 'function':
            return 'function';
        case 'symbol':
            return 'symbol';
        case 'bigint':
            return 'bigint';
    }

    return 'string';
};

