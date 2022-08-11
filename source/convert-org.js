// @ts-check

const fs = require('fs/promises');
const cp = require('child_process');
const path = require('path');

const { makeMetadata, join } = require('../tools/utils');


/**
 * @param {string} srcDir
 * @param {string} outDir
 * @param {Object.<string, any>} metadata
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

    // Each one is going to have to listen to the main program to see if it should get terminated
    if (global.process.getMaxListeners() < total)
        global.process.setMaxListeners(total);

    // Process all files concurrently
    await Promise.all(orgFiles.map(async fileName => {
        const fullName = path.join(srcDir, fileName);
        const baseName = path.basename(fileName);
        const destPath = path.join(outDir, baseName.replace(/\.org$/, '.flac'));

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

        let fadeStart =
            (44100.0 / 1000.0 * wait)                   // frames per tick
            * (start + (end - start) * (loopCount + 1)) // total number of ticks
            / 44100.0                                   // ticks per second
            + fadeDelay;                                // `n` seconds after that
        let fadeEnd = fadeStart + fadeDuration;

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
            fullName,                       // .org file to convert to raw data
            (loopCount + 2).toString(),    // number of times we want to loop; we need buffer so +2
        ], {
            stdio: [ 'ignore', 'pipe', 'ignore' ],
            windowsHide: true,
        });

        // ...and pipe it directly to FFmpeg
        const ffmpeg = cp.spawn('ffmpeg', [
            '-f', 's16le',                                          // signed, little-endian raw PCM
            '-ar', '44100',                                         // 44,100 Hz
            '-ac', '2',                                             // 2 audio channels
            '-channel_layout', 'stereo',                            // in stereo
            '-i', 'pipe:',                                          // take PCM data from pipe
            '-s', '0',                                              // start at zero
            '-t', (fadeEnd + 0.5).toString(),                       // finish just after the fade stops
            '-af', `afade=t=out:st=${fadeStart}:d=${fadeDuration}`, // add the fade
            ...makeMetadata(
                metadata['__common__'],
                metadata[baseName.replace(/\.org$/, '').toLowerCase()]
            ),
            destPath,                                               // output to .flac file
        ], {
            stdio: [ 'pipe', 'ignore', 'ignore' ],
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
            if (oRes.status == 'rejected')
                console.error(`${logPrefix} Organism failed to execute for ${baseName}: ${oRes.reason}`);
            if (fRes.status == 'rejected')
                console.error(`${logPrefix} FFmpeg failed to execute for ${baseName}: ${fRes.reason}.`);
        }
    }));
}


module.exports = { convertOrg };
