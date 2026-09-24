import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import type { SignaturePoint } from "@/types/database";
import { theme } from "@/theme";

export interface SignaturePadHandle {
  getPaths: () => SignaturePoint[][];
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props {
  width?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
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

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ width = 320, height = 180, color = theme.colors.primary, style }, ref) => {
    const [paths, setPaths] = useState<SignaturePoint[][]>([]);
    const pathsRef = useRef<SignaturePoint[][]>([]);

    useImperativeHandle(ref, () => ({
      getPaths: () => pathsRef.current,
      clear: () => {
        pathsRef.current = [];
        setPaths([]);
      },
      isEmpty: () => pathsRef.current.length === 0,
    }));

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            const newPath: SignaturePoint[] = [{ x: locationX, y: locationY }];
            pathsRef.current = [...pathsRef.current, newPath];
            setPaths([...pathsRef.current]);
          },
          onPanResponderMove: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            const last = pathsRef.current[pathsRef.current.length - 1];
            if (!last) return;
            last.push({ x: locationX, y: locationY });
            setPaths([...pathsRef.current]);
          },
          onPanResponderRelease: () => {},
        }),
      [],
    );

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.wrap,
          { width, height, borderColor: color + "55" },
          style,
        ]}
      >
        <Svg width={width} height={height}>
          {paths.map((pts, i) => (
            <Path
              key={i}
              d={pathToD(pts)}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        {paths.length === 0 ? (
          <Text style={styles.placeholder}>Signez ici avec votre doigt</Text>
        ) : null}
      </View>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    position: "absolute",
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
});
