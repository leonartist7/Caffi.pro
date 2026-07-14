export class PaymentProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentProviderConfigurationError'
  }
}

/** A validly signed provider event that this release intentionally ignores. */
export class PaymentProviderIgnoredEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentProviderIgnoredEventError'
  }
}

/** A signed event that cannot safely be linked to one of our orders. */
export class PaymentProviderInvalidEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentProviderInvalidEventError'
  }
}
