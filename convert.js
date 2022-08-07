const { process: prepare1 } = require('./source/1-original/process');
const { process: prepare2 } = require('./source/2-new/process');
const { process: prepare3 } = require('./source/3-remastered/process');


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

async function main() {

    // Grab the length and fade counts from the script arguments
    const totalPlays    = Math.round(getNumber(process.argv[2], 2));
    const fadeDelay     =            getNumber(process.argv[3], 2);
    const fadeDuration  =            getNumber(process.argv[4], 8);

    console.log('------------------------------ STEP 1: PROCESSING ------------------------------');
    console.log(`\nConverts raw '.org' and '.ogg' game files into looped + faded '.ogg' files.`);

    console.log(
        `\nEach song will play ${totalPlays} times (1 play-through, plus ${totalPlays - 1} "loop(s)"), start a fade\n` +
        `${fadeDelay} second(s) into the ${totalPlays + 1}${nth(totalPlays + 1)} play-through, fading to complete silence ${fadeDuration} second(s) later.`
    );

    console.log(`\nEverything will run concurrently. You may see a lot of CPU usage for a bit.`);
    console.log(`Running...`);

    await Promise.all([
        prepare1(totalPlays, fadeDelay, fadeDuration, '\x1b[36m1 - Original   |\x1b[0m'),
        prepare2(totalPlays, fadeDelay, fadeDuration, '\x1b[32m2 - New        |\x1b[0m'),
        prepare3(totalPlays, fadeDelay, fadeDuration, '\x1b[33m3 - Remastered |\x1b[0m'),
    ]);

    console.log('\n------------------------------ STEP 2: CONVERTING ------------------------------');
    console.log(`\nConverts the "ogg-ready" files into the desired filetype and tags with metadata.`);

    /**
     * @TODO
     */

    console.log('Converting, TODO');

}


if (require.main === module) main();
else module.exports = { main };
