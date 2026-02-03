import { HttpMethod } from './HttpMethod';
import type { Route } from './defineRoute';

interface RegexChild {
	regex: RegExp;
	node: TrieNode;
	paramName: string;
}

interface RouteInfo {
    route: Route;
    paramNames: Record<number, string>;
}

interface TrieNode {
	children: Map<string, TrieNode>;
	regexChildren?: RegexChild[];
	paramChild?: TrieNode;
	wildcardChild?: TrieNode;
	catchAllChild?: TrieNode;
	routes: Map<HttpMethod, RouteInfo>;
}

interface RouteMatch {
	route: Route | null;
	allowed?: HttpMethod[];
	params: Record<string, string | undefined>;
}

export class RouteTrie {
	private readonly root: TrieNode = { children: new Map(), routes: new Map() };

	insert(route: Route): void {
		if (!route || typeof route.path !== 'string') {
			return;
		}
		const segments = this.segmentize(route.path);
		let node = this.root;
        const paramNames: Record<number, string> = {};

		for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
			if (segment === '**') {
				if (!node.catchAllChild) {
					node.catchAllChild = { children: new Map(), routes: new Map() };
				}
				node = node.catchAllChild;
				break;
			} else if (segment === '*') {
				if (!node.wildcardChild) {
					node.wildcardChild = { children: new Map(), routes: new Map() };
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
						regexNode = { children: new Map(), routes: new Map() };
						node.regexChildren.push({
							regex: new RegExp(regexStr),
							paramName,
							node: regexNode,
						});
                        // Sort regex by specificity (longer source first)
                        node.regexChildren.sort((a, b) => b.regex.source.length - a.regex.source.length);
					}
					node = regexNode;
				} else {
					const paramName = segment.slice(1);
                    paramNames[i] = paramName;
                    if (!node.paramChild) {
                        node.paramChild = { children: new Map(), routes: new Map() };
                    }
					node = node.paramChild;
				}
			} else {
				if (!node.children.has(segment)) {
					node.children.set(segment, { children: new Map(), routes: new Map() });
				}
				node = node.children.get(segment)!;
			}
		}

		node.routes.set(route.method, { route, paramNames });
	}

	find(path: string, method: HttpMethod): RouteMatch {
		const segments = this.segmentize(path);
		return this.matchNode(this.root, segments, 0, method, {});
	}

	private matchNode(
		node: TrieNode,
		segments: string[],
		index: number,
		method: HttpMethod,
        capturedValues: Record<number, string>
	): RouteMatch {
		if (index === segments.length) {
			let info = node.routes.get(method) ?? null;
			let allowed = info ? undefined : [...node.routes.keys()];

			// If no route here, check if there's a catch-all that matches "empty" remaining
			if (!info && node.catchAllChild) {
				info = node.catchAllChild.routes.get(method) ?? null;
				allowed = info ? undefined : [...node.catchAllChild.routes.keys()];
                if (info) {
                    return { route: info.route, allowed, params: { '*': '' } };
                }
			}

            if (info) {
                const params: Record<string, string> = {};
                for (const [depth, name] of Object.entries(info.paramNames)) {
                    params[name] = decodeURIComponent(capturedValues[Number(depth)]);
                }
                return { route: info.route, params };
            }

			return { route: null, allowed, params: {} };
		}

		const segment = segments[index];

		// 1. Static Match
		const staticChild = node.children.get(segment);
		if (staticChild) {
			const match = this.matchNode(staticChild, segments, index + 1, method, capturedValues);
			if (match.route || (match.allowed && match.allowed.length > 0)) return match;
		}

		// 2. Regex Match
		if (node.regexChildren) {
			for (const rc of node.regexChildren) {
				if (rc.regex.test(segment)) {
					const match = this.matchNode(rc.node, segments, index + 1, method, capturedValues);
					if (match.route || (match.allowed && match.allowed.length > 0)) {
						match.params[rc.paramName] = decodeURIComponent(segment);
						return match;
					}
				}
			}
		}

		// 3. Param Match
		if (node.paramChild) {
            capturedValues[index] = segment;
            const match = this.matchNode(node.paramChild, segments, index + 1, method, capturedValues);
            if (match.route || (match.allowed && match.allowed.length > 0)) {
                return match;
            }
            delete capturedValues[index];
		}

		// 4. Wildcard Match (*)
		if (node.wildcardChild) {
			const match = this.matchNode(node.wildcardChild, segments, index + 1, method, capturedValues);
			if (match.route || (match.allowed && match.allowed.length > 0)) return match;
		}

		// 5. Catch-all Match (**)
		if (node.catchAllChild) {
			const info = node.catchAllChild.routes.get(method) ?? null;
            const params: Record<string, string | undefined> = {};
            // Capture the rest of the path
            const remainder = segments.slice(index).join('/');
            params['*'] = decodeURIComponent(remainder);
            
			return {
				route: info ? info.route : null,
				allowed: info ? undefined : [...node.catchAllChild.routes.keys()],
				params,
			};
		}

		return { route: null, params: {} };
	}

	private segmentize(path: string): string[] {
		if (typeof path !== 'string') return [];
		return path.split('/').filter(Boolean);
	}
}
