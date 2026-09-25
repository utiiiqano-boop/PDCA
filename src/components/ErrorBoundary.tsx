import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

function Fallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{tr("errorBoundary.title")}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={{ height: 16 }} />
      <Button label={tr("errorBoundary.retry")} onPress={onRetry} />
    </View>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <Fallback message={this.state.error.message} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.danger,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: "center",
    lineHeight: 20,
  },
});
