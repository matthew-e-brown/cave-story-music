// @ts-check

const fs = require('fs/promises');
const cp = require('child_process');
const path = require('path');

const { makeMetadata, join, fileExists } = require('../tools/utils');


/**
 *
 * @param {string} fileName
 * @returns {Promise<number>}
 */
async function probeLength(fileName) {
    let buffer = Buffer.alloc(0);

    const probe = cp.spawn('ffprobe', [
        fileName,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format'
    ], {
        stdio: [ 'ignore', 'pipe', 'ignore' ],
        windowsHide: true,
    });

    probe.stdout.on('data', chunk => buffer = Buffer.concat([ buffer, chunk ]));
    const [ joinResult ] = await join(probe);

    if (joinResult.status == 'fulfilled') {
        const result = JSON.parse(buffer.toString('utf-8'));
        const number = Number(result?.format?.duration);
        if (isNaN(number)) {
            throw new Error(`ffprobe did not return a number for '.format.duration' for ${path.basename(fileName)}: ${JSON.stringify(result)}`);
        } else {
            return number;
        }
    } else {
        throw new Error(`ffprobe failed to probe ${path.basename(fileName)}: ${joinResult.reason}`);
    }
}


/**
 * @param {string} srcDir
 * @param {string} outDir
 * @param {Object.<string, any>} metadata
 * @param {string?} probeDir A directory to override the probing of `.ogg` files from. Probing is
 * used to determine duration of source files for looping; if audio is broken, files with fixed
 * lengths can be put in here.
 * @param {string?} coverArt A path to the image to use for cover art.
 * @param {number} loopCount How many times the song should loop before fading. One loop means that
 * the main body of the song will play twice *total*.
 * @param {number} fadeDelay How long into the loops+1'th play-through the fade should start.
 * @param {number} fadeDuration How long the fade should take.
 * @param {string} logPrefix String to be put in front of every call to `console.log`.
 */
 async function convertOgg(
    srcDir,
    outDir,
    metadata,
    probeDir = null,
    coverArt = null,
    loopCount = 1,
    fadeDelay = 2,
    fadeDuration = 8,
    logPrefix = ''
) {

    // If the output directory doesn't exist, make it
    await fs.mkdir(outDir, { recursive: true });

    const oggFiles = await fs.readdir(srcDir, { withFileTypes: true })
        .then(entries => entries.filter(entry => entry.isFile() && entry.name.endsWith('.ogg')))
        .then(entries => entries.map(entry => entry.name));

    // Split them up into groups of singles and doubles
    const singleFiles = [ ];
    const doubleFiles = [ ];

    while (oggFiles.length) {
        const file = /** @type {!string} not null */ (oggFiles.shift());

        // Check if this track ends with _intro or _loop
        const part = file.match(/_(intro|loop)\.ogg$/)?.[1];

        // If it doesn't, this is a single track
        if (part === undefined) {
            singleFiles.push(file);
        }

        // If it does, then we grab the other one and shift it too
        else {
            // 'peek' before shifting
            const other = part == 'intro' ? 'loop' : 'intro';
            if (oggFiles[0]?.endsWith(`_${other}.ogg`)) {
                doubleFiles.push([ file, /** @type {!string} */ (oggFiles.shift()) ]);
            } else {
                throw new Error(`Song ${file} does not have a ${other} counterpart.`);
            }
        }
    }

    let finished = 0;
    const total = singleFiles.length + doubleFiles.length;

    // Handle a replacement probe-dir
    const getProbeDir = async (/** @type {string} */ filePath) => {
        if (!probeDir) return filePath;

        // Check if the file exists in the probe directory first
        const probePath = path.join(probeDir, path.basename(filePath));
        if (await fileExists(probePath)) return probePath;
        else {
            console.log(`${logPrefix} ${path.basename(filePath)} did not have a probe version, delegating to source file.`);
            return filePath;
        }
    }

    // --------------------------
    // Handle single-file songs
    // --------------------------

    const singlePromises = Promise.all(singleFiles.map(async fileName => {
        const fullName = path.join(srcDir, fileName);
        const baseName = path.basename(fileName);
        const destPath = path.join(outDir, baseName.replace(/\.ogg$/, '.flac'));

        const trackLength = await probeLength(await getProbeDir(fullName));

        const mainLength = trackLength + trackLength * loopCount;
        const fadeStart = mainLength + fadeDelay;
        const fadeEnd = fadeStart + fadeDuration;

        console.log(`${logPrefix} Spawning child process for ${baseName}...`);

        // Run FFmpeg
        const ffmpeg = cp.spawn('ffmpeg', [
            '-stream_loop', '-1',                                       // loop the input stream infinitely
            '-i', fullName,                                             // take the file directly
            ...(coverArt ? [                                            // add cover art if applicable
                '-i', coverArt,                                         // take image as input
                '-map', '0:a',                                          // map the first one (media) to audio stream
                '-map', '1:v',                                          // map the second one (image) to video stream
                '-codec:v', 'copy',                                     // copy the video stream instead of re-encoding
                '-metadata:s:v', 'title=Album cover',                   // add metadata just in case
                '-metadata:s:v', 'comment=Cover (front)',               // ""
                '-disposition:v', 'attached_pic',                       // mark as attached
            ] : [ ]),                                                   // -------------------------
            '-s', '0',                                                  // start at zero
            '-t', (fadeEnd + 0.5).toString(),                           // finish the stream just after fade
            '-af', `afade=t=out:st=${fadeStart}:d=${fadeDuration}`,     // add the fade
            ...makeMetadata(
                metadata['__common__'],
                metadata[baseName.replace(/\.ogg$/, '').toLowerCase()],
            ),
            destPath,                                                   // output to .flac file
        ], {
            stdio: 'ignore',
            windowsHide: true,
        });

        const [ res ] = await join(ffmpeg);

        if (res.status == 'fulfilled') {
            console.log(`${logPrefix} Child process for ${baseName} completed (${++finished}/${total}).`);
        } else {
            console.error(`${logPrefix}\x1b[31m FFmpeg failed to execute for ${baseName}:\x1b[0m ${res.reason}.`);
            console.error(`${logPrefix}\x1b[31m Change stderr to 'inherit' and run again to see output.\x1b[0m`);
        }
    }));

    // --------------------------
    // Handle double-file songs
    // --------------------------

    const doublePromises = Promise.all(doubleFiles.map(async filePair => {
        // Don't know what order they'll be in, so we just search
        const introTrack = path.join(srcDir, /** @type {!string} */ (filePair.find(f => f.endsWith('_intro.ogg'))));
        const loopTrack = path.join(srcDir, /** @type {!string} */ (filePair.find(f => f.endsWith('_loop.ogg'))));
        const destPath = path.join(outDir, path.basename(introTrack).replace(/_intro\.ogg$/, '.flac'));

        const names = path.basename(introTrack) + ' & ' + path.basename(loopTrack);

        // Check how long the intro and the start are
        const [ introLength, loopLength ] = await Promise.all([
            probeLength(await getProbeDir(introTrack)),
            probeLength(await getProbeDir(loopTrack)),
        ]);

        // Determine the total length of the song:
        const mainLength = introLength + loopLength * loopCount;
        const fadeStart = mainLength + fadeDelay;
        const fadeEnd = fadeStart + fadeDuration;

        console.log(`${logPrefix} Spawning child process for ${names}...`);

        const ffmpeg = cp.spawn('ffmpeg', [
            '-i', introTrack,
            '-stream_loop', '-1',
            '-i', loopTrack,
            ...(coverArt ? [
                '-i', coverArt,
                '-map', '2',
                '-c:v', 'copy',
                '-metadata:s:v', 'title=Album cover',
                '-metadata:s:v', 'comment=Cover (front)',
                '-disposition:v:2', 'attached_pic',
            ] : [ ]),
            '-s', '0',
            '-t', (fadeEnd + 0.5).toString(),
            ...makeMetadata(
                metadata['__common__'],
                metadata[path.basename(introTrack).replace(/_intro\.ogg$/, '').toLowerCase()],
            ),
            '-filter_complex', `[0:0][1:0]concat=n=2:v=0:a=1[cout];[cout]afade=t=out:st=${fadeStart}:d=${fadeDuration}[fout]`,
            '-map', '[fout]',
            destPath
        ], {
            stdio: 'ignore',
            windowsHide: true,
        });

        const [ res ] = await join(ffmpeg);

        if (res.status == 'fulfilled') {
            console.log(`${logPrefix} Child process for ${names} completed (${++finished}/${total}).`);
        } else {
            console.error(`${logPrefix}\x1b[31m FFmpeg failed to execute for ${names}:\x1b[0m ${res.reason}.`);
            console.error(`${logPrefix}\x1b[31m Change stderr to 'inherit' and run again to see output.\x1b[0m`);
        }
    }));

    // "Join" on both sets
    await Promise.all([ singlePromises, doublePromises ]);
}


module.exports = { convertOgg };
