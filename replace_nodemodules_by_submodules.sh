#!/bin/bash

submodule_paths=$(find ./packages -maxdepth 1 -mindepth 1 -type d)

for submodule_path in ${submodule_paths[*]}; do
  for dependant_submodule_path in ${submodule_paths[*]}; do
    dependant_node_module_dependency_path="${dependant_submodule_path}/node_modules/@deep-foundation/$(basename ${submodule_path})"
    if [ -d $dependant_node_module_dependency_path ] 
    then
      printf "Copying ${submodule_path} to ${dependant_node_module_dependency_path} without ${submodule_path}/node_modules \n";
      rsync --archive --exclude='${submodule_path}/node_modules' ${submodule_path} ${dependant_node_module_dependency_path}
    fi
  done
done
