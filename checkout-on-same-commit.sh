#!/bin/bash
test "$(git log -n 1 --pretty=format:"%H")" == "$(git log -n 1 $1 --pretty=format:"%H")" && git checkout $1