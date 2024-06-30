./ensure-node-version.sh

sleep 2

if [ ! -f prebuild-is-started.txt ]
then

echo "Prebuild force start..."

./prebuild.sh

echo "Prebuild is ready."
exit

fi

if [ ! -f prebuild-is-ready.txt ]
then

echo "==================================================================================================="
echo ""
echo "Looks like prebuild is not ready yet or GitPod was unable to pull prebuild from the cloud."
echo "In this case, be patient and wait until the prebuild is completed in another terminal just for you."
echo ""
echo "If you don't want to wait so long each time on GitPod's instance startup,"
echo "please setup your own prebuild for dev repository,"
echo "https://youtu.be/AfqNn9QQP3s video guide may help."
echo ""
echo "==================================================================================================="
echo ""

echo "Waiting for prebuild"

until [ -f prebuild-is-ready.txt ]
do
     sleep 10
     printf "▇"
done

echo ""
echo "Prebuild is ready."
exit

fi