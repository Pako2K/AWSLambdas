CALL uninstall-modules.bat
CALL install-pg-module.bat
mkdir nodejs
cd nodejs
mkdir node_modules
xcopy /E ..\..\node_modules node_modules
cd .. 
tar -acf ../target/layer-pg.zip nodejs
rmdir /S /Q nodejs