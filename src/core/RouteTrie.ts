import { HttpMethod } from './HttpMethod';
import type { Handler } from './defineHandler';

interface RegexChild {
	regex: RegExp;
	node: TrieNode;
	paramName: string;
}

interface TrieNode {
	children: Map<string, TrieNode>;
	regexChildren?: RegexChild[];
	paramChild?: TrieNode;
	paramName?: string;
	wildcardChild?: TrieNode;
	catchAllChild?: TrieNode;
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
			if (segment === '**') {
				if (!node.catchAllChild) {
					node.catchAllChild = { children: new Map(), handlers: new Map() };
				}
				node = node.catchAllChild;
				break;
			} else if (segment === '*') {
				if (!node.wildcardChild) {
					node.wildcardChild = { children: new Map(), handlers: new Map() };
				}
				node = node.wildcardChild;
			} else if (segment.startsWith(':')) {
				const regexMatch = segment.match(/^:([a-zA-Z0-9_]+)\((.*)\)$/);
				if (regexMatch) {
					const paramName = regexMatch[1];
					const regexStr = regexMatch[2];
					if (!node.regexChildren) node.regexChildren = [];

					let regexNode = node.regexChildren.find(
						(rc) => rc.regex.source === regexStr && rc.paramName === paramName
					)?.node;

					if (!regexNode) {
						regexNode = { children: new Map(), handlers: new Map() };
						node.regexChildren.push({
							regex: new RegExp(regexStr),
							paramName,
							node: regexNode,
						});
					}
					node = regexNode;
				} else {
					const paramName = segment.slice(1);
					if (!node.paramChild) {
						node.paramChild = { children: new Map(), handlers: new Map(), paramName };
					}
					node = node.paramChild;
				}
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
		return this.matchNode(this.root, segments, 0, method);
	}

	private matchNode(
		node: TrieNode,
		segments: string[],
		index: number,
		method: HttpMethod
	): RouteMatch {
		if (index === segments.length) {
			let handler = node.handlers.get(method) ?? null;
			let allowed = handler ? undefined : [...node.handlers.keys()];

			// If no handler here, check if there's a catch-all that matches "empty" remaining
			if (!handler && node.catchAllChild) {
				handler = node.catchAllChild.handlers.get(method) ?? null;
				allowed = handler ? undefined : [...node.catchAllChild.handlers.keys()];
			}

			return { handler, allowed, params: {} };
		}

		const segment = segments[index];

		// 1. Static Match
		const staticChild = node.children.get(segment);
		if (staticChild) {
			const match = this.matchNode(staticChild, segments, index + 1, method);
			if (match.handler || (match.allowed && match.allowed.length > 0)) return match;
		}

		// 2. Regex Match
		if (node.regexChildren) {
			for (const rc of node.regexChildren) {
				if (rc.regex.test(segment)) {
					const match = this.matchNode(rc.node, segments, index + 1, method);
					if (match.handler || (match.allowed && match.allowed.length > 0)) {
						match.params[rc.paramName] = segment;
						return match;
					}
				}
			}
		}

		// 3. Param Match
		if (node.paramChild) {
			const match = this.matchNode(node.paramChild, segments, index + 1, method);
			if (match.handler || (match.allowed && match.allowed.length > 0)) {
				match.params[node.paramChild.paramName!] = segment;
				return match;
			}
		}

		// 4. Wildcard Match (*)
		if (node.wildcardChild) {
			const match = this.matchNode(node.wildcardChild, segments, index + 1, method);
			if (match.handler || (match.allowed && match.allowed.length > 0)) return match;
		}

		// 5. Catch-all Match (**)
		if (node.catchAllChild) {
			const handler = node.catchAllChild.handlers.get(method) ?? null;
			return {
				handler,
				allowed: handler ? undefined : [...node.catchAllChild.handlers.keys()],
				params: {},
			};
		}

		return { handler: null, params: {} };
	}

	private segmentize(path: string): string[] {
		return path.split('/').filter(Boolean);
	}
}
