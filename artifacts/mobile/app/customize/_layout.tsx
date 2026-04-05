import { Stack } from "expo-router";

export default function CustomizeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="uniform" />
      <Stack.Screen name="logo" />
    </Stack>
  );
}
