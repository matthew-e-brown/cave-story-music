const fs = require('fs/promises');
const cp = require('child_process');
const path = require('path');

/**
 * @param {string} srcDir The directory to pull the `.org` files out of.
 * @param {string} outDir The directory to put the `.ogg` files into.
 * @param {number} fadeDelay How long into the third play-through (2nd loop) the fade should start.
 * @param {number} fadeDuration How long the fade should take.
 */
async function process(srcDir, outDir, fadeDelay = 2, fadeDuration = 8) {

    // Re-create the output directory just in case we are re-doing a fuck-up
    try {
        const existing = await fs.readdir(outDir);
        await Promise.all(existing.map(entry => {
            const fullName = path.join(outDir, entry);
            return fs.unlink(fullName);
        }));
    } catch (err) {
        // If the folder doesn't exist, make it.
        if (err.code == 'ENOENT' && err.path == outDir) {
            await fs.mkdir(outDir);
        } else {
            throw err;
        }
    }

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
        const destPath = path.join(outDir, baseName.replace(/\.org$/, '.ogg'));

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
            * (start + (end - start) * 2)               // total number of ticks
            / 44100.0                                   // ticks per second
            + fadeDelay;                                // `n` seconds after that
        let fadeEnd = fadeStart + fadeDuration;

        fadeStart = fadeStart.toFixed(6).replace(/0+$/, '');
        fadeEnd = fadeEnd.toFixed(6).replace(/0+$/, '');

        // --------------------------
        // Spawn child processes
        // --------------------------

        console.log(`Spawning child processes for ${baseName}...`);

        // Convert to PCM...
        const organism = cp.spawn('cargo', [
            'run',
            '-qr',
            '--locked',
            '--manifest-path', path.join(__dirname, '../../tools/organism/Cargo.toml'),
            '--',
            fullName,
            '2',
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
            '-t', fadeEnd.toString(),                               // finish where the fade stops
            '-af', `afade=t=out:st=${fadeStart}:d=${fadeDuration}`, // add the fade
            destPath,                                               // output to .ogg file
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

        // "Join"
        await Promise.allSettled([
            new Promise((resolve, reject) => {
                organism.on('exit', resolve);
                organism.on('error', reject);
            }),
            new Promise((resolve, reject) => {
                ffmpeg.on('exit', resolve);
                ffmpeg.on('error', reject);
            }),
        ]);

        console.log(`Child processes for ${baseName} completed (${++finished}/${total}).`);
    }));
}


if (require.main === module) {
    process(
        path.join(__dirname, './org-source'),
        path.join(__dirname, './ogg-ready'),
    );
}

else {
    module.exports = {
        process,
    };
}
