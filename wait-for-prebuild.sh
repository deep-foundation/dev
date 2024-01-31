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