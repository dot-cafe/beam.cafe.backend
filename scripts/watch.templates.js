const {compileSass, compileJS} = require('./compile.templates');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');

// Recompile css content
chokidar.watch('html/templates/*.scss').on('all', (event, file) => {
    compileSass(file, false)
        .then(() => console.log(`Compiled ${file}`))
        .catch(e => console.error(e.formatted));
});

// Recompile js
chokidar.watch('html/templates/*.js').on('all', (event, file) => {
    if (!file.endsWith('min.js')) {
        compileJS(file, false)
            .then(() => console.log(` Compiled ${file}`))
            .catch(e => console.error(e));
    }

});

// Copy templates
const src = path.resolve('html/templates');
const dist = path.resolve('dist/templates');
chokidar.watch('html/templates/**/*.ejs').on('all', () => {
    fs.copySync(src, dist, {
        filter: src => !['.scss', '.js'].includes(path.extname(src))
    });
});
