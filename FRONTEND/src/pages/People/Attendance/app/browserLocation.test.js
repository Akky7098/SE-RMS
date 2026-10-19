import { getBrowserLocation } from "./attendanceAppData";

beforeEach(() => {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: jest.fn() } });
});

test("retries a failed GPS fix using fresh standard-accuracy browser location", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  navigator.geolocation.getCurrentPosition
    .mockImplementationOnce((success, error) => error({ code: 2 }))
    .mockImplementationOnce(success => success({ coords: { latitude: 28.4, longitude: 77.3, accuracy: 800 } }));
  await expect(getBrowserLocation()).resolves.toEqual({ latitude: 28.4, longitude: 77.3, accuracyMeters: 800 });
  expect(navigator.geolocation.getCurrentPosition.mock.calls[1][2]).toEqual({ enableHighAccuracy: false, maximumAge: 0, timeout: 15000 });
  spy.mockRestore();
});

test("does not retry a denied location permission", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => error({ code: 1 }));
  await expect(getBrowserLocation()).rejects.toThrow("blocked");
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
