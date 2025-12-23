# Pre-Prebuild Final Checklist

## ✅ Already Done:
- [x] Tesseract OCR installed with --legacy-peer-deps
- [x] Paste Text feature working (backup!)
- [x] All AI models configured

## ⚠️ Must Do Before Prebuild:

### 1. Install PDF Library
```bash
npm install react-native-pdf react-native-blob-util --legacy-peer-deps
```

### 2. Commit Current State
```bash
git add .
git commit -m "Pre-prebuild: Tesseract installed, Paste Text working"
```

### 3. Uninstall Old APK from Phone
```bash
adb uninstall com.anonymous.masterji
```
OR manually:
- Phone Settings → Apps → MasterJi → Uninstall

### 4. Clean Build
```bash
rm -rf node_modules
rm -rf android
rm -rf ios
npm install
```

### 5. Run Prebuild
```bash
npx expo prebuild --clean
```

### 6. Build and Run
```bash
npx expo run:android --device
```

## 📋 Post-Prebuild Checklist:

- [ ] App builds successfully
- [ ] App opens on phone
- [ ] Models still load correctly
- [ ] Paste Text still works
- [ ] Upload any image and test OCR

## ⚠️ If Anything Breaks:

Restore from backup:
```bash
git reset --hard HEAD~1
npm install
npx expo start --dev-client
```

## 🎯 Expected Timeline:
- Prebuild: 2-3 minutes
- Build & Install: 5-7 minutes
- Total: ~10 minutes

---

**Ready to proceed? Run the commands above in order!**
