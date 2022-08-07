const fs = require('fs/promises');
const cp = require('child_process');
const path = require('path');

/**
 * @param {number} totalPlays How many times the song should loop before fading. Two loops means
 * that the main body of the song will play twice *total*.
 * @param {number} fadeDelay How long into the loops+1'th play-through the fade should start.
 * @param {number} fadeDuration How long the fade should take.
 * @param {string} logPrefix String to be put in front of every call to `console.log`.
 */
 async function process(totalPlays = 2, fadeDelay = 2, fadeDuration = 8, logPrefix = '') {

    const srcDir = path.join(__dirname, './ogg-source');
    const outDir = path.join(__dirname, './ogg-ready');

    /**
     * @TODO
     */

    console.log(`${logPrefix} process2, TODO`);

}


if (require.main === module) process();
else module.exports = { process };
