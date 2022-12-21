#!/bin/bash

submodule_paths=$(find ./packages -maxdepth 1 -mindepth 1 -type d)

for submodule_path in ${submodule_paths[*]}; do
  dependants_node_modules_paths=$(find ./ -type d -wholename "*node_modules/@deep-foundation/$(basename ${submodule_path})")
  for dependant_node_modules_path in ${dependants_node_modules_paths[*]}; do
    {
      printf "Copying ${submodule_path} to ${dependant_node_modules_path} excluding node_modules \n" &
      rsync --archive --exclude='./packages/hasura/node_modules' ${submodule_path} ${dependant_node_modules_path} &
    }
  done
done
