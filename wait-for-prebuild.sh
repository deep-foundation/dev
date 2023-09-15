echo "==================================================================================================="
echo ""
echo "Looks like prebuild is not ready yet or GitPod was unable to pull prebuild from the cloud."
echo "In this case, be patient and wait until the prebuild is completed in another terminal just for you."
echo ""
echo "==================================================================================================="
echo ""

printf "Waiting for prebuild"

until [ -f prebuild-is-ready.txt ]
do
     sleep 5
     printf "."
done

echo ""
echo "Prebuild is ready."
exit
