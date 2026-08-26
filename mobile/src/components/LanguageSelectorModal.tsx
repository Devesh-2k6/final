import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Globe, Check, X } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "../theme";
import { useLanguage } from "../contexts/LanguageContext";

interface LanguageSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Globe size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.headerTitle}>
                    {t("common.select_language") || "Select Language"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Language List */}
              <View style={styles.list}>
                {supportedLanguages.map((lang) => {
                  const isSelected = lang.code === language;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langItem,
                        isSelected && styles.langItemActive,
                      ]}
                      onPress={async () => {
                        await setLanguage(lang.code);
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.langLeft}>
                        <Text style={styles.flagEmoji}>{lang.flag}</Text>
                        <View>
                          <Text
                            style={[
                              styles.nativeText,
                              isSelected && styles.nativeTextActive,
                            ]}
                          >
                            {lang.nativeName}
                          </Text>
                          <Text style={styles.englishText}>{lang.name}</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Check size={14} color={Colors.textInverse} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.title2,
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 8,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  langItemActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  langLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  flagEmoji: {
    fontSize: 22,
  },
  nativeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  nativeTextActive: {
    color: Colors.primary,
  },
  englishText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
