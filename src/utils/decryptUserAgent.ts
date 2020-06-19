import Bowser from 'bowser';

// TODO: Seperate log-file with list of all user-agents (for analytics?!)
export const decryptUserAgent = (ua: string): string => {
    const bowser = Bowser.getParser(ua);
    const platform = bowser.getPlatform();
    const browser = bowser.getBrowser();
    const os = bowser.getOS();

    const platformInfo = platform.type || 'unknown platform';
    const osInfo = `${os.name || 'unknown OS'} (${os.version || 'unknown version'})`;
    const browserInfo = `${browser.name || 'unknown browser'} (${browser.version || 'unknown version'})`;
    return `${platformInfo} | ${osInfo} | ${browserInfo}`;
};
