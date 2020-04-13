export const uid = (): string => {
    const time = Date.now().toString(36).slice(2);
    const salt = Math.floor(Math.random() * 1000).toString(36);
    return time + salt;
};
