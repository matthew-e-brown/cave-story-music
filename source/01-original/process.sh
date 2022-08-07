#!/usr/bin/env bash

SRC_DIR="org-source"    # Original `.org` files from the game go in here
OUT_DIR="ogg-ready"     # "Ready" to be processed `.ogg` files will be put here

# https://stackoverflow.com/a/246128/10549827
CWD=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# -----------------------------------

# Re-create the output directory and any temp files in case we are redoing a fuck-up
rm -rf "$CWD/ogg-ready" "$CWD/"*.pcm
mkdir -p "$CWD/ogg-ready"

# Grab every `.org` file in `./org`
for org_file in "$CWD"/"$SRC_DIR"/*.org; do

    org="$(basename "$org_file")"
    pcm="${org/.org/.pcm}"  # same filename with `.pcm` instead; for intermediate file
    ogg="${org/.org/.ogg}"  # same filename with `.ogg` instead; for destination file

    # Check the bytes of the `.org` file for the duration of the looping section (delegate to Node
    # cuz screw doing that in Bash lol)
    d="$(node "$CWD/get-length.js" "$org_file" 2 8)"
    fade_s="$(echo "$d" | cut -d ' ' -f1)"
    fade_e="$(echo "$d" | cut -d ' ' -f2)"

    tput setaf 6
    echo "Organism: $org -> $pcm"
    tput sgr0

    # We tell Organism to give us a whole extra loop so that we have an extra chunk of song to fade
    # out through
    cargo run -qr --manifest-path "$CWD/../../tools/organism/Cargo.toml" -- "$org_file" 2 > "$CWD/$pcm"

    tput setaf 6
    echo "$pcm -> $ogg"
    echo "$ogg will be $fade_e seconds long and start an 8 second fade at the $fade_s second mark"
    tput sgr0

    ffmpeg -hide_banner \
        -f s16le \
        -channel_layout stereo \
        -ar 44100 \
        -ac 2 \
        -i "$CWD/$pcm" \
        -s 0:00 \
        -t "$fade_e" \
        -af "afade=t=out:st=$fade_s:d=8" \
        "$CWD/$OUT_DIR/$ogg"

    rm -rf "$CWD/$pcm"

done
