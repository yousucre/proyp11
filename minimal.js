const electron = require('electron');
console.log('Process versions:', process.versions);
console.log('In Electron?', !!process.versions.electron);
console.log('Electron require type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
try {
    if (electron.app) {
        console.log('App is present');
        electron.app.quit();
    } else {
        console.log('App is MISSING');
    }
} catch (e) { console.log(e); }
