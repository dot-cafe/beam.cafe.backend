import {config} from '../../config';
import {uid}    from '../uid';

export abstract class CollectionItem {
    public readonly id: string;

    protected constructor() {
        this.id = uid(config.server.internalIdSize);
    }
}
