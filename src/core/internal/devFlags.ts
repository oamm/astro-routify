export function shouldLogRegistration(): boolean {
    return (typeof process !== 'undefined' && process.env?.ASTRO_ROUTIFY_DEBUG_REGISTRATION === '1');
}

