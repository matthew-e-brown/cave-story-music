const fs = require('fs/promises');

(async () => {
    let offset = 0;

    const path = process.argv[2];                   // what file we're checking
    const fadeDelay = Number(process.argv[3]);      // how long into the 3rd play to start fading
    const fadeDuration = Number(process.argv[4]);   // how long the fade should take

    const buff = await fs.readFile(path);

    // The parsing of these bytes is mirrored from Organism

    const version = buff.toString('binary', offset, 6); offset += 6;
    switch (version) {
        case 'Org-01':
        case 'Org-02':
        case 'Org-03':
            // All good, we continue on
            break;
        default:
            console.error("Invalid magic number!");
            return;
    }

    const wait  = buff.readUint16LE(offset); offset += 2;
    /* const _bpm  = buff.readUInt8(offset); */ offset += 1;
    /* const _spb  = buff.readUint8(offset); */ offset += 1;
    const start = buff.readInt32LE(offset); offset += 4;
    const end   = buff.readInt32LE(offset); offset += 4;

    // ---

    const framesPerTick = 44100.0 / 1000.0 * wait;
    const totalTicks = framesPerTick * (start + (end - start) * 2);
    const totalSeconds = totalTicks / 44100.0;

    // Can be used to display the second counts in MM:SS format. But since we're using FFmpeg's -af
    // filter syntax, where `:` is a special delimiter, we simply print the seconds.
    // const display = secs => {
    //     const min = (Math.floor(secs / 60)).toFixed(0).padStart(2, '0');
    //     const sec = (secs % 60).toFixed(0).padStart(2, '0');
    //     return `${min}:${sec}`;
    // }

    // Output the time we want our fade to start and end. Start the fade 2 seconds into the third
    // loop and finish 8 seconds later.
    console.log(totalSeconds + fadeDelay, totalSeconds + fadeDuration + fadeDelay);
})();
