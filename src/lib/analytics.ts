/** No analytics in Open Analysis; kept so shared Priors components compile unchanged. */
export function track(...args: [event: string, props?: Record<string, unknown>]) { void args; }
