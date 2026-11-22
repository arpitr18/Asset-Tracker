# Android APK and OTA release

Run Expo and EAS commands from `mobile`. Use the Expo project that your organization owns.

## Before the first APK

1. Deploy the Express API to a phone-accessible HTTPS endpoint and apply the database migrations. Check `/health` and sign in against that deployment. Replace shared demo passwords for any accounts on the deployment before distributing the APK.
2. Confirm the Android package ID in `app.json` before generating signing credentials. The configured ID is `com.visicooler.tracker`. Keep the same ID and signing certificate for upgrades to installed copies.
3. Run `eas login`, then `eas init` and `eas update:configure`. Select your organization and project. Check that `app.json` contains the actual `extra.eas.projectId`, that `updates.url` is `https://u.expo.dev/<projectId>`, and that `runtimeVersion.policy` is still `fingerprint`.
4. In EAS project settings, set `EXPO_PUBLIC_API_URL`, `GOOGLE_MAPS_ANDROID_API_KEY`, and `TRACKER_RELEASE=1` for the **preview** and **production** environments. Use a public or sensitive Maps variable so EAS can resolve the same native configuration during build and update. Restrict the key to **Maps SDK for Android** and your Android package and signing certificate SHA-1. Keep server secrets on the backend. `EXPO_PUBLIC_*` variables are readable in the installed app.
5. Choose your release keystore in EAS. To prevent unauthorized update payloads from being accepted, configure Expo Update code signing **before the first APK** if your EAS plan supports it. Embed the public certificate and keep the private key outside the repository and build archive. Android APK signing and OTA update signing use separate keys.

If this checkout has no Git metadata, tell EAS to archive the monorepo root rather than only the mobile folder:

```powershell
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = (Resolve-Path ..).Path
```

The repository-root `.easignore` excludes local environment files, credentials, datasets, and backend source. It keeps the root package lock and workspace manifests for the mobile dependency install.

## Build and verify the preview APK

```powershell
eas build --platform android --profile preview
```

The **preview** profile outputs a signed installable APK on the preview channel. The **production** profile outputs an AAB for Google Play. Download the preview APK from the completed EAS build and install it on a physical Android device.

Verify login, map tiles, GPS, scanning a real cooler QR/barcode, photo capture and upload, survey submission, and restart with a weak or offline connection. Confirm the selected API environment before submitting real data. A successful JavaScript export does not exercise R8 or APK signing. Check the release build logs for R8 and retain the matching `mapping.txt` from the Gradle release outputs for crash deobfuscation.

## Publish OTA UI changes

```powershell
eas update --platform android --channel preview --environment preview --message "Describe the UI change"
```

For signed OTA publishing, append `--private-key-path <path-outside-repository>`. Test the update on the preview APK after the app has downloaded it and been restarted. Repeat with the production channel and environment only after testing. Use `eas update:rollback` if a bad update needs to be reverted.

OTA updates can deliver JavaScript, styles, and supported bundled assets to builds with the same channel and native runtime fingerprint. Changes to native dependencies, permissions, Maps native config, R8 rules, or the embedded OTA certificate require a new binary. R8 shrinks and obfuscates Android Java/Kotlin code. It does not conceal JavaScript or secrets embedded in the app.
