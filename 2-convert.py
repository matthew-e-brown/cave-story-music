#!/usr/bin/env python
# -*- coding: utf-8 -*-

# ==================================================================================================
# This script converts all the `.ogg` files into `.flac`, `.mp3`, `.wav`, `.aiff`, etc., then writes
# the metadata to the new files and renames them.
# ==================================================================================================

import os
import sys
import glob
import json
import shutil
import subprocess

from typing import Dict
from pprint import pprint


cwd = os.path.dirname(os.path.realpath(__file__))


def get_metadata(file_name: str) -> Dict:
    with open(f"{cwd}/metadata/{file_name}", encoding='utf-8') as fd:
        return json.load(fd)


def main() -> None:
    all_metadata = [
        get_metadata("1-original.json"),
        get_metadata("2-new.json"),
        get_metadata("3-remastered.json"),
    ]

    for i, metadata in enumerate(all_metadata):
        # TODO
        pass



if __name__ == '__main__':
    main()
