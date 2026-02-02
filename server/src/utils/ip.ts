
import { networkInterfaces } from 'os';

export const getLocalIpAddress = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            // Valid IPv4, not internal (127.0.0.1)
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};
