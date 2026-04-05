/** Query param when opening progress subpages from Add Check-in on /client/check-ins */
export const FROM_CHECK_INS_PARAM = "from";
export const FROM_CHECK_INS_VALUE = "check-ins";

export function isFromCheckIns(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get(FROM_CHECK_INS_PARAM) === FROM_CHECK_INS_VALUE;
}

export function progressBackHref(fromCheckIns: boolean): string {
  return fromCheckIns ? "/client/check-ins" : "/client/progress";
}

/** Append ?from=check-ins when navigating between progress tools from check-ins flow */
export function withFromCheckIns(path: string, fromCheckIns: boolean): string {
  if (!fromCheckIns) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${FROM_CHECK_INS_PARAM}=${FROM_CHECK_INS_VALUE}`;
}
