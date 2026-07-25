# Build and sync script for ExpiryGo
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
