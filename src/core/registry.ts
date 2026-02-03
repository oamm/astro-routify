
/**
 * A global registry for routes and groups to support "agnostic" auto-registration.
 * This allows routes to be defined anywhere in the project and automatically 
 * picked up by the router.
 */
export class InternalRegistry {
    private static instance: InternalRegistry;
    private items: any[] = [];

    private constructor() {}

    static getInstance(): InternalRegistry {
        if (!InternalRegistry.instance) {
            InternalRegistry.instance = new InternalRegistry();
        }
        return InternalRegistry.instance;
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
