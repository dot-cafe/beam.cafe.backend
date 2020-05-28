import {config}         from '../../config';
import {uid}            from '../uid';
import {CollectionItem} from './CollectionItem';

export class Collection<T extends CollectionItem> extends Set<T> {
    public readonly id: string;

    constructor() {
        super();
        this.id = uid(config.server.internalIdSize);
    }

    protected filter(predicate: (item: T) => boolean): Array<T> {
        const subSet: Array<T> = [];

        for (const item of this) {
            if (predicate(item)) {
                subSet.push(item);
            }
        }

        return subSet;
    }

    protected findItemById(id: string): T | null {
        for (const item of this) {
            if (item.id === id) {
                return item;
            }
        }

        return null;
    }
}
