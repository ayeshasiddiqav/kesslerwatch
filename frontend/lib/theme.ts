import type { ObjectType } from "./api";

/** The only palette allowed by CLAUDE.md "Design specifics". */
export const PALETTE = {
  space: "#05060A",
  ivory: "#F2EBDD",
  muted: "#B8B2A7",
  gold: "#D9B77E",
  ice: "#A8C8E8",
  silver: "#CFC6B8",
  amber: "#C9A36A",
  rose: "#E0707A",
} as const;

export const TYPE_COLORS: Record<ObjectType, string> = {
  payload: PALETTE.ice,
  debris: PALETTE.silver,
  rocket: PALETTE.amber,
};

export const TYPE_LABELS: Record<ObjectType, string> = {
  payload: "Payloads",
  debris: "Debris",
  rocket: "Rocket bodies",
};
