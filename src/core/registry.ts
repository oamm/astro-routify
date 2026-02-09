
const REGISTRY_KEY = Symbol.for('astro-routify.registry');

/**
 * A global registry for routes and groups to support "agnostic" auto-registration.
 * This allows routes to be defined anywhere in the project and automatically 
 * picked up by the router.
 */
export class InternalRegistry {
    private items: any[] = [];

    constructor() {
        const globalObj = (typeof globalThis !== 'undefined' 
            ? globalThis 
            : typeof window !== 'undefined' 
                ? window 
                : typeof global !== 'undefined' 
                    ? global 
                    : {}) as any;

        if (globalObj[REGISTRY_KEY]) {
            return globalObj[REGISTRY_KEY];
        }
        globalObj[REGISTRY_KEY] = this;
    }

    static getInstance(): InternalRegistry {
        return new InternalRegistry();
    }

    register(item: any) {
        this.items.push(item);
    }

    getItems(): any[] {
        return [...this.items];
    }

    clear() {
        this.items = [];
    }
}

export const globalRegistry = InternalRegistry.getInstance();
