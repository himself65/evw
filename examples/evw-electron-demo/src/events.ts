import { defineEvent } from "evw";

export const startEvent = defineEvent<{
  message: string;
}>();
