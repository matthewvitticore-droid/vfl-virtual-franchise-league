import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VFLSplash } from "@/components/VFLSplash";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NFLProvider } from "@/context/NFLContext";
import { SUPABASE_ENABLED } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, membership, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) return <VFLSplash />;

  const inAuthGroup     = segments[0] === "auth";
  const inFranchiseGroup = segments[0] === "franchise";
  const inTabsGroup     = segments[0] === "(tabs)";

  // If Supabase isn't configured, skip auth and allow direct access to tabs
  if (!SUPABASE_ENABLED) {
    if (inAuthGroup || inFranchiseGroup) return <Redirect href="/(tabs)" />;
    return <>{children}</>;
  }

  // Not logged in → force to login
  if (!session && !inAuthGroup) {
    return <Redirect href="/auth/login" />;
  }

  // Logged in but no franchise → force to franchise lobby (unless skipping offline)
  // We allow the user to skip to tabs from the lobby screen itself
  if (session && !membership && !inFranchiseGroup && !inTabsGroup && !inAuthGroup) {
    return <Redirect href="/franchise" />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <NFLProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="franchise/index" />
          <Stack.Screen
            name="game/[id]"
            options={{ presentation: "card", animation: "slide_from_bottom" }}
          />
        </Stack>
      </AuthGate>
    </NFLProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <VFLSplash />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
