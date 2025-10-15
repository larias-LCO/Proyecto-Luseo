export const VALID_PAGE_SIZES = [10, 20, 30];

export function getInitialPageSize(): number {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = parseInt(params.get("size") || "", 10);
  if (VALID_PAGE_SIZES.includes(fromUrl)) return fromUrl;
  const stored = parseInt(localStorage.getItem("employees.pageSize") || "", 10);
  if (VALID_PAGE_SIZES.includes(stored)) return stored;
  return 10;
}

export function syncFiltersToUrl(filters: Record<string, string | number | undefined | null>): void {
  const params = new URLSearchParams(window.location.search);
  Object.entries(filters).forEach(([key, value]) => {
    const str = value === undefined || value === null ? "" : String(value);
    if (str !== "") params.set(key, str);
    else params.delete(key);
  });
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}

export function readFiltersFromUrl(): any {
  const params = new URLSearchParams(window.location.search);
  const page = Math.max(1, parseInt(params.get("page") || "", 10) || 1);
  const size = parseInt(params.get("size") || "", 10);
  return {
    q: params.get("q") || "",
    department: params.get("department") || "",
    jobPosition: params.get("job") || "",
    office: params.get("office") || "",
    state: params.get("state") || "",
    role: params.get("role") || "",
    page,
    size: VALID_PAGE_SIZES.includes(size) ? size : undefined
  };
}