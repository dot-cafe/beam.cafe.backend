import crypto from 'crypto';


export const serializeFilename = (name: string): string => {

    // Maximum length is 100
    name = name.slice(0, 100);

    // Replace space with underscores
    name = name.replace(/\s+/g, '_');

    // Remove non-word characters and leading points
    name = name.replace(/[^\w.-]|^[.]+/g, '');

    // Return either the name if not empty or the first 16 characters of the hash
    if (name.length) {
        return name;
    }
    return crypto.createHash('sha512')
        .update(name)
        .digest('hex')
        .slice(0, 16);

};

