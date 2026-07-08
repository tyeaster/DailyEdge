export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertValidEnvironment } = await import("./src/config/env");

    assertValidEnvironment();
  }
}
