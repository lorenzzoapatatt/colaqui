export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export function problem(
  status: number,
  title: string,
  detail?: string,
  errors?: Record<string, string[]>,
): ProblemDetails {
  return {
    type: "about:blank",
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(errors ? { errors } : {}),
  };
}
