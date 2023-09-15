echo "=========================================="
echo ""
echo "Looks like prebuild is not ready yet. Maybe there is a problem with GitPod prebuilds. In that case just wait it to be finished."
echo ""
echo "=========================================="
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