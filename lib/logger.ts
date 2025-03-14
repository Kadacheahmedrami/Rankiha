/**
 * A basic logger wrapper.
 * 
 * In this example, we simply wrap console methods. In a production environment,
 * you might want to integrate with a logging library or service.
 */
export const logger = {
    info: (...args: any[]) => console.info("[INFO]", ...args),
    warn: (...args: any[]) => console.warn("[WARN]", ...args),
    error: (...args: any[]) => console.error("[ERROR]", ...args),
  };
  