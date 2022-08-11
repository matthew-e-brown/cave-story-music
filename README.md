# Cave Story Soundtrack Collection

Creating a properly formatted album with correct metadata and tags to be
imported into iTunes or any other music software. Done with scripts and stuff
instead of manually so that the process is documented.

Also cuz I was bored.


## Prerequisites

- `ffmpeg` and `ffprobe` installed and on PATH
- Rust & Cargo installed and on PATH
- Node installed and on PATH


## Usage

TODO


## Where to get the audio files from

### Original

Download the original `.org` tracks from the Cave Story fan website. Delete
`xxxx.org` and all of the "internal percussion" tracks. Follow the internal
track-name list to manually rename the files to the right thing.

- https://www.cavestory.org/download/music.php
- https://www.cavestory.org/game-info/internal-track-names.php

Even though we're going to rename them to use the internal names, we use the
tribute site's versions because they have done some work on the `.org` files to
make the percussion sound correct.

`convert.js` uses [Organism](https://gitdab.com/LunarLambda/organism) to convert
`.org` files into raw PCM data for FFmpeg to handle.


### "New"

At first, I was going to use the audio files from Cave Story+'s files, but then
I found online that the original artist of the "New" soundtrack had some issues
with it; the songs didn't appear as they were supposed to in-game. So, instead,
get the `.ogg` files from SoloMael's Google Drive.

- http://www.nurykabe.com/dump/sound/soundtracks/cave%20story/
- https://soundcloud.com/solomael/sets/cave-story-wii-balanced
- https://drive.google.com/drive/folders/1xSDHsDsMqKYhe2Wgd8Ewy4gMIcQhtPvs


#### Broken lengths

However, it seems that when the files were re-encoded, their lengths became
corrupted. This causes `ffmpeg` and `ffprobe` to report that some of the songs'
lengths are >20 minutes, like `gameover.ogg`. To fix this, we pull the game's
files just for probing the lengths.

The game-files can be found at `<steam folder>/Cave Story+/data/base/Ogg`.

Alternatively, if you don't mind the slightly broken percussion or don't like
SoloMael's remasters, you could simply use the in-game versions and change the
folder paths in [`convert.js`](./convert.js') (set the `probeDir` to `null`).


### "Remastered"

Pull these right from Cave Story+'s files. Delete `silence.ogg`, which is the
new name for `xxxx.ogg`, as well as `credits_*.ogg` (which is a duplicate of
`ending_*.ogg`) and `breakdown_*.ogg` (which is a duplicate of `bdown_*.ogg`).

The game-files can be found at `<steam folder>/Cave Story+/data/base/Ogg11`.
