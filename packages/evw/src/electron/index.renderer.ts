import { preservedEventChannel } from "./shared";

const ee = window[preservedEventChannel as keyof Window] as {};
