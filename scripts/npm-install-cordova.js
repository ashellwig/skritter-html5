#!/usr/bin/env node

const shell = require('shelljs');

shell.rm('-rf', './cordova');
shell.exec('cordova create cordova com.inkren.skritter "Skritter"');
shell.cd('./cordova');

// platforms
shell.exec('cordova platform add android@6.2.3');
shell.exec('cordova platform add ios@4.5.0');

// plugins
shell.exec('cordova plugin add cordova-plugin-crosswalk-webview@2.3.0');
shell.exec('cordova plugin add cordova-plugin-device@1.1.6');
shell.exec('cordova plugin add cordova-plugin-file-transfer@1.6.3');
shell.exec('cordova plugin add cordova-plugin-splashscreen@4.0.3');
shell.exec('cordova plugin add cordova-plugin-statusbar@2.2.3');
shell.exec('cordova plugin add https://github.com/phonegap/phonegap-mobile-accessibility.git');
shell.exec('cordova plugin add https://github.com/mcfarljw/cordova-plugin-audio.git');
shell.exec('cordova plugin add https://github.com/mcfarljw/cordova-plugin-billing.git');
shell.exec('cordova plugin add ../plugins/core');
