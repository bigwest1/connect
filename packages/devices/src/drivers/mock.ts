export interface MockDriver {
  name: "mock";
  connect(): Promise<void>;
}

export function createMockDriver(): MockDriver {
  return {
    name: "mock",
    async connect() {
      // no-op; placeholder for demo
    }
  };
}

// Stubs for vendor adapters scaffolding
export interface MatterAdapter { name: "matter" }
export interface HomeKitAdapter { name: "homekit" }
export interface GoogleHomeAdapter { name: "googlehome" }

