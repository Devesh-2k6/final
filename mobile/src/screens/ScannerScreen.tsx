import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { UniversalScannerModal, type UniversalScannerMode } from "../components/UniversalScannerModal";

export const ScannerScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const initialMode: UniversalScannerMode = route?.params?.mode || "barcode";
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("DealsFeed");
    }
  };

  const handleNavigateToDeals = (query: string) => {
    navigation.navigate("DealsTab", {
      screen: "DealsFeed",
      params: { query },
    });
  };

  return (
    <View style={styles.container}>
      <UniversalScannerModal
        visible={modalVisible}
        onClose={handleClose}
        initialMode={initialMode}
        onBarcodeDetected={(data) => {
          if (route?.params?.onBarcodeScanned) {
            route.params.onBarcodeScanned(data);
          }
        }}
        onDatesDetected={(dates) => {
          if (route?.params?.onDatesDetected) {
            route.params.onDatesDetected(dates);
          }
        }}
        onQrScanned={(data) => {
          if (route?.params?.onQrScanned) {
            route.params.onQrScanned(data);
          }
        }}
        onNavigateToDealsWithQuery={handleNavigateToDeals}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070A10",
  },
});
