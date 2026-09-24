import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ActionSignatureRow, SignaturePoint } from "@/types/database";
import { theme } from "@/theme";

interface Props {
  signature: ActionSignatureRow;
  width?: number;
  height?: number;
}

function pathToD(points: SignaturePoint[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export function SignatureView({ signature, width = 260, height = 100 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pad}>
        <Svg width={width} height={height}>
          {signature.signature_paths.map((pts, i) => (
            <Path
              key={i}
              d={pathToD(pts)}
              stroke={theme.colors.primary}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
      <Text style={styles.name}>Signé par {signature.signer_name}</Text>
      <Text style={styles.date}>{fmtDate(signature.signed_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, alignItems: "center" },
  pad: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 6,
  },
  date: { fontSize: 11, color: theme.colors.textMuted },
});
