/* eslint-disable @typescript-eslint/no-explicit-any */
export class AppAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string = "AUTH_ERROR",
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NetworkError extends AppAuthError {
  constructor(message = "Network error. Please check your internet connection.") {
    super(message, "NETWORK_ERROR");
  }
}

export class ConfigurationError extends AppAuthError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
  }
}
