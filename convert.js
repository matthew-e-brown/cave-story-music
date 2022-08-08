const fs = require('fs/promises');
const path = require('path');
const { constants: fsConstants } = require('fs');

const { convert: convert1 } = require('./source/1-original/convert');
const { convert: convert2 } = require('./source/2-new/convert');
const { convert: convert3 } = require('./source/3-remastered/convert');


/**
 * @param {string} stringValue
 * @param {number} defaultValue
 * @returns {number}
 */
function getNumber(stringValue, defaultValue) {
    const parsed = Number.parseFloat(stringValue);
    if (Number.isNaN(parsed)) return defaultValue;
    else return parsed;
}

/**
 * @param {number} n
 * @see https://stackoverflow.com/a/39466341/10549827
 */
const nth = n => [ 'st', 'nd', 'rd' ][((n + 90) % 100 - 10) % 10 - 1] || 'th';

/**
 * @param {fs.PathLike} path
 * @see https://stackoverflow.com/a/35008327/10549827
 */
const exists = path => fs.access(path, fsConstants.F_OK).then(() => true).catch(() => false);


/**
 * Let's do this thang!!
 */
async function main() {

    const outDir = path.join(__dirname, './flac-output');

    // Clear the output directory just in case we are redoing a fuck-up
    if (await exists(outDir) && !process.argv.some(arg => arg == '-f' || arg == '--force')) {
        console.error(`Refusing to overwrite output directory without '-f'/'--force' flag.`);
        return;
    }

    // Keep positional arguments the same
    process.argv = process.argv.filter(arg => arg != '-f' && arg != '--force');

    try {
        await fs.rm(outDir, { recursive: true, force: true });
    } catch (err) {
        // If the folder didn't exist, make it.
        if (err.code == 'ENOENT' && err.path == outDir) await fs.mkdir(outDir);
        else throw err;
    }

    // -------------------------------------------------------------------------------------------

    // Grab the length and fade counts from the script arguments
    const totalPlays    = Math.round(getNumber(process.argv[2], 2));
    const fadeDelay     =            getNumber(process.argv[3], 2);
    const fadeDuration  =            getNumber(process.argv[4], 8);

    console.log(
        `\nEach song will play ${totalPlays} times (1 play-through, plus ${totalPlays - 1} "loop(s)"), start a fade\n` +
        `${fadeDelay} second(s) into the ${totalPlays + 1}${nth(totalPlays + 1)} play-through, fading to complete silence ${fadeDuration} second(s) later.`
    );

    console.log(`\nEverything will run concurrently. You may see a lot of CPU usage for a bit.`);
    console.log(`Running...`);

    await Promise.all([
        convert1(totalPlays, fadeDelay, fadeDuration, '\x1b[36m1 - Original   |\x1b[0m'),
        // convert2(totalPlays, fadeDelay, fadeDuration, '\x1b[32m2 - New        |\x1b[0m'),
        // convert3(totalPlays, fadeDelay, fadeDuration, '\x1b[33m3 - Remastered |\x1b[0m'),
    ]);

}


if (require.main === module) main();
else module.exports = { main };
