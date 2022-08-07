#!/usr/bin/env bash

# ==================================================================================================
# This script runs all of the process scripts, converting the tracks from their "raw" format into
# `.ogg`.
# ==================================================================================================

./source/1-original/process.sh
./source/2-new/process.sh
./source/3-remastered/process.sh
