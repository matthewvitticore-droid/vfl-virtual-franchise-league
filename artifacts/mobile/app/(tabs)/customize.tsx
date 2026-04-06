import { Redirect } from "expo-router";

/**
 * Customize tab — redirects into the customize stack.
 */
export default function CustomizeTab() {
  return <Redirect href="/customize" />;
}
