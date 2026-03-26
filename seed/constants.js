import { DayOfWeek } from "../src/generated/prisma/client.js";

export const SLOT_SYSTEMS = [
  {
    key: "firstyear",
    code: "FIRST_YEAR",
    name: "First Year",
    applicableFor: "First Year",
  },
  {
    key: "secondyearonward",
    code: "SECOND_YEAR_ONWARD",
    name: "Second Year Onward",
    applicableFor: "Second Year Onward",
  },
];

export const DAY_MAP = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};
