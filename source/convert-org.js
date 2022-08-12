// @ts-check

const fs = require('fs/promises');
const cp = require('child_process');
const path = require('path');

const { makeMetadata, join, getLoopCount } = require('../tools/utils');


/**
 * @param {string} srcDir
 * @param {string} outDir
 * @param {Object.<string, any>} metadata
 * @param {string?} coverArt A path to the image to use for cover art.
 * @param {number} loopCount How many times the song should loop before fading. One loop means that
 * the main body of the song will play twice *total*.
 * @param {number} fadeDelay How long into the loops+1'th play-through the fade should start.
 * @param {number} fadeDuration How long the fade should take.
 * @param {string} logPrefix String to be put in front of every call to `console.log`.
 */
async function convertOrg(
    srcDir,
    outDir,
    metadata,
    coverArt = null,
    loopCount = 1,
    fadeDelay = 2,
    fadeDuration = 8,
    logPrefix = ''
) {

    // If the output directory doesn't exist, make it
    await fs.mkdir(outDir, { recursive: true });

    // Read the input directory
    const orgFiles = await fs.readdir(srcDir, { withFileTypes: true })
        .then(entries => entries.filter(entry => entry.isFile() && entry.name.endsWith('.org')))
        .then(entries => entries.map(entry => entry.name));

    let finished = 0;
    const total = orgFiles.length;

    // Process all files concurrently
    await Promise.all(orgFiles.map(async fileName => {
        const fullName = path.join(srcDir, fileName);
        const baseName = path.basename(fileName);
        const destPath = path.join(outDir, baseName.replace(/\.org$/, '.flac'));

        const songMeta = metadata[baseName.replace(/\.org$/, '').toLowerCase()];
        const songLoops = getLoopCount(loopCount, songMeta);

        const noFade = songLoops == 0 || fadeDuration == 0;

        // Read the first couple bytes to determine the looping size
        const buff = Buffer.alloc(18);

        /** @type {?fs.FileHandle} */ let file = null;
        try {
            file = await fs.open(fullName, 'r');
            await file.read(buff, 0, 18);
        } catch (err) {
            throw `Failed to open and read ${baseName}! Code: ${err.code}`;
        } finally {
            await file?.close();
        }

        const magic = buff.toString('binary', 0, 6);

        if (!/^Org-0[123]$/.test(magic))
            throw 'Invalid magic number!';

        const wait  = buff.readUInt16LE(6);
        const start = buff.readInt32LE(10);
        const end   = buff.readInt32LE(14);

        const mainLength =
            (44100.0 / 1000.0 * wait)                   // frames per tick
            * (start + (end - start) * (songLoops + 1)) // total number of ticks
            / 44100.0                                   // ticks per second
        const fadeStart = mainLength + fadeDelay;       // `n` seconds after that
        const fadeEnd = fadeStart + fadeDuration;

        // --------------------------
        // Spawn child processes
        // --------------------------

        console.log(`${logPrefix} Spawning child processes for ${baseName}...`);

        // Convert to PCM...
        const organism = cp.spawn('cargo', [
            'run',
            '-qr',
            '--locked',
            '--manifest-path', path.join(__dirname, '../tools/organism/Cargo.toml'),
            '--',
            fullName,                      // .org file to convert to raw data
            (songLoops * 2).toString(),    // number of times we want to loop
            // ↑ we need a buffer so *2 just in case; we will kill this process early anyways
        ], {
            stdio: [ 'ignore', 'pipe', 'ignore' ],
            windowsHide: true,
        });

        // ...and pipe it directly to FFmpeg
        const ffmpeg = cp.spawn('ffmpeg', [
            '-loglevel', 'error',
            '-f', 's16le',                                              // signed, little-endian raw PCM
            '-ar', '44100',                                             // 44,100 Hz
            '-ac', '2',                                                 // 2 audio channels
            '-channel_layout', 'stereo',                                // in stereo
            '-i', 'pipe:',                                              // take PCM data from pipe
            ...(coverArt ? [                                            // add cover art if applicable
                '-i', coverArt,                                         // take image as input
                '-map', '0:a',                                          // map the first one (media) to audio stream
                '-map', '1:v',                                          // map the second one (image) to video stream
                '-codec:v', 'copy',                                     // copy the video stream instead of re-encoding
                '-metadata:s:v', 'title=Album cover',                   // add metadata just in case
                '-metadata:s:v', 'comment=Cover (front)',               // ""
                '-disposition:v', 'attached_pic',                       // mark as attached
            ] : [ ]),                                                   // -------------------------
            ...(noFade ? [ ] : [                                        // add the fade
                '-af', `afade=t=out:st=${fadeStart}:d=${fadeDuration}`
            ]),
            ...makeMetadata(
                metadata['__common__'],
                songMeta,
            ),
            '-codec:a', 'flac',                                         // use 'flac' codec
            '-t', ((noFade ? mainLength : fadeEnd) + 0.5).toString(),   // finish just after the fade stops
            destPath,                                                   // output to file
        ], {
            stdio: [ 'pipe', 'ignore', 'inherit' ],
            windowsHide: true,
        });

        // Pipe organism's stdout to FFmpeg's stdin; kill organism when FFmpeg stops reading (FFmpeg
        // should always finish first because it is set to stop at the fade duration).
        organism.stdout.pipe(ffmpeg.stdin);

        const stop = () => {
            organism.stdout.unpipe();
            organism.kill('SIGINT');
        }

        ffmpeg.stdin.on('close', stop);
        ffmpeg.stdin.on('error', stop);
        ffmpeg.on('exit', stop);
        ffmpeg.on('error', stop);

        // If this process dies, send SIGINT to both children
        global.process.on('exit', () => {
            organism.kill('SIGINT');
            ffmpeg.kill('SIGINT');
        });

        const [ oRes, fRes ] = await join(organism, ffmpeg);

        if (fRes.status == 'fulfilled' && oRes.status == 'fulfilled')
            console.log(`${logPrefix} Child processes for ${baseName} completed (${++finished}/${total}).`);
        else {
            if (oRes.status == 'rejected') {
                console.error(`${logPrefix} \x1b[31mOrganism failed to execute for ${baseName}:\x1b[0m ${oRes.reason}`);
            }
            if (fRes.status == 'rejected') {
                console.error(`${logPrefix} \x1b[31mFFmpeg failed to execute for ${baseName}:\x1b[0m ${fRes.reason}.`);
            }
        }
    }));

    console.log(`${logPrefix} Done!`);
}


module.exports = { convertOrg };
