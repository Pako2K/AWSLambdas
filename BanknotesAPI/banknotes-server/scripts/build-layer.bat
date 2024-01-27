call ./uninstall-modules.bat
call ./install-jsonschema-module.bat
call ./install-yamljs-module.bat
mkdir nodejs
cd nodejs
mkdir node_modules
xcopy /E ..\..\node_modules node_modules
cd .. 
tar -acf ../target/layer-api-server.zip nodejs
rmdir /S /Q nodejs
call ./install-logger-module.bat