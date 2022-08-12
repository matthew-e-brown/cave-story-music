// @ts-check

const fs = require('fs/promises');
const path = require('path');

const { fileExists } = require('./tools/utils');

const { convertOrg } = require('./source/convert-org');
const { convertOgg } = require('./source/convert-ogg');


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
 * Let's do this thang!!
 */
async function main() {

    // Pull '-f' out of argv, then remove it from argv to keep other relative positions the same
    const force = process.argv.some(arg => arg == '-f' || arg == '--force');
    process.argv = process.argv.filter(arg => arg != '-f' && arg != '--force');

    // -------------------------------------------------------------------------------------------

    // Grab the length and fade counts from the script arguments
    const outDir        = process.argv[2] || path.join(__dirname, './flac-output');
    const coverArt      = process.argv[3] || path.join(__dirname, './artwork/cover.jpg');
    const loopCount     = Math.round(getNumber(process.argv[4], 1));
    const fadeDelay     =            getNumber(process.argv[5], 2);
    const fadeDuration  =            getNumber(process.argv[6], 8);

    // -------------------------------------------------------------------------------------------

    // Clear the output directory just in case we are redoing a fuck-up
    if (await fileExists(outDir) && !force) {
        console.error(`Refusing to overwrite output directory without '-f'/'--force' flag.`);
        return;
    }

    try {
        await fs.rm(outDir, { recursive: true, force: true });
    } catch (err) {
        // If the folder didn't exist, make it.
        if (err.code == 'ENOENT' && err.path == outDir) await fs.mkdir(outDir);
        else if (require.main === module) {
            console.error(`Failed to remove output directory (clearing past runs).`);
            console.error(err.message);
            process.exitCode = 1;
            return;
        } else {
            throw err;
        }
    }

    // -------------------------------------------------------------------------------------------

    console.log(
        `\nEach song will play ${loopCount + 1} times (1 play-through, plus ${loopCount} "loop(s)"), start a fade\n` +
        `${fadeDelay} second(s) into the ${loopCount + 2}${nth(loopCount + 2)} play-through, fading to complete silence ${fadeDuration} second(s) later.`
    );

    console.log(`\nEverything will run concurrently. You may see a lot of CPU usage for a bit.`);
    console.log(`Running...\n\n`);

    // We need a lot of listeners for SIGINT
    global.process.setMaxListeners(0);

    await Promise.all([
        convertOrg(
            path.join(__dirname, './source/1-original/org-source'),
            path.join(outDir, './1-original'),
            require('./source/1-original/metadata.json'),
            coverArt,
            loopCount,
            fadeDelay,
            fadeDuration,
            '\x1b[36m1 - Original   |\x1b[0m'
        ),
        convertOgg(
            // Use SoloMael's fixed files for the main audio...
            path.join(__dirname, './source/2-new/ogg-source-fixed'),
            path.join(outDir, './2-new'),
            require('./source/2-new/metadata.json'),
            // ... but probe their lengths using the files from the game.
            path.join(__dirname, './source/2-new/ogg-source-game'),
            coverArt,
            loopCount,
            fadeDelay,
            fadeDuration,
            '\x1b[32m2 - New        |\x1b[0m'
        ),
        convertOgg(
            path.join(__dirname, './source/3-remastered/ogg-source'),
            path.join(outDir, './3-remastered'),
            require('./source/3-remastered/metadata.json'),
            null, // all lengths for part 3 *should* be correct
            coverArt,
            loopCount,
            fadeDelay,
            fadeDuration,
            '\x1b[33m3 - Remastered |\x1b[0m'
        ),
    ]);

}


if (require.main === module) main();
else module.exports = { main };
