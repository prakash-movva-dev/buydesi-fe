/**
 * Verification Helper Utilities for Frontend
 * Common utility functions for verification operations
 */

/**
 * Returns true if any identity-type service is selected.
 *
 * When false (e.g. user picked only Criminal or Address), the flow must
 * skip mode / document-type / OCR / OTP / QR steps entirely — there's no
 * document to verify; criminal+address run off the user-supplied
 * verifeeInput (name + DOB + address). Facial implicitly requires an
 * identity reference photo so we treat it as identity-needed too.
 */
export const isIdentityVerificationSelected = (
  selectedServiceIds: string[],
  userEntityServices: any[]
): boolean => {
  if (!selectedServiceIds || selectedServiceIds.length === 0) return false;
  if (!userEntityServices || userEntityServices.length === 0) return false;
  return userEntityServices.some((item: any) => {
    const service = item.service || item;
    const serviceId = service._id || service.id;
    const taskType = service.taskType || '';
    if (!selectedServiceIds.includes(serviceId)) return false;
    return taskType === 'identity' || taskType === 'facial';
  });
};

/**
 * Check if facial verification is included in selected services
 * @param selectedServiceIds - Array of selected service IDs
 * @param userEntityServices - User's entity services array
 * @returns true if facial verification service is selected
 */
export const isFacialVerificationSelected = (
  selectedServiceIds: string[],
  userEntityServices: any[]
): boolean => {
  if (!selectedServiceIds || selectedServiceIds.length === 0) {
    return false;
  }

  if (!userEntityServices || userEntityServices.length === 0) {
    return false;
  }

  // Check if any selected service is a facial verification service
  return userEntityServices.some((item: any) => {
    const service = item.service || item;
    const serviceId = service._id || service.id;
    const serviceName = service.name || '';
    const taskType = service.taskType || '';

    // Check if this service is selected AND is a facial verification service
    if (selectedServiceIds.includes(serviceId)) {
      // Check by taskType first (most reliable)
      if (taskType === 'facial') {
        return true;
      }
      // Fallback to name-based check
      const lowerName = serviceName.toLowerCase();
      return (
        lowerName.includes('facial verification') ||
        lowerName.includes('face match') ||
        lowerName.includes('facial') ||
        lowerName.includes('biometric')
      );
    }
    return false;
  });
};

/**
 * Get service names from selected service IDs
 * @param selectedServiceIds - Array of selected service IDs
 * @param userEntityServices - User's entity services array
 * @returns Array of service names
 */
export const getSelectedServiceNames = (
  selectedServiceIds: string[],
  userEntityServices: any[]
): string[] => {
  if (!selectedServiceIds || selectedServiceIds.length === 0) {
    return [];
  }

  if (!userEntityServices || userEntityServices.length === 0) {
    return [];
  }

  return userEntityServices
    .filter((item: any) => {
      const service = item.service || item;
      const serviceId = service._id || service.id;
      return selectedServiceIds.includes(serviceId);
    })
    .map((item: any) => {
      const service = item.service || item;
      return service.name || '';
    });
};

/**
 * Check if Aadhaar OTP verification is enabled for the entity
 * This checks the identity verification subscription configuration
 * @param userEntityServices - User's entity services array (includes subscription info)
 * @returns true only if configuration.isAadhaarOTPEnabled is explicitly true
 */
export const isAadhaarOTPEnabled = (userEntityServices: any[]): boolean => {
  if (!userEntityServices || userEntityServices.length === 0) {
    return false; // Default to disabled if no services
  }

  // Find identity verification subscription
  const identityService = userEntityServices.find((item: any) => {
    const service = item.service || item;
    const taskType = service.taskType || '';
    const serviceName = (service.name || '').toLowerCase();

    // Check if this is an identity verification service
    return (
      taskType === 'identity' ||
      serviceName.includes('identity') ||
      serviceName.includes('aadhaar') ||
      serviceName.includes('pan') ||
      serviceName.includes('driving')
    );
  });

  if (!identityService) {
    return false; // Default to disabled if no identity service found
  }

  // Check configuration.isAadhaarOTPEnabled - only return true if explicitly set to true
  const configuration = identityService.configuration || {};
  return configuration.isAadhaarOTPEnabled === true;
};
