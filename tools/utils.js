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
        return [ ...acc, '-metadata', `${key}=${value}` ];
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


module.exports = {
    makeMetadata,
    join,
    fileExists,
};
