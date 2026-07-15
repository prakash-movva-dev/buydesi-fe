// Shared entity-type constants for hotels-fe.
//
// Mirrors the canonical values from the backend's entity-service. Keep the
// literal here in one place so business checks (e.g. sidebar gating) don't
// litter `'apiConsumer'` magic strings.

export const ENTITY_TYPE_API_CONSUMER = 'apiConsumer' as const;
