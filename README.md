# Cave Story Soundtrack Collection

Creating a properly formatted album with correct metadata and tags to be
imported into iTunes or any other music software. Done with scripts and stuff
instead of manually so that the process is documented.

Also cuz I was bored.


## Prerequisites

- FFmpeg installed and on PATH
- Rust & Cargo installed and on PATH
- Node installed and on PATH


## Usage

Run `1-prepare.sh` to convert the raw files into `.ogg` files. Then run
`2-convert.py` to convert those `.ogg` files into the desired final form with
metadata.


## Where to get the audio files from

### Original

Download the original `.org` tracks from the Cave Story fan website. Delete
`xxxx.org` and all of the "internal percussion" tracks. Follow the internal
track-name list to manually rename the files to the right thing.

- https://www.cavestory.org/download/music.php
- https://www.cavestory.org/game-info/internal-track-names.php.

Even though we're going to rename them to use the internal names, we use the
tribute site's versions because they have done some work on the `.org` files to
make the percussion sound correct.

`process.sh` uses [Organism](https://gitdab.com/LunarLambda/organism) to convert
`.org` files into raw PCM data for FFmpeg to handle.


### "New"

At first, I was going to use the audio files from Cave Story+'s files, but then
I found online that the original artist of the "New" soundtrack had some issues
with it; the songs didn't appear as they were supposed to in-game. So, instead,
get the `.ogg` files from SoloMael's Google Drive.

- http://www.nurykabe.com/dump/sound/soundtracks/cave%20story/
- https://soundcloud.com/solomael/sets/cave-story-wii-balanced
- https://drive.google.com/drive/folders/1xSDHsDsMqKYhe2Wgd8Ewy4gMIcQhtPvs


### "Remastered"

Pull these right from Cave Story+'s files. Delete `silence.ogg`, which is the
new name for `xxxx.ogg`, as well as `credits.ogg` (which is a duplicate of
`ending.ogg`).
