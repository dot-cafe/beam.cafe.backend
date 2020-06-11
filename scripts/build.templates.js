const {compileSass, compileJS} = require('./compile.templates');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');

const fatalError = e => {
    console.error(e);
    process.exit(-1);
};

glob('html/templates/*.scss', {}, (er, files) => {
    for (const file of files) {
        compileSass(file, true)
            .then(() => console.log(`Compiled ${file}`))
            .catch(fatalError);
    }
});

glob('html/templates/*.js', {}, (er, files) => {
    for (const file of files) {
        compileJS(file, true)
            .then(() => console.log(`Compiled ${file}`))
            .catch(fatalError);
    }
});

// Copy templates
const src = path.resolve('html/templates');
const dist = path.resolve('dist/templates');
fs.copySync(src, dist, {
    filter(src, dest) {
        const ok = !['.scss', '.js'].includes(path.extname(src));

        if (ok) {
            console.log(`Copied "${path.basename(src)}" to "${dest}"`);
            return true;
        }

        return false;
    }
});
