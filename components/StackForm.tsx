"use client";

import React from "react";
import {
  LibraryPicker,
  LibraryPickerProps,
  PRESETS,
  formatUpgradeQuery,
  type Preset,
  type UpgradeSelection,
} from "./LibraryPicker";

export interface StackFormProps extends LibraryPickerProps {}

export { LibraryPicker, PRESETS, formatUpgradeQuery };
export type { Preset, UpgradeSelection };

export function StackForm(props: StackFormProps) {
  return <LibraryPicker {...props} />;
}
