const electron = require('electron');
console.log('Electron keys:', Object.keys(electron));
try {
    console.log('App is:', electron.app);
} catch (e) {
    console.error('Error accessing app:', e);
}
