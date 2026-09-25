import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import {
  ActionPhoto,
  deleteActionPhoto,
  listPhotosForAction,
  uploadActionPhoto,
} from "@/services/photoService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  actionId: string;
}

export function ActionPhotos({ actionId }: Props) {
  const { session } = useAuth();
  const { toast, confirm } = useUI();
  const { t: tr } = useTranslation();
  const [photos, setPhotos] = useState<ActionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<ActionPhoto | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setPhotos(await listPhotosForAction(actionId));
    } catch (e) {
      console.warn("[photos] load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actionId]);

  const pickAndUpload = async () => {
    if (!session?.user) return;
    try {
      setUploading(true);

      // Web: native file input
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp";
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const uri = reader.result as string;
              const created = await uploadActionPhoto(actionId, uri, session.user.id);
              setPhotos((prev) => [created, ...prev]);
              toast.success(tr("actionPhotos.added"));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : tr("actionPhotos.failed"));
            } finally {
              setUploading(false);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }

      // Native: expo-image-picker (dynamic import for web safety)
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error(tr("actionPhotos.permissionDenied"));
        setUploading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const created = await uploadActionPhoto(
          actionId,
          result.assets[0].uri,
          session.user.id,
        );
        setPhotos((prev) => [created, ...prev]);
        toast.success(tr("actionPhotos.added"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("actionPhotos.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (photo: ActionPhoto) => {
    const ok = await confirm({
      title: tr("actionPhotos.confirmDelete"),
      message: tr("actionPhotos.confirmDeleteSub"),
      confirmLabel: tr("common.delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteActionPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast.info(tr("actionPhotos.deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("actionPhotos.failed"));
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {tr("actionPhotos.title")} {photos.length > 0 ? `(${photos.length})` : ""}
        </Text>
        <Pressable
          onPress={pickAndUpload}
          disabled={uploading}
          style={[styles.addBtn, uploading && { opacity: 0.5 }]}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addBtnTxt}>{tr("actionPhotos.add")}</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />
      ) : photos.length === 0 ? (
        <Text style={styles.empty}>
          {tr("actionPhotos.empty")}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {photos.map((p) => (
            <Pressable key={p.id} onPress={() => setViewer(p)} style={styles.thumb}>
              {p.signed_url ? (
                <Image source={{ uri: p.signed_url }} style={styles.thumbImg} />
              ) : (
                <View style={[styles.thumbImg, styles.thumbFallback]}>
                  <Text style={styles.thumbFallbackTxt}>?</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Fullscreen viewer */}
      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          <View style={styles.viewerContent}>
            {viewer?.signed_url ? (
              <Image
                source={{ uri: viewer.signed_url }}
                style={styles.viewerImg}
                resizeMode="contain"
              />
            ) : null}
            {viewer?.caption ? (
              <Text style={styles.viewerCaption}>{viewer.caption}</Text>
            ) : null}
            <View style={{ height: 12 }} />
            <Button
              label={tr("actionPhotos.deleteBtn")}
              variant="danger"
              onPress={() => {
                const v = viewer;
                setViewer(null);
                if (v) onDelete(v);
              }}
            />
            <View style={{ height: 8 }} />
            <Button label={tr("actionPhotos.close")} variant="secondary" onPress={() => setViewer(null)} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  addBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 90,
    alignItems: "center",
  },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { fontSize: 12, color: theme.colors.textMuted, fontStyle: "italic", marginTop: 4 },
  gallery: { gap: 8, paddingVertical: 4 },
  thumb: { width: 84, height: 84, borderRadius: 8, overflow: "hidden", backgroundColor: "#eef2f7" },
  thumbImg: { width: "100%", height: "100%" },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  thumbFallbackTxt: { color: theme.colors.textMuted, fontWeight: "700" },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: 20 },
  viewerContent: { backgroundColor: "#111", borderRadius: 12, padding: 16 },
  viewerImg: { width: "100%", height: 400 },
  viewerCaption: { color: "#fff", textAlign: "center", marginTop: 12, fontStyle: "italic" },
});
