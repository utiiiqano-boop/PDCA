import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useGate } from "@/hooks/useGate";
import { LoadingState } from "@/components/States";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { unlocked, loading: gateLoading } = useGate();

  if (authLoading || gateLoading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState />
      </View>
    );
  }

  // 1. Gate first
  if (!unlocked) return <Redirect href="/gate" />;

  // 2. Then auth
  return session ? (
    <Redirect href="/(app)/dashboard" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
