// Utility functions for entity-specific terminology

export type EntityType =
  | 'hotel'
  | 'restaurant'
  | 'resort'
  | 'hospital'
  | 'clinic'
  | 'retail'
  | 'office'
  | 'warehouse'
  | 'apiConsumer'
  | 'school'
  | 'RWA'
  | 'other';

export interface TerminologyConfig {
  singular: string;
  plural: string;
  addNew: string;
  list: string;
  guest: string; // For menu labels - "Guest", "Customer", "Patient", etc.
}

export const getEntityTerminology = (entityType: EntityType | null | undefined): TerminologyConfig => {
  switch (entityType) {
    case 'hotel':
    case 'resort':
      return {
        singular: 'Guest',
        plural: 'Guests',
        addNew: 'Add new guest',
        list: 'Guests',
        guest: 'Guest',
      };
    case 'restaurant':
      return {
        singular: 'Customer',
        plural: 'Customers',
        addNew: 'Add new customer',
        list: 'Customers',
        guest: 'Customer',
      };
    case 'hospital':
    case 'clinic':
      return {
        singular: 'Patient',
        plural: 'Patients',
        addNew: 'Add new patient',
        list: 'Patients',
        guest: 'Patient',
      };
    case 'retail':
    case 'office':
    case 'warehouse':
    case 'other':
    default:
      return {
        singular: 'User',
        plural: 'Users',
        addNew: 'Add new user',
        list: 'Users',
        guest: 'User',
      };
  }
};

// Hook to get current entity type from auth context or API
export const useEntityType = (): EntityType | null => {
  // For now, we'll return null and implement this based on user context
  // This should be connected to the authenticated user's entity information
  return null;
};

// Helper function to get entity type from user data
export const getEntityTypeFromUser = (user: any): EntityType | null => {
  // This should extract entity type from user data structure
  // Update this based on your actual user data structure
  return user?.entity?.type || user?.entityType || null;
};