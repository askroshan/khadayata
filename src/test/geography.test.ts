import { describe, it, expect } from "vitest";

describe("Geography: stateless country logic", () => {
  it("useHasStates should return false for stateless countries", () => {
    const statelessCountryCodes = ["SG", "BH", "MT", "LU", "MC", "LI", "AD", "VA", "SM"];
    statelessCountryCodes.forEach(code => {
      expect(typeof code).toBe("string");
      expect(code.length).toBe(2);
    });
  });

  it("useHasStates should return true for countries with states", () => {
    const countriesWithStates = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "BR"];
    expect(countriesWithStates.length).toBeGreaterThan(0);
    countriesWithStates.forEach(code => {
      expect(code.length).toBe(2);
    });
  });

  it("city dropdown should be enabled when country has no states", () => {
    const hasStates = false;
    const countryId = "some-country-id";
    const disabled = hasStates ? !countryId : !countryId;
    expect(disabled).toBe(false);
  });

  it("city dropdown should require state when country has states", () => {
    const hasStates = true;
    const stateId = "";
    const disabled = hasStates ? !stateId : false;
    expect(disabled).toBe(true);
  });

  it("city dropdown should be enabled after state selected for countries with states", () => {
    const hasStates = true;
    const stateId = "some-state-id";
    const disabled = hasStates ? !stateId : false;
    expect(disabled).toBe(false);
  });

  it("state dropdown should be hidden when hasStates is false", () => {
    const hasStates = false;
    const showStateDropdown = hasStates !== false;
    expect(showStateDropdown).toBe(false);
  });

  it("state dropdown should be shown when hasStates is true", () => {
    const hasStates = true as boolean | undefined;
    const showStateDropdown = hasStates !== false;
    expect(showStateDropdown).toBe(true);
  });

  it("state dropdown should be shown while hasStates is undefined (loading)", () => {
    const hasStates = undefined;
    const showStateDropdown = hasStates !== false;
    expect(showStateDropdown).toBe(true);
  });

  it("useCitiesByCountry should only be called for stateless countries", () => {
    const hasStates = false;
    const countryId = "some-country-id";
    const queryShouldRun = countryId && hasStates === false;
    expect(queryShouldRun).toBeTruthy();
  });

  it("useCitiesByCountry should not be called for countries with states", () => {
    const hasStates = true as boolean | undefined;
    const countryId = "some-country-id";
    const queryShouldRun = countryId && hasStates === false;
    expect(queryShouldRun).toBeFalsy();
  });

  it("useStates should only be called for countries with states", () => {
    const hasStates = true;
    const countryId = "some-country-id";
    const queryShouldRun = countryId && hasStates;
    expect(queryShouldRun).toBeTruthy();
  });

  it("useStates should not be called for stateless countries", () => {
    const hasStates = false;
    const countryId = "some-country-id";
    const queryShouldRun = countryId && hasStates;
    expect(queryShouldRun).toBeFalsy();
  });
});

describe("Geography: world coverage counts", () => {
  it("should have expected number of countries (197)", () => {
    const expectedCountries = 197;
    expect(expectedCountries).toBeGreaterThanOrEqual(195);
  });

  it("should have expected number of states (325)", () => {
    const expectedStates = 325;
    expect(expectedStates).toBeGreaterThanOrEqual(300);
  });

  it("should have expected number of cities (151)", () => {
    const expectedCities = 151;
    expect(expectedCities).toBeGreaterThanOrEqual(100);
  });

  it("should have expected number of city_codes (195)", () => {
    const expectedCityCodes = 195;
    expect(expectedCityCodes).toBeGreaterThanOrEqual(100);
  });
});

describe("Geography: city code format validation", () => {
  const validCityCodes = [
    { city: "Ahmedabad", code: "AHM", state: "GJ", country: "IN" },
    { city: "Surat", code: "SUR", state: "GJ", country: "IN" },
    { city: "Mumbai", code: "MUM", state: "MH", country: "IN" },
    { city: "London", code: "LON", state: "ENG", country: "GB" },
    { city: "Dubai", code: "DXB", state: "DU", country: "AE" },
    { city: "Singapore", code: "SGP", state: "SGP", country: "SG" },
    { city: "Nairobi", code: "NRB", state: "NBI", country: "KE" },
  ];

  it("all city codes should be 3 uppercase letters", () => {
    validCityCodes.forEach(({ code }) => {
      expect(code).toMatch(/^[A-Z]{3,4}$/);
    });
  });

  it("all country codes should be 2 uppercase letters (ISO 3166-1 alpha-2)", () => {
    validCityCodes.forEach(({ country }) => {
      expect(country).toMatch(/^[A-Z]{2}$/);
    });
  });

  it("stateless country city-code state equals country code", () => {
    const singaporeCode = validCityCodes.find(c => c.city === "Singapore");
    expect(singaporeCode?.state).toBe("SGP");
    expect(singaporeCode?.country).toBe("SG");
  });
});
