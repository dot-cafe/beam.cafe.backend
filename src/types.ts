/**
 * A hosted file with name, size
 * and the download-key.
 */
export type HostedFile = {
    serializedName: string;
    name: string;
    size: number;
    id: string;
};
