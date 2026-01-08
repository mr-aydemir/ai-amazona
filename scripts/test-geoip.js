
const geoip = require('geoip-lite');

const ip = '88.228.68.215';
console.log(`Testing lookup for IP: ${ip}`);

try {
    const geo = geoip.lookup(ip);
    console.log('Result:', geo);
} catch (error) {
    console.error('Error during lookup:', error);
}
