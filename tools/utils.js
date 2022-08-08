/**
 * Takes two metadata objects, merges them, and returns them in an FFmpeg format.
 * @param {Object.<string, string>} common Common (low priority) metadata
 * @param {Object.<string, string>} track Metadata for this particular track
 * @returns {Array.<string>}
 */
function makeMetadata(common, track) {
    const metadata = Object.assign({ }, common, track);
    return Object.entries(metadata).reduce((acc, [ key, value ]) => {
        return [ ...acc, '-metadata', `${key}=${value}` ];
    }, [ ]);
}


module.exports = {
    makeMetadata,
};
