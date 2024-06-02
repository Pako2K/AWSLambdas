call ./uninstall-modules.bat
call ./install-nodemailer-module.bat
call ./install-logger-module.bat
mkdir nodejs
cd nodejs
mkdir node_modules
xcopy /E ..\..\node_modules node_modules
cd .. 
tar -acf ../target/layer-api.zip nodejs
rmdir /S /Q nodejs
