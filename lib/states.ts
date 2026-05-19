export type StateSlug = "texas" | "tennessee" | "oklahoma" | "louisiana";

export interface StateData {
  slug: StateSlug;
  code: "TX" | "TN" | "OK" | "LA";
  name: string;
  tagline: string;
  intro: string;
  landNote: string;
  metros: string[];
}

export const STATES: Record<StateSlug, StateData> = {
  texas: {
    slug: "texas",
    code: "TX",
    name: "Texas",
    tagline: "Turnkey barndos built for Texas land, weather, and lifestyle.",
    intro:
      "From the Hill Country to the Panhandle, Texas land is built for barndominium living. We match landowners with a builder who knows local codes, soil, and the heat — and handles design through move-in under one contract.",
    landNote:
      "Texas counties vary widely on permitting and septic rules. Our matched builders know the difference between building outside Austin versus deep in East Texas.",
    metros: ["Dallas-Fort Worth", "San Antonio", "Hill Country", "East Texas"],
  },
  tennessee: {
    slug: "tennessee",
    code: "TN",
    name: "Tennessee",
    tagline: "Custom barndominiums across the Volunteer State.",
    intro:
      "Tennessee's rolling acreage is some of the best barndo land in the South. We connect landowners with builders who understand hillside foundations, county codes, and Tennessee financing.",
    landNote:
      "Sloped lots are common across Middle and East Tennessee. The right builder turns a hillside into a walkout-basement advantage instead of a cost overrun.",
    metros: ["Nashville", "Knoxville", "Chattanooga", "Tri-Cities"],
  },
  oklahoma: {
    slug: "oklahoma",
    code: "OK",
    name: "Oklahoma",
    tagline: "Steel-framed homes built for Oklahoma living.",
    intro:
      "Oklahoma weather demands a home that can take it. Steel-framed barndominiums stand up to wind and storms — and we match you with builders who engineer for exactly that.",
    landNote:
      "Wind ratings matter in Oklahoma. Our matched builders engineer steel framing and anchoring to the conditions on your specific tract.",
    metros: ["Oklahoma City", "Tulsa", "Lawton", "Rural OK"],
  },
  louisiana: {
    slug: "louisiana",
    code: "LA",
    name: "Louisiana",
    tagline: "Durable, design-forward barndos across Louisiana.",
    intro:
      "Louisiana land calls for smart elevation, drainage, and durable materials. We match landowners with builders who design for the climate and handle the whole build under one contract.",
    landNote:
      "Flood zones and elevation requirements shape every Louisiana build. The right builder plans foundation height and drainage from day one.",
    metros: ["Baton Rouge", "Lafayette", "Shreveport", "Northshore"],
  },
};

export const STATE_LIST = Object.values(STATES);

export function isStateSlug(value: string): value is StateSlug {
  return value in STATES;
}
