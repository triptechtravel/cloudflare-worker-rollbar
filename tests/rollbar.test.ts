import fetchMocks from "jest-fetch-mock";
fetchMocks.enableMocks();

import Rollbar from "../src/index";

describe("testing rollbar", () => {
  beforeEach(() => {
    // @ts-ignore
    fetch.resetMocks();
  });

  test("rollbar gracefully dies without a token", async () => {
    const rollbar = new Rollbar();
    expect(rollbar.token).toBe(undefined);
    await expect(rollbar.error(new Error())).resolves.toBe(undefined);
    await expect(rollbar.message("")).resolves.toBe(undefined);
  });

  test("rollbar with just a token defaults to production", async () => {
    const rollbar = new Rollbar("token");
    expect(rollbar.token).toBe("token");
    expect(rollbar.environment).toBe("production");

    await rollbar.error(new Error("test"));
    rollbar.message("test");

    // @ts-ignore
    expect(fetch.mock.calls.length).toEqual(2);
  });

  test("rollbar works with token/env setting", async () => {
    const rollbar = new Rollbar("token", "env");
    expect(rollbar.token).toBe("token");
    expect(rollbar.environment).toBe("env");

    await rollbar.error(new Error("test"));
    rollbar.message("test");

    // @ts-ignore
    expect(fetch.mock.calls.length).toEqual(2);
  });
});
