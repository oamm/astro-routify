import { HttpMethod } from './HttpMethod';
import type { Handler } from './defineHandler';

interface TrieNode {
	children: Map<string, TrieNode>;
	paramChild?: TrieNode;
	paramName?: string;
	handlers: Map<HttpMethod, Handler>;
}

interface RouteMatch {
	handler: Handler | null;
	allowed?: HttpMethod[];
	params: Record<string, string | undefined>;
}

export class RouteTrie {
	private readonly root: TrieNode = { children: new Map(), handlers: new Map() };

	insert(path: string, method: HttpMethod, handler: Handler): void {
		const segments = this.segmentize(path);
		let node = this.root;

		for (const segment of segments) {
			if (segment.startsWith(':')) {
				if (!node.paramChild) {
					node.paramChild = {
						children: new Map(),
						handlers: new Map(),
						paramName: segment.slice(1),
					};
				}
				node = node.paramChild;
			} else {
				if (!node.children.has(segment)) {
					node.children.set(segment, { children: new Map(), handlers: new Map() });
				}
				node = node.children.get(segment)!;
			}
		}

		node.handlers.set(method, handler);
	}

	find(path: string, method: HttpMethod): RouteMatch {
		const segments = this.segmentize(path);
		let node: TrieNode | undefined = this.root;
		const params: Record<string, string | undefined> = Object.create(null);

		for (const segment of segments) {
			if (node?.children.has(segment)) {
				node = node.children.get(segment);
			} else if (node?.paramChild) {
				params[node.paramChild.paramName!] = segment;
				node = node.paramChild;
			} else {
				return { handler: null, params };
			}
		}

		if (!node) return { handler: null, params };

		const handler = node.handlers.get(method) ?? null;
		return {
			handler,
			allowed: handler ? undefined : [...node.handlers.keys()],
			params,
		};
	}

	private segmentize(path: string): string[] {
		return path.split('/').filter(Boolean);
	}
}
