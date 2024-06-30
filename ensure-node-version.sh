echo "========================================================"
echo "Making sure correct versions of node and nvm are used..."
echo "--------------------------------------------------------"
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install && nvm use && npm i -g npm@latest
echo "========================================================"
echo ""
echo "========================================================"
echo "Applied versions of node and npm:"
echo "--------------------------------------------------------"
node -v && npm -v
echo "========================================================"
echo ""