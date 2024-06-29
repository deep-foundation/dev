touch prebuild-is-started.txt
rm prebuild-is-ready.txt
echo "Making sure correct versions of node and nvm are used..."
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install && nvm use && npm i -g npm@latest
echo "Applied versions of node and npm:"
node -v && npm -v
echo ""
npm run gitpod-init
docker pull deepf/deeplinks:main
docker run -v $(pwd)/packages/deeplinks:/deeplinks --rm --name links --entrypoint "sh" deepf/deeplinks:main -c "cp -r /snapshots/* /deeplinks/snapshots/ && chown -R 33333:33333 /deeplinks/snapshots/";
(cd packages/deeplinks && npm run snapshot:last);
npm install -g concurrently;
npm run gitpod-engine;
npm cache clean --force;
(cd packages/deepcase-app && rm -rf app);
(cd packages/deepcase/ && npm run package:build);
touch prebuild-is-ready.txt;
