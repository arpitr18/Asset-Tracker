import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "./api";

const fallback = {
  dateFormat: "DD MMM YYYY",
  surveyRadiusMeters: 100,
  nearbyRadiusKm: 5,
};
export function useRuntime() {
  const settings = useQuery({
    queryKey: ["runtime-settings"],
    queryFn: () => request("/runtime-settings"),
    staleTime: 10000,
    refetchInterval: 15000,
    retry: 0,
  });
  return settings.data ?? fallback;
}
export function useRuntimeSync() {
  const client = useQueryClient();
  const { revision } = useRuntime();
  const previous = useRef(undefined);
  useEffect(() => {
    if (revision === undefined) return;
    if (previous.current !== undefined && previous.current !== revision) {
      const affected = new Set([
        "me",
        "store-explorer",
        "map",
        "store",
        "hierarchy",
        "rd-directory",
        "rd-directory-detail",
        "rd-directory-sales",
        "rd-options",
        "field-stores",
        "field-form",
      ]);
      client.invalidateQueries({
        predicate: (query) => affected.has(query.queryKey[0]),
      });
    }
    previous.current = revision;
  }, [client, revision]);
}
export function formatTrackerDate(
  value,
  format,
  time = false,
  zone = "Asia/Kolkata",
) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((item) => [item.type, item.value]),
  );
  const month = new Intl.DateTimeFormat("en-IN", {
    timeZone: zone,
    month: "short",
  }).format(date);
  const label = format.replace(
    /YYYY|MMM|MM|DD/g,
    (key) =>
      ({ YYYY: parts.year, MMM: month, MM: parts.month, DD: parts.day })[key],
  );
  return time
    ? label +
        " · " +
        new Intl.DateTimeFormat("en-IN", {
          timeZone: zone,
          hour: "numeric",
          minute: "2-digit",
        }).format(date)
    : label;
}
