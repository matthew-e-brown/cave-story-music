# Cave Story Soundtrack Collection

Creating a properly formatted album with correct metadata and tags to be
imported into iTunes or any other music software. Done with scripts and stuff
instead of manually so that the process is documented.

Also cuz I was bored.


## Prerequisites

- Node installed;
- `ffmpeg` and `ffprobe` installed and on PATH (used for actual conversion and
  re-encoding); and
- Rust & Cargo installed and on PATH (used for converting raw `.org` sound data
  into PCM format with [Organism][organism]).


## Usage

1.  Clone this repository with submodules.
    ```
    git clone --recurse-submodules git@github.com:matthew-e-brown/cave-story-music.git
    ```
3.  Find all of the source audio files, and put them into their respective
    directories. There are
    [instructions below](#where-to-get-the-audio-files-from) as to how to find
    all of the files.
4.  Run the script.
    ```
    node convert.js
    ```
6.  Retrieve the `.flac` files from `./flac-output` and convert them to whatever
    format you want. <sup>[[1]][to-mp3] [[2]][to-aiff]</sup>

The script and metadata should all have sensible defaults, but you can of course
edit them to your liking. If you want a media player like iTunes to import the
album properly, make sure you keep the following items the same:

- `__common__.album_artist` should be the same across all 3 metadata files;
- `__common__.compilation` should always be `1`.

Of course, if you don't want them to create a compilation album, you can change
that too.

To change cover art, you'll have to edit `convert.js` directly, but it should be
fairly obvious how to do that. You can pass `null` to `convertOgg` and
`convertOrg` and they will skip adding cover art.


## Contributing

If you find any bugs or any issues with metadata, feel free to open an issue.
I'll gladly review it. I only tested these scripts on Windows 10. I did my best
to get all the metadata correct by perusing multiple wikis and artist websites,
but I am of course not perfect.


## Where to get the audio files from

### Original/"Organya"

Download the original `.org` tracks from the Cave Story fan website. Delete
`xxxx.org` and all of the "internal percussion" tracks. Follow the internal
track-name list to manually rename the files to the right thing.

- https://www.cavestory.org/download/music.php
- https://www.cavestory.org/game-info/internal-track-names.php

Even though we're going to rename them to use the internal names, we use the
tribute site's versions because they have done some work on the `.org` files to
make the percussion sound correct.

`convert.js` uses [Organism][organism] to convert `.org` files into raw PCM data
for FFmpeg to handle.


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


[organism]: https://gitdab.com/LunarLambda/organism
[to-mp3]:   https://stackoverflow.com/a/26109838/10549827
[to-aiff]:  https://superuser.com/a/1493395/974973
