#!/bin/bash

initial_directory=${PWD}
submodule_paths=$(find ./packages -maxdepth 1 -mindepth 1 -type d)

for submodule_path in ${submodule_paths[*]}; do
  cd ${submodule_path}
  if grep -q '"package:unbuild":' ./package.json; then
    printf "Unbuilding ${submodule_path}\n"
    npm run package:unbuild
  fi
  cd ${initial_directory}
done
