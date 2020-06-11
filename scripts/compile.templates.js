const CleanCSS = require('clean-css');
const sass = require('node-sass');
const {rollup} = require('rollup');
const {terser} = require('rollup-plugin-terser');
const path = require('path');
const fs = require('fs');

const assetDir = path.resolve('dist/ta');
if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, {recursive: true});
}

const resolveDistFile = (file, ext) => {
    const basename = path.basename(file).slice(0, -path.extname(file).length);
    return path.join(assetDir, basename + ext);
};

const compileSass = async (source, production = false) => {
    return new Promise((resolve, reject) => {
        sass.render({
            file: source
        }, (err, result) => {
            if (err) {
                return reject(err);
            }

            const distFile = resolveDistFile(source, '.min.css');
            if (production) {
                const minimized = new CleanCSS().minify(result.css);
                if (minimized.errors.length) {
                    return reject(minimized.errors);
                }

                fs.writeFileSync(distFile, minimized.styles);
                resolve();
            } else {
                fs.writeFileSync(distFile, result.css);
                resolve();
            }
        });
    });
};

const compileJS = async (source, production = false) => {
    return rollup({
        input: source,
        plugins: production ? [terser()] : []
    }).then(bundle => {
        return bundle.write({
            file: resolveDistFile(source, '.min.js'),
            format: 'iife'
        });
    });
};

module.exports = {
    compileJS,
    compileSass
};
