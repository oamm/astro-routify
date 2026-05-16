import { routeKey } from './internal/routeKey';
const REGISTRY_KEY = Symbol.for('astro-routify.registry');
const DEFAULT_MAX_ITEMS = 1000;
const ENV_REGISTRY_MAX_ITEMS = Number((typeof process !== 'undefined' && process.env?.ASTRO_ROUTIFY_REGISTRY_MAX_ITEMS) || '');
const REGISTRY_MAX_ITEMS =
    Number.isFinite(ENV_REGISTRY_MAX_ITEMS) && ENV_REGISTRY_MAX_ITEMS > 0
        ? Math.floor(ENV_REGISTRY_MAX_ITEMS)
        : DEFAULT_MAX_ITEMS;

/**
 * A global registry for routes and groups to support "agnostic" auto-registration.
 * This allows routes to be defined anywhere in the project and automatically 
 * picked up by the router.
 */
export class InternalRegistry {
    private items: any[] = [];
    private readonly maxItems = REGISTRY_MAX_ITEMS;

    constructor() {
        const globalObj = globalThis as any;

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
        if (this.items.length > this.maxItems) {
            this.compact();
        }
    }

    getItems(): any[] {
        return [...this.items];
    }

    clear() {
        this.items = [];
    }

    private compact() {
        const flattened: any[] = [];

        for (const item of this.items) {
            if (item && typeof item === 'object' && item._routifyType === 'group' && typeof item.getRoutes === 'function') {
                const groupRoutes = item.getRoutes();
                if (Array.isArray(groupRoutes)) {
                    flattened.push(...groupRoutes);
                }
            } else {
                flattened.push(item);
            }
        }

        const lastIndexByRouteKey = new Map<string, number>();
        flattened.forEach((item, index) => {
            if (
                item &&
                typeof item === 'object' &&
                item._routifyType === 'route' &&
                typeof item.method === 'string' &&
                typeof item.path === 'string'
            ) {
                lastIndexByRouteKey.set(routeKey(item), index);
            }
        });

        const compacted: any[] = [];
        flattened.forEach((item, index) => {
            if (
                item &&
                typeof item === 'object' &&
                item._routifyType === 'route' &&
                typeof item.method === 'string' &&
                typeof item.path === 'string'
            ) {
                const key = routeKey(item);
                if (lastIndexByRouteKey.get(key) === index) {
                    compacted.push(item);
                }
                return;
            }

            compacted.push(item);
        });

        this.items = compacted.slice(-this.maxItems);
    }
}

export const globalRegistry = InternalRegistry.getInstance();
