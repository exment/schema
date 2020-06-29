import { ChangeTree } from "../changes/ChangeTree";
import { OPERATION } from "../spec";

type K = number; // TODO: allow to specify K generic on MapSchema.

export class CollectionSchema<V=any> {
    protected $changes: ChangeTree = new ChangeTree(this);

    protected $items: Map<number, V> = new Map<number, V>();
    protected $indexes: Map<number, number> = new Map<number, number>();

    protected $refId: number = 0;

    //
    // Decoding callbacks
    //
    public onAdd?: (item: V, key: number) => void;
    public onRemove?: (item: V, key: number) => void;
    public onChange?: (item: V, key: number) => void;

    static is(type: any) {
        return type['collection'] !== undefined;
    }

    constructor (initialValues?: Array<V>) {
        if (initialValues) {
            initialValues.forEach((v) => this.add(v));
        }
    }

    add(value: V) {
        // set "index" for reference.
        const index = this.$refId++;

        const isRef = (value['$changes']) !== undefined;
        if (isRef) {
            (value['$changes'] as ChangeTree).setParent(this, this.$changes.root, index);
        }

        this.$changes.indexes[index] = index;

        this.$indexes.set(index, index);

        this.$items.set(index, value);

        this.$changes.change(index);

        return index;
    }

    at(key: number) {
        return this.$items.get(key);
    }

    remove(item: V) {
        //
        // TODO: should we delete from $indexes as well?
        //
        // const index = this.$changes.indexes[key];
        // this.$indexes.delete(index);

        const entries = this.$items.entries();

        let index: K;
        let entry: IteratorResult<[number, V]>;
        while (entry = entries.next()) {
            if (entry.done) { break; }

            if (item === entry.value[1]) {
                index = entry.value[0];
                break;
            }
        }

        if (index === undefined) {
            return false;
        }

        this.$changes.delete(index);
        this.$indexes.delete(index);

        return this.$items.delete(index);
    }

    clear() {
        this.$items.clear();
    }

    has (value: V): boolean {
        return Array.from(this.$items.values()).some((v) => v === value);
    }

    forEach(callbackfn: (value: V, key: K, collection: CollectionSchema<V>) => void) {
        this.$items.forEach((value, key, _) => callbackfn(value, key, this));
    }

    values() {
        return this.$items.values();
    }

    get size () {
        return this.$items.size;
    }

    protected setIndex(index: number, key: number) {
        console.log("SET INDEX!", { index, key });
        this.$indexes.set(index, key);
    }

    protected getByIndex(index: number) {
        return this.$items.get(this.$indexes.get(index));
    }

    protected deleteByIndex(index: number) {
        const key = this.$indexes.get(index);
        this.$items.delete(key);
        this.$indexes.delete(index);
    }

    protected clearAllIndexes() {
        // discard previous operations.
        this.$changes.discard();

        // clear previous indexes
        this.$indexes.clear();

        // clear items
        this.$items.clear();

        this.$changes.operation({ index: 0, op: OPERATION.CLEAR });

        // touch all structures until reach root
        this.$changes.touchParents();
    }

    toJSON() {
        const map: any = {};

        this.forEach((value, key) => {
            map[key] = (typeof (value['toJSON']) === "function")
                ? value['toJSON']()
                : value;
        });

        return map;
    }

    //
    // Decoding utilities
    //
    clone(isDecoding?: boolean): CollectionSchema<V> {
        let cloned: CollectionSchema;

        if (isDecoding) {
            // client-side
            cloned = Object.assign(new CollectionSchema(), this);
            cloned.onAdd = this.onAdd;
            cloned.onRemove = this.onRemove;
            cloned.onChange = this.onChange;

        } else {
            // server-side
            const cloned = new CollectionSchema();
            this.forEach((value) => {
                if (value['$changes']) {
                    cloned.add(value['clone']());
                } else {
                    cloned.add(value);
                }
            })
        }

        return cloned;
    }

    triggerAll (): void {
        if (!this.onAdd) { return; }
        this.forEach((value, key) => this.onAdd(value, key));
    }
}
