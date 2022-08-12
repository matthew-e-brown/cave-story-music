// @ts-check
const fs = require('fs/promises');
const { constants: fsConstants } = require('fs');


/**
 * Takes two metadata objects, merges them, and returns them in an FFmpeg format.
 * @param {Object.<string, any>} common Common (low priority) metadata
 * @param {Object.<string, any>} track Metadata for this particular track
 * @returns {Array.<string>}
 */
function makeMetadata(common, track) {
    const metadata = Object.assign({ }, common, track);
    return Object.entries(metadata).reduce((acc, [ key, value ]) => {
        if (key.match(/^__.*__$/)) return acc; // skip __key__ properties
        else return [ ...acc, '-metadata', `${key}=${value}` ];
    }, /** @type {string[]} */ ([ ]));
}


/**
 * Joins on multiple running child processes.
 * @param {...import('child_process').ChildProcess} processes
 * @returns {Promise<PromiseSettledResult<void>[]>}
 */
function join(...processes) {
    return Promise.allSettled(processes.map(child => new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', code => {
            if (code) reject(`Child process ${child.spawnfile} exited with error code ${code}`);
            else resolve(void 0);
        });
    })));
}


/**
 * @param {import('fs').PathLike} path
 * @see https://stackoverflow.com/a/35008327/10549827
 */
const fileExists = (path) => fs.access(path, fsConstants.F_OK).then(() => true).catch(() => false);


/**
 * @param {number} loopCount The default number of loops.
 * @param {any} songMeta The song's metadata object.
 * @returns {number} The actual number of loops this particular song should loop for.
 */
const getLoopCount = (loopCount, songMeta) => {
    if (songMeta.hasOwnProperty('__force_loops__')) {
        let l = songMeta['__force_loops__'];
        // Allow them to...

        // ...set an exact number of loops...
        if (typeof l == 'number' && !isNaN(l)) return l;

        // ...or set a modifier (+2, loop 2 more, *2, loop 2x as many times, etc.)
        else if (typeof l == 'string') {

            if (l.startsWith('+')) {
                l = Number(l.replace(/[+\s]/g, ''));
                l = loopCount + l;
            } else if (l.startsWith('-')) {
                l = Number(l.replace(/[-\s]/g, ''));
                l = loopCount - l;
            } else if (l.startsWith('*')) {
                l = Number(l.replace(/[*\s]/g, ''));
                l = loopCount * l;
            } else if (l.startsWith('/')) {
                l = Number(l.replace(/[/\s]/g, ''));
                l = loopCount / l;
            } else if (l.startsWith('%')) {
                l = Number(l.replace(/[%\s]/g, ''));
                l = loopCount % l;
            }

            if (!isNaN(l)) return l;
        }
    }

    // In all failure cases return the default
    return loopCount;
}


module.exports = {
    makeMetadata,
    join,
    fileExists,
    getLoopCount,
};
