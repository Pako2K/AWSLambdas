call uninstall.bat
call install-modules.bat
mkdir nodejs
cd nodejs
mkdir node_modules
xcopy /E ..\..\node_modules node_modules
cd .. 
tar -acf ../target/layer-common-functions.zip nodejs
rmdir /S /Q nodejs